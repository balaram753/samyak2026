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
