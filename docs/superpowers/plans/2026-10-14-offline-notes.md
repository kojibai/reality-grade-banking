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
- [x] Expose a Bank browser composition of existing local issuance and exact custody, with explicit account callbacks and retained attempt identities. Tests: no wallet-global source mutation, no server mint, qualified-only execution, restart and exact-byte reopening.
- [x] Implement admitted note-to-Reserve redemption from complete funding and current-holder evidence. Tests: conservation, atomicity, no double credit, foreign/current-head rejection and durable recovery. Do not expose a credit route without independent evidence.
- [x] Wire Create note/Deposit note into Send/Receive using the prepared preview, exact proof-bearing image export and existing sheet styles. Tests: Back/Close, no background scroll, stale result isolation, proof image round-trip and failure presentation.
- [x] Run focused release checks and browser inspection, record the unresolved full-conformance gate, complete fresh read-only review and commit verified Bank and Receiz changes locally on main.

## Execution ledger

### Resumed implementation — funding and redemption

Working denomination rule: the existing wallet projector retains both fixed whole Phi and the original funded USD amount in its ledger, and derives display through its normal value states. Reuse those fields exactly; do not invent a new exchange or fabricate additional funded USD at a later quote. An optional user clarification remains pending, but source inspection resolves the existing v129 behavior. No user funds have moved.

The Bank needs an exclusive Reserve allocation before offline custody. A plain observed balance or a generically sealed document is insufficient. Funding setup may be online; once the qualified funded source exists, ordinary issuance remains local. Do not re-enable connected mint/commit routes.

Implementation contract for this continuation:

1. A dedicated, authenticated Bank funding endpoint verifies signed identity funding authorization and attested receiving custody. It atomically allocates the reviewed amount from actual online Reserve, using the same wallet row lock as existing transfers. It retains a stable allocation ID and immutable operation basis. Lost outcomes are recovered by that ID before another allocation. No production schema changes run while Supabase is paused.
2. The exact allocation becomes a canonical `reserve_funding` proof object containing a purpose-bound funding attestation from Receiz's existing canonical root. An ordinary enrolled device certificate cannot declare funds allocated. Reuse the protected server root signer; do not repurpose a different signing context silently. A new narrowly named funding signing context, if needed, is configuration for review rather than a package release or a new issuer/key.
3. The allocation is a component of the complete account. It must not add money to the total or mislabel online Reserve as Settlement. Bind qualified custody only to the allocated component, while retaining the complete main account proof. Bank issuance subtracts from both that component and the main account's Reserve; other account namespaces remain exact. Existing default wallet issuance retains its full-Reserve semantics.
4. Each Bank creation allocates the exact reviewed note amount, then locally consumes that funded component and issues the complete qualified note. Persist the exact original account proof, allocation, preparation ID, note ID/token, Kai/time, nonce and intent before the first irreversible action. The existing stage/proof custody and SDK receipt checks remain the execution machinery.
5. Saved PNG transport carries exact funding source, full Reserve consumption prefix and complete note handoff artifacts. Verify each enclosing artifact and SDK custody receipt; the image and container hashes are transport only. No identity private key or account private history goes into the note image.
6. Deposit irreversibly consumes the qualified current note into a terminal redemption bound to the exact receiving account and retained intent. The Bank's native admission records terminal consumption and the Reserve credit once, preserves exact terminal/credit proof bytes and returns the same outcome on replay. Online Reserve indexing remains beneath that proof. A paused service may retain a pending operation; it cannot fabricate a successful deposit or replace known account truth.
7. No extra local Reserve credit counter is needed for a deposit into online Reserve. Returning deposited value to Offline Cash is a new funding allocation. This keeps the public funded-note proof graph linear and avoids embedding recursive duplicated purse histories in every subsequent note.

Progress: explicit Bank account callbacks, delegated attestation fetch and retained issuance identities are implemented in the host browser runtime; default wallet source checks remain. Partial saved intents now fail before a new ID can be substituted. The new funded-note verifier and PNG transport pass real v129 cryptography tests, including missing/tampered funding and a complete qualified sender-to-receiver handoff. No Bank UI action or live note creation/redemption is enabled yet.

