/**
 * Public SAMYAK 2026 team (shown on /team, selected via /team/#<id>).
 *
 * Rules for this file:
 *  - `id` is a stable, hand-written slug. Never derive it from the name.
 *  - Only real, supplied information. Leave a field out rather than guessing;
 *    the page hides anything that is missing (no "N/A").
 *  - `image` is optional. Put optimized photos (WebP/AVIF, ~800px) in
 *    public/team/ and reference them as "/team/<file>.webp". Without one the
 *    page shows the member's initials.
 *  - `social` keys: instagram, email, github, linkedin, website.
 */
export const TEAM_MEMBERS = [
  {
    id: 'uday-kiran-vempati',
    name: 'Uday Kiran Vempati',
    role: 'Frontend UI & Visual Experience',
    team: 'Platform Architecture',
    social: {
      website: 'https://udaykiranportfolio.web.app/',
    },
  },
  {
    id: 'balaram',
    name: 'Balaram',
    role: 'Head of Systems & Backend Architecture',
    team: 'Platform Architecture',
    bio: 'Leads the SAMYAK 2026 platform backend: Firestore data models, the Cloudflare edge gateway and R2 storage pipelines, plus ticket registration workflows and cryptographic QR gate pass generation and verification.',
    social: {
      instagram: 'https://instagram.com/_.roc_ram._',
      github: 'https://github.com/balaram753',
      linkedin: 'https://linkedin.com/in/chbalaram',
      website: 'https://balaram.me',
    },
  },
];

export function findTeamMember(id) {
  return TEAM_MEMBERS.find((member) => member.id === id) || null;
}
