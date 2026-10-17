# Native Offline Account Credit Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user explicitly authorized implementing this continuation on Receiz main and Bankeiz main, testing and committing locally. The user pushes. Do not modify the user's active Receiz branch.

**Goal:** From exclusively prepared device-held funds, create, transfer, deposit and spend the credited value with networking disabled, preserving Bankeiz's existing screens.

**Architecture:** Compose the existing v129 funded source, qualified irreversible custody, native Record/Seal and complete account successor. A local deposit consumes the current note into a receiver/account-head-bound native terminal; the same qualified hardware counter protects the resulting cash component. Its funding authority remains the complete original funding/consumption lineage. Synchronization appends that exact accepted lineage beneath local truth.

**Tech Stack:** SDK, MCP and AI skills 129.0.0; existing TypeScript, WebAuthn, IndexedDB and native source composition.

**Spec:** ../../settlement-note-contract.md, particularly Fully disconnected acceptance target; user authorization on October 17 permits the native extension on isolated Receiz main.

## Global constraints

- Bankeiz main starts at 0a8afab; Receiz main worktree is `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-v129-main`, starting at 6877b4fe1.
- No SQL migrations, package version changes, new issuer, root replacement, software custody fallback, fake balances or second independent wallet.
- Initial supported-device enrollment, proof resources and exclusive funding preparation may precede disconnection. No per-transaction allocation, enrollment, authentication refresh, credit signature or remote confirmation is permitted in the disconnected acceptance run.
- Reserve preserves original USD denomination. Settlement preserves exact locked Phi; dollar amounts remain deterministic projections.
- Keep original note design, From choice, preview, review, saved image, receiving request, transfer and Deposit note screens.
- Preserve complete private account namespaces; public notes must not export identity private keys, the complete private account or unrelated private history.
- No live financial transactions, production credential issuance, deployment or push by the agent.

## Primitive preflight

- Primitive affected: native funding, note custody, local Reserve/Settlement credit and spending.
- Source of truth: original admitted funding proof, full native consumption/handoff history and receiver-bound account successor.
- Risks: money-risk, settlement-risk, ownership-risk and offline-proof-risk. A signed account summary is not independent funding authority.
- First paint: retained verified account source must paint immediately; remote wallet observations cannot replace an accepted local head.
- External convention: none for product authority; use existing SDK cryptographic and browser mechanics.
- Evidence required: real v129 verification, independent source reopening, network-denied two-user respend, mutation/replay/restart/rollback tests, native source reproducibility and a fresh whole-change review. Synthetic authenticator tests do not qualify real hardware.

## Review focus

- Counter/state rollback and crashes between irreversible consumption and durable account adoption must preserve one exact recoverable outcome.
- A local credit must not also be redeemed online or remain spendable in its predecessor note.
- A copied credit source cannot initialize a second independently spendable budget or inflate another account.
- Settlement repricing must preserve exact Phi; Reserve repricing must preserve denomination and never manufacture another backing obligation.
- Reconnect must preserve account descendants and exclude outstanding device cash from competing online spending.

## Task 1: Source-bound local account credit and qualified cash activation

**Files:** Receiz `app/lib/wallet/bankNotes/{redemption,localAccountCredit,fundedNote}.ts`, `app/lib/wallet/kairosReservePwaCustodyAdapter.ts`, focused native tests.

**Interfaces:** Versioned local redemption intent binds exact note head, receiver identity, predecessor/successor account digests, local component identity and qualified custody. Runtime-verified local credit evidence exposes only the exact source-derived amount/rail and cash-head qualification. Existing online redemption and credit schemas remain compatible.

- [x] Write failing real-v129 tests for local deposit, complete account successor, independent reopening and subsequent qualified issuance with all network calls denied.
- [x] Implement local credit from exact terminal and complete funding sources; do not relax existing root-signed online credit verification.
- [x] Activate only the consumed note's qualified hardware successor; verify full account preservation, exact value delta and deterministic component identity.
- [x] Reject wrong receiver/head/rail/value, detached receipts, replay, copied state and unsupported custody; retain exact crash recovery.
- [x] Run native focused tests and record evidence before committing.

## Task 2: Reusable prepared funding, offline custody resources and Bank runtime

**Files:** Receiz `app/lib/wallet/bankNotes/browser.ts`, native preparation/storage helpers and browser recovery tests; Bank runtime types and identity handoff.

**Interfaces:** Prepared source/custody capacity is discoverable locally. Create consumes a verified available component and prequalified note slot. Deposit returns the exact verified account successor and retains a source usable by the next Create. Existing API methods and screens remain compatible.

- [x] Write failing creation/deposit/restart tests with fresh network requests disabled.
- [x] Reuse actual prepared exclusive budgets and prequalified custody resources; never allocate additional funds without consent.
- [x] Retain original intents and exact full source bytes across restart and partial writes.
- [x] Adopt verified local account successors for balance/chart and later native operations without an online wallet read.
- [x] Preserve per-account locks, foreign-ID refusal, previews, review amount, saving and legacy recovery.

## Task 3: Native reconciliation, exact modules and release evidence

**Files:** Receiz source service integration and native account writer ports/tests; Bank included native source manifests/modules, release documentation and integration tests.

**Interfaces:** The shared native writer accepts independently verified local transition lineage with semantic once-only identity, preserving outstanding qualified device capacity and exact account descendants. A remote response never replaces stronger local truth.

- [ ] Test reconnect and concurrent replay: one funding obligation, one consumed note, one account credit, exact later debits, no duplicate available online balance.
- [ ] Compose with the existing shared native writer; do not install a separate journal or silently merge unrelated working changes.
- [ ] Copy only reviewed native changes into Bank preferred sources and reproduce committed native modules/hashes.
- [ ] Run native focused crypto/custody tests, account-entry freeze where applicable, Bank tests/typecheck/build, MCP conformance and source/resource checks.
- [ ] Run one fresh whole-change review, address Critical/Important findings with RED/GREEN tests, then commit only reviewed work on both main branches. Report real-device/production evidence separately.

## Execution ledger

2026-10-17: Both main worktrees are clean at their starting commits. The user's active Receiz checkout and Crystal worktree contain unrelated ongoing changes and are read-only for this task. Native baseline: 16 focused funded-note, Settlement round-trip and browser recovery tests passed. Current v129 attestations qualify fresh credentials at registration counter + 2; cash activation after note consumption must derive its new qualification from the verified consumption receipt, not synthesize a fresh receiving certificate.

## Checkpoint status — October 17, 2026

Task 1 core qualification is committed on Receiz main at `ce455bfe444f88000be183afdae5455f8ff8d94b`.
Task 2 now includes reusable browser resource preparation, encrypted cash/source
retention, exact restart and verified local balance/chart adoption. Both rails
pass network-denied native journeys and the Bank bridge/storage checks. The
production selector remains disabled for the independent gates below. Task 3 included-source/module and browser/package checks pass;
shared-writer reconciliation, changing quotes/mixed rails and physical-device
qualification remain pending. See `../../native-offline-credit-qualification.md`.
Do not treat this checkpoint as completion of the full disconnected release.
