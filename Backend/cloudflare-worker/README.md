# SAMYAK API (Cloudflare Worker)

Where things live:

| Data | Store |
|---|---|
| All files: posters, gallery, event media, sponsor logos, ID photos, payment proofs | **Cloudflare R2** (`samyak` bucket) |
| Site content: events, about/schedule/contact/sponsors/departments, media lists, gallery list, contact inquiries, club reports | **Cloudflare D1** (`samyak2026`) |
| Logins, admin / semi-admin access, student registrations, payments, gate passes, attendance, core team, maintenance switch | **Firebase** (unchanged) |

The Worker verifies the caller's Firebase login token and looks up their role in
Firestore (`admins` / `staff`), so no Cloudflare keys exist in the website.

## First deploy

```bash
cd Backend/cloudflare-worker
npm install
npx wrangler login

# 1. Content database
npm run db:init                            # creates the table

# 2. Check wrangler.toml [vars]
#    PUBLIC_FILES_URL  = the bucket's public URL (R2 -> samyak -> Settings -> Public access)
#    ALLOWED_ORIGINS   = add your live site, e.g. "https://samyak.example.com,http://localhost:5173"

# 3. Deploy
npm run deploy                             # prints https://samyak-api.<you>.workers.dev
```

Then:

1. Set `VITE_CLOUD_API_URL=https://samyak-api.<you>.workers.dev` in `Frontend/.env`
   and in your hosting provider's environment variables, and rebuild the site.
2. Deploy the updated Firebase rules from the project root: `npm run deploy:backend`.
3. Sign in as a super admin -> Admin -> Admin Management -> **Copy content now**
   (one-time copy of existing content from Firebase into D1; safe to repeat).
4. Rotate the old R2 access keys / API token and the ImgBB key in their dashboards.
   They were bundled into the public website before this change.

## Local development

```bash
npm run db:init:local
npm run dev          # http://localhost:8787 (local D1 + R2 simulation)
```

`Frontend/.env` already points at `http://localhost:8787`. Local R2 files are
simulated; their returned URLs point at the real public bucket and will not load
until the Worker is deployed.

## Permissions (enforced in `src/index.js`)

- Content: anyone can read public collections; admins (`super_admin`, `admin`, `wing_admin`) write.
  Contact inquiries: anyone can submit, only admins read. Club reports: club staff and admins.
- Uploads: admins for posters/logos/event media; any signed-in user for gallery, ID cards and
  payment proofs; core-team photos also through an active registration link.
- File names include a random UUID and the bucket cannot be listed, so file links behave like
  unguessable share links (the same model as Firebase Storage download URLs).
- Sub-admins who log in with a PIN are **not** Firebase-authenticated and cannot be verified here.
  Give them Google sign-in (add their email in Admin Management) to let them edit content.
