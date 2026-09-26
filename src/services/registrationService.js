/**
 * SAMYAK 2026 — Registration Service
 * 
 * Handles the enrollment lifecycle:
 * - INTERNAL (KL University @kluniversity.in) vs EXTERNAL participants
 * - Duplicate enrollment prevention (UID + eventId uniqueness)
 * - eventStats/samyak2026 atomic counter updates
 * - Category verification status management
 * 
 * Security: All sensitive mutations are server-validated through Firestore rules.
 * Client-side code never sets payment.status = VERIFIED or gatePass.token.
 */

import {
  doc, setDoc, getDoc, updateDoc, collection, query,
  where, getDocs, runTransaction, serverTimestamp, increment, limit, addDoc, onSnapshot
} from 'firebase/firestore';
import { db, isKLUEmail } from './firebase';
import { sanitizeText } from './fileSecurityService';

// ============================================================
// ENUMERATIONS
// ============================================================

export const PARTICIPANT_CATEGORY = {
  INTERNAL: 'INTERNAL',  // KL University students — no gate pass
  EXTERNAL: 'EXTERNAL',  // Other colleges — gate pass required
};

export const CATEGORY_VERIFICATION_STATUS = {
  PENDING: 'PENDING',    // Admin needs to review (typed college name, non-KLU Microsoft)
  VERIFIED: 'VERIFIED',  // Auto-verified via @kluniversity.in Microsoft login
  REJECTED: 'REJECTED',  // Admin rejected the category claim
};

export const EVENT_ID = 'samyak-fest-2026';
export const EVENT_STATS_DOC = 'samyak2026';

// ============================================================
// EVENT STATS — Realtime aggregate counter document
// ============================================================

/**
 * Initializes the eventStats document if it doesn't exist.
 * Called by SuperAdmin once during setup.
 */
export async function initEventStats() {
  const statsRef = doc(db, 'eventStats', EVENT_STATS_DOC);
  const snap = await getDoc(statsRef);
  if (!snap.exists()) {
    await setDoc(statsRef, {
      totalEnrolled: 0,
      internalCount: 0,
      externalCount: 0,
      paymentPending: 0,
      paymentVerified: 0,
      gatePassIssued: 0,
      presentCount: 0,
      updatedAt: serverTimestamp(),
    });
    return { created: true };
  }
  return { created: false, data: snap.data() };
}

/**
 * Superadmin utility: Recalculate eventStats directly from actual collections.
 * Ensures numbers are 100% accurate and in-sync with Firestore records.
 */
export async function syncEventStatsFromCollections() {
  const regSnap = await getDocs(collection(db, 'registrations'));
  let totalEnrolled = 0;
  let internalCount = 0;
  let externalCount = 0;
  let paymentPending = 0;
  let paymentVerified = 0;
  let gatePassIssued = 0;
  let presentCount = 0;

  regSnap.forEach((d) => {
    const data = d.data();
    totalEnrolled++;
    if (data.category === PARTICIPANT_CATEGORY.INTERNAL) internalCount++;
    else if (data.category === PARTICIPANT_CATEGORY.EXTERNAL) externalCount++;

    if (data.payment?.status === PAYMENT_STATUS.VERIFIED) paymentVerified++;
    else if (data.payment?.status === PAYMENT_STATUS.PENDING_VERIFICATION || data.payment?.status === PAYMENT_STATUS.PAYMENT_SUBMITTED) paymentPending++;

    if (data.gatePass?.status === 'ISSUED' || data.gatePass?.status === 'USED') gatePassIssued++;
    if (data.attendance?.status === 'PRESENT') presentCount++;
  });

  const statsRef = doc(db, 'eventStats', EVENT_STATS_DOC);
  const newStats = {
    totalEnrolled,
    internalCount,
    externalCount,
    paymentPending,
    paymentVerified,
    gatePassIssued,
    presentCount,
    updatedAt: serverTimestamp(),
  };

  await setDoc(statsRef, newStats, { merge: true });
  return newStats;
}


/**
 * Atomically update eventStats counters.
 * delta is an object of field increments/decrements:
 * e.g. { totalEnrolled: 1, internalCount: 1, paymentPending: 1 }
 */
export async function updateEventStats(delta) {
  try {
    const statsRef = doc(db, 'eventStats', EVENT_STATS_DOC);
    const updates = { updatedAt: serverTimestamp() };
    for (const [field, value] of Object.entries(delta)) {
      if (typeof value === 'number' && value !== 0) {
        updates[field] = increment(value);
      }
    }
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(statsRef);
      if (!snap.exists()) {
        tx.set(statsRef, {
          totalEnrolled: 0,
          internalCount: 0,
          externalCount: 0,
          paymentPending: 0,
          paymentVerified: 0,
          gatePassIssued: 0,
          presentCount: 0,
          ...updates,
        });
      } else {
        tx.update(statsRef, updates);
      }
    });
  } catch (err) {
    console.warn('eventStats update note:', err.message);
  }
}

/**
 * Subscribe to live eventStats.
 * Returns unsubscribe function.
 */
export function listenToEventStats(callback) {
  const statsRef = doc(db, 'eventStats', EVENT_STATS_DOC);
  return onSnapshot(statsRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('eventStats listener note:', err.message);
    callback(null);
  });
}

// ============================================================
// DUPLICATE ENROLLMENT PROTECTION
// ============================================================

/**
 * Check if a user already has a registration for the given event.
 * Returns the existing registration or null.
 */
