# AIArtistVault Metadata Enhancer Patch

## What this patch includes
- `app/api/metadata-enhance/route.ts`
- `components/releases/EnhanceMetadataPanel.tsx`
- `prisma/metadata-enhancer.schema.patch.prisma`
- `.env.metadata-enhancer.example`
- `APPLY.sh`

## Safe patch behavior
This bundle is **additive**. It does **not** overwrite your existing release page, auth, Prisma client, or schema automatically.

That is intentional because the live repo is still evolving and we do not want to break:
- custom auth import paths
- live Prisma model names
- existing release page structure
- deployment environment assumptions

## What you still need to wire manually
1. Update the imports in `app/api/metadata-enhance/route.ts`:
   - `../../lib/prisma`
   - `../../lib/auth`

2. Merge the schema additions into your real `prisma/schema.prisma`.

3. Run:
   - `npx prisma generate`
   - `npx prisma migrate dev --name metadata_enhancer`
   - or your production migration flow

4. Add the component to the release or track detail page:

```tsx
import { EnhanceMetadataPanel } from "@/components/releases/EnhanceMetadataPanel";

<EnhanceMetadataPanel
  trackId={track.id}
  existingAudioUrl={track.audioUrl}
  existing={{
    title: track.title,
    artist: track.artistName,
    album: track.release?.title,
    isrc: track.isrc,
    upc: track.release?.upc,
    lyricsText: track.lyricsText,
  }}
/>
```

## Dependencies to add
```bash
npm install @anthropic-ai/sdk zod zod-to-json-schema file-type
```

## Recommended next step
After this patch is placed on the server, do a repo-specific pass to:
- match the real Track/Release model names
- mount the UI in the exact live route
- add retry + bulk enhancement
- add a lightweight job history table
