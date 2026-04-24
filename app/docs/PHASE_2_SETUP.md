# Phase 2 Setup

This phase adds a protected vault workspace with:

- self-hosted admin authentication
- onboarding wizard for the primary artist profile
- release CRUD
- track CRUD

## Required environment variables

Add these to your local `.env` file:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_NAME="Artist Vault"
ARTIST_VAULT_ADMIN_EMAIL="you@example.com"
ARTIST_VAULT_ADMIN_PASSWORD="replace-this-with-a-strong-password"
ARTIST_VAULT_SESSION_SECRET="replace-this-with-a-long-random-secret"
```

## Bootstrapping

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

## Routes added in Phase 2

- `/login`
- `/vault`
- `/vault/onboarding`
- `/vault/releases`
- `/vault/releases/new`
- `/vault/releases/[releaseId]`
- `/vault/releases/[releaseId]/edit`
- `/vault/releases/[releaseId]/tracks/new`
- `/vault/releases/[releaseId]/tracks/[trackId]/edit`

## Current architecture notes

- Authentication is self-hosted and environment-driven for a fast private deployment path.
- The app currently assumes a single primary artist profile.
- Artist photo storage is URL-based in this phase; file uploads can be added later.
- The onboarding wizard uses `react-hook-form` and saves artist metadata through an API route.
- The catalog pages use server actions for create, update, and delete operations.

## Good Phase 3 follow-ups

- storage uploads for press images and masters
- importer adapters for Spotify / Apple / YouTube artist pages
- ASCAP and BMI dashboard views
- press kit generation and exports
- multi-user auth and role separation
- PostgreSQL production deployment profile
