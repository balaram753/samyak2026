/**
 * Event media explorer: folders + files per event.
 *
 * Metadata: Cloudflare D1 collections `media_folders` and `media_files`.
 * Files:    Cloudflare R2 under events/<eventId>/<folderId>/...
 * Both go through the SAMYAK Worker (see services/contentStore.js, services/cloudApi.js).
 */
import {
  listContent,
  subscribeContent,
  setContentDoc,
  deleteContentDoc,
} from './contentStore';
import { uploadFile as uploadToCloud, deleteFile as deleteFromCloud, isCloudConfigured } from './cloudApi';
import { uploadFileToStorage, deleteFileFromStorage } from './r2Storage';

const FOLDERS = 'media_folders';
const FILES = 'media_files';

export { uploadFileToStorage, deleteFileFromStorage };
export const isR2Configured = isCloudConfigured;

// Kept for callers that broadcast after their own writes; the content store
// already refreshes subscribers after every write.
export function notifyMediaChange() {}

function newId(prefix) {
  return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function safeSegment(value) {
  return String(value || 'root').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 80) || 'root';
}

function byName(a, b) {
  return (a.name || '').localeCompare(b.name || '');
}

function newestFirst(a, b) {
  return (b.timestamp || 0) - (a.timestamp || 0);
}

function normalizeFolder(folder, eventId) {
  const parent = folder.parent_folder_id || folder.parentFolderId || null;
  const created = folder.timestamp || folder.created_at || folder.createdAt || folder._createdAt || Date.now();
  const by = folder.created_by || folder.createdBy || 'Admin';
  return {
    ...folder,
    eventId: folder.event_id || eventId,
    event_id: folder.event_id || eventId,
    parentFolderId: parent,
    parent_folder_id: parent,
    createdAt: created,
    timestamp: created,
    createdBy: by,
    created_by: by,
  };
}

function normalizeFile(file, eventId, folderId) {
  const url = file.url || file.fileUrl || '';
  const ts = file.timestamp || file._createdAt || Date.now();
  const by = file.created_by || file.uploaded_by || file.uploadedBy || 'Delegate';
  return {
    ...file,
    fileName: file.name || file.fileName,
    name: file.name || file.fileName,
    fileUrl: url,
    url,
    thumbUrl: file.thumb_url || url,
    thumb_url: file.thumb_url || url,
    displayUrl: file.display_url || url,
    display_url: file.display_url || url,
    fileSize: file.size || 0,
    fileType: file.type || 'image/jpeg',
    type: file.type || 'image/jpeg',
    storagePath: file.storage_path || null,
    storage_path: file.storage_path || null,
    eventId: file.event_id || eventId,
    event_id: file.event_id || eventId,
    folderId: file.folder_id || folderId,
    folder_id: file.folder_id || folderId,
    caption: file.caption || '',
    uploadedAt: ts,
    timestamp: ts,
    uploadedBy: by,
    created_by: by,
  };
}

// ---------------------------------------------------------------- reads
export async function getFolders(eventId, parentFolderId = null) {
  if (!eventId) return [];
  const all = await listContent(FOLDERS, { where: { event_id: eventId } });
  return all
    .filter((f) => (f.parent_folder_id || null) === (parentFolderId || null))
    .map((f) => normalizeFolder(f, eventId))
    .sort(byName);
}

export async function getFiles(eventId, folderId = 'root') {
  if (!eventId) return [];
  const target = folderId || 'root';
  const all = await listContent(FILES, { where: { event_id: eventId, folder_id: target } });
  return all.map((f) => normalizeFile(f, eventId, target)).sort(newestFirst);
}

export function subscribeEventFolders(eventId, parentFolderId = null, callback) {
  if (!eventId) {
    callback([]);
    return () => {};
  }
  return subscribeContent(
    FOLDERS,
    { where: { event_id: eventId } },
    (all) => callback(
      all
        .filter((f) => (f.parent_folder_id || null) === (parentFolderId || null))
        .map((f) => normalizeFolder(f, eventId))
        .sort(byName)
    ),
    (err) => { console.warn('Media folders load note:', err.message); callback([]); }
  );
}

export function subscribeEventFiles(eventId, folderId = 'root', callback) {
  if (!eventId) {
    callback([]);
    return () => {};
  }
  const target = folderId || 'root';
  return subscribeContent(
    FILES,
    { where: { event_id: eventId, folder_id: target } },
    (all) => callback(all.map((f) => normalizeFile(f, eventId, target)).sort(newestFirst)),
    (err) => { console.warn('Media files load note:', err.message); callback([]); }
  );
}

/**
 * Newest uploaded images across all events (used by the gallery shelf).
 * Calls back with [{ id, url, caption, eventId }].
 */
export function subscribeRecentMediaImages(max, callback) {
  return subscribeContent(
    FILES,
    { limit: max * 3 },
    (all) => callback(
      all
        .filter((f) => (f.display_url || f.url) && String(f.type || '').startsWith('image/'))
        .slice(0, max)
        .map((f) => ({ id: f.id, url: f.display_url || f.url, caption: f.caption || '', eventId: f.event_id || '' }))
    ),
    (err) => { console.warn('Recent media load note:', err.message); callback([]); }
  );
}

