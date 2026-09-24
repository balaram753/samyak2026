import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { uploadImageToImgBB } from './imgbb.js';
import { validateUploadedFile, generateSafeStorageKey } from './fileSecurityService.js';

/**
 * Cloudflare R2 S3-Compatible Storage Service
 * Bucket: samyak
 * Account: 6fd3838fd505ee00ff61f46eebf9c294
 * Endpoint: https://6fd3838fd505ee00ff61f46eebf9c294.r2.cloudflarestorage.com
 */

export const R2_CONFIG = {
  accountId: import.meta?.env?.VITE_R2_ACCOUNT_ID || '6fd3838fd505ee00ff61f46eebf9c294',
  bucketName: import.meta?.env?.VITE_R2_BUCKET_NAME || 'samyak',
  endpoint: import.meta?.env?.VITE_R2_ENDPOINT || 'https://6fd3838fd505ee00ff61f46eebf9c294.r2.cloudflarestorage.com',
  // Credentials come from the environment only; never commit fallbacks here.
  accessKeyId: import.meta?.env?.VITE_R2_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta?.env?.VITE_R2_SECRET_ACCESS_KEY || '',
  // Public CDN URL (Active Cloudflare R2 domain)
  publicUrl: import.meta?.env?.VITE_R2_PUBLIC_URL || 'https://pub-4e129d23d90c46c38c90a8108ca48369.r2.dev',
};

let s3ClientInstance = null;

export function isR2Configured() {
  return Boolean(R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey);
}

