import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const DUPLICATE_UTR_MESSAGE =
  'This UPI UTR ID has already been recorded in the database. Duplicate submissions are strictly prohibited.';

export function normalizeUtr(raw) {
  return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Reserves a UTR for the signed-in student. utr_claims/{utr} can only be
 * created once; Firestore rules reject another account's write, so duplicate
 * UTRs are blocked by the database rather than by a client-side query.
 * Re-claiming your own UTR (e.g. resubmitting after a rejection) succeeds.
 */
export async function claimUtr(utr, uid, registrationId = '') {
  const clean = normalizeUtr(utr);
  if (!/^[A-Z0-9]{10,16}$/.test(clean)) {
    throw new Error('Please enter a valid 10 to 16 alphanumeric UPI Transaction / UTR ID.');
  }
  try {
    await setDoc(doc(db, 'utr_claims', clean), {
      uid,
      registrationId: String(registrationId || ''),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    if (err?.code === 'permission-denied') throw new Error(DUPLICATE_UTR_MESSAGE);
    throw err;
  }
  return clean;
}
