# Email Guide Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task in the current agent. No commits or pushes; parent owns integrated build and review.

**Goal:** Deliver the concept-led Bankeiz email guide and connected booking presentation using real inert product examples.

**Architecture:** Existing static public-guide pipeline renders actual display components at build/dev time, scopes their CSS and carries complete example HTML. A page-only script changes local examples. Route, metadata and discovery registration reuse existing public navigation.

**Tech Stack:** React SSR, Vite, esbuild CSS, vanilla presentation JavaScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-13-email-guide-design.md`

## Global Constraints

No identity, Source, provider or transport calls from the guide. No changes to live booking or account entry. No generated JSON edits, new dependencies, full build, commit or push. Preserve other agents’ work. Concept assets are references only.

## Review Focus

- `/email` must not be captured as a bare profile, while `/u/email/` still works.
- No-JavaScript first paint must contain real example content and the full explanation.
- Local demo controls must remain inert, accessible and independent of API availability.
- Manual choice, reduced motion and leaving the page must stop autoplay.
- Mobile layout must keep headlines, address, product controls and FAQs readable without overflow.

### Task1: Content and actual example renderer

Create `src/content/email-guide.mjs`, `src/presentation/EmailPreview.tsx`, `scripts/email-guide.mjs` and declarations; add `tests/email-guide.test.ts`. Write failing tests for routes, actual EmailMessage markup, no forms/live destinations, complete copy and cross-links. Implement source-rendered screens and scoped CSS; run focused tests.

### Task2: Guide delivery and local walkthrough

Create `public/learn/email.css`, `public/learn/email.js`, declarations and `scripts/email-guide-dev.mjs`; register build/dev/metadata/rewrites/footer/directory and reserved route. Add `tests/email-guide-interaction.test.ts` for local controls, no fetch, pause, reduced motion and cleanup. Run focused interaction, navigation and guide tests.

### Task3: Connected booking presentation and verification

Refine only `scripts/booking-guide.mjs` and `public/learn/book.css`, retaining all real examples and adding the `/email/` cross-link. Use the existing guide regression tests. Verify desktop and mobile through Browser/IAB first, Playwright if unavailable; inspect accepted concepts beside screenshots with view_image. Update fidelity ledger and report owned paths and test evidence to parent.

## Completion checks

- [x] Source-rendered email examples and route/copy contracts.
- [x] Local demo controls, manual pause, reduced-motion and cleanup tests.
- [x] Static build/dev/metadata/discovery registration and explicit profile-route preservation.
- [x] Booking presentation refinement, complete local preview avatars and reciprocal links.
- [x] Browser fallback verified desktop/tablet/phone and no-JavaScript/API-blocked entry.
- [x] Fidelity ledger and owned-file manifest prepared; no build, commit or push.
