# Artist Vault

Self-hosted catalog and promo toolkit for independent artists.

## What this hardened build changes

- fixes the `/vault` ↔ `/vault/pro` redirect loop
- restores the missing importer adapter logic
- aligns upload URL env vars with runtime code
- blocks dangerous upload types like HTML, SVG, JS, and executables
- adds a basic health endpoint for reverse proxies and container checks
- protects first-run setup behind a one-time setup token in production
- adds baseline security headers and disables the `x-powered-by` header
- fixes Docker volume persistence for the SQLite database path

## Production notes

### Optional Spotify importer

For reliable Spotify artist, album, and track imports, configure Spotify Web API client credentials in `app/.env`:

```env
SPOTIFY_CLIENT_ID="your-client-id"
SPOTIFY_CLIENT_SECRET="your-client-secret"
```

If these values are missing, Artist Vault falls back to HTML page fetching, which is less reliable because Spotify can change or block page responses.

This codebase is still architected as a **single-tenant owner/admin app** with a public landing page and optional public press kit pages. It is not yet a full multi-tenant SaaS with public signup, billing, moderation, or per-artist workspaces.

For a safe public launch:

1. rotate all secrets before deployment
2. use a fresh `.env` derived from `.env.example`
3. keep the app behind HTTPS and a reverse proxy
4. create the first owner account through `/setup?token=YOUR_SETUP_TOKEN`
5. remove or rotate the setup token after bootstrapping
6. plan a move from SQLite to PostgreSQL before meaningful scale

## Local run

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## Docker run

```bash
docker compose build
docker compose up -d
```
