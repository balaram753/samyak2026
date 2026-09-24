import { storage, storageRef, uploadBytes, getDownloadURL } from './firebase';
import { uploadToR2, uploadImage, isR2Configured } from './r2Storage';
import { validateUploadedFile, generateSafeStorageKey } from './fileSecurityService';

/**
 * Storage Service — Secure Upload Pipeline for College ID Cards & Payment Proofs
 * 
 * Destination: Cloudflare R2 (Bucket: samyak)
 * Fallback: Firebase Storage / ImgBB
 * 
 * Rules:
 * - Validates MIME type, file extension, and size limit.
 * - Targets scoped private paths in Cloudflare R2:
 *   - ID Cards: `users/${uid}/id-card/${safeFilename}`
 *   - Payment Proofs: `users/${uid}/payments/${registrationId}/${safeFilename}`
 * 
 * @param {File} file - Raw File object from input
 * @param {'id_cards'|'payment_proofs'|'avatars'} category - File classification
 * @param {string} uid - Authenticated Firebase User UID
 * @param {string} [registrationId] - Optional registration ID for payment proofs
 * @returns {Promise<{ url: string, path: string, filename: string, size: number, mimeType: string, provider: string }>}
 */
export async function uploadSecureUserFile(file, category = 'id_cards', uid = '', registrationId = 'general') {
  if (!uid) {
    throw new Error('Authentication required: Cannot upload file without an authenticated Firebase UID.');
  }

  // 1. Strict Security Validation (MIME, size, extension, prohibited files)
  try {
    const validation = validateUploadedFile(file, category);
    if (validation && validation.isValid === false) {
      throw new Error(validation.error || 'File validation failed.');
    }
  } catch (valErr) {
    throw new Error(valErr.message || 'File validation failed.');
  }

  // 2. Generate cryptographically safe filename
  const safeFilename = generateSafeStorageKey(category, file.name || 'document.png').split('/').pop();

  // 3. Construct canonical storage path
  let storagePath;
  if (category === 'id_cards') {
    storagePath = `users/${uid}/id-card/${safeFilename}`;
  } else if (category === 'payment_proofs' || category === 'payments') {
    storagePath = `users/${uid}/payments/${registrationId}/${safeFilename}`;
  } else {
    storagePath = `users/${uid}/avatars/${safeFilename}`;
  }

  // 4. PRIMARY: Upload directly to Cloudflare R2
  if (isR2Configured()) {
    try {
      const r2Res = await uploadToR2(file, storagePath);
      return {
        url: r2Res.url,
        path: storagePath,
        filename: safeFilename,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        provider: 'cloudflare_r2'
      };
    } catch (r2Err) {
      console.warn('Cloudflare R2 direct upload notice, trying secondary fallback:', r2Err.message);
    }
  }

  // 5. Secondary Fallback: uploadImage (R2 / ImgBB)
  try {
    const fallbackRes = await uploadImage(file, category === 'payment_proofs' ? 'payments' : category);
    return {
      url: fallbackRes.url || fallbackRes.displayUrl,
      path: storagePath,
      filename: safeFilename,
      size: file.size,
      mimeType: file.type || 'image/jpeg',
      provider: fallbackRes.provider || 'cloudflare_r2'
    };
  } catch (imgbbErr) {
    console.warn('Secondary storage fallback notice, trying Firebase Storage:', imgbbErr.message);

    // 6. Last resort: Firebase Storage
    try {
      const fileRef = storageRef(storage, storagePath);
      const metadata = {
        contentType: file.type || 'image/jpeg',
        customMetadata: {
          uploadedBy: uid,
          category,
          originalName: (file.name || 'upload').substring(0, 50),
          uploadedAt: new Date().toISOString()
        }
      };

      const snapshot = await uploadBytes(fileRef, file, metadata);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      return {
        url: downloadUrl,
        path: storagePath,
        filename: safeFilename,
        size: file.size,
        mimeType: file.type || 'image/jpeg',
        provider: 'firebase_storage'
      };
    } catch (fbErr) {
      console.error('All storage destinations failed:', fbErr);
      throw new Error(`Upload failed: ${fbErr.message}`);
    }
  }
}
