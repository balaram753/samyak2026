import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  doc, setDoc, updateDoc, serverTimestamp, 
  collection, query, where, getDocs, onSnapshot, limit, addDoc 
} from 'firebase/firestore';
import { 
  auth, db, googleProvider, microsoftProvider, signInWithPopup, signOut as fbSignOut, isKLUEmail
} from '../services/firebase';
import { uploadSecureUserFile } from '../services/storageService';
import { UserContext } from './UserContextObject';
import { PAYMENT_STATUS, GATE_PASS_STATUS, recordAuditLog } from '../services/gatePassService';
import { sanitizeText, checkRateLimit } from '../services/fileSecurityService';
import { enrollParticipant, checkExistingEnrollment } from '../services/registrationService';
import { ATTENDANCE_STATUS } from '../services/attendanceService';

/**
 * SAMYAK 2026 — Unified User & Registration Lifecycle Provider
 * 
 * Single Identity: Authenticated Firebase UID (Google Sign-In only)
 * Single Lifecycle: Google Login -> Profile -> Registration -> Payment (UTR+Proof) -> Admin Verification -> Gate Pass QR -> Atomic Check-in
 */
export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileDoc, setProfileDoc] = useState(null);
  const [registrationDoc, setRegistrationDoc] = useState(null);

  // 1. Listen to Firebase Auth State (Google Sign-In)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (!user) {
        setProfileDoc(null);
        setRegistrationDoc(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-Time Listener on users/{uid}
  useEffect(() => {
    if (!currentUser) {
      setAuthLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setProfileDoc(snap.data());
      } else {
        // Initialize minimal user doc with Google Info
        const initialDoc = {
          uid: currentUser.uid,
          name: currentUser.displayName || '',
          email: currentUser.email || '',
          studentId: '',
          mobile: '',
          college: 'KL University',
          branch: '',
          idCardUrl: null,
          avatarUrl: currentUser.photoURL || null,
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        setDoc(userDocRef, initialDoc, { merge: true }).catch(console.warn);
        setProfileDoc(initialDoc);
      }
      setAuthLoading(false);
    }, (err) => {
      console.warn('User profile listener note:', err.message);
      setAuthLoading(false);
    });

    return () => unsubUser();
  }, [currentUser]);

  // 3. Real-Time Listener on registrations (where uid == currentUser.uid)
  useEffect(() => {
    if (!currentUser) return;

    const regQuery = query(
      collection(db, 'registrations'),
      where('uid', '==', currentUser.uid),
      limit(1)
    );

    const unsubReg = onSnapshot(regQuery, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setRegistrationDoc({ id: docSnap.id, ...docSnap.data() });
      } else {
        setRegistrationDoc(null);
      }
    }, (err) => {
      console.warn('Registration listener note:', err.message);
    });

    return () => unsubReg();
  }, [currentUser]);

  // Unified reactive userData combining profile + registration
  const userData = useMemo(() => {
    const email = currentUser?.email || profileDoc?.email || '';
    const name = profileDoc?.name || currentUser?.displayName || 'SAMYAK Attendee';
    const studentId = profileDoc?.studentId || '';
    const mobile = profileDoc?.mobile || '';
    const college = profileDoc?.college || 'KL University';
    const branch = profileDoc?.branch || '';
    const idCardUrl = profileDoc?.idCardUrl || null;
    const avatarUrl = profileDoc?.avatarUrl || currentUser?.photoURL || null;
    const profileCompleted = Boolean(profileDoc?.profileCompleted && studentId && mobile);

    const regId = registrationDoc?.registrationId || registrationDoc?.id || '';
    const tier = registrationDoc?.tier || 'PAY EVENT FEE & PASS';
    const category = registrationDoc?.category || profileDoc?.category || null;
    const categoryVerificationStatus = registrationDoc?.categoryVerificationStatus || profileDoc?.categoryVerificationStatus || null;
    const payment = registrationDoc?.payment || {
      status: PAYMENT_STATUS.PENDING_PAYMENT,
      amount: 499,
      currency: 'INR',
      utr: null,
      screenshotUrl: null,
      submittedAt: null,
      verifiedAt: null,
      verifiedBy: null
    };
    const gatePass = registrationDoc?.gatePass || {
      status: GATE_PASS_STATUS.NOT_ISSUED,
      token: null,
      issuedAt: null,
      checkedIn: false,
      checkedInAt: null
    };
    const attendance = registrationDoc?.attendance || {
      status: ATTENDANCE_STATUS.NOT_MARKED,
      markedAt: null,
      markedBy: null,
    };
    const isInternalParticipant = category === 'INTERNAL';
    const isExternalParticipant = category === 'EXTERNAL';

    return {
      uid: currentUser?.uid || null,
      name,
      email,
      studentId,
      rollNo: studentId, // compatibility alias
      mobile,
      phone: mobile,     // compatibility alias
      college,
      university: college, // compatibility alias
      branch,
      idCardUrl,
      collegeIdCardUrl: idCardUrl, // compatibility alias
      avatarUrl,
      profileCompleted,
      isStudentVerified: Boolean(idCardUrl),
      registrationId: regId,
      tier,
      passTier: tier,
      category,
      categoryVerificationStatus,
      isInternalParticipant,
      isExternalParticipant,
      registrationStatus: registrationDoc?.registrationStatus || (regId ? 'REGISTERED' : 'UNREGISTERED'),
      payment,
      paymentStatus: payment.status,
      gatePass,
      gatePassStatus: gatePass.status,
      gatePassToken: gatePass.token,
      attendance,
      attendanceStatus: attendance.status,
      registeredEvents: registrationDoc?.registeredEvents || []
    };
  }, [currentUser, profileDoc, registrationDoc]);

  // Auth Action: Google Sign-In (for External participants & admins)
  const loginWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }, []);

  // Auth Action: Microsoft Sign-In (for KL University Internal students)
  const loginWithMicrosoft = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const user = result.user;
      // Auto-detect KL University email
      const kluUser = isKLUEmail(user.email);
      // Store provider hint on the user doc for category pre-selection
      if (user.uid) {
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || '',
          email: user.email || '',
          authProvider: 'microsoft',
          suggestedCategory: kluUser ? 'INTERNAL' : null,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch(console.warn);
      }
      return { user, isKLUEmail: kluUser };
    } catch (error) {
      console.error('Microsoft Sign-In Error:', error);
      throw error;
    }
  }, []);

  // Auth Action: Sign Out
  const logout = useCallback(async () => {
    try {
      await fbSignOut(auth);
      setCurrentUser(null);
      setProfileDoc(null);
      setRegistrationDoc(null);
      localStorage.removeItem('samyak_user_data');
      localStorage.removeItem('samyak_student_session');
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  }, []);

  // Profile Action: Complete or Update Profile Details (Now including editable Name)
  const completeProfile = useCallback(async ({ name, studentId, mobile, college, branch, idCardUrl }) => {
    if (!currentUser) throw new Error('Authentication required.');

    const cleanName = sanitizeText(name || currentUser.displayName || '').trim();
    const cleanStudentId = sanitizeText(studentId || '').trim();
    const cleanMobile = sanitizeText(mobile || '').trim();
    const cleanCollege = sanitizeText(college || 'KL University').trim();
    const cleanBranch = sanitizeText(branch || '').trim();

    if (!cleanName) throw new Error('Full Name is required.');
    if (!cleanStudentId) throw new Error('Student ID / Roll Number is required.');
    if (!cleanMobile || cleanMobile.length < 8) throw new Error('Valid Mobile Number is required.');

    const userDocRef = doc(db, 'users', currentUser.uid);
    const updates = {
      name: cleanName,
      studentId: cleanStudentId,
      mobile: cleanMobile,
      college: cleanCollege,
      branch: cleanBranch,
      profileCompleted: true,
      updatedAt: serverTimestamp(),
    };

    if (idCardUrl) {
      updates.idCardUrl = idCardUrl;
    }

    await setDoc(userDocRef, updates, { merge: true });

    // If an existing registration exists, sync the updated contact details and name
    if (registrationDoc?.id) {
      const regRef = doc(db, 'registrations', registrationDoc.id);
      await updateDoc(regRef, {
        name: cleanName,
        studentId: cleanStudentId,
        mobile: cleanMobile,
        college: cleanCollege,
        branch: cleanBranch,
        updatedAt: serverTimestamp(),
      }).catch(console.warn);
    }

    return updates;
  }, [currentUser, registrationDoc]);

  // Storage Action: Upload College ID Card
  const uploadCollegeIdCard = useCallback(async (file) => {
    if (!currentUser) throw new Error('Authentication required: Sign in with Google to upload ID card.');

    const uploadRes = await uploadSecureUserFile(file, 'id_cards', currentUser.uid);
    const userDocRef = doc(db, 'users', currentUser.uid);

    await updateDoc(userDocRef, {
      idCardUrl: uploadRes.url,
      updatedAt: serverTimestamp(),
    }).catch(async () => {
      await setDoc(userDocRef, { idCardUrl: uploadRes.url, updatedAt: serverTimestamp() }, { merge: true });
    });

    return uploadRes.url;
  }, [currentUser]);

  // Registration Action: Create or Update Fest Registration
  const createRegistration = useCallback(async ({ tier = 'PAY EVENT FEE & PASS', eventId = 'samyak-fest-2026', amount = 499 }) => {
    if (!currentUser) throw new Error('Authentication required.');

    const regId = registrationDoc?.registrationId || `SMYK-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const regRef = doc(db, 'registrations', regId);

    const record = {
      registrationId: regId,
      uid: currentUser.uid,
      eventId,
      name: userData.name,
      email: userData.email,
      studentId: userData.studentId,
      mobile: userData.mobile,
      college: userData.college,
      branch: userData.branch,
      registrationStatus: 'REGISTERED',
      tier: tier || 'PAY EVENT FEE & PASS',
      payment: {
        status: registrationDoc?.payment?.status || PAYMENT_STATUS.PENDING_PAYMENT,
        amount: Number(amount) || 499,
        currency: 'INR',
        utr: registrationDoc?.payment?.utr || null,
        screenshotUrl: registrationDoc?.payment?.screenshotUrl || null,
        submittedAt: registrationDoc?.payment?.submittedAt || null,
        verifiedAt: registrationDoc?.payment?.verifiedAt || null,
        verifiedBy: registrationDoc?.payment?.verifiedBy || null,
        rejectionReason: null
      },
      gatePass: {
        status: registrationDoc?.gatePass?.status || GATE_PASS_STATUS.NOT_ISSUED,
        token: registrationDoc?.gatePass?.token || null,
        issuedAt: registrationDoc?.gatePass?.issuedAt || null,
        checkedIn: false,
        checkedInAt: null
      },
      createdAt: registrationDoc?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(regRef, record, { merge: true });
    return record;
  }, [currentUser, userData, registrationDoc]);

  // Payment Action: Submit UTR + Screenshot Proof
  const submitPaymentProof = useCallback(async (params = {}) => {
    const activeUser = currentUser || auth.currentUser;
    if (!activeUser) {
      throw new Error('Authentication required: Sign in with Google to submit payment proof.');
    }

    const rawUtr = params.utr || params.utrId || '';
    const cleanUtr = sanitizeText(rawUtr).trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      throw new Error('Please enter a valid 10 to 16 alphanumeric UPI Transaction / UTR ID.');
    }

    // Rate Limiting on submissions
    try {
      checkRateLimit(`pay_submit_${activeUser.uid}`, 8, 60000);
    } catch (rlErr) {
      console.warn('Rate limit warning:', rlErr.message);
    }

    // Anti-Fraud: Check for duplicate UTR in registrations collection
    try {
      const dupQuery = query(
        collection(db, 'registrations'),
        where('payment.utr', '==', cleanUtr),
        limit(1)
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        const dupData = dupSnap.docs[0].data();
        if (dupData.uid !== activeUser.uid) {
          throw new Error('This UPI UTR ID has already been recorded in the database. Duplicate submissions are strictly prohibited.');
        }
      }
    } catch (dupErr) {
      if (dupErr.message && dupErr.message.includes('strictly prohibited')) {
        throw dupErr;
      }
      console.warn('Duplicate check warning:', dupErr.message);
    }

    // 1. Ensure registration exists
    const regId = registrationDoc?.registrationId || params.registrationId || `SMYK-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Resolve Screenshot URL (Use Cloudflare URL if already uploaded, or upload to Cloudflare R2 now)
    let finalScreenshotUrl = params.screenshotUrl || params.paymentScreenshotUrl || null;
    if (!finalScreenshotUrl && params.screenshotFile) {
      const uploadRes = await uploadSecureUserFile(
        params.screenshotFile,
        'payment_proofs',
        activeUser.uid,
        regId
      );
      finalScreenshotUrl = uploadRes.url;
    }

    if (!finalScreenshotUrl) {
      throw new Error('Please upload your UPI payment confirmation screenshot.');
    }

    // 3. Resolve College ID Card URL
    const finalClgIdUrl = params.clgIdPicUrl || params.idCardUrl || userData.idCardUrl || null;
    if (params.clgIdPicUrl && activeUser.uid) {
      const userDocRef = doc(db, 'users', activeUser.uid);
      setDoc(userDocRef, { idCardUrl: params.clgIdPicUrl, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
    }

    const tier = params.tier || 'PAY EVENT FEE & PASS';
    const amount = Number(params.amount) || 499;

    // 4. Update registrations/{regId}
    const regRef = doc(db, 'registrations', regId);
    const paymentUpdate = {
      status: PAYMENT_STATUS.PENDING_VERIFICATION,
      amount,
      currency: 'INR',
      utr: cleanUtr,
      screenshotUrl: finalScreenshotUrl,
      submittedAt: serverTimestamp(),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    await setDoc(regRef, {
      registrationId: regId,
      uid: activeUser.uid,
      eventId: 'samyak-fest-2026',
      name: params.name || userData.name || activeUser.displayName || 'SAMYAK Attendee',
      email: params.email || userData.email || activeUser.email || '',
      studentId: params.rollNo || params.studentId || userData.studentId || '',
      mobile: params.phone || params.mobile || userData.mobile || '',
      college: params.university || params.college || userData.college || 'KL University',
      branch: params.branch || userData.branch || '',
      idCardUrl: finalClgIdUrl,
      registrationStatus: 'REGISTERED',
      tier,
      payment: paymentUpdate,
      gatePass: {
        status: GATE_PASS_STATUS.NOT_ISSUED,
        token: null,
        issuedAt: null,
        checkedIn: false,
        checkedInAt: null
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // 5. Sync to 'payments' collection for immediate admin dashboard visibility
    try {
      await addDoc(collection(db, 'payments'), {
        userId: activeUser.uid,
        name: params.name || userData.name || activeUser.displayName || '',
        email: params.email || userData.email || activeUser.email || '',
        phone: params.phone || params.mobile || userData.mobile || '',
        rollNo: params.rollNo || params.studentId || userData.studentId || '',
        university: params.university || params.college || userData.college || 'KL University',
        utrId: cleanUtr,
        transactionId: cleanUtr,
        tier,
        amount,
        registrationId: regId,
        registrationNumber: regId,
        clgIdPicUrl: finalClgIdUrl,
        paymentScreenshotUrl: finalScreenshotUrl,
        paymentStatus: PAYMENT_STATUS.PENDING_VERIFICATION,
        gatePassStatus: GATE_PASS_STATUS.NOT_ISSUED,
        gatePassToken: null,
        timestamp: serverTimestamp(),
        date: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Sync to payments collection notice:', e.message);
    }

    // 6. Audit Log
    try {
      await recordAuditLog({
        registrationId: regId,
        action: 'PAYMENT_SUBMITTED',
        actorId: activeUser.email || activeUser.uid,
        details: {
          registrationId: regId,
          utr: cleanUtr,
          amount,
          tier
        }
      });
    } catch (logErr) {
      console.warn('Audit log notice:', logErr.message);
    }

    return { success: true, registrationId: regId };
  }, [currentUser, userData, registrationDoc]);

  // Backward compatibility alias for updatePayment in PaymentPortal
  const updatePayment = submitPaymentProof;

  const value = {
    currentUser,
    authLoading,
    userData,
    isRegistered: Boolean(userData.registrationId),
    isProfileComplete: userData.profileCompleted,
    loginWithGoogle,
    loginWithMicrosoft,
    logout,
    completeProfile,
    uploadCollegeIdCard,
    createRegistration,
    enrollParticipant,       // new: full enrollment via registrationService
    checkExistingEnrollment, // new: check for duplicate enrollment
    submitPaymentProof,
    updatePayment,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
