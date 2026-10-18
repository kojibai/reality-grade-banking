# Public Ledger Crystal Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task in the existing main checkouts. Do not modify the user's Receiz working branches.

**Goal:** Download and reopen the public Ledger as a source-carrying Memory Crystal, and accept either a ledger source or an individual proof through the same v129 verification path.

**Architecture:** Reuse Receiz's existing Ledger source, Merkle snapshot, complete-artifact verification, public discovery and durable native source primitives. Reuse the v129 source-carrying Crystal history mechanics for a Crystal; do not introduce another financial ledger or verifier. Public display records remain observations until their original enclosing source and supported domain claims are admitted.

**Tech stack:** Receiz SDK/MCP/AI Skills 129.0.0, existing native source storage and coordination, TypeScript, React, PNG, Web Crypto, current Bankeiz API transport.

**Spec:** [Public Ledger: one verifier, two carried forms](../specs/2026-10-17-public-ledger-crystal.md).

## Global constraints

- Keep SDK/MCP/AI Skills at exactly 129.0.0.
- No SQL, replacement trust roots, shadow wallet or financial execution from a public upload.
- Preserve the exact Bankeiz app and note experience. New controls belong on `/ledger/`.
- Reuse the isolated Receiz main worktree; leave both user working branches untouched.
- User pushes both repositories. No deployment or live financial transaction.
- Full history means complete declared source scope, never the visible 60-row presentation window.

## Existing implementations to preserve

- Receiz `app/ledger/ledgerProofBundleClient.ts` exports and imports Ledger JSON/PNG using `receiz.ledger_proof_bundle` and the existing `wallet-ledger-merkle.v1` snapshot integrity rules.
- Receiz `app/components/SigilExplorer/ledgerStore.ts` provides exact snapshot/event canonicalization, segmented Merkle roots and integrity verification. Its unauthenticated display snapshot is not independent financial or ownership admission.
- Existing Ledger export explicitly distinguishes an integrity-sealed snapshot from a proof object with ownership continuity. Preserve that distinction; do not copy its printed `integrityVerified` flag as authority.
- v129 `@receiz/mcp-server` `offlineCrystal` uses canonical SDK artifact verification, same-signer carried predecessor history and exact verified source bytes. Its local intelligence carrier alone never publishes public state.
- Bankeiz's public source cache is a public projection, not the original native global source. Keep its immediate reader and statuses; do not upgrade it by relabeling.

## Review focus

- A sealed arbitrary statement or a recomputed Merkle tree must not be accepted as the official financial Ledger.
- A Crystal's predecessor, original source and stable identity must survive save, reload, retry and duplicate upload.
- Public-source coverage must remain explicit when a source is unavailable or exceeds the existing verifier's capacity.
- Public upload must never disclose private identity/recovery/custody bytes or trigger note claiming.
- Concurrent publication and interrupted transport must not rewrite a settled prefix or produce duplicate entries.

## Task 1: Reuse the native Ledger source contract

**Read:** Receiz `app/ledger/ledgerProofBundleClient.ts`, `app/components/SigilExplorer/ledgerStore.ts`, `app/lib/ledger/actionLedgerHistory.server.ts`, existing file-backed Action Ledger/source stores and canonical source verification.

**Add:** Receiz `app/lib/ledger/publicLedgerSource.server.ts`, `app/lib/ledger/__tests__/publicLedgerSource.test.ts`; Bank `docs/public-ledger-source-contract.md`.

**Interfaces:** Native `readPublicLedgerSource()` returns exact original public-safe source bytes, stable source/ledger identity, original Kai/head, declared coverage and matching public rows. It consumes only the existing verified native source and publication authority, never caller-provided roots, balances, raw private export or public feed rows as proof authority.

- [x] Write and observe failing source tests: complete native scope, unavailable/incomplete source, private-field exclusion, genuine Kai, missing/changed original and unsupported financial claims.
- [x] Reuse existing source admission and exact snapshot canonicalization beneath that source. Preserve existing snapshot compatibility and original scope; add no synthetic full-history source.
- [x] Require the real admitted public writer/source binding and full source continuity. A server seal is not by itself a new independent attestation of uploaded claims.
- [x] Verify green against actual canonical sealed fixtures. Document exactly what the exported source proves and what remains a display projection.

## Task 2: One source opener for both files

