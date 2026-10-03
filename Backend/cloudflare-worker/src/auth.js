// Firebase ID token verification + SAMYAK role lookup.
//
// The browser sends `Authorization: Bearer <Firebase ID token>`. We verify the
// RS256 signature against Google's public keys and the standard claims, then
// resolve the caller's role from Firestore (admins / staff collections) using
// the caller's own token, exactly like the Firestore security rules do.

const GOOGLE_JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

// Same role model as firestore.rules (see Frontend/src/services/roles.js).
export const ADMIN_ROLES = ['super_admin', 'admin', 'wing_admin'];
export const CLUB_ROLES = [...ADMIN_ROLES, 'club_admin', 'club_lead'];
// Event content (events, site content, media, gallery moderation) only.
export const CONTENT_ROLES = [...ADMIN_ROLES, 'events_admin'];
// Payment verification: may open ID cards and payment proofs.
export const DESK_ROLES = [...ADMIN_ROLES, 'registrations_desk'];

let jwksCache = { keys: null, expires: 0 };
const roleCache = new Map(); // uid -> { role, expires }

function b64urlToBytes(input) {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

async function getJwks(env) {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.expires > now) return jwksCache.keys;
  const res = await fetch(env.JWKS_URL || GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status})`);
  const { keys } = await res.json();
  const maxAge = Number((res.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
  jwksCache = { keys, expires: now + maxAge * 1000 };
  return keys;
}

/** Returns the verified token payload, or null if the token is missing/invalid. */
export async function verifyFirebaseToken(token, env) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== 'RS256' || !header.kid) return null;

    const jwk = (await getJwks(env)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!valid) return null;

    const now = Math.floor(Date.now() / 1000);
    const project = env.FIREBASE_PROJECT_ID;
    if (payload.aud !== project) return null;
    if (payload.iss !== `https://securetoken.google.com/${project}`) return null;
    if (!payload.sub || payload.exp <= now || payload.iat > now + 60) return null;
    return payload;
  } catch {
    return null;
  }
}

function firestoreUrl(env, path) {
  return `${env.FIRESTORE_BASE || FIRESTORE_BASE}/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents${path}`;
}

function fieldString(doc, name) {
  return doc?.fields?.[name]?.stringValue ?? null;
}

function fieldBool(doc, name) {
  const v = doc?.fields?.[name];
  return v && 'booleanValue' in v ? v.booleanValue : null;
}

async function getDoc(env, idToken, path) {
  const res = await fetch(firestoreUrl(env, path), { headers: { Authorization: `Bearer ${idToken}` } });
  return res.ok ? res.json() : null;
}

function roleFromDoc(doc) {
  if (!doc) return null;
  const status = fieldString(doc, 'status');
  if (status === 'suspended' || status === 'inactive' || fieldBool(doc, 'active') === false) return null;
  const role = (fieldString(doc, 'role') || '').toLowerCase();
  return role || null;
}

/**
 * Resolves who is calling: { uid, email, role } where role is one of the
 * SAMYAK roles, 'user' for any signed-in account, or null when anonymous.
 */
export async function resolveCaller(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const idToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const claims = await verifyFirebaseToken(idToken, env);
  if (!claims) return { uid: null, email: null, role: null };

  const uid = claims.sub;
  // Email-based identity only for verified emails (same as firestore.rules).
  const email = claims.email_verified === true ? String(claims.email || '').toLowerCase() : '';
  const superAdmins = String(env.SUPER_ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim());
  if (email && superAdmins.includes(email)) return { uid, email, role: 'super_admin' };

  const cached = roleCache.get(uid);
  if (cached && cached.expires > Date.now()) return { uid, email, role: cached.role };

  let role = null;
  for (const collection of ['admins', 'staff']) {
    // Exactly the ids firestore.rules recognise: UID or verified email.
    role = roleFromDoc(await getDoc(env, idToken, `/${collection}/${encodeURIComponent(uid)}`));
    if (!role && email) role = roleFromDoc(await getDoc(env, idToken, `/${collection}/${encodeURIComponent(email)}`));
    if (role) break;
  }
  role = role || 'user';
  roleCache.set(uid, { role, expires: Date.now() + 60_000 });
  return { uid, email, role };
}

/** Public check used by the core-team photo upload (no account needed). */
export async function isCoreInviteActive(env, token) {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token || '')) return false;
  const res = await fetch(firestoreUrl(env, `/core_invites/${token}`));
  if (!res.ok) return false;
  return fieldBool(await res.json(), 'active') === true;
}
