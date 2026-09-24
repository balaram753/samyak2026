import { 
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, 
  serverTimestamp, runTransaction, onSnapshot, query, where, getDocs,
  orderBy, limit 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Standard Status Enumerations
 */
export const PAYMENT_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  REFUND_REQUIRED: 'REFUND_REQUIRED',
};

export const GATE_PASS_STATUS = {
  NOT_ISSUED: 'NOT_ISSUED',
  ISSUED: 'ISSUED',
  USED: 'USED',
  CANCELLED: 'CANCELLED',
};

export const AUDIT_ACTIONS = {
  PAYMENT_SUBMITTED: 'PAYMENT_SUBMITTED',
  PAYMENT_VERIFICATION_STARTED: 'PAYMENT_VERIFICATION_STARTED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  GATE_PASS_ISSUED: 'GATE_PASS_ISSUED',
  GATE_PASS_CANCELLED: 'GATE_PASS_CANCELLED',
  GATE_PASS_SCANNED: 'GATE_PASS_SCANNED',
  GATE_PASS_USED: 'GATE_PASS_USED',
};

/**
 * Generates a cryptographically random, unpredictable high-entropy token.
 * Formatted as: SMYK-GP-<24-hex-chars>
 */
export function generateSecureGatePassToken() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `SMYK-GP-${hex}`;
  }
  // Safe fallback if web crypto unavailable
  const fallback = 'GP' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase();
  return `SMYK-${fallback}`;
}

/**
 * Record an audit log entry in Firestore 'audit_logs' collection.
 */
