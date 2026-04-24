# DistroKid import notes

## What this scaffold currently does

- generates a short-lived import token
- receives normalized release payloads from the browser extension
- stores the raw payload for debugging
- writes each imported release into a review inbox on disk

## What you probably want to do next

Replace the file-based inbox adapter in:

`lib/server/distrokid-release-adapter.ts`

with your actual Artist Vault import path.

Suggested DB shape:
- source provider
- source release id
- release draft id
- raw payload
- review status
- imported at timestamp

## Why the backend no longer fetches DistroKid URLs

Private DistroKid dashboard pages require a logged-in user session. Browser same-origin protections prevent a normal site page from reading authenticated pages from another domain, and backend fetches to private URLs will usually receive a 403 unless they include a valid authenticated session.

This connector model avoids storing the user password in Artist Vault.
