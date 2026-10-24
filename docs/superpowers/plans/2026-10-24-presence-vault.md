# Source-carrying Vault implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. The user selected implementation here on main. Leave pushing and deployment to the user.

**Goal:** Deliver recoverable PBI-protected Vault originals containing actual money and asset sources, with balance/card deposits, in-kind asset custody, owner returns, direct sending and independent read-only ownership proofs.

**Architecture:** Build the source and custody contracts before exposing money controls. Encrypt the private source family and its distinct custody authority with a qualified passkey PRF; keep the ordinary account active. Reuse native financial and ownership rules, and build the missing parent-custody and Market-position transfer adapters explicitly. A separate closed public record format discloses admitted evidence without access authority.

**Tech stack:** Existing TypeScript, React/Vite, WebAuthn, WebCrypto, pinned Receiz SDK/native financial primitives and independent offline verifier resources. Existing Receiz host and SQL acceptance mechanisms only where their qualified contracts need extension.

**Spec:** ../specs/2026-10-24-presence-vault-design.md, especially its expanded-scope amendment. Copy draft: ../specs/2026-10-24-vault-public-copy.md.

## Global constraints

- User identity and account remain the same; an internal Vault custody address is not a second consumer signup.
- The asset itself moves; no implicit sale, claimed valuation, public-file copy or ordinary account balance can substitute for actual Vault custody.
- Private original carries required complete source bytes, continuity and encrypted recovery material. Public proof grants no unlock, login or spending authority.
- Save and successfully reopen prepared encrypted recovery before moving value.
- Existing financial rules, prices, rights, backing, card minimums and source validation remain authoritative.
- No Vault work on ordinary cold entry, balance, Ledger, Market or public asset first paint.
- No temporary swap of the active device identity, no unprotected child key in ordinary storage, no automatic real-money testing.
- Opening held contents can be offline; the approved first release uses connected money execution until the separate offline financial acceptance work is qualified.
- Production migrations, deployment and real passkey/account enrollment are separate from local implementation and synthetic verification.
- Preserve existing unrelated untracked offline-financial foundation work in Receiz main. Do not stage it in Vault commits.

## Review focus

- Copied private file plus stolen ordinary Identity Record must still require the original qualified passkey secret.
- A pre-funding or pre-send backup must recover the exact accepted operation rather than create another request or resurrect consumed value.
- Public export must be constructed from safe native witnesses and reject private authority even when nested inside carried bytes.
- Unsupported Market shares or generic proof images must not masquerade as exclusively held asset custody.
- Parent identity closure, backgrounding and competing tabs must invalidate stale grants/callbacks without losing a durably submitted original.

## Task 1: Define and qualify source/custody contracts

**Files:** Bank `src/receiz/vault/{types,source,public-record}.ts`, `schemas/vault-{private,public}.schema.json`, `tests/vault-source.test.ts`; Receiz `app/lib/wallet/bankVault/{source,custody}.ts` and their tests.

**Interfaces:** `VaultPrivateSource` carries version, Vault ID, original owner binding, custody binding, exact native source family, predecessor and operation journal. `VaultPublicRecord` carries only selected public witnesses, holder proof, disclosed owner, exact source heads and sealed coordinate. Source verifiers return authority only from complete admitted originals.

- [ ] Write failing cases for missing original, substituted owner/key/head, source amount mismatch, duplicated child source, private authority in public export and old-head replay.
- [ ] Run `npx vitest run tests/vault-source.test.ts`; observe the expected missing-contract failures.
- [ ] Implement closed schemas, canonical encoding and full-source admission. Qualify existing source classes before labeling them depositable. Do not create a financial root signature or trust root from an app key.
- [ ] Run Bank source tests and Receiz native contract tests; expect all named substitution/replay cases to be rejected.
- [ ] Commit source-contract changes separately in the applicable repositories after their required verification.

## Task 2: Protect and recover private custody

**Files:** Bank `src/receiz/vault/{presence,encryption,store,recovery}.ts`, `tests/vault-{presence,encryption,recovery,store}.test.ts`.

