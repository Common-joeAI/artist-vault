# Production Readiness Notes

## Immediate blockers that were addressed

- Redirect loop between `/vault` and `/vault/pro`
- Missing importer helper implementation in `lib/import-adapters.ts`
- Setup route exposed publicly without a production bootstrap gate
- Upload handling accepted risky file types from authenticated users
- Docker database mount path did not match `DATABASE_URL`
- No health endpoint for uptime checks
- Security headers were missing at the app layer

## Still not a full public SaaS

The current product model is still single-artist / owner-admin oriented.

Missing pieces for true public user ingestion:

- self-service user registration
- password reset and email verification
- multi-tenant artist/team boundaries
- role-based authorization beyond a basic owner model
- audit logging
- rate limiting / abuse controls
- storage offload (S3/R2/etc.)
- background jobs for imports and PDF generation
- moderation workflows for public content ingestion
- PostgreSQL migration for concurrent production traffic

## Recommended next build phase

1. Replace single-artist assumptions with tenant-aware models.
2. Add real auth flows (signup, reset, verification, sessions revocation).
3. Move uploads to object storage.
4. Add request throttling and structured logging.
5. Replace heuristic importer with queued jobs plus retries.
6. Add observability: health, logs, metrics, and error tracking.
