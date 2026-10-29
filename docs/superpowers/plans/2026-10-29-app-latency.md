# App latency Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline. Steps use checkbox syntax.

**Goal:** Remove six audited serial preparation waits while preserving the existing product and authority boundaries.
**Architecture:** Overlap independent existing code, local-file and read-only preparation after the same explicit user intent. Keep admission, signing, native actions, durable results and per-peer signaling in their existing order.
**Tech Stack:** TypeScript, React, native Receiz SDK adapters, Vitest, existing browser fixtures.
**Spec:** The user-approved six-row latency audit in /private/tmp/bankeiz-latency-audit-2026-10-29.md and current conversation.

## Global Constraints

- User explicitly authorizes this work and a scoped commit on latest main. Preserve all other agents' work, especially native-identity.ts ownership changes.
- No account-entry, bank-kai, model, prompt, SDK, SQL, route, payload, permission, payment or stylesheet changes.
- No new network requests, automatic preloading at login, authority layer, whole-collection work or added polling.
- Same component trees and controls. Earlier completed preparation may reveal the same result sooner.
- Group-call concurrency is bounded to four independent peers; each peer retains its own description/signaling order.
- One heavy job at a time; one Vitest worker. Qualify the exact owned patch in a clean main snapshot; stage only its diff.

## Primitive preflight

- Primitive affected: owner-bound tool execution, public proof inspection, certificates, asset publication and live call membership.
- Source of truth: existing canonical Identity/artifact admission, verified source bytes, native owner result and accepted membership.
- Stronger/weaker truth risk: identity-risk, ownership-risk and public-proof-risk; no temporary state may authorize an action or replace a verified result.
- First-paint risk: existing markup, held results and admission remain unchanged; only independent work overlaps after intent.
- External convention: JavaScript promise scheduling and browser mechanics only; no external product authority.
- Checks: failing ordering contracts, existing owner/entry/publication/call suites, full Bank tests/build, phone browser evidence.
- Exact uncertainty: new order/cancellation behavior and speedups are unverified until these checks execute. No live customer action is needed.

## Review Focus

- Rejected or closed Identity cannot construct/use a foreign-owner tool or publication.
- Image failure or Identity replacement cannot submit a photo; API failure must not leave an unhandled image promise.
- Certificate local-checkpoint failure/unmount cannot publish details or enable an action from a late response.
- A failed peer or End during a delayed offer stops media and cannot create more peers or resurrect the call.
- Invalid file bytes still fail enclosing verification; overlapping reads cannot publish or admit a forged source.

### Task 1: Remove the six independent preparation waits

**Files:**
- Modify src/receiz/native-identity.ts: businessSetup, moneyTools, profile, openAssetPublicationRuntime only.
- Modify src/features/account/ProfileEditor.tsx and QuickProfileEditor.tsx: photo preparation only.
- Modify src/features/certificates/CertificateManager.tsx: initial status/read scheduling only.
- Modify src/public-ledger/LedgerProofControls.tsx: selected local file/code scheduling only.
- Modify src/receiz/native-calls.ts: bounded independent mesh offers and cancellation checks only.
- Create targeted ordering tests and docs/verification/2026-10-29-app-latency.md.

**Interfaces:** Consumes the same existing owner APIs, file verifier and call transport. Produces the same return types, markup, requests and retained state; no new runtime API.

- [x] Step 1: Write contracts with explicitly held code/transport/image/checkpoint/signal promises. Assert both independent starts before either is released, same accepted result, no duplicate action, failure and cancellation guards.
- [x] Step 2: Run new tests on unchanged 722c377. Expected: ordering assertions fail at the audited serial boundaries; no setup/transform failures.
- [x] Step 3: Apply minimal Promise.all scheduling in existing functions. Bound mesh offers in groups of four, preserving each peer's offer chain and generation checks.
- [x] Step 4: Run targeted new and existing regression tests. Expected: all pass with the same requests, owner guards and final result.
- [x] Step 5: Measure the same before/after cold paths with controlled delays; do not turn timings into flaky regression thresholds. Run phone browser flows and inspect screenshots.
- [x] Step 6: Run the complete Bank test suite and production build on the exact owned patch, one process at a time. Review final diff separately. Expected: green checks, unchanged product preview correspondence and no contradictory visible evidence.
- [x] Step 7: Integrate only owned hunks onto latest main, preserving other agents' bytes. Verify staged paths/hunks, commit and report measured results plus exact live-browser limits. No push/deploy.
