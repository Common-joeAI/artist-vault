# Phase 4 Setup

Phase 4 adds:

- local media uploads
- downloadable press kit PDF export
- advanced manual public-link importer

## New routes

- `/vault/phase-4`
- `/vault/media`
- `/vault/imports/advanced`
- `/api/press-kit/pdf`
- `/api/uploads`
- `/api/import-preview-v2`

## Local media uploads

The upload API stores files on disk and keeps a simple manifest so the vault can list previously uploaded assets.

### Optional environment variables

```env
ARTIST_VAULT_UPLOAD_DIR="public/uploads"
ARTIST_VAULT_UPLOAD_PUBLIC_BASE="/uploads"
```

Defaults are already set for a typical self-hosted Next.js deployment, so these variables are optional.

## Press kit PDF

The PDF route generates a simple downloadable PDF built from:

- artist name
- press kit title
- short bio
- long bio
- website URL
- contact email
- saved links
- selected releases

## Advanced importer

The advanced importer lets you paste one or more public URLs manually. It then:

1. scans each page
2. performs platform-aware title cleanup
3. returns curated release candidates with confidence hints

This is still a heuristic importer. Public pages vary widely in how much structured data they expose.

## Notes

- Uploaded files are stored locally on the server.
- The upload manifest is file-based and does not yet require additional database tables.
- The PDF export is intentionally simple and self-hosted friendly.
- The advanced importer is best used as a discovery assistant, not a fully trusted auto-ingest pipeline.
