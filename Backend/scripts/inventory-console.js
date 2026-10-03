// SAMYAK read-only pre-deployment inventory (Backend/scripts/inventory-console.js). Run in the DevTools console on
// https://klsamyak.in while signed in with a SUPER ADMIN Google account.
// GET requests only. Prints no PINs, URLs, tokens, phone numbers or full emails.
(async () => {
  const FS = 'https://firestore.googleapis.com/v1/projects/nirva-7e226/databases/(default)/documents';
  const db = await new Promise((ok, fail) => { const r = indexedDB.open('firebaseLocalStorageDb'); r.onsuccess = () => ok(r.result); r.onerror = fail; });
  const rows = await new Promise((ok) => { const q = db.transaction('firebaseLocalStorage').objectStore('firebaseLocalStorage').getAll(); q.onsuccess = () => ok(q.result); });
  const user = rows.map((r) => r.value).find((v) => v && v.stsTokenManager);
  if (!user) return console.warn('Not signed in. Sign in as super admin, reload, run again.');
  if (user.stsTokenManager.expirationTime < Date.now()) return console.warn('Token expired. Reload the page and run again.');
  const H = { Authorization: `Bearer ${user.stsTokenManager.accessToken}` };

  async function all(col) {
    let out = [], page = '';
    do {
      const r = await fetch(`${FS}/${col}?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: H });
      if (!r.ok) { console.warn(col, 'HTTP', r.status); return out; }
      const j = await r.json(); out = out.concat(j.documents || []); page = j.nextPageToken || '';
    } while (page);
    return out;
  }
  const id = (d) => d.name.split('/').pop();
  const raw = (fields, path) => path.split('.').reduce((f, k, i, a) => {
    const v = f && f[k]; if (!v) return undefined;
    return i === a.length - 1 ? Object.values(v)[0] : v.mapValue && v.mapValue.fields;
  }, fields);
  const val = (d, path) => raw(d.fields || {}, path);
  const mask = (e) => (e ? String(e).replace(/^(.{2}).*(@.*)$/, '$1***$2') : '');
  const host = (u) => {
    if (!u) return 'empty';
    if (u.startsWith('data:')) return 'data-url (inline)';
    try {
      const h = new URL(u).hostname;
      if (h.endsWith('.r2.dev')) return 'R2 PUBLIC (r2.dev)';
      if (u.includes('/api/private-files/')) return 'worker-private';
      if (h.includes('ibb.co')) return 'ImgBB (3rd party public)';
      if (h.includes('firebasestorage')) return 'firebase-storage';
      return 'other: ' + h;
    } catch { return 'unparseable'; }
  };

  // Same role model as firestore.rules (admins/ and staff/ share it).
  const ROLE_GRANTS = {
    super_admin: 'admin', admin: 'admin', wing_admin: 'admin',
    registrations_desk: 'registrations desk', events_admin: 'events admin',
    club_admin: 'club (Worker only)', club_lead: 'club (Worker only)',
    core_team: 'gate staff', gate_staff: 'gate staff', security: 'gate staff', volunteer: 'gate staff',
  };
  const grants = (role) => ROLE_GRANTS[String(role || '').trim().toLowerCase()] || 'NOTHING (role not recognised)';
  const keyedOk = (docId, email, kind) => docId === (email || '').toLowerCase() || (!docId.includes('@') && !/^(admin|staff)_/.test(docId));

  // 1-3. Admins (roles, id format, legacy PIN fields)
  const admins = await all('admins');
  console.log(`\n=== admins: ${admins.length} ===`);
  console.table(admins.map((d) => {
    const role = val(d, 'role') || '';
    const docKey = keyedOk(id(d), val(d, 'email')) ? (id(d).includes('@') ? 'email' : 'uid') : 'LEGACY id';
    return {
      email: mask(val(d, 'email')), role, status: val(d, 'status') || '',
      docKey, starterRosterDemo: /^admin_(tech|rpa|cult|game|fin|media|ai)_0\d$/.test(id(d)),
      hasPinField: 'passcode' in (d.fields || {}), hasFirstLoginReset: 'firstLoginReset' in (d.fields || {}),
      rulesSeeAs: docKey === 'LEGACY id' ? 'NOTHING (id not uid/email)' : grants(role),
    };
  }));

  // 7. Staff (gate scanner accounts)
  const staff = await all('staff');
  console.log(`\n=== staff: ${staff.length} ===`);
  console.table(staff.map((d) => {
    const role = val(d, 'role') || '';
    const docKey = keyedOk(id(d), val(d, 'email')) ? (id(d).includes('@') ? 'email' : 'uid') : 'LEGACY staff_<email> id';
    return {
      email: mask(val(d, 'email')), role, active: val(d, 'active'), docKey,
      rulesSeeAs: docKey.startsWith('LEGACY') ? 'NOTHING -> cannot check in' : grants(role),
    };
  }));

  // 4. Where ID cards / payment proofs live
  const tally = {};
  const add = (where, u) => { const k = `${where} -> ${host(u)}`; tally[k] = (tally[k] || 0) + 1; };
  for (const d of await all('users')) add('users.idCardUrl', val(d, 'idCardUrl'));
  const regs = await all('registrations');
  for (const d of regs) { add('registrations.idCardUrl', val(d, 'idCardUrl')); add('registrations.payment.screenshotUrl', val(d, 'payment.screenshotUrl')); }
  const pays = await all('payments');
  for (const d of pays) { add('payments.clgIdPicUrl', val(d, 'clgIdPicUrl')); add('payments.paymentScreenshotUrl', val(d, 'paymentScreenshotUrl')); }
  console.log('\n=== private file references (count by storage location) ===');
  console.table(Object.entries(tally).sort().map(([k, n]) => ({ reference: k, count: n })));

  // 7. Gate passes
  const passes = await all('gate_passes');
  const by = (f) => passes.reduce((m, d) => { const v = String(val(d, f)); m[v] = (m[v] || 0) + 1; return m; }, {});
  console.log(`\n=== gate_passes: ${passes.length} ===`);
  console.log('gatePassStatus:', by('gatePassStatus'), '| paymentStatus:', by('paymentStatus'), '| checkedIn:', by('checkedIn'));
  console.log('passes whose doc id != token (scanner fallback query, gate staff denied):', passes.filter((d) => val(d, 'gatePassToken') && val(d, 'gatePassToken') !== id(d)).length);
  const issuedRegs = regs.filter((d) => val(d, 'gatePass.status') === 'ISSUED').length;
  const regsNoGateMap = regs.filter((d) => val(d, 'gatePass.token') && !val(d, 'gatePass.status')).length;
  console.log(`registrations with gatePass ISSUED: ${issuedRegs} | with token but no gatePass.status: ${regsNoGateMap}`);

  // 6. Event registrations + stats
  const evr = await all('event_registrations');
  console.log(`\n=== event_registrations: ${evr.length} | new format (<event>__<uid>): ${evr.filter((d) => id(d).includes('__') && val(d, 'uid')).length} | legacy: ${evr.filter((d) => !val(d, 'uid')).length}`);
  const stats = await all('eventStats');
  console.log(`eventStats docs: ${stats.length} (${stats.map(id).join(', ') || 'MISSING samyak2026'})`);
  // 8. Core team (data-change review): what exists now and what is public.
  const members = await all('core_members');
  const pub = new Set((await all('team_public')).map(id));
  const invites = await all('core_invites');
  console.log(`\n=== core_members: ${members.length} | team_public: ${pub.size} | core_invites: ${invites.length} ===`);
  console.table(members.map((d) => ({
    id: id(d), name: val(d, 'name'), team: val(d, 'team'), created: d.createTime, updated: d.updateTime,
    via: val(d, 'inviteToken') ? 'invite link' : 'admin add', flaggedPublic: val(d, 'showOnPublicTeam') === true,
    inTeamPublic: pub.has(id(d)),
  })));
  console.table(invites.map((d) => ({ token: id(d).slice(0, 4) + '…', label: val(d, 'label'), active: val(d, 'active'), createdBy: mask(val(d, 'createdBy')), created: d.createTime, updated: d.updateTime })));
  console.log('team_public docs without a core_members source:', [...pub].filter((p) => !members.some((m) => id(m) === p)).length);
  console.log('\nDone. Nothing was written.');
})();
