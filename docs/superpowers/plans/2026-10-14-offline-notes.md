# Bank Offline Notes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user has authorized implementation, testing and local Receiz main commits; the user will push.

**Goal:** Create a funded Offline Note and redeem a received note into spendable Reserve inside the existing Bank console.

**Architecture:** Compose the existing v129 qualified local issuance, complete artifact verification, irreversible custody and exact participant transitions. Origin-bound attestation transport is beneath those proofs. A redemption must consume the note and admit the Reserve successor together, retain recovery, and synchronize only beneath those stronger sources.

**Tech Stack:** Existing Receiz SDK/MCP/AI Skills 129.0.0, TypeScript, browser WebAuthn/IndexedDB, existing Receiz native host.

**Spec:** ../../offline-note-integration-contract.md. User clarified Deposit note must redeem into Reserve, not merely hold a note.

## Global constraints

- No package version changes, new dependencies, wallet redirects, fake receipts, reconstructed proof authority, software-key custody substitutes or legacy mint fallback.
- Exact enclosing proof bytes, canonical pinned roots, registry 8d0b5b839d02d9efbd4306cc99410595a183705c2670b76d2567eaaaade99065.
- No user funds, real credentials or production data mutations by the agent. Local code commits only.
- Preserve Receiz wallet defaults, Bank entry and first paint.

## Review focus

- Copied image without current custody cannot authorize redemption.
- A valid seal without verified funding cannot create Reserve.
- Repeated, concurrent and lost-response deposits cannot credit twice.
- Interrupted local consumption must resume its exact intent rather than create another.
- New account/device/source cannot inherit another account's note or pending operation.

## Tasks

- [x] Add origin/account/client-bound delegated device attestation through the existing issuer. Tests: reject wrong client, callback origin, scope, expiry, challenge and account before certification; preserve website route. Transport preparation only; no hardware qualification or note financial execution claimed.
- [ ] Expose a Bank browser composition of existing local issuance and exact custody, with explicit account callbacks and retained attempt identities. Tests: no wallet-global source mutation, no server mint, qualified-only execution, restart and exact-byte reopening.
- [ ] Implement admitted note-to-Reserve redemption from complete funding and current-holder evidence. Tests: conservation, atomicity, no double credit, foreign/current-head rejection and durable recovery. Do not expose a credit route without independent evidence.
- [ ] Wire Create note/Deposit note into Send/Receive using the prepared preview, exact proof-bearing image export and existing sheet styles. Tests: Back/Close, no background scroll, stale result isolation, proof image round-trip and failure presentation.
- [ ] Run focused and release/conformance checks, browser inspection, fresh read-only whole-change review; commit verified Bank and Receiz changes locally on main.

## Execution ledger

2026-10-14: Existing qualified genesis is a sealed portable document with an image payload. It does not itself carry the issuance Reserve consumption receipt. Existing qualified Receive activates a receiver slot; it does not redeem into Reserve. The Bank integration must supply the complete issuance/funding relation and terminal redemption rather than infer those effects from a valid image or HTTP success.

2026-10-14 checkpoint: Supabase reports the Receiz project `INACTIVE`; the user will restore service after resolving billing. Private source qualification cannot be checked live during the outage. This does not account for the unfinished note funding/redemption integration above: restoring Supabase alone does not enable Create note or Deposit note into Reserve.

Completed preparation: the Bank has a private challenge-ticket transport and an exact native-route allowlist. The Receiz host has a scoped bearer-bound challenge endpoint that calls the existing canonical platform attestation issuer. Its browser custody factory accepts an optional fetch transport; the wallet's default same-origin behavior stays intact. No note UI, account-entry behavior, balance projection, funding command, note issuance or Reserve credit route was changed.

Verification: Bank 276 tests passed; production build and public-page checks passed. Receiz 31 focused note/custody tests, 37 account-entry tests, scoped ESLint, API-security checks, governance and v129 release lock passed. A focused TypeScript check of the four changed production entries and their dependencies passed with the project's existing snarkjs declarations. The full Receiz TypeScript run exhausted its default 4 GiB heap; no full host typecheck/build success is claimed. A read-only independent review found no Critical or Important issues in the preparation scope.

Review follow-ups: the private challenge-map limit does not reserve capacity for pending requests; local HTTP transport acceptance does not imply hardware certificate qualification (the canonical certificate requires HTTPS). Neither grants financial authority. Production origin/hardware qualification and the remaining tasks must pass before enabling notes.

Conformance boundary: the installed v129 SDK validates the Bank's exact 60-operation contract. The connected MCP integration check reports a conflicting contract matrix. The installed SDK's integration inspection also fails: it reports compiler/adapter migration, generated-manifest flags and continuity verification findings, plus weak-state heuristics in generated SDK bundles under `.vercel/output`. These findings have not been resolved or dismissed; the project has not passed full application conformance or live note qualification. Do not change a valid operation matrix or treat a heuristic check as artifact authority.
