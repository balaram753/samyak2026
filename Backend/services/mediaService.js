import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase.js';
import { 
  uploadToR2, 
  deleteFromR2, 
  R2_CONFIG, 
  isR2Configured, 
  listR2EventMedia, 
  listR2EventFolders, 
  listR2EventsWithMedia,
  saveR2Folder,
  deleteR2Folder,
  deleteR2FolderAll,
  deleteR2EventAll,
  uploadFileToStorage,
  deleteFileFromStorage
} from './r2Storage.js';

const FOLDERS_COLLECTION = 'media_folders';
const FILES_COLLECTION = 'media_files';

export { 
  isR2Configured,
  listR2EventMedia,
  listR2EventFolders,
  listR2EventsWithMedia,
  uploadFileToStorage,
  deleteFileFromStorage
};

// Local Storage Keys for fast, offline-first reliability
const LOCAL_FOLDERS_KEY = 'samyak_media_folders';
const LOCAL_FILES_KEY = 'samyak_media_files';

function getLocalFolders() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(LOCAL_FOLDERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalFolders(folders) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(folders));
  } catch (err) {
    console.warn('Could not save folders to localStorage:', err);
  }
}

function getLocalFiles() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const data = localStorage.getItem(LOCAL_FILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalFiles(files) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(files));
  } catch (err) {
    console.warn('Could not save files to localStorage:', err);
  }
}

// Local event emitter and cross-tab BroadcastChannel for real-time multi-tab synchronization
const mediaEvents = new EventTarget();
const mediaChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('samyak_media_bus')
  : null;

export function notifyMediaChange(type = 'files_changed') {
  mediaEvents.dispatchEvent(new Event(type));
  if (mediaChannel) {
    try {
      mediaChannel.postMessage({ type, timestamp: Date.now() });
    } catch {}
  }
}

if (mediaChannel) {
  mediaChannel.onmessage = (e) => {
    if (e.data?.type) {
      mediaEvents.dispatchEvent(new Event(e.data.type));
    }
  };
}

/**
 * Listen to folders for an event scoped to a specific parent folder
 * @param {string} eventId 
 * @param {string|null} parentFolderId null for root folders
 * @param {Function} callback 
 * @returns {Function} unsubscribe function
 */