**Interfaces:** `registerVaultProtection(owner, signal)` returns a public credential descriptor after a verified encrypt/decrypt rehearsal; `unlockVault(source, purpose, signal)` returns a short-lived nonpersistent custody context. `saveVault(next, expectedDigest)` persists only encrypted payload and public routing metadata through compare-and-swap. Recovery returns the original identity bytes and phrase only to existing canonical admission.

- [ ] Test wrong credential/origin/RP/challenge/flags/signature, absent PRF, tampered AAD/ciphertext, provider recovery mismatch and cancelled enrollment; no financial request may run.
- [ ] Run targeted tests and observe expected failures before implementation.
- [ ] Implement domain-bound user verification, PRF/HKDF/AES-GCM, bounded parsing and encrypted IndexedDB retention. Separate this recoverable encryption credential from non-backup-capable irreversible Note custody qualification.
- [ ] Test exact recovery on a clean browser profile, no plaintext key retention, stale CAS refusal and close/background abort. Exercise the real browser WebAuthn implementation with virtual credentials in CI; record actual supported-device rehearsal requirements separately.
- [ ] Commit only after targeted tests pass.

## Task 3: Establish isolated Vault execution authority

**Files:** Bank `src/receiz/vault/{context,operations}.ts`; Receiz `app/api/connect/vault/custody/route.ts`, `app/lib/wallet/bankVault/custodyService.server.ts`, relevant Connect scope/consent definitions and native test fixtures.

**Interfaces:** Parent-signed and child-signed custody creation binds exact owner ID, Vault ID and distinct custody public key. A successful native result establishes the internal custody relation and financial account without replacing the user's active identity. `openVaultContext` provides encrypted source/journal ports, independent lock/CAS, ephemeral grants and an abort lifetime.

- [ ] Test a second key bound only to the same ordinary wallet cannot establish isolated Vault custody; test substituted creator, public proof input, duplicate creation and active-parent identity preservation.
- [ ] Observe failures, then implement the supported Connect contract and isolated runtime composition over existing injectable payment/asset primitives. Do not patch global `identity/current` temporarily.
- [ ] Prove ordinary identity backup, Note listing, card archive and root signer stores contain no unprotected Vault key or reusable grant.
- [ ] Run Connect authorization, account-entry freeze and applicable governance tests; commit verified integration separately from UI.

## Task 4: Deposit and send actual value

**Files:** Bank `src/receiz/vault/{funding,assets,transfers,journal}.ts`; Receiz `app/api/connect/vault/{funding,assets,transfers}/route.ts`, `app/lib/wallet/bankVault/*Service.server.ts`, and explicit SQL migrations only where atomic native acceptance requires them.

**Interfaces:** Each action retains exact source heads, recipient, amount/quantity, approval digest and original idempotency key. Funding returns allocated native money source; asset deposit returns transferred native ownership source. Release/send returns consumed-source evidence plus exact recipient/change successors.

- [ ] Write failing conservation, partial-change, same-source double-use, lost-reply and old-backup recovery tests for balance/card deposits and each native money rail.
- [ ] Write in-kind native asset tests proving identity, quantity, backing and rights remain unchanged through deposit, owner return and direct send.
- [ ] Add a qualified Connect adapter for existing share certificates. Test Market positions transfer as the asset itself; quote/trade/portfolio responses are insufficient and no automatic sale is permitted.
- [ ] Implement exact native adapters and once-only accepted-effect recovery. Preserve unfinished checkout and verified credit before subsequent allocation; no blind repeated charge/transfer.
- [ ] Verify interruption at each retention/submit boundary, two tabs, two devices and stale copies. Expect zero duplicate debit/credit and complete original source continuity.
- [ ] Commit verified source/services/migrations separately. Do not apply production migrations as part of tests.

## Task 5: Independent private recovery and public evidence

**Files:** Bank `src/receiz/vault/{export,inspect,disclose}.ts`, `institution/vault-inspect.mjs`, `public/vault-reader/`, `tests/vault-{export,public-record,independent-reader}.test.ts`, published schema/reader documentation.