export async function checkExistingEnrollment(uid, eventId = EVENT_ID) {
  if (!uid) return null;
  try {
    const q = query(
      collection(db, 'registrations'),
      where('uid', '==', uid),
      where('eventId', '==', eventId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
  } catch (err) {
    console.warn('Duplicate check note:', err.message);
    return null;
  }
}

// ============================================================
// ENROLLMENT
// ============================================================

/**
 * Create a new registration for a participant.
 * 
 * @param {Object} params
 * @param {string} params.uid - Firebase UID
 * @param {string} params.email - Participant email
 * @param {string} params.name - Full name
 * @param {string} params.mobile - Mobile number
 * @param {string} params.studentId - Student ID / Roll number
 * @param {string} params.college - College name
 * @param {string} params.branch - Branch / Department
 * @param {'INTERNAL'|'EXTERNAL'} params.category - Participant category
 * @param {string} [params.authProvider] - 'google' | 'microsoft'
 * @returns {Promise<{success: boolean, registrationId: string}>}
 */
export async function enrollParticipant({
  uid,
  email,
  name,
  mobile,
  studentId,
  college,
  branch,
  category,
  authProvider = 'google',
}) {
  if (!uid) throw new Error('Authentication required.');
  if (!name || !mobile || !studentId) {
    throw new Error('Please fill in all required fields.');
  }
  if (!PARTICIPANT_CATEGORY[category]) {
    throw new Error('Invalid participant category selected.');
  }

  // 1. Server-side duplicate check
  const existing = await checkExistingEnrollment(uid);
  if (existing) {
    throw new Error('ALREADY_ENROLLED');
  }

  // 2. Sanitize inputs
  const cleanName = sanitizeText(name).trim();
  const cleanMobile = sanitizeText(mobile).trim();
  const cleanStudentId = sanitizeText(studentId).trim();
  const cleanCollege = sanitizeText(college || 'KL University').trim();
  const cleanBranch = sanitizeText(branch || '').trim();

  if (!cleanName) throw new Error('Please enter your full name.');
  if (!cleanMobile || cleanMobile.length < 8) throw new Error('Please enter a valid mobile number.');
  if (!cleanStudentId) throw new Error('Please enter your Student ID.');

  // 3. Determine category verification status
  let categoryVerificationStatus;
  if (category === PARTICIPANT_CATEGORY.INTERNAL) {
    // Auto-verify if email is @kluniversity.in (Microsoft login)
    if (isKLUEmail(email)) {
      categoryVerificationStatus = CATEGORY_VERIFICATION_STATUS.VERIFIED;
    } else {
      // User claims to be internal but email isn't KLU — pending admin review
      categoryVerificationStatus = CATEGORY_VERIFICATION_STATUS.PENDING;
    }
  } else {
    // External — category is inherently valid; no gate pass until payment verified
    categoryVerificationStatus = CATEGORY_VERIFICATION_STATUS.VERIFIED;
  }

  // 4. Generate registration ID
  const regId = `SMYK-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  // 5. Build the registration record
  const record = {
    registrationId: regId,
    uid,
    eventId: EVENT_ID,

    // Participant info
    name: cleanName,
    email: email || '',
    mobile: cleanMobile,
    studentId: cleanStudentId,
    college: cleanCollege,
    branch: cleanBranch,

    // Category
    category,
    categoryVerificationStatus,
    authProvider,

    // Registration lifecycle
    registrationStatus: 'REGISTERED',

    // Payment — starts as pending
    payment: {
      status: 'PENDING_PAYMENT',
      amount: 499,
      currency: 'INR',
      utr: null,
      screenshotUrl: null,
      submittedAt: null,
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null,
    },

    // Gate Pass — only generated for EXTERNAL after payment verified
    gatePass: {
      status: 'NOT_ISSUED',
      token: null,
      issuedAt: null,
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
      checkedInByRole: null,
    },

    // Attendance — internal managed by admin, external via gate pass
    attendance: {
      status: 'NOT_MARKED',
      markedAt: null,
      markedBy: null,
      markedByRole: null,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 6. Write the registration
  const regRef = doc(db, 'registrations', regId);
  await setDoc(regRef, record);

  // 7. Update user profile with category & registration link
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      category,
      categoryVerificationStatus,
      registrationId: regId,
      studentId: cleanStudentId,
      mobile: cleanMobile,
      college: cleanCollege,
      branch: cleanBranch,
      name: cleanName,
      profileCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('User profile sync note:', err.message);
  }

  // 8. Update eventStats atomically
  const statsDelta = {
    totalEnrolled: 1,
    paymentPending: 1,
  };
  if (category === PARTICIPANT_CATEGORY.INTERNAL) {
    statsDelta.internalCount = 1;
  } else {
    statsDelta.externalCount = 1;
  }
  await updateEventStats(statsDelta);

  // 9. Audit log
  try {
    await addDoc(collection(db, 'audit_logs'), {
      registrationId: regId,
      action: 'ENROLLMENT_CREATED',
      actorId: uid,
      details: { category, categoryVerificationStatus, authProvider },
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Enrollment audit log note:', err.message);
  }

  return { success: true, registrationId: regId, record };
}

/**
 * Update category verification status (admin action only).
 */
export async function updateCategoryVerification(registrationId, newStatus, adminId) {
  if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(newStatus)) {
    throw new Error('Invalid category verification status.');
  }
  const regRef = doc(db, 'registrations', registrationId);
  await updateDoc(regRef, {
    categoryVerificationStatus: newStatus,
    categoryVerifiedBy: adminId,
    categoryVerifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'audit_logs'), {
    registrationId,
    action: 'CATEGORY_VERIFICATION_UPDATED',
    actorId: adminId,
    details: { newStatus },
    timestamp: serverTimestamp(),
    clientTimestamp: new Date().toISOString(),
  });
}
