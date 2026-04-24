# Artist Vault – SDLC Roadmap

This document defines the structured development lifecycle for Artist Vault as it evolves from a self-hosted tool into a production-ready platform.

---

## Phase 1 – Auth Foundation (CURRENT)

Goal: Move from single-env admin auth to a scalable authentication model.

Tasks:
- Stabilize current session system (signed cookies, hashing)
- Introduce database-backed users (future step)
- Prepare for multi-user support
- Ensure secure password handling

Status: In progress

---

## Phase 2 – Storage & Media System

Goal: Make uploads scalable and structured.

Tasks:
- Move uploads metadata into Prisma
- Add ownership (user → assets)
- Add delete + cleanup workflows
- Prepare for S3 / cloud storage adapters

---

## Phase 3 – UX & Product Polish

Goal: Make the app feel like a production SaaS product.

Tasks:
- Add loading + error states (completed)
- Introduce component system (Tailwind + shadcn)
- Improve dashboard UX
- Add previews (audio player, image grid)

---

## Phase 4 – Automation Engine

Goal: Turn Artist Vault into an intelligent assistant.

Tasks:
- Convert importer → actual release creation
- Auto-fill metadata from URLs
- Bulk ingest Spotify / Apple catalogs
- Smart suggestions for missing data

---

## Phase 5 – SaaS Platform

Goal: Monetization + multi-user environment.

Tasks:
- Multi-tenant architecture (artists / teams)
- Stripe integration
- Usage tiers
- Public press-kit sharing links

---

## Guiding Principles

- Keep everything self-hostable
- Favor server actions over client fetch where possible
- Maintain strong typing (TypeScript + Prisma)
- Avoid premature complexity until each phase is stable

---

## Current Focus

👉 Phase 1 → Auth Foundation

Next step: introduce database-backed users without breaking existing single-admin flow.
