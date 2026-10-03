/**
 * File uploads — Cloudflare R2 only, through the SAMYAK Worker.
 *
 * Kept as the single upload entry point for the site. There is no ImgBB or
 * Firebase Storage fallback and no Cloudflare credentials in the browser: the
 * Worker checks who is uploading and what, then writes to the bucket.
 */
import { uploadFile, deleteFile, isCloudConfigured, CloudApiError } from './cloudApi.js';
import { validateUploadedFile } from './fileSecurityService.js';

export function isR2Configured() {
  return isCloudConfigured();
}

function toResult(res) {
  return {
    url: res.url,
    displayUrl: res.url,
    thumbUrl: res.url,
    key: res.key,
    provider: 'cloudflare_r2',
  };
}

// Public site imagery is resized before upload: camera/design exports of
// 4-10 MB are slow to upload, often time out, and can exceed the Worker limit.
// ID cards and payment proofs are never touched (kept as submitted).
const SHRINK_FOLDERS = ['banners', 'event_gallery', 'gallery', 'images', 'logos', 'sponsors',
  'workshops', 'workshop_posters', 'workshop_qr', 'workshop_payment_qrs'];
const SHRINK_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SHRINK_MIN_BYTES = 800 * 1024;

const LEGACY_FOLDER_FALLBACK = {
  workshop_posters: 'banners',
  workshops: 'banners',
  workshop_payment_qrs: 'images',
  workshop_qr: 'images',
};

async function shrinkImage(file, { maxSide = 2000, quality = 0.85 } = {}) {
  if (typeof document === 'undefined' || !SHRINK_TYPES.includes(file.type) || file.size < SHRINK_MIN_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    // JPEG stays JPEG; PNG/WebP become WebP so transparent logos keep their alpha.
    const outType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outType, quality));
    if (!blob || blob.size >= file.size || !SHRINK_TYPES.includes(blob.type)) return file;
    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1];
    const name = `${(file.name || 'upload').replace(/\.[^.]+$/, '')}.${ext}`;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file; // Decoding failed (e.g. unsupported format): upload the original.
  }
}

/**
 * Upload an image into an R2 folder ('banners', 'gallery', 'logos', 'sponsors',
 * 'event_gallery', 'avatars', ...). Returns { url, displayUrl, thumbUrl, key, provider }.
 */
export async function uploadImage(imageFile, folder = 'images', options = {}) {
  if (!imageFile) throw new Error('No image file selected.');
  const rootFolder = String(folder).split('/')[0];
  const file = SHRINK_FOLDERS.includes(rootFolder) ? await shrinkImage(imageFile) : imageFile;
  validateUploadedFile(file, folder);
  try {
    return toResult(await uploadFile(file, folder, options));
  } catch (err) {
    // Workers deployed before the workshop folders existed reject them as
    // unknown; store in an equivalent public content folder instead.
    const fallback = LEGACY_FOLDER_FALLBACK[rootFolder];
    if (fallback && err instanceof CloudApiError && err.status === 400 && /unknown upload folder/i.test(err.message)) {
      return toResult(await uploadFile(file, fallback, options));
    }
    throw err;
  }
}

/** Upload any file to an exact R2 folder path, e.g. 'events/<eventId>/<folderId>'. */
export async function uploadFileToStorage(file, folderPath) {
  return toResult(await uploadFile(file, folderPath));
}

/** Delete a file from R2 by its key (admins only; enforced by the Worker). */
export async function deleteFromR2(storageKey) {
  if (!storageKey) return;
  await deleteFile(storageKey);
}

export const deleteFileFromStorage = deleteFromR2;

/**
 * Builds a report for the admin to download. Reports contain personal data,
 * so they are never uploaded to the public bucket.
 */
export async function uploadReportToR2(reportContent, reportBaseName, format = 'csv') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${reportBaseName}_${timestamp}.${format}`;
  const contentType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';
  const blob = new Blob([reportContent], { type: contentType });
  return {
    url: URL.createObjectURL(blob),
    key: null,
    fileName,
    provider: 'local_download',
  };
}
