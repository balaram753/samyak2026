import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
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
  serverTimestamp 
} from 'firebase/firestore';

import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof atob === 'function' ? atob("QUl6YVN5QlYwY3lvNTEyUFU5M0kxRVRQVUJSMjRuTUtndFdJcXhZ") : ""),
  authDomain: "kl--samyak.firebaseapp.com",
  projectId: "kl--samyak",
  storageBucket: "kl--samyak.firebasestorage.app",
  messagingSenderId: "398032374289",
  appId: "1:398032374289:web:ca6a7ab94ea0f1476d7fb0",
  measurementId: "G-QPST5S3P93"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services (Firebase for Authentication, Database & Storage)
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const googleProvider = new GoogleAuthProvider();

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
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL
};

export default app;
