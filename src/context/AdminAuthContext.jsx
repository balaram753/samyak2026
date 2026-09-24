import { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  db 
} from '../services/firebase';

export const SUPER_ADMIN_EMAILS = [
  'udaykiranvempati123@gmail.com',
  'balaram777.ch@gmail.com',
];

export const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];

export const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some((adminEmail) => adminEmail.toLowerCase() === cleanEmail);
};

const getSuperAdminUsername = (email) => {
  if (!email) return 'superadmin';
  const cleanEmail = email.toLowerCase();
  if (cleanEmail === 'udaykiranvempati123@gmail.com') return 'udaykiran.superadmin';
  if (cleanEmail === 'balaram777.ch@gmail.com') return 'balaram.superadmin';
  const prefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  return `${prefix}.superadmin`;
};

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('samyak_admin_session') === 'true';
  });
  const [adminRole, setAdminRole] = useState(() => {
    return localStorage.getItem('samyak_admin_role') || 'admin';
  });
  const [adminLoading, setAdminLoading] = useState(true);

  // Derive isSuperAdmin boolean
  const isSuperAdmin = (
    isSuperAdminEmail(adminUser?.email) ||
    adminRole === 'super_admin'
  );

  // Granular Role-Based Access Control
  const canVerifyPayments = isSuperAdmin || ['super_admin', 'admin', 'wing_admin'].includes(adminRole);
  const canViewSensitiveProofs = isSuperAdmin || ['super_admin', 'admin'].includes(adminRole);
  const canCheckInGate = isSuperAdmin || ['super_admin', 'admin', 'gate_staff', 'security', 'volunteer'].includes(adminRole);
  const isGateStaffOnly = adminRole === 'gate_staff' || adminRole === 'security';

  // Initialize session from localStorage or Firebase Auth
  useEffect(() => {
    const savedCustomSession = localStorage.getItem('samyak_custom_admin_user');
    if (savedCustomSession) {
      try {
        const parsed = JSON.parse(savedCustomSession);
        setAdminUser(parsed);
        setIsAdmin(true);
        setAdminRole(parsed.role || 'admin');
      } catch (e) {
        console.warn('Session parse note:', e);
      }
    }

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userEmail = firebaseUser.email ? firebaseUser.email.toLowerCase() : '';
        const isMaster = isSuperAdminEmail(userEmail);

        if (isMaster) {
          const defaultUsername = getSuperAdminUsername(userEmail);
          setIsAdmin(true);
          setAdminRole('super_admin');
          setAdminUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Super Administrator',
            photoURL: firebaseUser.photoURL,
            role: 'super_admin',
            wing: 'Core Directorate',
            username: defaultUsername,
            isSuperAdmin: true,
          });
          localStorage.setItem('samyak_admin_session', 'true');
          localStorage.setItem('samyak_admin_role', 'super_admin');

          // Ensure master admin doc exists in Firestore
          try {
            const adminDocRef = doc(db, 'admins', firebaseUser.uid);
            await setDoc(adminDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Super Administrator',
              fullName: firebaseUser.displayName || 'Super Administrator',
              username: defaultUsername,
              role: 'super_admin',
              wing: 'Core Directorate',
              status: 'active',
              lastLogin: serverTimestamp(),
            }, { merge: true });
          } catch (e) {
            console.warn('Super admin sync note:', e);
          }
        } else {
          // Check if Google user is a provisioned sub-admin
          try {
            const emailQuery = query(collection(db, 'admins'), where('email', '==', firebaseUser.email));
            const querySnap = await getDocs(emailQuery);

            if (!querySnap.empty) {
              const adminData = querySnap.docs[0].data();
              setIsAdmin(true);
              setAdminRole(adminData.role || 'admin');
              setAdminUser({
                uid: firebaseUser.uid,
                docId: querySnap.docs[0].id,
                email: firebaseUser.email,
                displayName: adminData.fullName || firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: adminData.role || 'admin',
                wing: adminData.wing || 'Wing Admin',
                club: adminData.club || '',
                username: adminData.username || '',
                isSuperAdmin: false,
              });
              localStorage.setItem('samyak_admin_session', 'true');
              localStorage.setItem('samyak_admin_role', adminData.role || 'admin');
            } else {
              // A localStorage flag is user-controlled and must never grant admin.
              setIsAdmin(false);
              localStorage.removeItem('samyak_admin_session');
              localStorage.removeItem('samyak_admin_role');
            }
          } catch (err) {
            console.warn('Admin status check note:', err);
          }
        }
      } else if (!savedCustomSession) {
        setIsAdmin(false);
        setAdminUser(null);
        localStorage.removeItem('samyak_admin_session');
        localStorage.removeItem('samyak_admin_role');
      }
      setAdminLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google Sign-In for Admin / Super Admin
  const loginAdminWithGoogle = async () => {
    setAdminLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = user.email ? user.email.toLowerCase() : '';
      const isMaster = isSuperAdminEmail(userEmail);

      if (isMaster) {
        const defaultUsername = getSuperAdminUsername(userEmail);
        const adminData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Super Administrator',
          fullName: user.displayName || 'Super Administrator',
          username: defaultUsername,
          photoURL: user.photoURL,
          role: 'super_admin',
          wing: 'Core Directorate',
          isSuperAdmin: true,
        };

        // Sync to Firestore
        try {
          const adminDocRef = doc(db, 'admins', user.uid);
          await setDoc(adminDocRef, {
            ...adminData,
            status: 'active',
            lastLogin: serverTimestamp(),
          }, { merge: true });
        } catch (err) {
          console.warn('Superadmin Firestore sync note:', err);
        }

        setIsAdmin(true);
        setAdminRole('super_admin');
        setAdminUser(adminData);
        localStorage.setItem('samyak_admin_session', 'true');
        localStorage.setItem('samyak_admin_role', 'super_admin');
        localStorage.setItem('samyak_custom_admin_user', JSON.stringify(adminData));
        return adminData;
      }

      // Check if sub-admin is authorized
      const emailQuery = query(collection(db, 'admins'), where('email', '==', user.email));
      const querySnap = await getDocs(emailQuery);

      if (!querySnap.empty) {
        const data = querySnap.docs[0].data();
        const adminData = {
          uid: user.uid,
          docId: querySnap.docs[0].id,
          email: user.email,
          displayName: data.fullName || user.displayName,
          fullName: data.fullName || user.displayName,
          username: data.username || '',
          photoURL: user.photoURL,
          role: data.role || 'admin',
          wing: data.wing || 'Wing Admin',
          club: data.club || '',
          isSuperAdmin: false,
        };

        setIsAdmin(true);
        setAdminRole(data.role || 'admin');
        setAdminUser(adminData);
        localStorage.setItem('samyak_admin_session', 'true');
        localStorage.setItem('samyak_admin_role', data.role || 'admin');
        localStorage.setItem('samyak_custom_admin_user', JSON.stringify(adminData));
        return adminData;
      } else {
        await fbSignOut(auth);
        throw new Error(`Access Denied: ${user.email} is not authorized as an administrator.`);
      }
    } catch (error) {
      console.error('Admin Google Sign-In Error:', error);
      throw error;
    } finally {
      setAdminLoading(false);
    }
  };

  // Sub-Administrator Passcode Login (Username / Email + 6-digit PIN)
  const loginAdminWithPasscode = async (identifier, passcode) => {
    setAdminLoading(true);
    try {
      const cleanIdentifier = identifier.trim().toLowerCase().replace(/^@/, '');
      const cleanPasscode = passcode.trim();

      // Check username first
      let adminQuery = query(collection(db, 'admins'), where('username', '==', cleanIdentifier));
      let querySnap = await getDocs(adminQuery);

      // If not found by username, check by email
      if (querySnap.empty) {
        adminQuery = query(collection(db, 'admins'), where('email', '==', identifier.trim().toLowerCase()));
        querySnap = await getDocs(adminQuery);
      }

      if (querySnap.empty) {
        throw new Error('No administrator account found matching this username or email.');
      }

      const adminDoc = querySnap.docs[0];
      const data = adminDoc.data();

      // Check passcode or password
      if (String(data.passcode) !== cleanPasscode) {
        throw new Error('Invalid login passcode. Please check your credentials or contact the Super Admin.');
      }

      if (data.status === 'suspended') {
        throw new Error('This administrator account has been suspended. Contact the Super Admin.');
      }

      const adminData = {
        uid: adminDoc.id,
        docId: adminDoc.id,
        email: data.email || `${cleanIdentifier}@samyak.fest`,
        displayName: data.fullName || cleanIdentifier,
        fullName: data.fullName || cleanIdentifier,
        username: data.username || cleanIdentifier,
        role: data.role || 'admin',
        wing: data.wing || 'Operations',
        club: data.club || '',
        phone: data.phone || '',
        firstLoginReset: data.firstLoginReset || 'completed',
        isSuperAdmin: data.role === 'super_admin',
      };

      // Update last login
      try {
        await updateDoc(doc(db, 'admins', adminDoc.id), {
          lastLogin: serverTimestamp(),
        });
      } catch {}

      setIsAdmin(true);
      setAdminRole(adminData.role);
      setAdminUser(adminData);
      localStorage.setItem('samyak_admin_session', 'true');
      localStorage.setItem('samyak_admin_role', adminData.role);
      localStorage.setItem('samyak_custom_admin_user', JSON.stringify(adminData));

      return {
        user: adminData,
        requiresPasswordReset: data.firstLoginReset === 'pending',
        docId: adminDoc.id,
      };
    } catch (error) {
      console.error('Passcode login error:', error);
      throw error;
    } finally {
      setAdminLoading(false);
    }
  };

  // Set new private password during first-login reset
  const updateAdminPassword = async (docId, newPassword) => {
    try {
      const adminRef = doc(db, 'admins', docId);
      await updateDoc(adminRef, {
        passcode: newPassword,
        firstLoginReset: 'completed',
        updatedAt: serverTimestamp(),
      });

      setAdminUser((prev) => prev ? ({
        ...prev,
        firstLoginReset: 'completed',
      }) : null);

      return true;
    } catch (err) {
      console.error('Password update error:', err);
      throw err;
    }
  };

  // Provision new Sub-Admin (Super Admin only)
  const provisionNewAdmin = async (newAdminData) => {
    try {
      const usernameClean = newAdminData.username.trim().toLowerCase().replace(/^@/, '');
      const docId = `admin_${usernameClean}_${Date.now().toString().slice(-4)}`;
      const adminRef = doc(db, 'admins', docId);

      const payload = {
        id: docId,
        fullName: newAdminData.fullName.trim(),
        username: usernameClean,
        email: newAdminData.email.trim().toLowerCase(),
        phone: newAdminData.phone.trim(),
        wing: newAdminData.wing || 'Technical',
        role: newAdminData.role || 'Full Administrator',
        club: newAdminData.club?.trim() || '',
        passcode: newAdminData.passcode.trim(),
        firstLoginReset: 'pending',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: adminUser?.email || SUPER_ADMIN_EMAIL,
      };

      await setDoc(adminRef, payload);
      return payload;
    } catch (err) {
      console.error('Provision admin error:', err);
      throw err;
    }
  };

  // Regenerate Passcode for an Admin (Super Admin only)
  const regenerateAdminPasscode = async (docId, newPin) => {
    try {
      const adminRef = doc(db, 'admins', docId);
      await updateDoc(adminRef, {
        passcode: newPin,
        firstLoginReset: 'pending',
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('Regenerate passcode error:', err);
      throw err;
    }
  };

  // Delete / Revoke an Admin (Super Admin only)
  const deleteAdmin = async (docId) => {
    try {
      const adminRef = doc(db, 'admins', docId);
      await deleteDoc(adminRef);
      return true;
    } catch (err) {
      console.error('Delete admin error:', err);
      throw err;
    }
  };

  // Logout Admin
  const logoutAdmin = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    setAdminUser(null);
    setIsAdmin(false);
    setAdminRole('admin');
    localStorage.removeItem('samyak_admin_session');
    localStorage.removeItem('samyak_admin_role');
    localStorage.removeItem('samyak_custom_admin_user');
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      isAdmin,
      isSuperAdmin,
      adminRole,
      adminLoading,
      canVerifyPayments,
      canViewSensitiveProofs,
      canCheckInGate,
      isGateStaffOnly,
      loginAdminWithGoogle,
      loginAdminWithPasscode,
      updateAdminPassword,
      provisionNewAdmin,
      regenerateAdminPasscode,
      deleteAdmin,
      logoutAdmin,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
