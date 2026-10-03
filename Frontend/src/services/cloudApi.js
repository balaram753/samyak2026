/**
 * Client for the SAMYAK Cloudflare Worker (Backend/cloudflare-worker).
 *
 * - Content documents live in Cloudflare D1  -> /api/content/...
 * - Every file lives in Cloudflare R2        -> /api/upload, /api/files
 *
 * Firebase is only used to prove who is calling: the signed-in user's Firebase
 * ID token is sent as a Bearer token and verified by the Worker. No Cloudflare
 * keys exist in the browser.
 */
import { auth } from './firebase';

export const CLOUD_API_URL = String(import.meta.env.VITE_CLOUD_API_URL || '').replace(/\/$/, '');

export function isCloudConfigured() {
  return Boolean(CLOUD_API_URL);
}

export class CloudApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function authHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    return {};
  }
}

export async function cloudFetch(path, { method = 'GET', body, headers = {}, signal } = {}) {
  if (!CLOUD_API_URL) {
    throw new CloudApiError(0, 'Cloud API is not configured (VITE_CLOUD_API_URL missing).');
  }
  const isForm = body instanceof FormData;
  const auth = await authHeader();
  const res = await fetch(`${CLOUD_API_URL}${path}`, {
    method,
    signal,
    // Signed-in readers (admins) must see their own writes immediately; a
    // cached `public, max-age` copy would make a fresh save look reverted.
    ...(auth.Authorization ? { cache: 'no-store' } : {}),
    headers: {
      ...auth,
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) throw new CloudApiError(res.status, data?.error || `Request failed (${res.status})`);
  return data;
}

/**
 * Uploads one file to R2. `folder` is e.g. 'banners', 'gallery', 'avatars',
 * 'events/<eventId>/<folderId>'. Returns { url, key, size, type }.
 * `coreInvite` lets people without an account upload their core-team photo.
 */
export async function uploadFile(file, folder, { coreInvite } = {}) {
  if (!file) throw new Error('No file selected.');
  const form = new FormData();
  form.append('folder', folder);
  form.append('file', file, file.name || 'upload');
  return cloudFetch('/api/upload', {
    method: 'POST',
    body: form,
    headers: coreInvite ? { 'X-Core-Invite': coreInvite } : {},
  });
}

export function deleteFile(key) {
  if (!key) return Promise.resolve();
  return cloudFetch(`/api/files?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
}

// ID cards and payment proofs are served by the Worker only to the uploader
// and admins, so they need the sign-in token and cannot be a plain <img src>.
export function isPrivateFileUrl(url) {
  return typeof url === 'string' && /^https?:\/\/[^/]+\/api\/private-files\//.test(url);
}

export async function fetchPrivateFile(url) {
  const res = await fetch(url, { headers: await authHeader() });
  if (!res.ok) throw new CloudApiError(res.status, `File request failed (${res.status})`);
  return res.blob();
}
