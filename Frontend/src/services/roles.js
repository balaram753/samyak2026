/**
 * SAMYAK role model. Mirrors firestore.rules and the Worker (auth.js) exactly:
 * a role record is admins/{id} or staff/{id} where {id} is the account's
 * Firebase UID or its verified lowercase email. Nothing else is recognised.
 *
 * The UI uses these sets only to decide what to show; every grant is enforced
 * again by Firestore rules and the Worker.
 */

export const ADMIN_ROLES = ['super_admin', 'admin', 'wing_admin'];
export const REGISTRATIONS_DESK_ROLES = ['registrations_desk'];
export const EVENTS_ADMIN_ROLES = ['events_admin'];
export const CLUB_ROLES = ['club_admin', 'club_lead'];
export const GATE_ROLES = ['core_team', 'gate_staff', 'security', 'volunteer'];

export const KNOWN_ROLES = [
  ...ADMIN_ROLES, ...REGISTRATIONS_DESK_ROLES, ...EVENTS_ADMIN_ROLES, ...CLUB_ROLES, ...GATE_ROLES,
];

/** Lower-cases a stored role. Legacy display labels are NOT mapped: they need migration. */
export function roleKey(role) {
  return String(role || '').trim().toLowerCase();
}

export function isKnownRole(role) {
  return KNOWN_ROLES.includes(roleKey(role));
}

/** The ids a role record may have for this signed-in account. */
export function roleRecordIds(firebaseUser) {
  const ids = [firebaseUser.uid];
  if (firebaseUser.email) {
    const cleanEmail = firebaseUser.email.trim().toLowerCase();
    if (!ids.includes(cleanEmail)) ids.push(cleanEmail);
  }
  return ids;
}

/** Record is usable only if its role is known and it is not switched off. */
export function isActiveRecord(data) {
  return Boolean(data) && data.active !== false && data.status !== 'suspended' && data.status !== 'inactive';
}

/** Admin dashboard tabs each role may open (the rules enforce the data side). */
export function allowedAdminTabs(role, isSuperAdmin) {
  const key = roleKey(role);
  if (isSuperAdmin || ADMIN_ROLES.includes(key)) return 'all';
  if (REGISTRATIONS_DESK_ROLES.includes(key)) return ['overview', 'users', 'payments', 'gatepasses', 'rosters'];
  if (EVENTS_ADMIN_ROLES.includes(key)) return ['overview', 'events', 'workshops', 'rosters', 'departments', 'sponsors', 'about', 'schedule'];
  if (CLUB_ROLES.includes(key)) return ['overview', 'techclub', 'rosters'];
  return [];
}

/**
 * Least-privilege mapping for the labels the old super-admin console stored.
 * `null` means "no automatic mapping": the super admin must decide.
 */
export const LEGACY_ROLE_LABELS = {
  'full administrator': 'admin',
  'registrations desk admin': 'registrations_desk',
  'technology club admin': 'club_admin',
  'tech_club_admin': 'club_admin',
  'events wing admin': 'events_admin',
  'cultural coordinator': null,
};
