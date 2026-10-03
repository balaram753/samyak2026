/**
 * SAMYAK 2026 — Backend Auth Layer
 * Re-exports Firebase Authentication instances, providers, and Admin authentication context.
 */

export {
  auth,
  googleProvider,
  microsoftProvider,
  KLU_EMAIL_DOMAIN,
  isKLUEmail,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from '../services/firebase';

export { useAdminAuth, AdminAuthProvider, SUPER_ADMIN_EMAILS } from '../context/AdminAuthContext';
export { useUser, UserProvider } from '../data/userContext';