Local SQL test environment: disposable PostgreSQL at `/private/tmp/receiz-bank-notes-pg-20261014`, Unix socket `/private/tmp/receiz-bank-notes-pg-socket-20261014`, port 55477, TCP disabled. Stop it with pg_ctl after the SQL tests. It contains no user or production data. Migration creation is running in exec session 64482; check its output before creating another migration.

Migration created: `supabase/migrations/20261015012532_bank_offline_notes_native.sql`. Fresh local SQL tests passed for conservation, exact replay, conflict/capacity rejection, RLS/service-only execution and large-integer JSON precision. No hosted migration was applied. RPCs return financial integers as decimal strings; direct row reads cast bigint columns to text.

Privacy and full-account binding: public note funding proofs must not expose the funder's complete Reserve balance or private account history. The allocation proof may commit a private cash-account snapshot by SHA-256; the authenticated Bank receives the exact private opening separately and verifies it only after admitting the complete enclosing allocation proof and its funding-purpose root signature. That private snapshot records actual cash before/after allocation from the atomic wallet operation. The main account retains complete Settlement and all other namespaces; allocating cash changes where its Reserve is held, not the total. Bank local issuance consumes only that allocated component while subtracting the same reviewed amount from the complete account. Default wallet behavior remains unchanged. Redeeming into online Reserve similarly returns a verified credit proof and private cash-account opening. The generic image/seal signature by itself cannot declare funding.

2026-10-14: Existing qualified genesis is a sealed portable document with an image payload. It does not itself carry the issuance Reserve consumption receipt. Existing qualified Receive activates a receiver slot; it does not redeem into Reserve. The Bank integration must supply the complete issuance/funding relation and terminal redemption rather than infer those effects from a valid image or HTTP success.

2026-10-14 checkpoint: Supabase reports the Receiz project `INACTIVE`; the user will restore service after resolving billing. Private source qualification cannot be checked live during the outage. This does not account for the unfinished note funding/redemption integration above: restoring Supabase alone does not enable Create note or Deposit note into Reserve.

Completed preparation: the Bank has a private challenge-ticket transport and an exact native-route allowlist. The Receiz host has a scoped bearer-bound challenge endpoint that calls the existing canonical platform attestation issuer. Its browser custody factory accepts an optional fetch transport; the wallet's default same-origin behavior stays intact. No note UI, account-entry behavior, balance projection, funding command, note issuance or Reserve credit route was changed.

Verification: Bank 276 tests passed; production build and public-page checks passed. Receiz 31 focused note/custody tests, 37 account-entry tests, scoped ESLint, API-security checks, governance and v129 release lock passed. A focused TypeScript check of the four changed production entries and their dependencies passed with the project's existing snarkjs declarations. The full Receiz TypeScript run exhausted its default 4 GiB heap; no full host typecheck/build success is claimed. A read-only independent review found no Critical or Important issues in the preparation scope.

Review follow-ups: the private challenge-map limit does not reserve capacity for pending requests; local HTTP transport acceptance does not imply hardware certificate qualification (the canonical certificate requires HTTPS). Neither grants financial authority. Production origin/hardware qualification and the remaining tasks must pass before enabling notes.

Conformance boundary: the installed v129 SDK validates the Bank's exact 60-operation contract. The connected MCP integration check reports a conflicting contract matrix. The installed SDK's integration inspection also fails: it reports compiler/adapter migration, generated-manifest flags and continuity verification findings, plus weak-state heuristics in generated SDK bundles under `.vercel/output`. These findings have not been resolved or dismissed; the project has not passed full application conformance or live note qualification. Do not change a valid operation matrix or treat a heuristic check as artifact authority.

Final implementation and review: the five Important recovery findings were fixed in one pass and their regression tests passed. A realistic engraving test exposed a complete-proof transport limit; bounded lossless packing plus a compact native preview preserves the full-size downloaded note and all exact proof bytes. The module loads in an actual browser without Vite's public-import error and retries a failed lazy load. See `docs/offline-notes-release.md` for final checks, review decisions and the explicit production prerequisites. Financial activation remains pending Supabase restoration, migration, scoped signer configuration and a supported-device funded check. No hosted changes or funds were moved. Final local main commits follow the user's explicit choice; no push or deployment is authorized here.
