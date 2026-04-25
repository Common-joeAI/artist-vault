# Artist Vault — Migration & Release Guide

## Overview
This guide covers upgrading from the single-tenant SQLite app to the multi-user PostgreSQL version.

---

## 1. Environment Setup

Add these to your `.env`:

```env
# Database (Supabase or any PostgreSQL)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/artist_vault"

# Auth
ARTIST_VAULT_SESSION_SECRET="<random 64-char string — generate with: openssl rand -hex 32>"
ARTIST_VAULT_ADMIN_EMAIL="your@email.com"
ARTIST_VAULT_ADMIN_PASSWORD_HASH="<run: node scripts/hash-password.mjs>"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Discovery (optional but recommended)
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
YOUTUBE_API_KEY="..."

# Email (pick one)
RESEND_API_KEY="re_..."
# OR
SENDGRID_API_KEY="SG...."
EMAIL_FROM="noreply@aiartistvault.com"
```

---

## 2. Database Migration

### Switch to PostgreSQL
1. Replace `app/prisma/schema.prisma` with `deliverables/schema.prisma`
2. Set `DATABASE_URL` to your PostgreSQL connection string

### Run migrations
```bash
cd app
npx prisma migrate dev --name multi_tenant_v2
npx prisma generate
```

### Migrate existing SQLite data (if needed)
```bash
# Export from SQLite
sqlite3 storage/artist-vault.db .dump > old_data.sql

# Then manually insert critical data (artist profiles, releases, tracks)
# or use the admin panel after migration
```

---

## 3. File Changes

Copy these files from `deliverables/` into `app/`:

```
deliverables/prisma/schema.prisma          → app/prisma/schema.prisma
deliverables/lib/auth.ts                   → app/lib/auth.ts
deliverables/lib/server/import-store.ts   → app/lib/server/import-store.ts
deliverables/lib/server/soundon-release-adapter.ts → app/lib/server/soundon-release-adapter.ts
deliverables/lib/ai-discovery.ts          → app/lib/ai-discovery.ts
deliverables/lib/release-ready.ts         → app/lib/release-ready.ts

# New API routes
deliverables/app/api/import/soundon/      → app/app/api/import/soundon/

# Browser extension (replace existing)
deliverables/browser-extension/           → app/browser-extension/
```

---

## 4. Update DistroKid importer to use new import-store

In `app/app/api/import/distrokid/session/route.ts`, change:
```ts
// OLD
import { createImportSession } from "@/lib/server/distrokid-import-store";
const session = await createImportSession();

// NEW
import { createImportSession } from "@/lib/server/import-store";
const session = await createImportSession("distrokid");
```

In `app/app/api/import/distrokid/status/[sessionToken]/route.ts`, change:
```ts
// OLD
import { getImportSession } from "@/lib/server/distrokid-import-store";

// NEW
import { getImportSession } from "@/lib/server/import-store";
```

---

## 5. New Signup Routes Needed

Create these pages (or update existing):

### `/app/signup/page.tsx`
Add role selection: "I'm an Artist" vs "I'm a Radio Station"
- Artist → creates User with role: "artist", then auto-creates ArtistProfile
- Radio Station → creates User with role: "radio_station", then creates RadioStation record

### `/app/app/radio/` (new section)
- `/radio/signup` — Radio station registration form
- `/radio/dashboard` — Browse ready releases, manage notification preferences

---

## 6. Release Ready — Integration Points

After any of these actions, call `updateReleaseReadyStatus(releaseId)`:
- Master file uploaded to a track (`track.masterFileUrl` set)
- Cover art uploaded (`release.coverArtUrl` set)
- PRO registration approved (`track.proStatus = "APPROVED"`)

```ts
import { updateReleaseReadyStatus } from "@/lib/release-ready";

// After upload handler saves masterFileUrl:
await updateReleaseReadyStatus(releaseId);
```

---

## 7. PRO Registration — ASCAP vs BMI Enforcement

The schema enforces mutual exclusivity at the User level via `user.proOrg`.

When an artist registers:
```ts
import { setProOrg } from "@/lib/auth";

// This throws if they already have the other org registered
await setProOrg(userId, "ASCAP"); // or "BMI"
```

UI should:
1. Show which org the user is registered with (or neither)
2. Only show the registration form for one org once chosen
3. Display clear message: "You cannot belong to both ASCAP and BMI"

---

## 8. Supabase Setup (Recommended)

1. Create project at supabase.com
2. Go to Settings → Database → Connection string (URI mode)
3. Copy the `postgresql://...` URL into `DATABASE_URL`
4. Run `npx prisma migrate deploy` in production

For file storage, use Supabase Storage buckets:
- `masters` — audio master files (private)
- `covers` — cover art (public)
- `press` — press kit assets (public)

---

## 9. Docker Deployment

Update `compose.yml`:
```yaml
services:
  app:
    build: ./app
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ARTIST_VAULT_SESSION_SECRET: ${ARTIST_VAULT_SESSION_SECRET}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      RESEND_API_KEY: ${RESEND_API_KEY}
    ports:
      - "3000:3000"
    # Remove the SQLite volume — PostgreSQL is external
```

---

## 10. Feature Checklist

### Multi-tenant ✅
- [x] PostgreSQL schema with proper user scoping
- [x] Role-based auth (artist / radio_station / admin)
- [x] Email verification tokens
- [x] Password reset flow

### DistroKid Importer ✅
- [x] DB-backed sessions (no more file store)
- [x] Multi-user scoped (each import tied to userId)
- [x] AI post-enhancement hook available

### SoundOn Importer ✅
- [x] New API routes (/api/import/soundon/*)
- [x] Browser extension updated to scrape SoundOn
- [x] Same import flow as DistroKid

### AI Discovery ✅
- [x] Spotify catalog search
- [x] YouTube search
- [x] Claude analysis of discovered releases
- [x] Cross-reference with existing vault

### Release Ready ✅
- [x] 3-part checklist (master + cover art + PRO)
- [x] Auto-updates on file uploads / PRO approval
- [x] Queues radio notifications on status change

### Radio Station Portal 🔲 (UI work remaining)
- [x] RadioStation data model
- [x] Notification system (DB + email)
- [ ] Radio signup page (`/radio/signup`)
- [ ] Radio dashboard (`/radio/dashboard`)
- [ ] Genre preference management UI

### PRO Registration ✅
- [x] ASCAP XOR BMI enforcement at user level
- [x] ProRegistration model per track
- [ ] ASCAP guided registration form (UI)
- [ ] BMI guided registration form (UI)

### Press Kit ✅ (existing, enhanced schema)
- [x] Radio-format flag on PressKit model
- [x] Featured tracks list
- [ ] Auto-include PRO status in PDF export (UI update)