/** Events that have media, including ones not (or no longer) in the events list. */
export async function listR2EventsWithMedia() {
  try {
    const [files, folders] = await Promise.all([listContent(FILES, { limit: 1000 }), listContent(FOLDERS, { limit: 1000 })]);
    const ids = new Set([...files, ...folders].map((d) => d.event_id).filter(Boolean));
    return [...ids].map((id) => ({
      id,
      title: id.split(/[-_]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      department: 'Festival Event',
      category: 'Event Media',
      banner_url: '/events/circuit_detecitve.jpg',
      hasMediaInR2: true,
    }));
  } catch (err) {
    console.warn('Media event list note:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------- writes (admin)
export async function createMediaFolder(eventId, name, parentFolderId = null, createdBy = 'Admin') {
  if (!eventId || !String(name || '').trim()) {
    throw new Error('Event ID and Folder name are required');
  }
  const folder = {
    id: newId('f_'),
    event_id: eventId,
    parent_folder_id: parentFolderId || null,
    name: String(name).trim(),
    created_by: createdBy,
    timestamp: Date.now(),
  };
  await setContentDoc(FOLDERS, folder.id, folder, { merge: false });
  return folder;
}

export async function uploadEventMedia(eventId, folderId = 'root', file, caption = '', uploadedBy = 'Delegate') {
  if (!eventId || !file) {
    throw new Error('Event ID and file are required');
  }
  const folder = folderId || 'root';
  const uploaded = await uploadToCloud(file, `events/${safeSegment(eventId)}/${safeSegment(folder)}`);
  const record = {
    id: newId('m_'),
    event_id: eventId,
    folder_id: folder,
    name: file.name,
    storage_path: uploaded.key,
    storage_provider: 'cloudflare_r2',
    url: uploaded.url,
    thumb_url: uploaded.url,
    display_url: uploaded.url,
    size: uploaded.size,
    type: uploaded.type,
    caption: caption || '',
    created_by: uploadedBy,
    timestamp: Date.now(),
  };
  await setContentDoc(FILES, record.id, record, { merge: false });
  return record;
}

export async function deleteMediaFile(fileId, storagePath = null) {
  if (!fileId) return;
  if (storagePath) await deleteFromCloud(storagePath).catch((err) => console.warn('R2 delete note:', err.message));
  await deleteContentDoc(FILES, fileId);
}

async function collectFolderTree(eventId, rootFolderId) {
  const all = await listContent(FOLDERS, { where: { event_id: eventId } });
  const ids = [rootFolderId];
  for (let i = 0; i < ids.length; i++) {
    all.filter((f) => f.parent_folder_id === ids[i]).forEach((f) => ids.push(f.id));
  }
  return ids;
}

/** Deletes a folder, its sub-folders, and every file inside them (records and R2 objects). */
export async function deleteMediaFolder(folderId, eventId) {
  if (!folderId || !eventId) return;
  const folderIds = await collectFolderTree(eventId, folderId);
  for (const id of folderIds) {
    const files = await listContent(FILES, { where: { event_id: eventId, folder_id: id } });
    await Promise.all(files.map((f) => deleteMediaFile(f.id, f.storage_path)));
    await deleteContentDoc(FOLDERS, id);
  }
}

/** When an event is deleted, remove all its folders, files and R2 objects. */
export async function cascadeDeleteEventMedia(eventId) {
  if (!eventId) return;
  try {
    const [files, folders] = await Promise.all([
      listContent(FILES, { where: { event_id: eventId }, limit: 1000 }),
      listContent(FOLDERS, { where: { event_id: eventId }, limit: 1000 }),
    ]);
    await Promise.all(files.map((f) => deleteMediaFile(f.id, f.storage_path)));
    await Promise.all(folders.map((f) => deleteContentDoc(FOLDERS, f.id)));
  } catch (err) {
    console.warn(`Media cleanup note for event ${eventId}:`, err.message);
  }
}

// ---------------------------------------------------------------- workflow aliases
export async function createFolder(eventId, parentFolderId, folderName, createdBy = 'Admin') {
  // Supports both (eventId, parentFolderId, folderName) and (eventId, folderName, parentFolderId)
  let parent = null;
  let name = '';
  if (typeof folderName === 'string' && folderName.trim()) {
    parent = parentFolderId || null;
    name = folderName.trim();
  } else if (typeof parentFolderId === 'string' && parentFolderId.trim()) {
    name = parentFolderId.trim();
    parent = typeof folderName === 'string' ? folderName : null;
  }
  return createMediaFolder(eventId, name, parent, createdBy);
}

export function uploadFile(eventId, folderId, file, caption = '', uploadedBy = 'Delegate') {
  return uploadEventMedia(eventId, folderId, file, caption, uploadedBy);
}

export function deleteFile(fileId, storagePath = null) {
  return deleteMediaFile(fileId, storagePath);
}

export function deleteFolder(folderId, eventId) {
  return deleteMediaFolder(folderId, eventId);
}
