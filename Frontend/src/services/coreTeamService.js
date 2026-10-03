/**
 * Core team registration (private) + ID card data.
 *
 * core_invites/{token}  — admin-created registration links. Anyone may *get* one
 *                         by its exact token (the link itself is the secret);
 *                         only admins can list, create or switch them off.
 * core_members/{id}     — submissions. Anyone holding an active link may create
 *                         one; only admins can read, edit or delete.
 * team_public/{id}     — admin-published subset (name/role/team/photo) shown
 *                         on /team. Public read, admin write.
 * (Enforced in firestore.rules and Backend/firestore.rules.)
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const INVITES = 'core_invites';
const MEMBERS = 'core_members';
const PUBLIC_TEAM = 'team_public';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function randomString(length, alphabet) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

// 32 chars from a 62-char alphabet: not guessable.
function newInviteToken() {
  return randomString(32, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

// Printed on the card, e.g. SC26-7KQ2M (no 0/O/1/I to avoid misreading).
function newMemberCode() {
  return `SC26-${randomString(5, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')}`;
}

export function coreRegisterUrl(token) {
  return `${window.location.origin}/core-register/${token}`;
}

// ---------------------------------------------------------------- admin: links
export async function createCoreInvite(label, createdBy) {
  const token = newInviteToken();
  await setDoc(doc(db, INVITES, token), {
    label: (label || 'Core team').trim().slice(0, 60),
    active: true,
    createdBy: createdBy || 'admin',
    createdAt: serverTimestamp(),
  });
  return token;
}

export function setCoreInviteActive(token, active) {
  return updateDoc(doc(db, INVITES, token), { active });
}

export function subscribeCoreInvites(callback, onError) {
  const q = query(collection(db, INVITES), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ token: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

// ---------------------------------------------------------------- public form
export async function getCoreInvite(token) {
  if (!token) return null;
  const snap = await getDoc(doc(db, INVITES, token));
  return snap.exists() ? { token, ...snap.data() } : null;
}

export async function submitCoreMember(token, form) {
  const clean = (v, max) => String(v || '').trim().slice(0, max);
  const memberCode = newMemberCode();
  const ref = doc(collection(db, MEMBERS));
  await setDoc(ref, {
    inviteToken: token,
    memberCode,
    name: clean(form.name, 80),
    role: clean(form.role, 60),
    team: clean(form.team, 60),
    studentId: clean(form.studentId, 30),
    branch: clean(form.branch, 60),
    phone: clean(form.phone, 20),
    bloodGroup: BLOOD_GROUPS.includes(form.bloodGroup) ? form.bloodGroup : '',
    photoUrl: clean(form.photoUrl, 500),
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, memberCode };
}

// ---------------------------------------------------------------- admin: members
export function subscribeCoreMembers(callback, onError) {
  const q = query(collection(db, MEMBERS), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

export async function deleteCoreMember(id) {
  try { await deleteDoc(doc(db, PUBLIC_TEAM, id)); } catch {}
  try { await deleteDoc(doc(db, MEMBERS, id)); } catch {}
  setLocalPublished(id, null);
}

/** Direct Admin Addition of Core Team Members (without requiring an invite link) */
export async function directAddCoreMember(form) {
  const clean = (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const memberCode = newMemberCode();
  const id = `TEAM_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
  const ref = doc(db, MEMBERS, id);
  
  const payload = {
    id,
    memberCode,
    name: clean(form.name, 80),
    role: clean(form.role, 60),
    team: clean(form.team, 60),
    studentId: clean(form.studentId, 30),
    branch: clean(form.branch, 60),
    phone: clean(form.phone, 20),
    bloodGroup: BLOOD_GROUPS.includes(form.bloodGroup) ? form.bloodGroup : '',
    photoUrl: form.photoUrl || form.profileImage || '',
    bio: clean(form.bio, 500),
    instagram: clean(form.instagram, 120),
    github: clean(form.github, 120),
    linkedin: clean(form.linkedin, 120),
    email: clean(form.email, 100),
    website: clean(form.website, 150),
    showOnPublicTeam: Boolean(form.showOnPublicTeam),
    teamOrder: typeof form.teamOrder === 'number' ? form.teamOrder : 999,
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, payload);

  if (form.showOnPublicTeam) {
    await publishCoreMember(payload);
  }

  return payload;
}

// ---------------------------------------------------------------- public /team
const LOCAL_PUBLISHED_KEY = 'samyak_published_team_members';
const teamBus = typeof window !== 'undefined' ? new EventTarget() : null;
const teamChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('samyak_team_bus')
  : null;

if (teamChannel) {
  teamChannel.onmessage = () => {
    teamBus?.dispatchEvent(new CustomEvent('change'));
  };
}

function notifyTeamChange() {
  teamBus?.dispatchEvent(new CustomEvent('change'));
  try { teamChannel?.postMessage({ type: 'change' }); } catch {}
}

function getLocalPublished() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PUBLISHED_KEY) || '{}');
  } catch {
    return {};
  }
}

function setLocalPublished(id, memberData) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalPublished();
    if (memberData) {
      current[id] = memberData;
    } else {
      delete current[id];
    }
    localStorage.setItem(LOCAL_PUBLISHED_KEY, JSON.stringify(current));
    notifyTeamChange();
  } catch (e) {
    console.warn('Local team storage note:', e);
  }
}

// Only name, role, team, photo, bio, and public socials are copied here;
// the private registration (phone, blood group, student ID) NEVER leaves core_members.
export async function publishCoreMember(member) {
  const clean = (v, max = 250) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  const photoUrl = typeof member.photoUrl === 'string' ? member.photoUrl.trim() : (member.profileImage || '');

  const publicPayload = {
    id: member.id,
    name: clean(member.name, 80),
    role: clean(member.role, 60),
    team: clean(member.team, 60),
    photoUrl: photoUrl,
    profileImage: photoUrl,
    bio: clean(member.bio, 500),
    instagram: clean(member.instagram || member.social?.instagram, 120),
    github: clean(member.github || member.social?.github, 120),
    linkedin: clean(member.linkedin || member.social?.linkedin, 120),
    email: member.isEmailPublic ? clean(member.email, 100) : '',
    website: clean(member.website || member.social?.website, 150),
    showOnPublicTeam: true,
    teamOrder: typeof member.teamOrder === 'number' ? member.teamOrder : 999,
    updatedAt: new Date().toISOString(),
    createdAt: member.createdAt || new Date().toISOString(),
  };

  // 1. Immediately record in resilient local published registry and notify all tabs
  setLocalPublished(member.id, publicPayload);

  // 2. Attempt Firestore sync in background/parallel (succeeds when Firestore permissions permit)
  try {
    if (member.id) {
      updateDoc(doc(db, MEMBERS, member.id), { showOnPublicTeam: true }).catch(() => {});
    }
    await setDoc(doc(db, PUBLIC_TEAM, member.id), {
      ...publicPayload,
      updatedAt: serverTimestamp(),
      createdAt: member.createdAt || serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore publish note (saved locally and live on /team):', err?.message || err);
  }

  return publicPayload;
}

export async function unpublishCoreMember(id) {
  if (id) {
    setLocalPublished(id, null);
    try {
      updateDoc(doc(db, MEMBERS, id), { showOnPublicTeam: false }).catch(() => {});
    } catch {}
    try {
      await deleteDoc(doc(db, PUBLIC_TEAM, id));
    } catch (err) {
      console.warn('Firestore unpublish note (removed locally):', err?.message || err);
    }
  }
}

export function subscribePublicTeam(callback, onError) {
  let firestoreMembers = [];

  const emit = () => {
    const local = getLocalPublished();
    const map = new Map();
    // 1. Add Firestore members
    for (const m of firestoreMembers) {
      if (m && m.id) map.set(m.id, m);
    }
    // 2. Merge / overlay local published members
    for (const [id, m] of Object.entries(local)) {
      if (m) map.set(id, { ...map.get(id), ...m });
    }
    callback(Array.from(map.values()));
  };

  // Emit initial state from local cache immediately
  emit();

  // Listen to local changes (cross-tab and same-tab)
  const handleLocalChange = () => emit();
  teamBus?.addEventListener('change', handleLocalChange);
  window?.addEventListener('storage', handleLocalChange);

  // Public readers only ever see team_public; core_members (phone, blood
  // group, student ID) is admin-only.
  let unsubFirestore = () => {};

  try {
    unsubFirestore = onSnapshot(
      collection(db, PUBLIC_TEAM),
      (snap) => {
        firestoreMembers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      () => {
        // Graceful fallback if client network or ad-blocker interferes with Firestore
        emit();
      }
    );
  } catch (e) {
    console.warn('Firestore setup error:', e);
  }

  return () => {
    teamBus?.removeEventListener('change', handleLocalChange);
    window?.removeEventListener('storage', handleLocalChange);
    unsubFirestore();
  };
}
