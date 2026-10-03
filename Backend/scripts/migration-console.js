// SAMYAK pre/post-deployment data migrations.
//
// Run in the DevTools console on https://klsamyak.in while signed in with a
// SUPER ADMIN Google account. Choose one PHASE at a time.
//   APPLY = false (default): dry run, prints the plan, writes nothing.
//   APPLY = true: performs the writes for that phase.
// Nothing here ever deletes a document or a file: originals are kept until the
// owner removes them by hand after verification.
//
// Phases (see the deployment runbook for when to run each):
//   'staff'      legacy staff_<email> records  -> staff/<email> copy (same role)
//   'admins'     legacy ids / display-label roles -> admins/<email> with a supported role
//   'coreTeam'   publish ONLY the core members listed in CORE_TEAM_PUBLISH_IDS to team_public
//   'eventRegs'  legacy event registrations (no uid) -> <eventId>__<uid> copy
//   'r2Copy'     copy legacy public ID cards / payment proofs into the private bucket
//   'r2Rewrite'  point database references at the private copies (verified first)
//   'pins'       remove legacy plaintext PIN fields from admin records (after the new frontend is live)
const PHASE = 'staff';
const APPLY = false;
const CORE_TEAM_PUBLISH_IDS = []; // e.g. ['abc123'] - only members you confirmed should be public
const WORKER = 'https://samyak-api.balaram753-ch.workers.dev';

