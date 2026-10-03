// SAMYAK 2026 API on Cloudflare.
//   /api/content/...  JSON documents in D1 (events, site content, media lists, ...)
//   /api/upload       files into R2 (the only file store)
//   /api/files        delete a file from R2
// Firebase is used only to identify the caller (see auth.js).

import {
  resolveCaller, isCoreInviteActive, ADMIN_ROLES, CLUB_ROLES, CONTENT_ROLES, DESK_ROLES,
} from './auth.js';

// ---------------------------------------------------------------- access policy
const anyone = () => true;
const signedIn = (c) => Boolean(c.uid);
const admin = (c) => ADMIN_ROLES.includes(c.role);
const clubStaff = (c) => CLUB_ROLES.includes(c.role);
const contentEditor = (c) => CONTENT_ROLES.includes(c.role);
const desk = (c) => DESK_ROLES.includes(c.role);
const superAdmin = (c) => c.role === 'super_admin';

const COLLECTIONS = {
  events:                 { read: anyone, create: contentEditor, update: contentEditor, delete: contentEditor },
  workshops:              { read: anyone, create: contentEditor, update: contentEditor, delete: contentEditor },
  workshop_registrations: { read: desk,   create: signedIn,      update: desk,          delete: admin },
  site_content:           { read: anyone, create: contentEditor, update: contentEditor, delete: contentEditor },
  team_public:            { read: anyone, create: admin,         update: admin,         delete: admin },
  team_members:           { read: anyone, create: admin,         update: admin,         delete: admin },
  media_folders:          { read: anyone, create: contentEditor, update: contentEditor, delete: contentEditor },
  media_files:            { read: anyone, create: signedIn,      update: contentEditor, delete: contentEditor },
  gallery_photos:         { read: anyone, create: signedIn,      update: contentEditor, delete: contentEditor },
  inquiries:              { read: admin,  create: anyone,        update: admin,         delete: admin },
  club_reports:           { read: clubStaff, create: clubStaff,  update: clubStaff,     delete: clubStaff },
};

// Upload folders: who may upload and which file types.
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
const DOC_TYPES = [...IMAGE_TYPES, 'application/pdf'];
const UPLOAD_FOLDERS = {
  avatars:            { who: 'signed-in-or-core-invite', types: IMAGE_TYPES, maxMb: 5 },
  id_cards:           { who: 'signed-in', types: DOC_TYPES, maxMb: 10 },
  payment_proofs:     { who: 'signed-in', types: DOC_TYPES, maxMb: 10 },
  payments:           { who: 'signed-in', types: DOC_TYPES, maxMb: 10 },
  gallery:            { who: 'signed-in', types: IMAGE_TYPES, maxMb: 10 },
  banners:            { who: 'content', types: IMAGE_TYPES, maxMb: 10 },
  event_gallery:      { who: 'content', types: IMAGE_TYPES, maxMb: 10 },
  logos:              { who: 'content', types: IMAGE_TYPES, maxMb: 5 },
  sponsors:           { who: 'content', types: IMAGE_TYPES, maxMb: 5 },
  images:             { who: 'content', types: IMAGE_TYPES, maxMb: 10 },
  events:             { who: 'content', types: [...IMAGE_TYPES, 'video/mp4', 'video/webm'], maxMb: 100 },
  reports:            { who: 'club', types: ['text/csv', 'application/pdf'], maxMb: 10 },
  workshops:              { who: 'content', types: IMAGE_TYPES, maxMb: 10 },
  workshop_posters:       { who: 'content', types: IMAGE_TYPES, maxMb: 10 },
  workshop_qr:            { who: 'content', types: IMAGE_TYPES, maxMb: 5 },
  workshop_payment_qrs:   { who: 'content', types: IMAGE_TYPES, maxMb: 5 },
  workshop_payments:      { who: 'signed-in', types: DOC_TYPES, maxMb: 10 },
  workshop_payment_proofs:{ who: 'signed-in', types: DOC_TYPES, maxMb: 10 },
};