export function subscribeEventFolders(eventId, parentFolderId = null, callback) {
  if (!eventId) {
    callback([]);
    return () => {};
  }

  // 1. Send local cached folders immediately
  const emitLocal = () => {
    const all = getLocalFolders();
    const filtered = all.filter(
      (f) => f.event_id === eventId && (f.parent_folder_id || null) === (parentFolderId || null)
    );
    filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    callback(filtered);
  };

  emitLocal();

  // 2. Query Cloudflare R2 as authoritative source of truth for folders
  const syncFoldersFromR2 = () => {
    listR2EventFolders(eventId).then((r2Folders) => {
      const validFolders = r2Folders || [];
      const currentLocal = getLocalFolders();
      // Keep folders for other events, replace all folders for THIS event
      const otherFolders = currentLocal.filter((f) => f.event_id !== eventId);
      const updated = [...otherFolders, ...validFolders];
      saveLocalFolders(updated);

      const filtered = validFolders.filter(
        (f) => (f.parent_folder_id || null) === (parentFolderId || null)
      );
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      callback(filtered);
    }).catch(() => {});
  };

  syncFoldersFromR2();

  // Listen to local & cross-tab events
  const handleUpdate = () => {
    emitLocal();
    syncFoldersFromR2();
  };
  mediaEvents.addEventListener('folders_changed', handleUpdate);

  // Background polling every 4 seconds to sync remote deletions across separate devices/sessions
  const folderPollInterval = setInterval(syncFoldersFromR2, 4000);

  // 3. Firestore sync listener
  let unsubFirestore = () => {};
  try {
    const q = query(
      collection(db, FOLDERS_COLLECTION),
      where('event_id', '==', eventId),
      where('parent_folder_id', '==', parentFolderId || null)
    );

    unsubFirestore = onSnapshot(q, (snapshot) => {
      const remote = [];
      snapshot.forEach((docSnap) => {
        remote.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (remote.length > 0) {
        const local = getLocalFolders();
        const mergedMap = new Map();
        local.forEach((f) => mergedMap.set(f.id, f));
        remote.forEach((f) => mergedMap.set(f.id, f));
        const mergedList = Array.from(mergedMap.values());
        saveLocalFolders(mergedList);

        const filtered = mergedList.filter(
          (f) => f.event_id === eventId && (f.parent_folder_id || null) === (parentFolderId || null)
        );
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(filtered);
      }
    }, (error) => {
      console.warn('Firestore folders listener notice:', error.message);
    });
  } catch (err) {
    console.warn('Firestore folders setup notice:', err);
  }

  return () => {
    clearInterval(folderPollInterval);
    mediaEvents.removeEventListener('folders_changed', handleUpdate);
    unsubFirestore();
  };
}

/**
 * Listen to files for an event scoped to a specific folder
 * Directly queries Cloudflare R2 so ANY normal user or visitor sees all uploaded photos!
 * @param {string} eventId 
 * @param {string} folderId 'root' or folder id
 * @param {Function} callback 
 * @returns {Function} unsubscribe function
 */
export function subscribeEventFiles(eventId, folderId = 'root', callback) {
  if (!eventId) {
    callback([]);
    return () => {};
  }

  const targetFolder = folderId || 'root';

  // 1. Send local cached files immediately
  const emitLocal = () => {
    const all = getLocalFiles();
    const filtered = all.filter(
      (f) => f.event_id === eventId && (f.folder_id || 'root') === targetFolder
    );
    filtered.sort((b, a) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(filtered);
  };

  emitLocal();

  // 2. Fetch directly from Cloudflare R2 bucket as authoritative source of truth
  const syncFilesFromR2 = () => {
    listR2EventMedia(eventId, targetFolder).then((r2Files) => {
      const validFiles = r2Files || [];
      const currentLocal = getLocalFiles();
      // Keep files from other events or folders, replace files for THIS event & folder!
      const otherFiles = currentLocal.filter(
        (f) => !(f.event_id === eventId && (f.folder_id || 'root') === targetFolder)
      );
      const updated = [...otherFiles, ...validFiles];
      saveLocalFiles(updated);

      const filtered = validFiles.slice();
      filtered.sort((b, a) => (a.timestamp || 0) - (b.timestamp || 0));
      callback(filtered);
    }).catch((err) => {
      console.warn('R2 direct media sync note:', err);
    });
  };

  syncFilesFromR2();

  // Listen to local & cross-tab events
  const handleUpdate = () => {
    emitLocal();
    syncFilesFromR2();
  };
  mediaEvents.addEventListener('files_changed', handleUpdate);

  // Background polling every 4 seconds to sync remote deletions across separate devices/sessions
  const filePollInterval = setInterval(syncFilesFromR2, 4000);

  // 3. Firestore sync in background
  let unsubFirestore = () => {};
  try {
    const q = query(
      collection(db, FILES_COLLECTION),
      where('event_id', '==', eventId),
      where('folder_id', '==', targetFolder)
    );

    unsubFirestore = onSnapshot(q, (snapshot) => {
      const remote = [];
      snapshot.forEach((docSnap) => {
        remote.push({ id: docSnap.id, ...docSnap.data() });
      });

      if (remote.length > 0) {
        const local = getLocalFiles();
        const mergedMap = new Map();
        local.forEach((f) => mergedMap.set(f.id, f));
        remote.forEach((f) => mergedMap.set(f.id, f));
        const mergedList = Array.from(mergedMap.values());
        saveLocalFiles(mergedList);

        const filtered = mergedList.filter(
          (f) => f.event_id === eventId && (f.folder_id || 'root') === targetFolder
        );
        filtered.sort((b, a) => (a.timestamp || 0) - (b.timestamp || 0));
        callback(filtered);
      }
    }, (error) => {
      console.warn('Firestore files listener notice:', error.message);
    });
  } catch (err) {
    console.warn('Firestore files setup notice:', err);
  }

  return () => {
    clearInterval(filePollInterval);
    mediaEvents.removeEventListener('files_changed', handleUpdate);
    unsubFirestore();
  };
}

/**
 * Create a new folder inside an event
 */
export async function createMediaFolder(eventId, name, parentFolderId = null, createdBy = 'Admin') {
  if (!eventId || !name.trim()) {
    throw new Error('Event ID and Folder name are required');
  }

  const folderId = 'f_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const folderData = {
    id: folderId,
    event_id: eventId,
    parent_folder_id: parentFolderId || null,
    name: name.trim(),
    created_by: createdBy,
    timestamp: Date.now(),
  };

  // 1. Save locally immediately
  const local = getLocalFolders();
  local.push(folderData);
  saveLocalFolders(local);
  notifyMediaChange('folders_changed');

  // 2. Save directly to Cloudflare R2 (Guarantees normal users & delegates see the folder)
  await saveR2Folder(eventId, folderData).catch(console.warn);

  // 3. Non-blocking Firestore sync (safe if adblocker blocks Firestore)
  try {
    const folderRef = doc(db, FOLDERS_COLLECTION, folderId);
    await setDoc(folderRef, { ...folderData, created_at: serverTimestamp() });
  } catch (fsErr) {
    console.warn('Firestore folder sync note (saved in Cloudflare R2):', fsErr.message);
  }

  return folderData;
}

/**
 * Upload a media file scoped to {event_id}/{folder_id} directly to Cloudflare R2
 */
export async function uploadEventMedia(eventId, folderId = 'root', file, caption = '', uploadedBy = 'Delegate') {
  if (!eventId || !file) {
    throw new Error('Event ID and file are required');
  }

  const normalizedFolder = folderId || 'root';
  const timestamp = Date.now();
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `events/${eventId}/${normalizedFolder}/${timestamp}-${safeFileName}`;

  // 1. Direct Upload to Cloudflare R2 S3 Bucket
  const r2Res = await uploadToR2(file, storagePath);
  const uploadUrl = r2Res.url;

  const fileId = 'm_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);
  const fileData = {
    id: fileId,
    event_id: eventId,
    folder_id: normalizedFolder,
    name: file.name,
    storage_path: storagePath,
    storage_provider: 'cloudflare_r2',
    url: uploadUrl,
    thumb_url: uploadUrl,
    display_url: uploadUrl,
    delete_url: null,
    size: file.size,
    type: file.type || 'image/jpeg',
    caption: caption || '',
    created_by: uploadedBy,
    timestamp: timestamp,
  };

  // 2. Save locally immediately so UI updates instantly
  const local = getLocalFiles();
  local.unshift(fileData);
  saveLocalFiles(local);
  notifyMediaChange('files_changed');

  // 3. Non-blocking Firestore sync (safe if adblocker blocks Firestore)
  try {
    const fileRef = doc(db, FILES_COLLECTION, fileId);
    await setDoc(fileRef, { ...fileData, uploaded_at: serverTimestamp() });
  } catch (fsErr) {
    console.warn('Firestore file metadata sync note (file safely stored in Cloudflare R2):', fsErr.message);
  }

  return fileData;
}

/**
 * Delete a single media file record
 */
export async function deleteMediaFile(fileId, storagePath = null) {
  if (!fileId) return;

  // 1. Delete from Cloudflare R2
  if (storagePath) {
    await deleteFromR2(storagePath).catch(console.warn);
  }

  // 2. Delete locally immediately
  const local = getLocalFiles().filter((f) => f.id !== fileId && (!storagePath || f.storage_path !== storagePath));
  saveLocalFiles(local);
  notifyMediaChange('files_changed');

  // 3. Non-blocking Firestore deletion
  try {
    const fileRef = doc(db, FILES_COLLECTION, fileId);
    await deleteDoc(fileRef);
  } catch (fsErr) {
    console.warn('Firestore file delete note:', fsErr.message);
  }
}

/**
 * Recursively delete a folder and all its child folders and files
 */
export async function deleteMediaFolder(folderId, eventId) {
  if (!folderId || !eventId) return;

  // 1. Delete from Cloudflare R2 (removes manifest entry, .keep marker, and all files in folder)
  await deleteR2FolderAll(eventId, folderId).catch(console.warn);

  // 2. Delete local files inside this folder
  const allFiles = getLocalFiles();
  const remainingFiles = allFiles.filter((f) => !(f.event_id === eventId && f.folder_id === folderId));
  saveLocalFiles(remainingFiles);

  // 3. Delete local folders
  const allFolders = getLocalFolders();
  const remainingFolders = allFolders.filter((f) => !(f.event_id === eventId && (f.id === folderId || f.parent_folder_id === folderId)));
  saveLocalFolders(remainingFolders);

  // 4. Broadcast to all open tabs and windows
  notifyMediaChange('folders_changed');
  notifyMediaChange('files_changed');

  // 5. Background Firestore cleanup
  try {
    const filesQuery = query(
      collection(db, FILES_COLLECTION),
      where('event_id', '==', eventId),
      where('folder_id', '==', folderId)
    );
    const filesSnap = await getDocs(filesQuery);
    await Promise.all(filesSnap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, FOLDERS_COLLECTION, folderId));
  } catch (err) {
    console.warn('Firestore folder cleanup note:', err.message);
  }
}

/**
 * Cascade deletion: when an event is deleted, remove all its folders, files, and gallery items
 */
export async function cascadeDeleteEventMedia(eventId) {
  if (!eventId) return;

  // 1. Delete all R2 storage objects for this event
  await deleteR2EventAll(eventId).catch(console.warn);

  // 2. Clean local state
  const remainingFolders = getLocalFolders().filter((f) => f.event_id !== eventId);
  saveLocalFolders(remainingFolders);

  const remainingFiles = getLocalFiles().filter((f) => f.event_id !== eventId);
  saveLocalFiles(remainingFiles);

  notifyMediaChange('folders_changed');
  notifyMediaChange('files_changed');

  // 3. Background Firestore cleanup
  try {
    const foldersQ = query(collection(db, FOLDERS_COLLECTION), where('event_id', '==', eventId));
    const foldersSnap = await getDocs(foldersQ);
    await Promise.all(foldersSnap.docs.map((d) => deleteDoc(d.ref)));

    const filesQ = query(collection(db, FILES_COLLECTION), where('event_id', '==', eventId));
    const filesSnap = await getDocs(filesQ);
    await Promise.all(filesSnap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    console.warn(`Cascade deletion note for event ${eventId}:`, err.message);
  }
}

/**
 * Workflow Spec: getFolders(eventId, parentFolderId = null)
 * Queries media_folders and Cloudflare R2 manifest for active event & folder level
 */
export async function getFolders(eventId, parentFolderId = null) {
  if (!eventId) return [];

  // Authoritative query to Cloudflare R2
  const r2Folders = await listR2EventFolders(eventId).catch(() => []);
  const validFolders = r2Folders || [];

  // Keep local storage synchronized
  const currentLocal = getLocalFolders();
  const otherFolders = currentLocal.filter((f) => (f.event_id || f.eventId) !== eventId);
  const updated = [...otherFolders, ...validFolders];
  saveLocalFolders(updated);

  const filtered = validFolders.filter(
    (f) => (f.parent_folder_id || f.parentFolderId || null) === (parentFolderId || null)
  );

  return filtered
    .map((folder) => ({
      id: folder.id,
      name: folder.name,
      eventId: folder.event_id || folder.eventId || eventId,
      event_id: folder.event_id || folder.eventId || eventId,
      parentFolderId: folder.parent_folder_id || folder.parentFolderId || null,
      parent_folder_id: folder.parent_folder_id || folder.parentFolderId || null,
      createdAt: folder.created_at || folder.createdAt || folder.timestamp || Date.now(),
      timestamp: folder.timestamp || folder.created_at || folder.createdAt || Date.now(),
      createdBy: folder.created_by || folder.createdBy || 'Admin',
      created_by: folder.created_by || folder.createdBy || 'Admin',
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Workflow Spec: getFiles(eventId, folderId = 'root')
 * Queries media_files and Cloudflare R2 storage for active event & folder level
 */
export async function getFiles(eventId, folderId = 'root') {
  if (!eventId) return [];
  const targetFolder = folderId || 'root';

  const r2Files = await listR2EventMedia(eventId, targetFolder).catch(() => []);
  const validFiles = r2Files || [];

  // Keep local storage synchronized
  const currentLocal = getLocalFiles();
  const otherFiles = currentLocal.filter(
    (f) => !((f.event_id || f.eventId) === eventId && (f.folder_id || f.folderId || 'root') === targetFolder)
  );
  const updated = [...otherFiles, ...validFiles];
  saveLocalFiles(updated);

  return validFiles
    .map((file) => ({
      id: file.id,
      fileName: file.name || file.fileName,
      name: file.name || file.fileName,
      fileUrl: file.url || file.fileUrl,
      url: file.url || file.fileUrl,
      thumbUrl: file.thumb_url || file.thumbUrl || file.url || file.fileUrl,
      thumb_url: file.thumb_url || file.thumbUrl || file.url || file.fileUrl,
      displayUrl: file.display_url || file.displayUrl || file.url || file.fileUrl,
      display_url: file.display_url || file.displayUrl || file.url || file.fileUrl,
      fileSize: file.size || file.fileSize || 0,
      size: file.size || file.fileSize || 0,
      fileType: file.type || file.fileType || 'image/jpeg',
      type: file.type || file.fileType || 'image/jpeg',
      storagePath: file.storage_path || file.storagePath,
      storage_path: file.storage_path || file.storagePath,
      eventId: file.event_id || file.eventId || eventId,
      event_id: file.event_id || file.eventId || eventId,
      folderId: file.folder_id || file.folderId || targetFolder,
      folder_id: file.folder_id || file.folderId || targetFolder,
      caption: file.caption || '',
      uploadedAt: file.timestamp || file.uploaded_at || file.uploadedAt || Date.now(),
      timestamp: file.timestamp || file.uploaded_at || file.uploadedAt || Date.now(),
      uploadedBy: file.created_by || file.uploaded_by || file.uploadedBy || 'Delegate',
      created_by: file.created_by || file.uploaded_by || file.uploadedBy || 'Delegate',
    }))
    .sort((b, a) => (a.timestamp || 0) - (b.timestamp || 0));
}

/**
 * Workflow Spec: createFolder(eventId, parentFolderId, folderName)
 */
export async function createFolder(eventId, parentFolderId, folderName, createdBy = 'Admin') {
  // Support both (eventId, parentFolderId, folderName) and (eventId, folderName, parentFolderId)
  let pId = null;
  let name = '';

  if (typeof folderName === 'string' && folderName.trim()) {
    pId = parentFolderId || null;
    name = folderName.trim();
  } else if (typeof parentFolderId === 'string' && parentFolderId.trim()) {
    name = parentFolderId.trim();
    pId = (typeof folderName === 'string' ? folderName : null);
  }

  return await createMediaFolder(eventId, name, pId, createdBy);
}

/**
 * Workflow Spec: uploadFile(eventId, folderId, file)
 */
export async function uploadFile(eventId, folderId, file, caption = '', uploadedBy = 'Delegate') {
  return await uploadEventMedia(eventId, folderId, file, caption, uploadedBy);
}

/**
 * Workflow Spec: deleteFile(fileId, storagePath)
 */
export async function deleteFile(fileId, storagePath = null) {
  return await deleteMediaFile(fileId, storagePath);
}

/**
 * Workflow Spec: deleteFolder(folderId, eventId)
 */
export async function deleteFolder(folderId, eventId) {
  return await deleteMediaFolder(folderId, eventId);
}