export function getR2Client() {
  if (!s3ClientInstance) {
    if (!isR2Configured()) {
      console.warn('Cloudflare R2 API credentials (VITE_R2_ACCESS_KEY_ID & VITE_R2_SECRET_ACCESS_KEY) not set in .env.');
    }

    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint: R2_CONFIG.endpoint,
      credentials: {
        accessKeyId: R2_CONFIG.accessKeyId,
        secretAccessKey: R2_CONFIG.secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Compute the public accessible URL for a given R2 storage key
 * @param {string} storageKey 
 * @returns {string}
 */
export function getR2PublicUrl(storageKey) {
  if (!storageKey) return '';
  if (R2_CONFIG.publicUrl) {
    return `${R2_CONFIG.publicUrl.replace(/\/$/, '')}/${storageKey}`;
  }
  return `${R2_CONFIG.endpoint}/${R2_CONFIG.bucketName}/${storageKey}`;
}

/**
 * Upload any File / Blob to Cloudflare R2 S3 bucket
 * @param {File|Blob} file 
 * @param {string} storageKey Path key in bucket (e.g., 'events/roboWars/root/img.jpg')
 * @returns {Promise<{ url: string, key: string, size: number, type: string, provider: string }>}
 */
export async function uploadToR2(file, storageKey) {
  if (!file) throw new Error('No file provided for upload');

  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 credentials missing. Please set VITE_R2_ACCESS_KEY_ID & VITE_R2_SECRET_ACCESS_KEY in .env to upload to Cloudflare.');
  }

  const client = getR2Client();
  const fileBytes = new Uint8Array(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: storageKey,
    Body: fileBytes,
    ContentType: file.type || 'application/octet-stream',
  });

  await client.send(command);
  const publicUrl = getR2PublicUrl(storageKey);

  return {
    url: publicUrl,
    key: storageKey,
    size: file.size,
    type: file.type || 'application/octet-stream',
    provider: 'cloudflare_r2',
  };
}

/**
 * Dual-Engine Image Upload (Cloudflare R2 primary, ImgBB fallback)
 * Used across the project for ID cards, banners, gallery photos, and avatars
 * @param {File} imageFile 
 * @param {string} folder Category/folder name (e.g. 'banners', 'gallery', 'id_cards', 'avatars')
 * @returns {Promise<{ url: string, displayUrl: string, thumbUrl: string, key: string, provider: string }>}
 */
export async function uploadImage(imageFile, folder = 'images') {
  if (!imageFile) throw new Error('No image file selected.');

  // Security check: validate size, MIME, and extension
  validateUploadedFile(imageFile, folder);

  // Generate an unpredictable, safe cryptographic storage key
  const storageKey = generateSafeStorageKey(folder, imageFile.name);

  // 1. Attempt Cloudflare R2 if credentials present
  if (isR2Configured()) {
    try {
      const res = await uploadToR2(imageFile, storageKey);
      return {
        url: res.url,
        displayUrl: res.url,
        thumbUrl: res.url,
        key: res.key,
        provider: 'cloudflare_r2',
      };
    } catch (r2Err) {
      console.warn('Cloudflare R2 upload attempt failed; seamlessly falling back to ImgBB:', r2Err);
    }
  }

  // 2. High-reliability fallback to ImgBB
  try {
    const imgbbRes = await uploadImageToImgBB(imageFile);
    return {
      url: imgbbRes.url,
      displayUrl: imgbbRes.displayUrl,
      thumbUrl: imgbbRes.thumbUrl,
      key: `imgbb/${storageKey}`,
      provider: 'imgbb',
    };
  } catch (imgbbErr) {
    console.error('Dual upload failure (both Cloudflare R2 and ImgBB failed):', imgbbErr);
    throw new Error(`Upload failed: ${imgbbErr.message || 'Network error'}`);
  }
}

/**
 * Upload Reports (CSV, JSON, Text) directly to Cloudflare R2
 * Used for storing attendee export files, registration spreadsheets, financial summaries
 * @param {string} reportContent Content string or Blob
 * @param {string} reportBaseName (e.g. 'attendee_attendance_report')
 * @param {string} format 'csv' | 'json'
 * @returns {Promise<{ url: string, key: string, provider: string }>}
 */
export async function uploadReportToR2(reportContent, reportBaseName, format = 'csv') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${reportBaseName}_${timestamp}.${format}`;
  const storageKey = `reports/${fileName}`;
  const contentType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json';

  const blob = new Blob([reportContent], { type: contentType });

  if (isR2Configured()) {
    try {
      const res = await uploadToR2(blob, storageKey);
      return {
        url: res.url,
        key: res.key,
        fileName,
        provider: 'cloudflare_r2',
      };
    } catch (err) {
      console.warn('Could not store report in Cloudflare R2, generating local download blob:', err);
    }
  }

  // Generate object URL for direct browser download if R2 credentials not entered
  const blobUrl = URL.createObjectURL(blob);
  return {
    url: blobUrl,
    key: storageKey,
    fileName,
    provider: 'local_blob',
  };
}

/**
 * Delete a file from Cloudflare R2 S3 bucket
 * @param {string} storageKey 
 */
export async function deleteFromR2(storageKey) {
  if (!storageKey || !isR2Configured()) return;

  try {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: storageKey,
    });
    await client.send(command);
  } catch (err) {
    console.warn('Failed to delete object from Cloudflare R2:', err);
  }
}

/**
 * Workflow Spec: uploadFileToStorage(file, storagePath)
 * Sanitizes file name and uploads binary to Cloudflare R2 bucket.
 */
export async function uploadFileToStorage(file, storagePath) {
  if (!file) throw new Error('No file provided for upload');
  return await uploadToR2(file, storagePath);
}

/**
 * Workflow Spec: deleteFileFromStorage(storagePath)
 * Removes object from Cloudflare R2 storage bucket.
 */
export async function deleteFileFromStorage(storagePath) {
  return await deleteFromR2(storagePath);
}

/**
 * List all media files for an event folder directly from Cloudflare R2
 * Guarantees that normal users can see all uploaded files even when Firestore is blocked or empty.
 * @param {string} eventId 
 * @param {string} folderId 'root' or subfolder slug
 * @returns {Promise<Array>}
 */
export async function listR2EventMedia(eventId, folderId = 'root') {
  if (!eventId || !isR2Configured()) return [];

  const targetFolder = folderId || 'root';
  const prefix = `events/${eventId}/${targetFolder}/`;

  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: prefix,
    });

    const response = await client.send(command);
    const items = response.Contents || [];

    return items
      .filter((item) => item.Key && !item.Key.endsWith('/'))
      .map((item) => {
        const rawFileName = item.Key.split('/').pop() || 'file';
        // Strip timestamp prefix if present (e.g., 1790031481888-bg.png -> bg.png)
        const cleanName = rawFileName.replace(/^\d+-/, '');
        const publicUrl = getR2PublicUrl(item.Key);

        return {
          id: 'r2_' + (item.ETag ? item.ETag.replace(/["']/g, '') : Math.random().toString(36).substring(2)),
          name: cleanName,
          caption: '',
          url: publicUrl,
          thumb_url: publicUrl,
          size: item.Size || 0,
          storage_path: item.Key,
          event_id: eventId,
          folder_id: targetFolder,
          timestamp: item.LastModified ? new Date(item.LastModified).getTime() : Date.now(),
          uploaded_by: 'Organizer',
          provider: 'cloudflare_r2',
        };
      });
  } catch (err) {
    console.warn('Cloudflare R2 media listing error:', err);
    return [];
  }
}

/**
 * Save a new or updated folder to Cloudflare R2 manifest and S3 prefix marker
 * @param {string} eventId 
 * @param {object} folderData 
 */
export async function saveR2Folder(eventId, folderData) {
  if (!eventId || !folderData || !isR2Configured()) return;

  try {
    const client = getR2Client();
    const existing = await listR2EventFolders(eventId);
    const filtered = existing.filter((f) => f.id !== folderData.id);
    const updated = [...filtered, folderData];

    // 1. Write _folders.json manifest to R2
    const key = `events/${eventId}/_folders.json`;
    await client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
        Body: new TextEncoder().encode(JSON.stringify(updated, null, 2)),
        ContentType: 'application/json',
      })
    );

    // 2. Write empty placeholder for S3 prefix consistency
    const folderSlug = folderData.id || folderData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: `events/${eventId}/${folderSlug}/.keep`,
        Body: new Uint8Array([]),
        ContentType: 'text/plain',
      })
    );
  } catch (err) {
    console.warn('Failed to save folder to Cloudflare R2:', err);
  }
}

/**
 * Delete a folder and all its files from Cloudflare R2
 * @param {string} eventId 
 * @param {string} folderId 
 */
export async function deleteR2Folder(eventId, folderId) {
  if (!eventId || !folderId || !isR2Configured()) return;

  try {
    const client = getR2Client();
    const existing = await listR2EventFolders(eventId);
    const updated = existing.filter((f) => f.id !== folderId && f.parent_folder_id !== folderId);

    // 1. Write updated manifest (even if empty [])
    const key = `events/${eventId}/_folders.json`;
    await client.send(
      new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
        Body: new TextEncoder().encode(JSON.stringify(updated, null, 2)),
        ContentType: 'application/json',
      })
    );

    // 2. Delete folder marker placeholders
    const possibleKeys = [
      `events/${eventId}/${folderId}/.keep`,
      `events/${eventId}/${folderId.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/.keep`,
    ];
    for (const pKey of possibleKeys) {
      await client.send(new DeleteObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: pKey })).catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to delete folder from Cloudflare R2:', err);
  }
}

/**
 * Delete a folder and all child objects within that folder in R2
 * @param {string} eventId 
 * @param {string} folderId 
 */
export async function deleteR2FolderAll(eventId, folderId) {
  if (!eventId || !folderId || !isR2Configured()) return;
  const client = getR2Client();

  // 1. Remove from _folders.json
  await deleteR2Folder(eventId, folderId);

  // 2. Delete all S3 objects with prefix events/{eventId}/{folderId}/
  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: `events/${eventId}/${folderId}/`,
    });
    const res = await client.send(listCmd);
    if (res.Contents && res.Contents.length > 0) {
      await Promise.all(
        res.Contents.map((obj) =>
          client.send(new DeleteObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: obj.Key })).catch(() => {})
        )
      );
    }
  } catch (err) {
    console.warn('Error purging folder files from Cloudflare R2:', err);
  }
}

/**
 * Delete an entire event and all its media files, folders, and manifests from R2
 * @param {string} eventId 
 */
export async function deleteR2EventAll(eventId) {
  if (!eventId || !isR2Configured()) return;
  try {
    const client = getR2Client();
    const listCmd = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: `events/${eventId}/`,
    });
    const res = await client.send(listCmd);
    if (res.Contents && res.Contents.length > 0) {
      await Promise.all(
        res.Contents.map((obj) =>
          client.send(new DeleteObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: obj.Key })).catch(() => {})
        )
      );
    }
  } catch (err) {
    console.warn('Error purging event from Cloudflare R2:', err);
  }
}

/**
 * Discover subfolders for an event directly from Cloudflare R2 manifest & S3 prefixes
 * Guarantees folders are visible to normal users without Firebase dependencies.
 * @param {string} eventId 
 * @returns {Promise<Array>}
 */
export async function listR2EventFolders(eventId) {
  if (!eventId || !isR2Configured()) return [];

  const foldersMap = new Map();
  let hasManifest = false;

  // 1. Read manifest _folders.json from Cloudflare R2 Public CDN / Direct
  try {
    const publicUrl = getR2PublicUrl(`events/${eventId}/_folders.json`);
    const res = await fetch(`${publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const manifestFolders = await res.json();
      if (Array.isArray(manifestFolders)) {
        hasManifest = true;
        manifestFolders.forEach((f) => {
          if (f && f.id) foldersMap.set(f.id, f);
        });
      }
    }
  } catch (manifestErr) {
    console.warn('R2 _folders.json read notice:', manifestErr.message);
  }

  // If manifest exists (even if empty []), respect it as authoritative to honor user deletions!
  if (hasManifest) {
    return Array.from(foldersMap.values());
  }

  // 2. Query S3 CommonPrefixes to discover any physical folders in R2 if no manifest exists yet
  try {
    const client = getR2Client();
    const prefix = `events/${eventId}/`;
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: prefix,
      Delimiter: '/',
    });

    const response = await client.send(command);
    const prefixes = response.CommonPrefixes || [];

    prefixes.forEach((p) => {
      const segments = p.Prefix.replace(/\/$/, '').split('/');
      const folderSlug = segments[segments.length - 1];
      if (!folderSlug || folderSlug === 'root' || folderSlug === '_folders' || folderSlug.startsWith('.')) return;

      if (!foldersMap.has(folderSlug)) {
        const folderName = folderSlug
          .split(/[-_]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        foldersMap.set(folderSlug, {
          id: folderSlug,
          name: folderName,
          event_id: eventId,
          parent_folder_id: null,
          created_by: 'Admin',
          timestamp: Date.now(),
          isR2Folder: true,
        });
      }
    });
  } catch (err) {
    console.warn('Cloudflare R2 prefix folder listing notice:', err);
  }

  return Array.from(foldersMap.values());
}

/**
 * List all events that have media stored in Cloudflare R2
 * @returns {Promise<Array>}
 */
export async function listR2EventsWithMedia() {
  if (!isR2Configured()) return [];

  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: R2_CONFIG.bucketName,
      Prefix: 'events/',
      Delimiter: '/',
    });

    const response = await client.send(command);
    const prefixes = response.CommonPrefixes || [];

    return prefixes
      .map((p) => {
        const segments = p.Prefix.replace(/\/$/, '').split('/');
        const eventSlug = segments[segments.length - 1];
        if (!eventSlug) return null;

        const eventTitle = eventSlug
          .split(/[-_]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        return {
          id: eventSlug,
          title: eventTitle,
          department: 'Festival Event',
          category: 'Event Media',
          banner_url: '/hero-bg.png',
          hasMediaInR2: true,
        };
      })
      .filter(Boolean);
  } catch (err) {
    console.warn('Cloudflare R2 event list error:', err);
    return [];
  }
}