export async function recordAuditLog({ registrationId, action, actorId = 'system', details = {} }) {
  try {
    await addDoc(collection(db, 'audit_logs'), {
      registrationId: registrationId || 'unknown',
      action,
      actorId,
      details,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to record audit log:', err.message);
  }
}

/**
 * Admin action: Idempotently verify payment and issue a single unique Gate Pass.
 * If already issued, returns the existing token without generating a duplicate.
 */
export async function issueGatePassForRegistration({ 
  paymentId, 
  registrationId, 
  adminId = 'super_admin',
  attendeeData = {} 
}) {
  const effectiveRegId = registrationId || paymentId;

  // 1. Check existing payment doc if ID provided
  let paymentDocData = null;
  let payRef = null;
  if (paymentId) {
    payRef = doc(db, 'payments', paymentId);
    const paySnap = await getDoc(payRef);
    if (paySnap.exists()) {
      paymentDocData = paySnap.data();
    }
  }

  // 2. Check existing student_registrations doc
  const regRef = doc(db, 'student_registrations', effectiveRegId);
  const regSnap = await getDoc(regRef);
  const regData = regSnap.exists() ? regSnap.data() : null;

  // 3. IDEMPOTENCY GUARD: If already issued, return existing pass
  const existingToken = paymentDocData?.gatePassToken || regData?.gatePassToken;
  const existingStatus = paymentDocData?.gatePassStatus || regData?.gatePassStatus;

  if (existingToken && existingStatus === GATE_PASS_STATUS.ISSUED) {
    return {
      success: true,
      alreadyIssued: true,
      gatePassToken: existingToken,
      gatePassStatus: GATE_PASS_STATUS.ISSUED,
      message: 'Gate pass already active for this registration.',
    };
  }

  // 4. Generate new high-entropy token
  const token = generateSecureGatePassToken();
  const regNumber = attendeeData.registrationNumber || regData?.registrationId || paymentDocData?.registrationId || `SAMYAK-${Math.floor(100000 + Math.random() * 900000)}`;
  const ticketType = attendeeData.ticketType || attendeeData.tier || regData?.passTier || paymentDocData?.tier || 'Standard Fest Pass';
  const attendeeName = attendeeData.name || regData?.name || paymentDocData?.name || 'Student Delegate';
  const attendeeEmail = attendeeData.email || regData?.email || paymentDocData?.email || '';
  const attendeePhone = attendeeData.phone || regData?.phone || paymentDocData?.phone || '';
  const attendeeCollege = attendeeData.university || regData?.university || paymentDocData?.university || 'KL University';
  const attendeeRoll = attendeeData.rollNo || regData?.rollNo || paymentDocData?.rollNo || '';

  const appOrigin = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
    ? window.location.origin
    : 'https://kl--samyak.web.app';
  const verificationUrl = `${appOrigin}/gate/verify/${token}`;

  const passRecord = {
    gatePassToken: token,
    registrationNumber: regNumber,
    registrationId: effectiveRegId,
    paymentId: paymentId || null,
    name: attendeeName,
    email: attendeeEmail,
    phone: attendeePhone,
    university: attendeeCollege,
    rollNo: attendeeRoll,
    ticketType: ticketType,
    paymentStatus: PAYMENT_STATUS.VERIFIED,
    gatePassStatus: GATE_PASS_STATUS.ISSUED,
    gatePassIssuedAt: serverTimestamp(),
    issuedBy: adminId,
    checkedIn: false,
    checkedInAt: null,
    checkedInBy: null,
    verificationUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // 5. Save to primary lookup collection: 'gate_passes/{token}'
  const passDocRef = doc(db, 'gate_passes', token);
  await setDoc(passDocRef, passRecord);

  // 6. Update 'registrations' collection (Unified Data Model)
  try {
    const mainRegRef = doc(db, 'registrations', effectiveRegId);
    const mainRegSnap = await getDoc(mainRegRef);
    if (mainRegSnap.exists()) {
      await updateDoc(mainRegRef, {
        'payment.status': PAYMENT_STATUS.VERIFIED,
        'payment.verifiedAt': serverTimestamp(),
        'payment.verifiedBy': adminId,
        'gatePass.status': GATE_PASS_STATUS.ISSUED,
        'gatePass.token': token,
        'gatePass.issuedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.warn('Sync to registrations doc note:', e.message);
  }

  // 7. Update 'payments' collection
  if (payRef) {
    await updateDoc(payRef, {
      paymentStatus: PAYMENT_STATUS.VERIFIED,
      status: 'verified',
      gatePassStatus: GATE_PASS_STATUS.ISSUED,
      gatePassToken: token,
      gatePassIssuedAt: serverTimestamp(),
      verifiedBy: adminId,
      updatedAt: serverTimestamp(),
    }).catch(console.warn);
  }

  // 8. Update 'student_registrations' collection
  if (regSnap.exists()) {
    await updateDoc(regRef, {
      paymentStatus: PAYMENT_STATUS.VERIFIED,
      gatePassStatus: GATE_PASS_STATUS.ISSUED,
      gatePassToken: token,
      gatePassIssuedAt: serverTimestamp(),
      isVerified: true,
      updatedAt: serverTimestamp(),
    }).catch(console.warn);
  } else {
    await setDoc(regRef, {
      ...passRecord,
      createdAt: serverTimestamp(),
    }, { merge: true }).catch(console.warn);
  }

  // 8. If linked to users collection
  const userId = paymentDocData?.userId || regData?.userId;
  if (userId) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        paymentStatus: PAYMENT_STATUS.VERIFIED,
        gatePassStatus: GATE_PASS_STATUS.ISSUED,
        gatePassToken: token,
        gatePassIssuedAt: serverTimestamp(),
        isStudentVerified: true,
      });
    } catch {}
  }

  // 9. Audit Logging
  await recordAuditLog({
    registrationId: regNumber,
    action: AUDIT_ACTIONS.PAYMENT_VERIFIED,
    actorId: adminId,
    details: { paymentId, amount: paymentDocData?.amount || 0 }
  });

  await recordAuditLog({
    registrationId: regNumber,
    action: AUDIT_ACTIONS.GATE_PASS_ISSUED,
    actorId: adminId,
    details: { token, ticketType }
  });

  return {
    success: true,
    gatePassToken: token,
    gatePassStatus: GATE_PASS_STATUS.ISSUED,
    registrationNumber: regNumber,
    verificationUrl,
  };
}

/**
 * Admin action: Reject Payment.
 */
export async function rejectPaymentForRegistration({ 
  paymentId, 
  registrationId, 
  reason = 'Invalid UTR or fraudulent payment proof',
  adminId = 'super_admin' 
}) {
  const effectiveRegId = registrationId || paymentId;

  if (paymentId) {
    try {
      const payRef = doc(db, 'payments', paymentId);
      await updateDoc(payRef, {
        paymentStatus: PAYMENT_STATUS.REJECTED,
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
        rejectedBy: adminId,
      });
    } catch (e) {
      console.warn('Reject payments note:', e.message);
    }
  }

  if (effectiveRegId) {
    try {
      const regRef = doc(db, 'registrations', effectiveRegId);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        await updateDoc(regRef, {
          'payment.status': PAYMENT_STATUS.REJECTED,
          'payment.rejectionReason': reason,
          'gatePass.status': GATE_PASS_STATUS.CANCELLED,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn('Reject registrations note:', e.message);
    }

    try {
      const legacyRegRef = doc(db, 'student_registrations', effectiveRegId);
      await updateDoc(legacyRegRef, {
        paymentStatus: PAYMENT_STATUS.REJECTED,
        gatePassStatus: GATE_PASS_STATUS.CANCELLED,
        rejectionReason: reason,
        isVerified: false,
        rejectedAt: serverTimestamp(),
      });
    } catch {}
  }

  await recordAuditLog({
    registrationId: effectiveRegId,
    action: AUDIT_ACTIONS.PAYMENT_REJECTED,
    actorId: adminId,
    details: { reason }
  });

  return { success: true };
}

export const STAFF_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CORE_TEAM: 'CORE_TEAM',
  GATE_STAFF: 'GATE_STAFF',
  USER: 'USER',
};

export const SUPER_ADMIN_EMAILS = [
  'udaykiranvempati123@gmail.com',
  'balaram777.ch@gmail.com',
];

export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((e) => e.toLowerCase() === clean);
};

export function normalizeRole(role) {
  if (!role) return STAFF_ROLES.USER;
  const upper = String(role).trim().toUpperCase().replace(/[- ]/g, '_');
  if (upper === 'SUPER_ADMIN' || upper === 'SUPERADMIN') return STAFF_ROLES.SUPER_ADMIN;
  if (upper === 'ADMIN' || upper === 'FULL_ADMINISTRATOR' || upper === 'WING_ADMIN') return STAFF_ROLES.ADMIN;
  if (upper === 'CORE_TEAM' || upper === 'CORETEAM') return STAFF_ROLES.CORE_TEAM;
  if (upper === 'GATE_STAFF' || upper === 'SECURITY' || upper === 'VOLUNTEER') return STAFF_ROLES.GATE_STAFF;
  return STAFF_ROLES.USER;
}

/**
 * Fetch and verify staff profile and privileges for a Firebase user.
 * Validates against super admin allowlist, staff collection, and admins collection.
 */
export async function getStaffProfile(firebaseUser) {
  if (!firebaseUser) {
    return {
      isAuthenticated: false,
      isStaff: false,
      role: STAFF_ROLES.USER,
      active: false,
      permissions: { gatePassScan: false, gatePassCheckIn: false, allowEntry: false },
    };
  }

  const userEmail = (firebaseUser.email || '').toLowerCase().trim();
  const uid = firebaseUser.uid;

  // 1. Authoritative Super Admin check by email allowlist
  if (isSuperAdminEmail(userEmail)) {
    const superStaff = {
      uid,
      name: firebaseUser.displayName || 'Super Administrator',
      email: userEmail,
      role: STAFF_ROLES.SUPER_ADMIN,
      active: true,
      isAuthenticated: true,
      isStaff: true,
      permissions: {
        gatePassScan: true,
        gatePassCheckIn: true,
        allowEntry: true,
        staffManagement: true,
        auditLogView: true,
      },
    };
    try {
      const staffRef = doc(db, 'staff', uid);
      await setDoc(staffRef, {
        uid,
        name: superStaff.name,
        email: userEmail,
        role: STAFF_ROLES.SUPER_ADMIN,
        active: true,
        permissions: superStaff.permissions,
        lastActiveAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Super admin staff sync note:', err.message);
    }
    return superStaff;
  }

  // 2. Check 'staff' collection by uid
  try {
    const staffRef = doc(db, 'staff', uid);
    const staffSnap = await getDoc(staffRef);
    if (staffSnap.exists()) {
      const data = staffSnap.data();
      const normRole = normalizeRole(data.role);
      const isActive = data.active !== false;
      const isAuthorizedRole = ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM', 'GATE_STAFF'].includes(normRole);

      if (isActive && isAuthorizedRole) {
        return {
          uid,
          name: data.name || firebaseUser.displayName || 'Staff Member',
          email: userEmail,
          role: normRole,
          active: isActive,
          isAuthenticated: true,
          isStaff: true,
          permissions: {
            gatePassScan: true,
            gatePassCheckIn: true,
            allowEntry: true,
            staffManagement: normRole === STAFF_ROLES.SUPER_ADMIN,
            auditLogView: normRole === STAFF_ROLES.SUPER_ADMIN || normRole === STAFF_ROLES.ADMIN,
            ...data.permissions,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Staff UID lookup note:', err.message);
  }

  // 3. Check 'admins' collection by uid
  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);
    if (adminSnap.exists()) {
      const data = adminSnap.data();
      const normRole = normalizeRole(data.role);
      const isActive = data.status !== 'inactive';
      const isAuthorizedRole = ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM', 'GATE_STAFF'].includes(normRole);

      if (isActive && isAuthorizedRole) {
        return {
          uid,
          name: data.fullName || data.displayName || firebaseUser.displayName || 'Administrator',
          email: userEmail,
          role: normRole,
          active: isActive,
          isAuthenticated: true,
          isStaff: true,
          permissions: {
            gatePassScan: true,
            gatePassCheckIn: true,
            allowEntry: true,
            staffManagement: normRole === STAFF_ROLES.SUPER_ADMIN,
            auditLogView: true,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Admin UID lookup note:', err.message);
  }

  // 4. Fallback search by email in 'staff' collection
  try {
    const qStaff = query(collection(db, 'staff'), where('email', '==', userEmail));
    const qStaffSnap = await getDocs(qStaff);
    if (!qStaffSnap.empty) {
      const data = qStaffSnap.docs[0].data();
      const normRole = normalizeRole(data.role);
      const isActive = data.active !== false;
      const isAuthorizedRole = ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM', 'GATE_STAFF'].includes(normRole);

      if (isActive && isAuthorizedRole) {
        return {
          uid,
          name: data.name || firebaseUser.displayName || 'Staff Member',
          email: userEmail,
          role: normRole,
          active: isActive,
          isAuthenticated: true,
          isStaff: true,
          permissions: {
            gatePassScan: true,
            gatePassCheckIn: true,
            allowEntry: true,
            staffManagement: normRole === STAFF_ROLES.SUPER_ADMIN,
            auditLogView: true,
            ...data.permissions,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Staff email lookup note:', err.message);
  }

  // 5. Fallback search by email in 'admins' collection
  try {
    const qAdmin = query(collection(db, 'admins'), where('email', '==', userEmail));
    const qAdminSnap = await getDocs(qAdmin);
    if (!qAdminSnap.empty) {
      const data = qAdminSnap.docs[0].data();
      const normRole = normalizeRole(data.role);
      const isActive = data.status !== 'inactive';
      const isAuthorizedRole = ['SUPER_ADMIN', 'ADMIN', 'CORE_TEAM', 'GATE_STAFF'].includes(normRole);

      if (isActive && isAuthorizedRole) {
        return {
          uid,
          name: data.fullName || firebaseUser.displayName || 'Administrator',
          email: userEmail,
          role: normRole,
          active: isActive,
          isAuthenticated: true,
          isStaff: true,
          permissions: {
            gatePassScan: true,
            gatePassCheckIn: true,
            allowEntry: true,
            staffManagement: normRole === STAFF_ROLES.SUPER_ADMIN,
            auditLogView: true,
          },
        };
      }
    }
  } catch (err) {
    console.warn('Admin email lookup note:', err.message);
  }

  // 6. Default to Attendee (USER) - No gate check-in privileges
  return {
    uid,
    name: firebaseUser.displayName || 'Attendee',
    email: userEmail,
    role: STAFF_ROLES.USER,
    active: true,
    isAuthenticated: true,
    isStaff: false,
    permissions: { gatePassScan: false, gatePassCheckIn: false, allowEntry: false },
  };
}

/**
 * Record a dedicated Gate Pass audit log entry.
 * Logs to both 'gate_pass_audits' and 'audit_logs'.
 */
export async function recordGatePassAudit({
  registrationId,
  gatePassId,
  action = 'CHECK_IN',
  attendeeUid = null,
  staffUid = 'anonymous',
  staffName = 'Staff Member',
  staffRole = 'CORE_TEAM',
  result = 'SUCCESS',
  reason = null,
  details = {},
}) {
  const payload = {
    registrationId: registrationId || 'unknown',
    gatePassId: gatePassId || 'unknown',
    action,
    attendeeUid: attendeeUid || null,
    staffUid,
    staffName,
    staffRole,
    result,
    reason: reason || null,
    details,
    timestamp: serverTimestamp(),
    createdAt: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, 'gate_pass_audits'), payload);
  } catch (err) {
    console.warn('Failed to record gate_pass_audits:', err.message);
  }

  try {
    await addDoc(collection(db, 'gatePassAudit'), payload);
  } catch {}

  try {
    await addDoc(collection(db, 'audit_logs'), {
      ...payload,
      actorId: staffUid,
    });
  } catch {}
}

/**
 * Gate Staff: Verify an incoming Gate Pass Token.
 * Returns full verification status payload and records scan event.
 */
export async function verifyGatePassToken(token, staffInfo = null) {
  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      status: 'INVALID',
      error: 'Malformed or missing gate pass token.',
    };
  }

  const cleanToken = token.trim();
  const passDocRef = doc(db, 'gate_passes', cleanToken);
  const snap = await getDoc(passDocRef);

  const staffId = staffInfo?.uid || 'staff_scanner';

  if (!snap.exists()) {
    // Attempt fallback query by token if docId wasn't token
    const q = query(collection(db, 'gate_passes'), where('gatePassToken', '==', cleanToken));
    const querySnap = await getDocs(q);
    if (querySnap.empty) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        error: 'QR code could not be verified. Gate pass record does not exist.',
      };
    }
    const record = querySnap.docs[0].data();
    return processPassRecord(record, cleanToken, staffInfo);
  }

  const record = snap.data();
  return processPassRecord(record, cleanToken, staffInfo);
}

function processPassRecord(record, token, staffInfo) {
  const staffId = staffInfo?.uid || 'staff_scanner';
  const staffName = staffInfo?.name || 'Staff Member';
  const staffRole = staffInfo?.role || 'CORE_TEAM';

  // Audit scan event
  recordGatePassAudit({
    registrationId: record.registrationNumber || record.registrationId || 'unknown',
    gatePassId: token,
    action: AUDIT_ACTIONS.GATE_PASS_SCANNED,
    attendeeUid: record.userId || null,
    staffUid: staffId,
    staffName,
    staffRole,
    result: 'SCANNED',
    details: { token }
  });

  // Check 1: Cancelled
  if (record.gatePassStatus === GATE_PASS_STATUS.CANCELLED) {
    return {
      isValid: false,
      status: 'CANCELLED',
      error: 'This Gate Pass has been cancelled or revoked by administration.',
      data: record,
    };
  }

  // Check 2: Payment not verified
  if (record.paymentStatus !== PAYMENT_STATUS.VERIFIED) {
    return {
      isValid: false,
      status: 'PAYMENT_NOT_VERIFIED',
      error: 'Payment for this registration has not been verified by the fest committee.',
      data: record,
    };
  }

  // Check 3: Already Used / Double Check-In
  if (record.checkedIn || record.gatePassStatus === GATE_PASS_STATUS.USED) {
    const checkInTime = record.checkedInAt?.seconds
      ? new Date(record.checkedInAt.seconds * 1000).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : record.checkedInAt
      ? new Date(record.checkedInAt).toLocaleString('en-IN')
      : 'Earlier';

    return {
      isValid: false,
      status: 'ALREADY_USED',
      error: 'GATE PASS ALREADY USED. This QR has already been used for event entry.',
      data: record,
      checkedInAt: checkInTime,
      checkedInBy: record.checkedInByName || record.checkedInBy || 'Authorized Staff',
      checkedInByRole: record.checkedInByRole || 'STAFF',
    };
  }

  // Valid and Ready for Check-In
  if (record.gatePassStatus === GATE_PASS_STATUS.ISSUED) {
    return {
      isValid: true,
      status: 'VALID',
      data: record,
    };
  }

  return {
    isValid: false,
    status: 'UNKNOWN_STATUS',
    error: 'Unrecognized gate pass status: ' + record.gatePassStatus,
    data: record,
  };
}

/**
 * Gate Staff: Atomic Check-in Execution.
 * Guarantees race-condition protection: even if two devices scan simultaneously,
 * only one entry is granted via an atomic Firestore transaction.
 */
export async function checkInGatePass(token, staffInfo) {
  if (!token) {
    throw new Error('Token is required for gate check-in.');
  }

  if (!staffInfo || !staffInfo.isAuthenticated || !staffInfo.isStaff) {
    throw new Error('ACCESS_DENIED: Only authenticated, authorized SAMYAK staff may authorize entry.');
  }

  const cleanToken = token.trim();
  const passDocRef = doc(db, 'gate_passes', cleanToken);

  let targetRegistrationId = null;
  let attendeeName = '';
  let attendeeRoll = '';
  let ticketType = '';
  let attendeeCollege = '';
  let attendeeUid = null;

  try {
    const result = await runTransaction(db, async (transaction) => {
      const passSnap = await transaction.get(passDocRef);
      if (!passSnap.exists()) {
        throw new Error('INVALID_GATE_PASS: Gate pass record does not exist.');
      }

      const data = passSnap.data();
      targetRegistrationId = data.registrationId || data.registrationNumber;
      attendeeName = data.name;
      attendeeRoll = data.rollNo;
      ticketType = data.ticketType;
      attendeeCollege = data.university;
      attendeeUid = data.userId || null;

      // Verify conditions atomically
      if (data.gatePassStatus === GATE_PASS_STATUS.CANCELLED) {
        throw new Error('CANCELLED: Gate pass has been revoked.');
      }
      if (data.paymentStatus !== PAYMENT_STATUS.VERIFIED) {
        throw new Error('PAYMENT_NOT_VERIFIED: Payment has not been verified.');
      }
      if (data.checkedIn || data.gatePassStatus === GATE_PASS_STATUS.USED) {
        const checkInTime = data.checkedInAt?.seconds 
          ? new Date(data.checkedInAt.seconds * 1000).toLocaleTimeString() 
          : 'earlier';
        const authorizer = data.checkedInByName || 'Authorized Staff';
        throw new Error(`ALREADY_USED: This Gate Pass has already been used for event entry at ${checkInTime} by ${authorizer}.`);
      }

      // Atomic update
      const now = serverTimestamp();
      transaction.update(passDocRef, {
        checkedIn: true,
        checkedInAt: now,
        checkedInBy: staffInfo.uid,
        checkedInByName: staffInfo.name || 'Authorized Staff',
        checkedInByRole: staffInfo.role || 'CORE_TEAM',
        gatePassStatus: GATE_PASS_STATUS.USED,
        updatedAt: now,
      });

      return {
        success: true,
        registrationNumber: data.registrationNumber || data.registrationId,
        name: data.name,
        ticketType: data.ticketType,
        university: data.university,
        rollNo: data.rollNo,
      };
    });

    // Sync registrations collection
    if (targetRegistrationId) {
      try {
        const regRef = doc(db, 'registrations', targetRegistrationId);
        await updateDoc(regRef, {
          'gatePass.status': GATE_PASS_STATUS.USED,
          'gatePass.checkedIn': true,
          'gatePass.checkedInAt': serverTimestamp(),
          'gatePass.checkedInBy': staffInfo.uid,
          'gatePass.checkedInByName': staffInfo.name || 'Authorized Staff',
          'gatePass.checkedInByRole': staffInfo.role || 'CORE_TEAM',
          updatedAt: serverTimestamp(),
        });
      } catch (syncErr) {
        console.warn('Registration check-in sync note:', syncErr.message);
      }
    }

    // Record success audit log
    await recordGatePassAudit({
      registrationId: result.registrationNumber,
      gatePassId: cleanToken,
      action: 'CHECK_IN',
      attendeeUid,
      staffUid: staffInfo.uid,
      staffName: staffInfo.name || 'Authorized Staff',
      staffRole: staffInfo.role || 'CORE_TEAM',
      result: 'SUCCESS',
      details: {
        ticketType,
        attendeeName,
      },
    });

    return result;
  } catch (error) {
    // Record denied audit log if appropriate
    if (error.message.includes('ALREADY_USED') || error.message.includes('PAYMENT_NOT_VERIFIED') || error.message.includes('CANCELLED')) {
      await recordGatePassAudit({
        registrationId: targetRegistrationId || 'unknown',
        gatePassId: cleanToken,
        action: 'CHECK_IN_DENIED',
        attendeeUid,
        staffUid: staffInfo.uid,
        staffName: staffInfo.name || 'Authorized Staff',
        staffRole: staffInfo.role || 'CORE_TEAM',
        result: 'DENIED',
        reason: error.message,
      });
    }
    throw error;
  }
}

/**
 * Real-time listener for attendee registration / payment gate pass status.
 */
export function listenToRegistrationPass(registrationId, uid, onUpdate, onError) {
  if (!registrationId || !uid) return () => {};

  const cleanId = registrationId.trim();

  // Firestore rules only allow attendees to read their own payments, and gate
  // passes only by token, so scope the query to the caller's uid and resolve
  // the pass through the token stored on the payment record.
  const payQ = query(
    collection(db, 'payments'),
    where('registrationId', '==', cleanId),
    where('userId', '==', uid)
  );

  let unsubPass = null;
  const unsubPay = onSnapshot(payQ, (paySnap) => {
    if (paySnap.empty) return;
    const payment = paySnap.docs[0].data();

    if (unsubPass) {
      unsubPass();
      unsubPass = null;
    }

    if (!payment.gatePassToken) {
      onUpdate(payment);
      return;
    }

    unsubPass = onSnapshot(doc(db, 'gate_passes', payment.gatePassToken), (passSnap) => {
      onUpdate(passSnap.exists() ? passSnap.data() : payment);
    }, onError);
  }, onError);

  return () => {
    unsubPay();
    if (unsubPass) unsubPass();
  };
}

/**
 * Real-time listener for recent Gate Check-ins (live feed for Staff Panel).
 */
export function listenToRecentCheckIns(callback, maxCount = 20) {
  const q = query(
    collection(db, 'gate_passes'),
    where('checkedIn', '==', true),
    orderBy('checkedInAt', 'desc'),
    limit(maxCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list);
    },
    (error) => {
      // Fallback query if composite index is pending: fetch and sort in memory
      console.warn('Recent check-ins indexed query fallback:', error.message);
      const fallbackQ = query(
        collection(db, 'gate_passes'),
        where('checkedIn', '==', true),
        limit(50)
      );
      return onSnapshot(fallbackQ, (fallbackSnap) => {
        const fallbackList = [];
        fallbackSnap.forEach((docSnap) => {
          fallbackList.push({ id: docSnap.id, ...docSnap.data() });
        });
        fallbackList.sort((a, b) => {
          const timeA = a.checkedInAt?.seconds ? a.checkedInAt.seconds * 1000 : new Date(a.checkedInAt || 0).getTime();
          const timeB = b.checkedInAt?.seconds ? b.checkedInAt.seconds * 1000 : new Date(b.checkedInAt || 0).getTime();
          return timeB - timeA;
        });
        callback(fallbackList.slice(0, maxCount));
      });
    }
  );
}

/**
 * Super Admin Staff Management: List all staff accounts.
 */
export async function listAllStaff() {
  try {
    const snap = await getDocs(collection(db, 'staff'));
    const list = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (err) {
    console.error('Failed to list staff:', err);
    return [];
  }
}

/**
 * Super Admin Staff Management: Save / Provision a Staff Member.
 */
export async function saveStaffMember({ uid, email, name, role = STAFF_ROLES.CORE_TEAM, active = true, permissions = {} }) {
  if (!email) throw new Error('Email is required for staff account.');
  const cleanEmail = email.trim().toLowerCase();
  const staffUid = uid || `staff_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const defaultPermissions = {
    gatePassScan: true,
    gatePassCheckIn: true,
    allowEntry: true,
    staffManagement: role === STAFF_ROLES.SUPER_ADMIN,
    ...permissions,
  };

  const payload = {
    uid: staffUid,
    email: cleanEmail,
    name: (name || cleanEmail.split('@')[0]).trim(),
    role: normalizeRole(role),
    active: active !== false,
    permissions: defaultPermissions,
    updatedAt: serverTimestamp(),
  };

  const staffRef = doc(db, 'staff', staffUid);
  await setDoc(staffRef, payload, { merge: true });
  return payload;
}

/**
 * Super Admin Staff Management: Toggle staff active status.
 */
export async function toggleStaffActive(staffId, active) {
  const staffRef = doc(db, 'staff', staffId);
  await updateDoc(staffRef, {
    active: !!active,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Super Admin Staff Management: Delete staff member.
 */
export async function deleteStaffMember(staffId) {
  const staffRef = doc(db, 'staff', staffId);
  await deleteDoc(staffRef);
}

