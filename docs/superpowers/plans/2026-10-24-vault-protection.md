# Vault protection page implementation plan

> Use superpowers:executing-plans inline, task by task.

**Goal:** Sell the implemented Vault protections in customer language with a transparent moving visual story.
**Architecture:** One static Learn-namespace solution page in the existing carried public renderer, CSS-native scenarios, custom coded illustration and social art. No Vault runtime, identity, custody or financial code changes.
**Tech Stack:** Existing ESM, SVG/CSS, static Vite build and Vitest.
**Spec:** `docs/superpowers/specs/2026-10-24-vault-protection-design.md`.

## Constraints and review focus

- Keep optional protection and default bearer authority explicit.
- No unconditional theft prevention, device qualification or active-production claim.
- Shared proof never grants account/Vault access; images never assert live verification.
- No new dependency, shared JS byte, account read or simulated financial action.
- Preserve other agents' work; apply scoped deltas only.

## Tasks

- [x] Add failing contract for route, source-bound copy, native scenario labels, original/private/public distinction and honest limitations.
- [x] Build content registry, coded SVG and page-only CSS, shared renderer/footer/metadata integration and canonical social art.
- [x] Verify static route/offline retention and prior public navigation; exercise actual scenario switching and FAQ on phone/desktop, capture screenshots and inspect custom share art.
- [x] Review factual claims against current implementation. Run scoped native protection tests, typecheck/build and relevant public gates; apply only this page's scoped files to Bankeiz.

Execution rule: direct user authorization continues the accepted page design. This task creates no new security authority and changes no passkey, recovery or money behavior.

## Verification

Implemented and reviewed against the actual Vault custody, encryption, presence, source admission and public proof paths. Corrected malformed animation frames and narrowed the lock claim to explicit closing and browser tab backgrounding. All 69 targeted tests and the full Bankeiz production build passed. Browser evidence covers 1200px desktop, 390px phone, 320px layout, native radio/keyboard selection, expandable security limits, retained Business-to-protection navigation, and the existing signed-out account entry reached by the Vault CTA. Shared public navigation JavaScript and CSS remain byte-identical to the existing implementation. No production service, provider credential, real funds or device recovery ceremony was exercised.
