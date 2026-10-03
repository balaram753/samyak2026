/**
 * SAMYAK 2026 — Backend Database Layer
 * Re-exports Firestore database instance, collection references, and Firestore utility helpers.
 */

export {
  db,
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
} from '../services/firebase';

// Files and site content are on Cloudflare (R2 + D1) via the SAMYAK Worker.
export * from '../services/contentStore';
export { uploadFile, deleteFile, cloudFetch, isCloudConfigured } from '../services/cloudApi';