**Interfaces:** `exportPrivateVault` carries encrypted actual sources and journal; `createVaultPublicRecord` takes explicit selected disclosures and a fresh source-bound holder approval. `inspectVaultRecord` independently verifies sources and returns a machine-readable scoped result. Public input is never accepted by private open/login/send interfaces.

- [ ] Test a private original restores through the independent reader with the correct passkey and without the Vault UI or account-summary API.
- [ ] Test a public export verifies disclosed holdings, rejects substituted evidence, preserves its recorded scope and cannot unlock, import identity, fund, send or mint money.
- [ ] Test no private key, phrase, bearer token, encrypted private original or reusable financial authorization is recursively disclosed.
- [ ] Implement exact-byte carrier export, closed public disclosure and offline verifier/CLI packaging. Do not claim an old offline proof proves current unspent state.
- [ ] Verify CLI/browser results agree on authentic and adversarial artifacts; commit after all tests pass.

## Task 6: Deliver the consumer experience

**Files:** Bank `src/features/vault/{VaultExperience,VaultRecovery,VaultReview,VaultProofSharing}.tsx`, `vault.css`; modify `IdentityProfile.tsx` and explicit selected-file recovery routing only.

**Interfaces:** Lazy feature entry receives active owner and exact qualified Vault ports. Private contents exist only during an explicit authorized session. Identity shows **Protect your recovery** and **Your vaults**. Opened Vault shows **Add value**, **Send**, **Move to my balance**, **Save private Vault** and **Share proof**.

- [ ] Add behavior tests for no startup Vault work, cancelled setup, save/reopen-before-fund, mobile keyboard/focus, pending original recovery and background lock.
- [ ] Observe failures, then implement approved visual direction using existing sheets, typography and financial review components. Reuse avatar/known source; no eager profile or ledger requests.
- [ ] Exercise mobile/desktop browser flows through real controllers and synthetic native finance/ownership originals. Verify direct Send cannot act on an edited recipient after authorization.
- [ ] Commit polished UI only when its required native capabilities are qualified; no placeholder financial controls.

## Task 7: Public page with supported claims

**Files:** Bank `scripts/vault-page.mjs`, public-page metadata/build routes and assets, associated route and copy tests. Copy basis: `2026-10-24-vault-public-copy.md`.

- [ ] Test no claim of universal fraud prevention, no private-public export confusion, supported-device recovery instructions and accurate offline scope.
- [ ] Implement the public page with the approved plain-language framing, actual feature CTAs and evidence links. Include independent verification and exact supported asset classes.
- [ ] Check mobile/desktop readability and static first paint; no Vault or PBI runtime on marketing-page load.
- [ ] Publish as build output only when the corresponding protection and financial acceptance gates pass.

## Task 8: Release verification and main commits

- [ ] Run full Bank tests, typecheck, production build and browser regressions; zero skipped tests.
- [ ] Run affected Receiz tests, account-entry freeze, lint/build and required governance checks for exact modified paths.
- [ ] Record device-native setup and supported replacement-device recovery evidence; do not label synthetic credentials as Face ID testing.
- [ ] Request one independent final code review against the approved expanded spec, especially source custody and public/private export separation. Fix important findings with regression tests.
- [ ] Commit on main in separate Bank/Receiz commits, preserving unrelated work. Report exact verification, any unqualified boundary, and commit IDs. The user pushes and launches.

## Current execution status

The expanded plan is explicitly approved for implementation in Bank and Receiz on main. Design, native capability review, source requirements, visual direction and public-copy draft are prepared. Encryption, WebAuthn, encrypted retention and the Identity Record recovery transport are implemented and tested as a foundation. Recovery still requires the existing canonical identity admission and checks the resulting owner before returning; decryption grants no identity authority. The repeatable `npm run test:vault-browser` gate exercises a synthetic PRF credential and real IndexedDB without financial or external service requests. These modules are not connected to a product control or financial operation. Real-device/provider recovery, native custody, money/assets, independent value recovery and UI integration remain unfinished. No real money movement, device credential enrollment, migration, deployment or custody change has occurred. The Note-only initial approach no longer covers the expanded asset/direct-send/self-contained-original requirements; qualify and implement the expanded native contracts before exposing the experience.