**Add:** Bank `src/receiz/public-ledger-proof.ts`, `tests/public-ledger-proof.test.ts`; Receiz counterpart beneath `app/lib/ledger/` for server re-verification.

**Interfaces:** `inspectPublicLedgerFile(file)` returns an opaque held review with supported source projections and proposed local/public effect. `retainPublicLedgerReview(review)` uses only that held exact-byte review. Sources are opened with v129 canonical verification; the existing Crystal opener verifies every enclosing predecessor/source before dispatch to the same supported source-domain reader.

- [x] Write and observe failing parity/tampering tests: one original vs the same original inside a valid Crystal, changed signature/source/Kai/predecessor, unsigned JSON/PNG, forged flags, foreign ledger and pruned/conflicting history.
- [x] Reuse v129 existing mechanisms without accepting transported verifier keys or creating a new Crystal verification scheme.
- [x] Preserve exact bytes and original identifiers, idempotent duplicate handling, verified prefix and supported sibling branches. Validate before any local write.
- [x] Verify green with real native artifacts and independent negative fixtures.

## Task 3: Durable public admission and distribution

**Add:** Receiz bounded `/api/ledger/proof` read/review/publish adapters and focused HTTP/concurrency tests; Bank `server/public-ledger-proof.ts` and its tests.

**Interfaces:** Read serves only admitted public source. Review reopens exact upload bytes and proposes a supported effect. Publish requires consent bound to the exact source digest and chosen effect, then uses existing source storage/coordination and idempotency. Bank relay fixes the Receiz origin/path, bounds bytes and never forwards private cookies or arbitrary URLs.

- [x] Write and observe failing tests for private-source publication refusal, consent/source mismatch, cross-origin writes, unsupported content, duplicate retry, process restart and concurrent predecessor change.
- [x] Route a carried Ledger to its existing lawful history admission; route a single proof to its existing public discovery/admission mechanism. No wallet/ownership effect is implied or dispatched.
- [x] Persist exact source before index updates. Retain the same source on uncertain delivery and reopen the existing result before retry.
- [x] Verify read-only public distribution and exact replay after restart. Exercise no live publication or funds.

## Task 4: Crystal image and tasteful controls

**Add:** Bank `src/receiz/public-ledger-crystal-image.ts`, `src/public-ledger/LedgerProofControls.tsx` and focused tests.

**Modify:** `src/public-ledger/PublicLedgerApp.tsx`, `public-ledger.css`, bounded relay wiring and offline-shell asset graph as needed.

**Interfaces:** `createPublicLedgerCrystal(verifiedSource)` uses held admitted originals, the existing v129 sealing/history mechanism and byte-preserving PNG transport. It returns exact verified bytes and a safe filename. Image metadata/QR/text never supply proof authority.

- [x] Test full-history selection, no visible-window ceiling, image source mutation, capacity refusal and output verification before download.
- [x] Render a high-resolution navy/paper Crystal with the real source count, head/Kai, scope and public verification link. Reopen the exact saved image offline.
- [x] Add one upload picker and a restrained review. Keep local inspection separate from explicit public publication. Explain that already-public copies cannot be recalled.
- [x] Verify same original/Crystal parity, preserved user account state, keyboard focus, reduced motion, mobile containment and real file save/reopen.

## Task 5: Qualification and commits

- [x] Run focused native source/admission/HTTP tests plus the required existing Receiz boundary and entry-freeze checks for any affected shared path.
- [x] Run Bank tests, typecheck, production build, native source/rebuild checks, public-page/offline-shell checks and clean source archive reproduction.
- [x] Browser-test desktop and 393px mobile: public reader, download, source reopen without network, both upload formats, review/cancel/confirm, receipts, retained history after API failure and source download.
- [x] Request scoped code review; fix actionable failures and repeat affected verification.
- [x] Commit reviewed changes to both main checkouts. Report actual commit IDs, supported source scope, checks and remaining qualification limits without claiming unrelated financial operations are live.

## Ready reader checkpoint

The current `/ledger/` reader, Reality-Grade Banking explainer, contextual links and actual chart-window selection are separate from Tasks 1–4. They can be committed after their own checks while source work follows this plan. The reader does not currently offer Crystal production or public uploads.

## Completion evidence

See [the release verification record](../../verification/2026-10-18-public-ledger-release.md) and [activation guide](../../public-ledger-release.md). User-controlled push/deployment and exact native source disclosure approval remain separate from completed local implementation and tests. Existing financial selectors are unchanged.
