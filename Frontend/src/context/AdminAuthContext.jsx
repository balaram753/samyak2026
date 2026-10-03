import { createContext, useContext, useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut as fbSignOut,
  db
} from '../services/firebase';
import {
  ADMIN_ROLES, REGISTRATIONS_DESK_ROLES, EVENTS_ADMIN_ROLES, CLUB_ROLES, GATE_ROLES,
  roleKey, isKnownRole, roleRecordIds, isActiveRecord, allowedAdminTabs,
} from '../services/roles';

export const SUPER_ADMIN_EMAILS = [
  'udaykiranvempati123@gmail.com',
  'balaram777.ch@gmail.com',
  'harshasai955@gmail.com',
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

// Old builds kept the admin session in localStorage. It is user-editable and
// must never grant access, so it is only cleared here, never read.
const LEGACY_SESSION_KEYS = ['samyak_admin_session', 'samyak_admin_role', 'samyak_custom_admin_user'];

function clearLegacySession() {
  try {
    LEGACY_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
}

/**
 * Looks up the signed-in Google account in `admins`. Firestore rules only let
 * an account read its own admin document, so this cannot be spoofed from the
 * browser: the role always comes from a document the super admin wrote.
 * Same identity model as the rules: admins/{uid} or admins/{verified email}.
 */
async function resolveAdminProfile(firebaseUser) {
  const email = (firebaseUser.email || '').toLowerCase();

  if (firebaseUser.emailVerified && isSuperAdminEmail(email)) {
    const username = getSuperAdminUsername(email);
    const profile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || 'Super Administrator',
      fullName: firebaseUser.displayName || 'Super Administrator',
      username,
      photoURL: firebaseUser.photoURL,
      role: 'super_admin',
      wing: 'Core Directorate',
      isSuperAdmin: true,
    };
    try {
      await setDoc(doc(db, 'admins', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: profile.displayName,
        fullName: profile.fullName,
        username,
        role: 'super_admin',
        wing: 'Core Directorate',
        status: 'active',
        lastLogin: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('Super admin sync note:', e);
    }
    return profile;
  }

  let adminDoc = null;
  for (const id of roleRecordIds(firebaseUser)) {
    const snap = await getDoc(doc(db, 'admins', id)).catch(() => null);
    if (snap?.exists()) { adminDoc = snap; break; }
  }
  if (!adminDoc) return null;

  const data = adminDoc.data();
  if (!isActiveRecord(data)) return null;
  if (!isKnownRole(data.role)) {
    // Old console labels ("Full Administrator", ...) grant nothing until migrated.
    const err = new Error(`Your administrator role "${data.role || 'none'}" has not been migrated yet. Ask the Super Admin to update it.`);
    err.code = 'ROLE_NEEDS_MIGRATION';
    throw err;
  }

  return {
    uid: firebaseUser.uid,
    docId: adminDoc.id,
    email: firebaseUser.email,
    displayName: data.fullName || firebaseUser.displayName,
    fullName: data.fullName || firebaseUser.displayName,
    username: data.username || '',
    photoURL: firebaseUser.photoURL,
    role: roleKey(data.role),
    roleLabel: data.roleLabel || data.role,
    wing: data.wing || 'Wing Admin',
    club: data.club || '',
    phone: data.phone || '',
    isSuperAdmin: false,
  };
}

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [adminLoading, setAdminLoading] = useState(true);

  // Derive isSuperAdmin boolean
  const isSuperAdmin = (
    isSuperAdminEmail(adminUser?.email) ||
    adminRole === 'super_admin'
  );

  // Granular Role-Based Access Control (mirrors firestore.rules)
  const isFullAdmin = isSuperAdmin || ADMIN_ROLES.includes(adminRole);
  const canVerifyPayments = isFullAdmin || REGISTRATIONS_DESK_ROLES.includes(adminRole);
  const canViewSensitiveProofs = isSuperAdmin || ['super_admin', 'admin'].includes(adminRole)
    || REGISTRATIONS_DESK_ROLES.includes(adminRole);
  const canEditContent = isFullAdmin || EVENTS_ADMIN_ROLES.includes(adminRole);
  const isClubAdmin = CLUB_ROLES.includes(adminRole);
  const canCheckInGate = isFullAdmin || GATE_ROLES.includes(adminRole);
  const isGateStaffOnly = GATE_ROLES.includes(adminRole);
  const adminTabs = allowedAdminTabs(adminRole, isSuperAdmin);
  const canAccessTab = (tab) => adminTabs === 'all'
    ? (tab !== 'admin_management' || isSuperAdmin)
    : adminTabs.includes(tab);

  const applyProfile = (profile) => {
    setAdminUser(profile);
    setIsAdmin(Boolean(profile));
    setAdminRole(profile?.role || null);
  };

  // The only source of admin state is the verified Firebase session.
  useEffect(() => {
    clearLegacySession();

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setAdminLoading(true);
      try {
        applyProfile(firebaseUser ? await resolveAdminProfile(firebaseUser) : null);
      } catch (err) {
        console.warn('Admin status check note:', err);
        applyProfile(null);
      } finally {
        setAdminLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Google Sign-In for Super Admins and provisioned sub-admins
  const loginAdminWithGoogle = async () => {
    setAdminLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      let profile = null;
      try {
        profile = await resolveAdminProfile(result.user);
      } catch (err) {
        await fbSignOut(auth);
        throw err;
      }
      if (!profile) {
        await fbSignOut(auth);
        throw new Error(`Access Denied: ${result.user.email} is not authorized as an administrator.`);
      }
      applyProfile(profile);
      return profile;
    } catch (error) {
      console.error('Admin Google Sign-In Error:', error);
      throw error;
    } finally {
      setAdminLoading(false);
    }
  };

  // Provision new Sub-Admin (Super Admin only). They sign in with this Google
  // account; the doc id is the email so security rules can find it.
  const provisionNewAdmin = async (newAdminData) => {
    const email = (newAdminData.email || '').trim().toLowerCase();
    if (!isKnownRole(newAdminData.role)) {
      throw new Error(`Unknown role "${newAdminData.role}". Choose one of the listed roles.`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('A valid Google account email is required: sub-admins sign in with Google.');
    }
    const usernameClean = newAdminData.username.trim().toLowerCase().replace(/^@/, '');

    const payload = {
      id: email,
      fullName: newAdminData.fullName.trim(),
      username: usernameClean,
      email,
      phone: newAdminData.phone.trim(),
      wing: newAdminData.wing || 'Technical',
      role: newAdminData.role,
      roleLabel: newAdminData.roleLabel || newAdminData.role,
      club: newAdminData.club?.trim() || '',
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: adminUser?.email || SUPER_ADMIN_EMAIL,
    };

    await setDoc(doc(db, 'admins', email), payload);
    return payload;
  };

  // Delete / Revoke an Admin (Super Admin only)
  const deleteAdmin = async (docId) => {
    try {
      await deleteDoc(doc(db, 'admins', docId));
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
    applyProfile(null);
    clearLegacySession();
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      isAdmin,
      isSuperAdmin,
      adminRole,
      adminLoading,
      isFullAdmin,
      canVerifyPayments,
      canViewSensitiveProofs,
      canEditContent,
      isClubAdmin,
      canCheckInGate,
      isGateStaffOnly,
      canAccessTab,
      loginAdminWithGoogle,
      provisionNewAdmin,
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
