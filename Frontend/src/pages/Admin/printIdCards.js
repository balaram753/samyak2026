// Printable SAMYAK core team ID cards (portrait CR80, 54 x 85.6 mm, 9 per A4).

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function safePhotoUrl(url) {
  return /^https:\/\//i.test(url || '') ? url : '';
}

// Portrait CR80 cards (54 × 85.6 mm), 9 per A4 sheet, printed from a clean window.
export function printIdCards(members) {
  const cards = members.map((m) => {
    const photo = safePhotoUrl(m.photoUrl);
    const row = (label, value) => (value ? `<div class="row"><span>${label}</span><b>${escapeHtml(value)}</b></div>` : '');
    return `
      <article class="card">
        <header>
          <div class="brand">SAMYAK <em>2026</em></div>
          <div class="sub">KL University · Core Team</div>
        </header>
        <div class="photo">${photo ? `<img src="${escapeHtml(photo)}" alt="">` : ''}</div>
        <div class="name">${escapeHtml(m.name)}</div>
        <div class="role">${escapeHtml(m.role)}</div>
        <div class="team">${escapeHtml(m.team)}</div>
        <div class="details">
          ${row('ID', m.memberCode)}
          ${row('Student ID', m.studentId)}
          ${row('Branch', m.branch)}
          ${row('Blood', m.bloodGroup)}
          ${row('Phone', m.phone)}
        </div>
        <footer></footer>
      </article>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SAMYAK 2026 · Core ID Cards</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font-family: "Barlow Condensed", "Arial Narrow", Arial, sans-serif; background: #fff; }
  .sheet { display: grid; grid-template-columns: repeat(3, 54mm); gap: 6mm; justify-content: center; }
  .card { width: 54mm; height: 85.6mm; border: 0.2mm solid #d4d4d4; border-radius: 3mm; overflow: hidden; position: relative;
          background: #fff; color: #000; display: flex; flex-direction: column; align-items: center; break-inside: avoid; }
  header { width: 100%; background: #000; color: #fff; text-align: center; padding: 2.4mm 2mm 2mm; }
  .brand { font-size: 12pt; font-weight: 800; letter-spacing: 0.04em; line-height: 1; }
  .brand em { font-style: normal; color: #DF2531; }
  .sub { margin-top: 0.8mm; font-size: 5.5pt; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.7); }
  .photo { margin-top: 3mm; width: 24mm; height: 30mm; border: 0.6mm solid #DF2531; border-radius: 1.5mm; overflow: hidden; background: #f2f2f2; }
  .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .name { margin-top: 2mm; padding: 0 2mm; font-size: 11pt; font-weight: 800; text-align: center; line-height: 1.05; text-transform: uppercase; }
  .role { margin-top: 0.8mm; font-size: 7.5pt; font-weight: 700; color: #DF2531; text-align: center; }
  .team { margin-top: 0.4mm; font-size: 6pt; letter-spacing: 0.12em; text-transform: uppercase; color: #5e5e5e; text-align: center; }
  .details { margin-top: 2mm; width: 100%; padding: 0 4mm; font-size: 6.5pt; }
  .row { display: flex; justify-content: space-between; gap: 2mm; padding: 0.55mm 0; border-bottom: 0.15mm solid #e6e6e6; }
  .row span { color: #5e5e5e; text-transform: uppercase; letter-spacing: 0.06em; }
  .row b { font-weight: 700; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  footer { position: absolute; bottom: 0; left: 0; right: 0; height: 2.5mm; background: #DF2531; }
  .hint { font: 13px Arial, sans-serif; color: #333; text-align: center; margin: 0 0 8mm; }
  @media print { .hint { display: none; } }
</style></head><body>
<p class="hint">Print on A4 at 100% scale ("Actual size"), with background graphics on. ${members.length} card(s).</p>
<main class="sheet">${cards}</main>
<script>
  const imgs = Array.from(document.images);
  Promise.all(imgs.map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))
    .then(() => setTimeout(() => window.print(), 300));
</script>
</body></html>`);
  win.document.close();
  return true;
}