// ID cards and payment proofs are never served from the public bucket URL:
// they go to the PRIVATE_FILES bucket (no public access) and are downloaded
// through /api/private-files/<key>, which only the uploader, admins and the
// registrations desk can read.
const PRIVATE_FOLDERS = ['id_cards', 'payment_proofs', 'payments', 'workshop_payments', 'workshop_payment_proofs'];
const PRIVATE_PREFIX = '/api/private-files/';
// Folders the events admin may delete files from (public event content only).
const CONTENT_FOLDERS = [
  'banners', 'event_gallery', 'logos', 'sponsors', 'images', 'events', 
  'workshops', 'workshop_posters', 'workshop_qr', 'workshop_payment_qrs'
];

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/avif': 'avif', 'application/pdf': 'pdf', 'text/csv': 'csv', 'video/mp4': 'mp4', 'video/webm': 'webm',
};

const MAX_DOC_BYTES = 200_000;

// ---------------------------------------------------------------- helpers
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Core-Invite',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };

  if (origin && (allowed.includes(origin) || isTrustedOrigin(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// Exact host checks only: `endsWith('klsamyak.in')` would also accept
// `evilklsamyak.in`, and any `*.workers.dev` site can be deployed by anyone.
function isTrustedOrigin(origin) {
  let url;
  try { url = new URL(origin); } catch { return false; }
  const host = url.hostname;
  if (url.protocol === 'https:' && (
    host === 'klsamyak.in' || host.endsWith('.klsamyak.in') ||
    host === 'nirva-7e226.web.app' || host === 'nirva-7e226.firebaseapp.com'
  )) return true;
  return url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1');
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function requirePolicy(check, caller) {
  if (check(caller)) return;
  throw new HttpError(caller.uid ? 403 : 401, caller.uid ? 'Not allowed.' : 'Sign in required.');
}

function checkCollection(name) {
  const policy = COLLECTIONS[name];
  if (!policy) throw new HttpError(404, 'Unknown collection.');
  return policy;
}

function checkId(id) {
  if (!/^[A-Za-z0-9_.:@-]{1,160}$/.test(id)) throw new HttpError(400, 'Invalid document id.');
  return id;
}

async function readJsonBody(request) {
  const text = await request.text();
  if (text.length > MAX_DOC_BYTES * 60) throw new HttpError(413, 'Request too large.');
  try { return JSON.parse(text || '{}'); } catch { throw new HttpError(400, 'Invalid JSON.'); }
}

function checkData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Document must be an object.');
  const encoded = JSON.stringify(data);
  if (encoded.length > MAX_DOC_BYTES) throw new HttpError(413, 'Document too large.');
  return encoded;
}

function rowToDoc(row) {
  return { id: row.id, ...JSON.parse(row.data), _createdAt: row.created_at, _updatedAt: row.updated_at };
}

function newId(prefix = '') {
  return prefix + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

const INQUIRY_LIMITS = { name: 80, email: 120, phone: 20, subject: 150, message: 2000 };

// Only the known contact-form fields, each a bounded string.
function checkInquiry(data) {
  const out = {};
  for (const [field, max] of Object.entries(INQUIRY_LIMITS)) {
    const value = data[field];
    if (value === undefined || value === null || value === '') continue;
    if (typeof value !== 'string' || value.length > max) {
      throw new HttpError(400, `"${field}" must be text of at most ${max} characters.`);
    }
    out[field] = value.trim();
  }
  if (!out.name || !out.message) throw new HttpError(400, 'Name and message are required.');
  if (out.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new HttpError(400, 'Invalid email.');
  out.submittedAt = Date.now();
  return out;
}

// One inquiry per IP per minute, and at most 500 new inquiries per hour overall.
async function limitInquiries(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const recent = await env.DB.prepare(
    `SELECT
       SUM(CASE WHEN json_extract(data, '$.ip') = ? AND created_at > ? THEN 1 ELSE 0 END) AS mine,
       SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS total
     FROM docs WHERE collection = 'inquiries' AND created_at > ?`
  ).bind(ip, now - 60_000, now - 3_600_000, now - 3_600_000).first();
  if ((recent?.mine || 0) >= 1) throw new HttpError(429, 'Please wait a minute before sending another message.');
  if ((recent?.total || 0) >= 500) throw new HttpError(429, 'The contact form is busy. Please try again later.');
  return ip;
}

// ---------------------------------------------------------------- content handlers
async function listDocs(env, collection, url) {
  const where = [];
  const binds = [collection];
  for (const [key, value] of url.searchParams) {
    if (!key.startsWith('where.')) continue;
    const field = key.slice(6);
    if (!/^[A-Za-z0-9_]{1,64}$/.test(field)) throw new HttpError(400, 'Invalid filter field.');
    where.push(`json_extract(data, '$.${field}') = ?`);
    binds.push(value);
  }
  const limit = Math.min(Number(url.searchParams.get('limit')) || 500, 1000);
  const sql = `SELECT id, data, created_at, updated_at FROM docs WHERE collection = ?${where.map((w) => ` AND ${w}`).join('')} ORDER BY updated_at DESC LIMIT ${limit}`;
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return results.map(rowToDoc);
}

async function getDocById(env, collection, id) {
  const row = await env.DB.prepare('SELECT id, data, created_at, updated_at FROM docs WHERE collection = ? AND id = ?')
    .bind(collection, id).first();
  return row ? rowToDoc(row) : null;
}

const PRIVATE_FIELDS = ['createdByUid', 'ip'];

function publicView(doc) {
  const out = { ...doc };
  for (const field of PRIVATE_FIELDS) delete out[field];
  return out;
}

function stripMeta(data) {
  const { id: _id, _createdAt, _updatedAt, ...rest } = data;
  return rest;
}

async function putDoc(env, collection, id, data, merge) {
  const now = Date.now();
  let next = stripMeta(data);
  const existing = await getDocById(env, collection, id);
  if (merge && existing) next = { ...stripMeta(existing), ...next };
  const encoded = checkData(next);
  await env.DB.prepare(
    `INSERT INTO docs (collection, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
  ).bind(collection, id, encoded, existing?._createdAt || now, now).run();
  return { id, ...next, _createdAt: existing?._createdAt || now, _updatedAt: now };
}

async function handleContent(request, env, url, caller) {
  // /api/content/:collection[/:id]
  const [, , , collection, rawId] = url.pathname.split('/');
  const policy = checkCollection(collection);
  const id = rawId ? checkId(decodeURIComponent(rawId)) : null;

  if (request.method === 'GET') {
    requirePolicy(policy.read, caller);
    // Public responses are cached and seen by anyone: never include uploader ids.
    const isPublicView = policy.read === anyone && !admin(caller);
    const cache = { 'Cache-Control': isPublicView ? 'public, max-age=10' : 'no-store' };
    const view = isPublicView ? publicView : (d) => d;
    if (!id) return json((await listDocs(env, collection, url)).map(view), 200, cache);
    const doc = await getDocById(env, collection, id);
    return doc ? json(view(doc), 200, cache) : json({ error: 'Not found.' }, 404);
  }

  if (request.method === 'POST' && !id) {
    requirePolicy(policy.create, caller);
    const body = await readJsonBody(request);
    let data = { ...(body.data || {}) };
    if (collection === 'inquiries') {
      // Public contact form: keep it small and never trust client-side flags.
      data = checkInquiry(data);
      data.ip = await limitInquiries(request, env);
      data.status = 'new';
    }
    if (caller.uid) data.createdByUid = caller.uid;
    return json(await putDoc(env, collection, newId(), data, false), 201);
  }

  if (request.method === 'PUT' && id) {
    const existing = await getDocById(env, collection, id);
    requirePolicy(existing ? policy.update : policy.create, caller);
    const body = await readJsonBody(request);
    return json(await putDoc(env, collection, id, body.data || {}, body.merge !== false));
  }

  if (request.method === 'DELETE' && id) {
    requirePolicy(policy.delete, caller);
    await env.DB.prepare('DELETE FROM docs WHERE collection = ? AND id = ?').bind(collection, id).run();
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed.');
}

// One-time copy of existing Firestore content (super admin only).
async function handleImport(request, env, caller) {
  requirePolicy((c) => c.role === 'super_admin', caller);
  const { collection, docs } = await readJsonBody(request);
  checkCollection(collection);
  if (!Array.isArray(docs) || docs.length > 200) throw new HttpError(400, 'Send up to 200 docs per batch.');
  const now = Date.now();
  const statements = docs.map((d) => {
    const id = checkId(String(d.id));
    return env.DB.prepare(
      `INSERT INTO docs (collection, id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`
    ).bind(collection, id, checkData(stripMeta(d.data || {})), now, now);
  });
  if (statements.length) await env.DB.batch(statements);
  return json({ ok: true, imported: statements.length });
}

// ---------------------------------------------------------------- files
async function handleUpload(request, env, caller) {
  const form = await request.formData();
  const file = form.get('file');
  const folderPath = String(form.get('folder') || '').replace(/^\/+|\/+$/g, '');
  if (!(file instanceof File)) throw new HttpError(400, 'No file.');

  // First segment decides the policy; sub-folders (events/<id>/<folder>) are sanitised.
  const segments = folderPath.split('/').filter(Boolean);
  const rule = UPLOAD_FOLDERS[segments[0]];
  if (!rule) throw new HttpError(400, 'Unknown upload folder.');
  if (segments.some((s) => !/^[A-Za-z0-9_-]{1,80}$/.test(s)) || segments.length > 4) {
    throw new HttpError(400, 'Invalid folder path.');
  }

  if (rule.who === 'admin') requirePolicy(admin, caller);
  else if (rule.who === 'content') requirePolicy(contentEditor, caller);
  else if (rule.who === 'club') requirePolicy(clubStaff, caller);
  else if (rule.who === 'signed-in') requirePolicy(signedIn, caller);
  else if (rule.who === 'signed-in-or-core-invite' && !caller.uid) {
    if (!(await isCoreInviteActive(env, request.headers.get('X-Core-Invite')))) {
      throw new HttpError(401, 'Sign in or use an active registration link.');
    }
  }

  const type = (file.type || '').toLowerCase();
  if (!rule.types.includes(type)) throw new HttpError(415, 'This file type is not allowed here.');
  if (file.size > rule.maxMb * 1024 * 1024) throw new HttpError(413, `File is larger than ${rule.maxMb} MB.`);

  const isPrivate = PRIVATE_FOLDERS.includes(segments[0]);
  const key = `${segments.join('/')}/${Date.now()}-${crypto.randomUUID()}.${EXT[type]}`;
  await (isPrivate ? privateBucket(env) : env.FILES).put(key, file.stream(), {
    httpMetadata: {
      contentType: type,
      cacheControl: isPrivate ? 'private, no-store' : 'public, max-age=31536000, immutable',
    },
    customMetadata: { uploadedBy: caller.uid || 'core-invite', originalName: String(file.name || '').slice(0, 120) },
  });
  const url = isPrivate
    ? `${new URL(request.url).origin}${PRIVATE_PREFIX}${key}`
    : `${String(env.PUBLIC_FILES_URL || '').replace(/\/$/, '')}/${key}`;
  return json({ key, url, size: file.size, type, private: isPrivate }, 201);
}

function privateBucket(env) {
  if (!env.PRIVATE_FILES) throw new HttpError(503, 'Private storage is not configured.');
  return env.PRIVATE_FILES;
}

// Staff who review registrations and the student who uploaded the file.
async function handlePrivateFile(env, url, caller) {
  requirePolicy(signedIn, caller);
  const key = decodeURIComponent(url.pathname.slice(PRIVATE_PREFIX.length));
  if (!PRIVATE_FOLDERS.includes(key.split('/')[0]) || key.includes('..')) throw new HttpError(400, 'Invalid key.');
  const object = await privateBucket(env).get(key);
  if (!object) throw new HttpError(404, 'Not found.');
  if (!desk(caller) && object.customMetadata?.uploadedBy !== caller.uid) throw new HttpError(403, 'Not allowed.');
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function handleDeleteFile(env, url, caller) {
  const key = url.searchParams.get('key') || '';
  if (!key || key.includes('..') || key.startsWith('/')) throw new HttpError(400, 'Invalid key.');
  requirePolicy(CONTENT_FOLDERS.includes(key.split('/')[0]) ? contentEditor : admin, caller);
  await (PRIVATE_FOLDERS.includes(key.split('/')[0]) ? privateBucket(env) : env.FILES).delete(key);
  return json({ ok: true });
}

// One-off migration (super admin): copy legacy ID cards / payment proofs from
// the public bucket into PRIVATE_FILES under the same key. Copy only: nothing
// is ever deleted here. Body: { prefix, cursor?, dryRun = true, limit = 100 }.
async function handleR2Migration(request, env, caller) {
  requirePolicy(superAdmin, caller);
  const body = await readJsonBody(request);
  const prefix = String(body.prefix || '');
  if (!PRIVATE_FOLDERS.includes(prefix.replace(/\/$/, ''))) throw new HttpError(400, 'Unknown prefix.');
  const dryRun = body.dryRun !== false;
  const target = privateBucket(env);
  const listing = await env.FILES.list({
    prefix: `${prefix.replace(/\/$/, '')}/`,
    cursor: body.cursor || undefined,
    limit: Math.min(Number(body.limit) || 100, 500),
  });
  const copied = [];
  const alreadyPrivate = [];
  for (const item of listing.objects) {
    if (await target.head(item.key)) { alreadyPrivate.push(item.key); continue; }
    if (dryRun) { copied.push(item.key); continue; }
    const source = await env.FILES.get(item.key);
    if (!source) continue;
    await target.put(item.key, source.body, {
      httpMetadata: { contentType: source.httpMetadata?.contentType, cacheControl: 'private, no-store' },
      customMetadata: { ...source.customMetadata, migratedFrom: 'public' },
    });
    copied.push(item.key);
  }
  return json({
    dryRun, prefix, listed: listing.objects.length, copied, alreadyPrivate,
    cursor: listing.truncated ? listing.cursor : null,
  }, 200, { 'Cache-Control': 'no-store' });
}

// ---------------------------------------------------------------- router
export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    let response;
    try {
      if (url.pathname === '/api/health') {
        response = json({ ok: true });
      } else {
        const caller = await resolveCaller(request, env);
        if (url.pathname === '/api/content/_import' && request.method === 'POST') {
          response = await handleImport(request, env, caller);
        } else if (url.pathname.startsWith('/api/content/')) {
          response = await handleContent(request, env, url, caller);
        } else if (url.pathname === '/api/upload' && request.method === 'POST') {
          response = await handleUpload(request, env, caller);
        } else if (url.pathname === '/api/admin/r2-migrate-private' && request.method === 'POST') {
          response = await handleR2Migration(request, env, caller);
        } else if (url.pathname.startsWith(PRIVATE_PREFIX) && request.method === 'GET') {
          response = await handlePrivateFile(env, url, caller);
        } else if (url.pathname === '/api/files' && request.method === 'DELETE') {
          response = await handleDeleteFile(env, url, caller);
        } else {
          response = json({ error: 'Not found.' }, 404);
        }
      }
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      response = json({ error: status === 500 ? 'Server error.' : err.message }, status);
    }

    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(response.body, { status: response.status, headers });
  },
};
