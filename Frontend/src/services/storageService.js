import { uploadFile } from './cloudApi';
import { validateUploadedFile } from './fileSecurityService';

/**
 * Upload pipeline for student files (college ID cards, payment proofs, avatars).
 * Destination: Cloudflare R2 only, via the SAMYAK Worker, which requires the
 * student to be signed in and checks file type and size.
 *
 * @param {File} file
 * @param {'id_cards'|'payment_proofs'|'payments'|'avatars'} category
 * @param {string} uid - signed-in Firebase user id
 * @param {string} [registrationId] - kept for API compatibility
 * @returns {Promise<{ url: string, path: string, filename: string, size: number, mimeType: string, provider: string }>}
 */
export async function uploadSecureUserFile(file, category = 'id_cards', uid = '', registrationId = 'general') {
  if (!uid) {
    throw new Error('Authentication required: Cannot upload file without an authenticated Firebase UID.');
  }

  const validation = validateUploadedFile(file, category);
  if (validation && validation.isValid === false) {
    throw new Error(validation.error || 'File validation failed.');
  }

  const folder = category === 'payments' ? 'payment_proofs' : category;
  const res = await uploadFile(file, folder);
  return {
    url: res.url,
    path: res.key,
    filename: res.key.split('/').pop(),
    size: res.size,
    mimeType: res.type,
    provider: 'cloudflare_r2',
    registrationId,
  };
}
