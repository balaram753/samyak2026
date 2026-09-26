import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  deleteDoc,
  updateDoc, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy, 
  limit,
  runTransaction,
  serverTimestamp,
  increment
} from 'firebase/firestore';

import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof atob === 'function' ? atob("QUl6YVN5RHZqTTlTTkdaN0Rwd0toT0QxVk5odnhjLVhsZmFyMl9F") : ""),
  authDomain: "nirva-7e226.firebaseapp.com",
  projectId: "nirva-7e226",
  storageBucket: "nirva-7e226.firebasestorage.app",
  messagingSenderId: "871650355611",
  appId: "1:871650355611:web:484075af5c1370a2cc193e",
  measurementId: "G-335H8GK65G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services (Firebase for Authentication, Database & Storage)
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Google Provider — for External participants & admins
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Microsoft Provider — for KL University Internal students (@kluniversity.in)
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
  // Optionally restrict to KL University tenant if you have the tenant ID:
  // tenant: 'YOUR_AZURE_TENANT_ID',
});

/** KL University email domain — used for INTERNAL category auto-verification */
export const KLU_EMAIL_DOMAIN = '@kluniversity.in';

/** Returns true if the email belongs to KL University */
export function isKLUEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith(KLU_EMAIL_DOMAIN);
}

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  increment,
  storageRef,
  uploadBytes,
  getDownloadURL
};

export default app;