(async () => {
  const FS = 'https://firestore.googleapis.com/v1/projects/nirva-7e226/databases/(default)/documents';
  const idb = await new Promise((ok, fail) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => ok(r.result); r.onerror = fail; });
  const rows = await new Promise((ok) => { const q = idb.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); q.onsuccess = () => ok(q.result); });
  const user = rows.map((r) => r.value).find((v) => v && v.stsTokenManager);
  if (!user) return console.warn('Not signed in. Sign in as super admin, reload, run again.');
  if (user.stsTokenManager.expirationTime < Date.now()) return console.warn('Token expired. Reload the page and run again.');
  const H = { Authorization: `Bearer ${user.stsTokenManager.accessToken}`, 'Content-Type': 'application/json' };

  const all = async (col) => {
    let out = [], page = '';
    do {
      const r = await fetch(`${FS}/${col}?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: H });
      if (!r.ok) throw new Error(`${col}: HTTP ${r.status}`);
      const j = await r.json(); out = out.concat(j.documents || []); page = j.nextPageToken || '';
    } while (page);
    return out;
  };
  const id = (d) => d.name.split('/').pop();
  const val = (d, path) => path.split('.').reduce((f, k, i, a) => {
    const v = f && f[k]; if (!v) return undefined;
    return i === a.length - 1 ? Object.values(v)[0] : v.mapValue && v.mapValue.fields;
  }, d.fields || {});
  const str = (v) => ({ stringValue: String(v) });
  const nowTs = () => ({ timestampValue: new Date().toISOString() });
  // Create-only write: fails if the target already exists.
  const createDoc = async (col, docId, fields) => {
    const r = await fetch(`${FS}/${col}/${encodeURIComponent(docId)}?currentDocument.exists=false`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
    if (!r.ok) throw new Error(`create ${col}/${docId}: HTTP ${r.status} ${await r.text()}`);
  };
  // Field-level update: only the listed paths change (omitted value => field removed).
  const patchFields = async (col, docId, paths, fields) => {
    const mask = paths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
    const r = await fetch(`${FS}/${col}/${encodeURIComponent(docId)}?${mask}&currentDocument.exists=true`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
    if (!r.ok) throw new Error(`patch ${col}/${docId}: HTTP ${r.status} ${await r.text()}`);
  };
  const mask = (e) => (e ? String(e).replace(/^(.{2}).*(@.*)$/, '$1***$2') : '');
  const without = (fields, keys) => Object.fromEntries(Object.entries(fields || {}).filter(([k]) => !keys.includes(k)));
  const isLegacyId = (docId, email) => /^(admin|staff)_/.test(docId) || (docId.includes('@') && docId !== (email || '').toLowerCase());
  const plan = [];
  const log = (row) => plan.push(row);
  console.log(`=== PHASE ${PHASE} (${APPLY ? 'APPLY' : 'DRY RUN'}) ===`);

  // Least-privilege mapping. null = owner must decide; nothing is granted.
  const LABELS = {
    'full administrator': 'admin', 'registrations desk admin': 'registrations_desk',
    'technology club admin': 'club_admin', tech_club_admin: 'club_admin',
    'events wing admin': 'events_admin', 'cultural coordinator': null,
  };
  const KNOWN = ['super_admin', 'admin', 'wing_admin', 'registrations_desk', 'events_admin', 'club_admin', 'club_lead',
    'core_team', 'gate_staff', 'security', 'volunteer'];
  const SUPER = ['udaykiranvempati123@gmail.com', 'balaram777.ch@gmail.com', 'harshasai955@gmail.com'];

  if (PHASE === 'staff') {
    const staff = await all('staff');
    const ids = new Set(staff.map(id));
    for (const d of staff) {
      const email = (val(d, 'email') || '').toLowerCase();
      if (!isLegacyId(id(d), email)) continue;
      if (!email) { log({ record: id(d), action: 'MANUAL: no email on record' }); continue; }
      if (ids.has(email)) { log({ record: id(d), email: mask(email), action: 'skip: staff/<email> already exists' }); continue; }
      log({ record: id(d), email: mask(email), role: val(d, 'role'), action: `copy -> staff/${mask(email)} (original kept)` });
      if (APPLY) await createDoc('staff', email, { ...without(d.fields, ['uid']), email: str(email), migratedFrom: str(id(d)), migratedAt: nowTs() });
    }
  }

  if (PHASE === 'admins') {
    const admins = await all('admins');
    const ids = new Set(admins.map(id));
    for (const d of admins) {
      const email = (val(d, 'email') || '').toLowerCase();
      if (SUPER.includes(email)) continue;
      const label = val(d, 'role') || '';
      const key = label.trim().toLowerCase();
      const target = KNOWN.includes(key) ? key : LABELS[key];
      const demo = /^admin_(tech|rpa|cult|game|fin|media|ai)_0\d$/.test(id(d));
      const row = { record: id(d), email: mask(email), currentRole: label, newRole: target ?? '(owner decision)', hasPin: 'passcode' in (d.fields || {}) };
      if (demo) { log({ ...row, action: 'SKIP: starter-roster demo record (review, then remove by hand)' }); continue; }
      if (target === null || target === undefined) { log({ ...row, action: 'MANUAL: no least-privilege mapping; grants nothing until decided' }); continue; }
      if (!email) { log({ ...row, action: 'MANUAL: no email on record' }); continue; }
      if (!isLegacyId(id(d), email)) {
        if (key === target) { log({ ...row, action: 'ok: already supported' }); continue; }
        log({ ...row, action: 'update role in place' });
        if (APPLY) await patchFields('admins', id(d), ['role', 'roleLabel'], { role: str(target), roleLabel: str(label) });
        continue;
      }
      if (ids.has(email)) { log({ ...row, action: 'skip: admins/<email> already exists' }); continue; }
      log({ ...row, action: `copy -> admins/${mask(email)} (original kept; PIN fields not copied)` });
      if (APPLY) {
        await createDoc('admins', email, {
          ...without(d.fields, ['passcode', 'firstLoginReset', 'id', 'uid']),
          id: str(email), email: str(email), role: str(target), roleLabel: str(label),
          migratedFrom: str(id(d)), migratedAt: nowTs(),
        });
      }
    }
  }

  if (PHASE === 'pins') {
    for (const d of await all('admins')) {
      const has = ['passcode', 'firstLoginReset'].filter((k) => k in (d.fields || {}));
      if (!has.length) continue;
      log({ record: id(d), email: mask(val(d, 'email')), removeFields: has.join(', ') });
      if (APPLY) await patchFields('admins', id(d), has, {});
    }
  }

  if (PHASE === 'coreTeam') {
    const members = await all('core_members');
    const published = new Set((await all('team_public')).map(id));
    const PUBLIC = ['name', 'role', 'team', 'photoUrl', 'profileImage', 'bio', 'instagram', 'github', 'linkedin', 'website', 'teamOrder', 'createdAt'];
    for (const d of members) {
      const flagged = val(d, 'showOnPublicTeam') === true;
      const listed = CORE_TEAM_PUBLISH_IDS.includes(id(d));
      if (!flagged && !listed) continue;
      const row = { id: id(d), name: val(d, 'name'), team: val(d, 'team'), flaggedPublic: flagged, hasPublicDoc: published.has(id(d)) };
      if (published.has(id(d))) { log({ ...row, action: 'ok: already in team_public' }); continue; }
      if (!listed) { log({ ...row, action: 'CONFIRM: add this id to CORE_TEAM_PUBLISH_IDS if it should be public' }); continue; }
      const fields = { id: str(id(d)), showOnPublicTeam: { booleanValue: true }, updatedAt: nowTs() };
      for (const k of PUBLIC) if (d.fields?.[k]) fields[k] = d.fields[k];
      if (!fields.profileImage && fields.photoUrl) fields.profileImage = fields.photoUrl;
      if (val(d, 'isEmailPublic') === true && d.fields?.email) fields.email = d.fields.email;
      log({ ...row, action: `publish public-safe fields: ${Object.keys(fields).join(', ')}` });
      if (APPLY) await createDoc('team_public', id(d), fields);
    }
  }

  if (PHASE === 'eventRegs') {
    const regs = await all('event_registrations');
    const users = await all('users');
    const byEmail = {};
    for (const u of users) {
      const e = (val(u, 'email') || '').toLowerCase();
      if (e) (byEmail[e] = byEmail[e] || []).push(id(u));
    }
    const existing = new Set(regs.map(id));
    for (const d of regs) {
      if (val(d, 'uid')) continue;
      const email = (val(d, 'email') || '').toLowerCase();
      const eventId = val(d, 'event_id');
      const uids = byEmail[email] || [];
      const row = { legacyDoc: id(d), event: eventId, email: mask(email) };
      if (uids.length !== 1) { log({ ...row, action: `MANUAL: ${uids.length} accounts match this email` }); continue; }
      const target = `${eventId}__${uids[0]}`;
      if (existing.has(target)) { log({ ...row, action: 'skip: account already has a new-format registration' }); continue; }
      log({ ...row, action: `copy -> ${eventId}__<uid> (no seat change; original kept)` });
      if (APPLY) await createDoc('event_registrations', target, { ...d.fields, uid: str(uids[0]), id: str(target), migratedFrom: str(id(d)), migratedAt: nowTs() });
    }
  }

  if (PHASE === 'r2Copy') {
    for (const prefix of ['id_cards', 'payment_proofs', 'payments']) {
      let cursor = null;
      do {
        const r = await fetch(`${WORKER}/api/admin/r2-migrate-private`, { method: 'POST', headers: H, body: JSON.stringify({ prefix, cursor, dryRun: !APPLY, limit: 200 }) });
        if (!r.ok) throw new Error(`r2Copy ${prefix}: HTTP ${r.status} ${await r.text()}`);
        const j = await r.json();
        log({ prefix, listed: j.listed, [APPLY ? 'copied' : 'wouldCopy']: j.copied.length, alreadyPrivate: j.alreadyPrivate.length });
        cursor = j.cursor;
      } while (cursor);
    }
  }

  if (PHASE === 'r2Rewrite') {
    const targets = [
      ['users', 'idCardUrl'], ['registrations', 'idCardUrl'], ['registrations', 'payment.screenshotUrl'],
      ['payments', 'clgIdPicUrl'], ['payments', 'paymentScreenshotUrl'],
    ];
    const counts = {};
    for (const [col, path] of targets) {
      for (const d of await all(col)) {
        const url = val(d, path);
        if (typeof url !== 'string' || !/\.r2\.dev\//.test(url)) continue;
        const key = new URL(url).pathname.replace(/^\//, '');
        if (!/^(id_cards|payment_proofs|payments)\//.test(key)) continue;
        const next = `${WORKER}/api/private-files/${key}`;
        // Only rewrite once the private copy is confirmed readable.
        const ok = (await fetch(next, { headers: { Authorization: H.Authorization } })).ok;
        const k = `${col}.${path} ${ok ? (APPLY ? 'rewritten' : 'would rewrite') : 'BLOCKED: private copy missing'}`;
        counts[k] = (counts[k] || 0) + 1;
        if (!ok || !APPLY) continue;
        const [top, sub] = path.split('.');
        const fields = sub ? { [top]: { mapValue: { fields: { [sub]: str(next) } } } } : { [top]: str(next) };
        await patchFields(col, id(d), [path], fields);
      }
    }
    Object.entries(counts).forEach(([k, n]) => log({ reference: k, count: n }));
  }

  console.table(plan);
  console.log(APPLY ? 'Done. Writes applied for this phase.' : 'Dry run only. Nothing was written.');
})().catch((e) => console.error('Migration stopped:', e.message));
