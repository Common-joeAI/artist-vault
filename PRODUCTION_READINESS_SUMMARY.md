# Artist Vault production-readiness pass

This package contains a hardened source snapshot based on your upload.

## Fixed in this pass
- Removed the `/vault` to `/vault/pro` redirect loop.
- Rebuilt the missing importer adapter helpers so the import preview feature has working parsing logic.
- Hardened the first-run setup flow with a one-time production setup token.
- Added safer upload validation and blocked risky file types.
- Aligned Docker volume persistence with the configured SQLite path.
- Added app-level security headers and a basic health endpoint.
- Gated the public press kit root page behind `isPublic`.
- Expanded deployment notes and production caveats.

## Still required before a true public SaaS launch
- Multi-tenant data model.
- Public signup, email verification, password reset.
- Rate limiting and abuse controls.
- PostgreSQL migration.
- Object storage for uploads.
- Background jobs and observability.

## Important security action
Rotate your existing secrets before deploying. Your uploaded working copy included real environment secrets, so you should treat them as exposed and replace them.
