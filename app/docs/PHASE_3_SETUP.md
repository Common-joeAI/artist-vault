# Phase 3 Setup

Phase 3 adds three major feature areas:

- ASCAP / BMI rights dashboard
- public artist-link importer
- press kit workspace and export view

## New routes

- `/vault/phase-3`
- `/vault/rights`
- `/vault/imports`
- `/vault/press-kit`
- `/vault/press-kit/export`

## What each piece does

### Rights dashboard

The rights page aggregates track-level registration data already stored in the catalog and highlights tracks that still need:

- ISRCs
- lyrics
- writer credits
- ASCAP approval
- BMI approval

### Importer

The importer scans public artist links saved during onboarding. It then:

1. fetches each page
2. extracts page metadata
3. looks for JSON-LD and common music-page hints
4. proposes release candidates
5. creates draft releases in the vault

This is a first-pass importer. Different public platforms expose different markup, so some artist pages will produce better results than others.

### Press kit

The press kit workspace lets you save:

- title
- short bio
- long bio
- hero image URL
- website URL
- contact email

The export route presents that data in a clean one-sheet style page using the saved artist profile and top releases.

## Notes and limitations

- The importer depends on public page HTML and structured data being available.
- Imported releases are created as draft records in the catalog and should be reviewed manually.
- Press kit media is still URL-based in this phase.
- The vault still assumes one primary artist profile for the authenticated admin account.

## Good next follow-ups

- file uploads for press images and masters
- richer artist-page adapters per platform
- printable PDF export for press kits
- release-level registration checklists
- multi-user access and roles
