# Public profiles implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship the approved public profile and same-account editor using Receiz v129.

**Architecture:** Extend the retained public Explore runtime and shared native
account owner. A public-only profile DTO supplies identity and paged Showcase
assets; the existing SDK owns edits and all financial/messaging authority.

**Tech Stack:** Existing React 19, TypeScript, Vite, v129 SDK and Lucide.

**Spec:** `docs/superpowers/specs/2026-10-21-public-profiles-design.md`

## Global constraints

- Main branch; no push, deployment, live financial mutation. Receiz edits are limited to the approved named-links contract and profile-scoped access to the existing image-upload pipeline.
- No extra polling, per-asset discovery calls or second account/storage service.
- Public seeds/caches exclude private profiles, hidden assets and account data.
- PBI authorship is separate from device/financial conformance.
- Preserve existing media, custody, verification and transaction behavior.

## Review focus

- Private or reassigned handles cannot expose retained previous-owner data.
- Route collisions and malformed names cannot replace existing public routes.
- A failed or wrong-account save cannot alter the presented account/username.
- Layout/filter/identity popover use adds no profile or per-asset requests.
- Public artwork alone never becomes verified Original or proof of ownership.

### Task 1: Public profile source and routing

Files: `src/receiz/public-profile.ts`, `server/public-profile.ts`,
`server/profile-preview.ts`, `api/profile.ts`, `public/learn/learn.js`,
`vite.config.ts`, `vercel.json`; tests `tests/public-profile.test.ts` and
`tests/public-profile-source.test.ts`.

Produces `PublicProfile`, `parsePublicProfile(input, expectedUsername)`,
`profilePagePath(username)` and `profilePageUsername(path)`; source returns
sanitized identity, public assets, public stats and bounded pagination.

- [x] Write failing tests for privacy, unsafe fields, collision-safe routing,
  complete source conversion, same-name owner changes and single-flight reads.
- [x] Implement the DTO, cookie-free bounded public relay and dynamic HTML seed.
- [x] Extend the existing public router with profile entries and retained scroll.
- [x] Run source/routing tests; preserve existing public route tests.

### Task 2: Profile presentation and media

Files: `src/public-explorer/PublicProfilePage.tsx`, `profile.css`,
`ProfileCollection.tsx`, `PublicExplorer.tsx`, `PublicAssetPage.tsx`.
Consumes `PublicProfile` and the current public Market pricing source.

- [x] Write failing component tests for both layouts, PBI scope, source links,
  missing artwork/prices, and media opening without leaving the profile.
- [x] Implement the selected layout, categories, search, share/copy, identity
  popover, activity and on-demand media using the current viewer.
- [x] Link standalone assets to the source-attributed profile and preserve
  profile/asset return state; do not replace creator attribution with ownership.
- [x] Run component and navigation regressions.

### Task 3: Same-account editing and actions

Files: `src/receiz/profile-edit.ts`, `native-identity.ts`,
`native-transport.ts`, `src/features/account/ProfileEditor.tsx`,
`IdentityProfile.tsx`, `src/features/account/PublicProfilePortal.tsx`,
`src/receiz/profile-actions.ts`, `src/App.tsx`, and messaging recipient handoff.

Produces optional `OpenIdentity.profile()` returning the same-account editor.

- [x] Write failing tests for changed-only patches, UID mismatch, closed
  identity, username availability, safe fields and narrowly allowed routes.
- [x] Reuse SDK `profile.update`, availability and authenticated account UID;
  retain no private profile in public cache. Update confirmed handle on success.
- [x] Add owner editor, public-image choice, Insights and existing Pay/Message
  handoffs under the single retained account owner.
- [x] Run owner/action/transport tests and TypeScript.

### Task 4: Qualification and commit

- [x] Verify actual public source reads without auth or mutations.
- [x] Exercise mobile/desktop layouts, reading/media, both column modes,
  profile→asset→back, link actions and owner edit using controlled fixtures.
- [x] Compare the selected visual and browser capture; fix material issues.
- [x] Run full tests and production build, obtain fresh whole-change review.
- [x] Document capabilities and profile-image route rollout; commit
  verified files on main for the user to push.
