/**
 * File Security, Input Sanitization, Masking & Rate-Limiting Service
 * Hardened for SAMYAK 2026 Production Security Standards
 */

// 1. Allowed MIME types and extensions
export const ALLOWED_FILE_CONFIG = {
  id_cards: {
    maxSize: 10 * 1024 * 1024, // 10MB (camera photos)
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'],
  },
  payment_proofs: {
    maxSize: 10 * 1024 * 1024, // 10MB
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'],
  },
  payments: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'],
  },
  avatars: {
    maxSize: 5 * 1024 * 1024, // 5MB
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  general: {
    maxSize: 10 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'],
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'],
  }
};

// Forbidden extensions that must never be uploaded
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'html', 'htm', 'js', 
  'jsx', 'ts', 'tsx', 'svg', 'xml', 'jar', 'vbs', 'ps1', 'msi'
];

/**
 * Validates an uploaded File against MIME, extension, and size limits.
 * Returns { isValid: true } on success or throws/returns { isValid: false, error }
 */
export function validateUploadedFile(file, category = 'general') {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const config = ALLOWED_FILE_CONFIG[category] || ALLOWED_FILE_CONFIG.general;

  // 1. File Size Check
  if (file.size > config.maxSize) {
    const maxMb = Math.round(config.maxSize / (1024 * 1024));
    throw new Error(`File is too large. Maximum allowed size is ${maxMb}MB.`);
  }

  // 2. Extension Check
  const rawName = file.name || '';
  const extParts = rawName.split('.');
  const ext = (extParts.length > 1 ? extParts.pop() : '').toLowerCase().trim();

  if (ext && DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new Error('This file format is prohibited for security reasons.');
  }

  if (ext && !config.extensions.includes(ext)) {
    throw new Error(`Invalid file format. Allowed formats: ${config.extensions.join(', ').toUpperCase()}.`);
  }

  // 3. MIME Type Check (Allow if mime is blank or generic octet-stream as long as extension is valid)
  const mime = (file.type || '').toLowerCase().trim();
  if (mime && mime !== 'application/octet-stream' && !config.mimeTypes.includes(mime)) {
    // If extension matches, accept it despite unusual MIME string
    if (!config.extensions.includes(ext)) {
      throw new Error(`Invalid file type (${mime}). Only safe image and document files are accepted.`);
    }
  }

  return { isValid: true };
}

/**
 * Generates an unpredictable, cryptographically safe storage key.
 * Prevents client path traversal and directory guessing.
 * Flexible signature accepting (folder, filename) or (file, folder).
 */
export function generateSafeStorageKey(folderOrFile = 'uploads', originalFileNameOrCategory = 'file.png') {
  let folder = 'uploads';
  let originalFileName = 'file.png';

  if (typeof folderOrFile === 'string') {
    folder = folderOrFile;
    if (typeof originalFileNameOrCategory === 'string') {
      originalFileName = originalFileNameOrCategory;
    } else if (originalFileNameOrCategory && typeof originalFileNameOrCategory === 'object') {
      originalFileName = originalFileNameOrCategory.name || 'file.png';
    }
  } else if (folderOrFile && typeof folderOrFile === 'object') {
    originalFileName = folderOrFile.name || 'file.png';
    folder = typeof originalFileNameOrCategory === 'string' ? originalFileNameOrCategory : 'uploads';
  }

  const extParts = (originalFileName || '').split('.');
  let ext = (extParts.length > 1 ? extParts.pop() : 'png').toLowerCase().trim();
  if (!/^[a-z0-9]+$/.test(ext) || DANGEROUS_EXTENSIONS.includes(ext)) {
    ext = 'png';
  }

  let randomHex = '';
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    randomHex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    randomHex = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${safeFolder}/${Date.now()}-${randomHex}.${ext}`;
}

/**
 * Strips HTML tags, script injection, and control characters from text input.
 */
export function sanitizeText(input = '') {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"'&]/g, (char) => {
      switch (char) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        case '&': return '&amp;';
        default: return char;
      }
    })
    .trim();
}

/**
 * Mask sensitive UPI UTR transaction ID for display (e.g., XXXXXX1234).
 */
export function maskUtr(utr) {
  if (!utr || typeof utr !== 'string') return '—';
  const clean = utr.trim();
  if (clean.length <= 4) return '****';
  return 'XXXXXX' + clean.slice(-4);
}

/**
 * Mask sensitive student phone number for display (e.g., ******7727).
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '—';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 4) return '******';
  return '******' + clean.slice(-4);
}

/**
 * In-memory client rate limiter to prevent rapid submission spam and token guessing.
 */
const rateLimitBuckets = new Map();

export function checkRateLimit(actionKey, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(actionKey) || [];

  // Prune timestamps older than window
  const validTimestamps = bucket.filter((time) => now - time < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const waitSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    throw new Error(`Too many attempts. Please wait ${waitSec} seconds before trying again.`);
  }

  validTimestamps.push(now);
  rateLimitBuckets.set(actionKey, validTimestamps);
  return true;
}
