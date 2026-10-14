# Native bank domain preparation — 2026-10-13

The full live bank domain is unfinished. This change preserves the existing mobile console and adds source verification, conservation and execution recovery composition. It does not activate custody issuance, ownership transfers, sales or currencies.

## Signer configuration repair follow-up

On 2026-10-13 at 22:14 local, the user's protected signer repair was applied without editing Receiz or signer source. The existing matching root and four signing contexts were restored, and the exact previous signer commit was redeployed as `dpl_Fq27sHjpJR4f6sGMH9MA87LY3tuA`. The public keyring now exposes the expected active root. This administrative configuration repair uses the installed 129.0.0 packages and requires no new package release.

The actual bank qualification still returned HTTP 503 after refreshing the same previously approved native access. Protected diagnosis found zero usable signer authentication tokens, despite Receiz having its existing production bearer configured. The separately approved accepted-token-list repair was applied at 22:31 local, preserving previous entries and targets. Unchanged signer commit `0912baa6383ba9bb013dab185a50a44901c3d188` redeployed as `dpl_EePsS2jYzHLksZgH7gWxNch11zD1`, READY. A nonfinancial transport health request returned HTTP 200 and its signature was independently verified against the unchanged root. See `native-signer-repair.md` and `native-signer-repair-result.json`. These updates supersede the earlier stage statements below that no deployment or private configuration access had occurred.

Aggregate bank qualification still returned 503. Optional read-only diagnostics isolated source-publication 503, while the other six families returned 200; HTTP status alone is not admitted operational readiness. The separately approved one-line host fix is committed on `fix/native-qualification-head-order` as `2058014de55a7780f7c424065109c8ad5d20a2c5`. Its review preview preserves all existing production files except that line; production Receiz is unchanged. Deployment evidence and the incomplete full-release gate are recorded in [native-qualification-host-fix-review.md](native-qualification-host-fix-review.md).

The separate bearer helper preserves existing token entries/ignored malformed representation and refuses invalid source credentials. The exact deployed handler fixture reproduces the authentication 503 and independently verifies a signature after preparation. Fixture and configuration evidence remain separate from real SDK qualification, source admission and financial execution.

## Native registration follow-up

After the user's exact approval, Receiz Connect created public client **rc_uV6aT6wZJCQDspB0_SJ1DcEm** at 2026-10-13 19:59:21 local. The visible registration confirms all 15 approved scopes, public/token-auth-none/no client secret and the unchanged bank.receiz.com/local 4173/5173 callbacks. The former read/card and read-only clients remain active.

The bank now uses that exact ID. Historical wallet observations remain eligible for identity-bound first paint. Card attempts retain their original registered client in authenticated encrypted custody; old untagged attempts use the known prior card client. Status queries obtain the same original client grant, while new deposits and account reads use the current client. Tests cover this selection and foreign-client refusal. The isolated browser migration page passed five checks, including actual legacy AES-GCM reopening, old balance first paint, preserved old attempts, concurrent-start refusal and current-client new attempts.

Profile → Bank connection has a displayed native consent, an unchecked checkbox and an approval button. Ordinary checks remain read-only. Broader grants are requested only after the person's explicit approval. Its real read grant under the new client succeeded and freshly displayed the same $0.00 shared account.

Registration follow-up verification: **171 tests across 48 files passed**, TypeScript/production build passed. Evidence: `native-bank-registration-created.png` and `native-bank-access-consent-mobile.png` in the task visualization directory. Private consent was still pending at that stage; its subsequently approved check is recorded below.

## Approved native account access and service check

The user separately approved native access for the open bank ID. The displayed consent was submitted inside the bank. Exact same-identity grant and scope introspection passed; qualification reached the native-services phase. This is access evidence, not a custody, funding or operation admission.

The first attempt exposed a bank transport defect: SDK 129's authenticated runtime request adds the exact registered `applicationId` query, but the bank allowlist previously accepted only a query-free qualification path. A real SDK wire test reproduced the local refusal. The bank now accepts only POST qualification with one exact current-application query; missing, foreign, duplicate and unrelated parameters still fail. The actual server was restarted with this correction.

Both corrected live qualification attempts received **HTTP 503 / SERVICE_CAPACITY_UNAVAILABLE** from Receiz. No capability report was admitted, and the bank's transactions remain disabled. Error presentation now distinguishes account access from native services and retains only fixed public codes/statuses. It does not retain or display arbitrary response text, Identity Seals, tokens, challenges or sources. An expired short-lived grant remains distinct from the earlier successful approved grant; an ordinary check does not silently widen its read scopes. The final 390 × 844 screenshot confirms this actual service failure, and the viewport was reset: `native-bank-service-failure-mobile.png` in the task visualization directory.

Read-only deployment inspection confirmed that `receiz.com` belongs to the Receiz Vercel project. The targeted native-qualification runtime-error and log searches returned no entries; this does not identify the underlying service cause. No environment value was retrieved, server code changed or deployment performed. The current v129 source was also inspected read-only and still refuses unregistered custom bank operations/multiple operations in `prepareExecution`.

Verification after this fix: **178 tests across 49 files passed**, TypeScript/production build passed. Real SDK wire rejection tests and private-diagnostic exclusion checks passed. Successful live native service qualification remains absent.

## Implemented

- `bank-custody.ts` opens exact native sealed receipt and intake sources through SDK 129. It requires a genuine attestation authority bound to the bank's trusted operator-policy artifact, correct holder/type/request/quantity, current credential history and admitted full KKS coordinate. It retains exact receipt custody privately. The SDK initial credential plan/apply composition requires the same pinned authority, an actually issued attestation and its held exact bank plan/confirmation. No actual operator authority or receipt was created.
- `bank-domain.ts` computes application-only proposals with integer share/supply conservation, ownership locks, whole-asset redemption eligibility and proportional backing redemption with retained rounding. Its receipt/payment/backing digest fields are proposal coordinates. They do not verify receipts, admit funds, commit a sale or issue currency.
- `bank-execution.ts` independently admits full portable transition sources with unchanged SDK roots, matches the exact application and plan, holds review custody, requires its exact confirmation and retains the original intent before SDK submission. It uses canonical stagePrepared/execute/idempotency resolution and refuses committed results without SDK-held complete recovery. This composition is not connected to current live buttons and supplies no bank reducer, financial source or authority session.
- `bank-execution-vault.ts` / `identity-vault.ts` retain exact private plans, transition sets and recovery encrypted under the existing non-exportable device key. IndexedDB version 3 adds an operations store and leaves existing identity/source stores intact. Only one pending intent may start. Plans and exact sources cannot change under an attempt. Terminal state cannot become unknown, and late results cannot replace another attempt or revive removed/replaced identity custody. Earlier operation entries remain retained when a new intent becomes current.
- `bank-kai.ts` produces full KaiSigil coordinates through the installed SDK's offline factory and independently admits causality and strict later uPulse. Packaged canonical proving resources are included in the PWA shell. Browser proving remains unobserved; the actual Node factory produced and independently verified two full causal coordinates in the test.
- Profile has a collapsed Bank connection detail. Its explicit Check connection uses the current read grant, displays missing native access and never silently requests expanded scopes or reports transactions enabled. Full SDK runtime qualification is attempted only when the actual grant includes all required scopes.

The live layout, Deposit forms, shared balance, Market, Ledger and Send/Receive screens remain in the bank. No live demo, new external service, external wallet handoff or shadow wallet was introduced.

## Compiler and MCP evidence

SDK, MCP and AI Skills dependencies remain pinned to 129.0.0. The unchanged registry digest is `8d0b5b839d02d9efbd4306cc99410595a183705c2670b76d2567eaaaade99065`.

`npm run bank:contract` uses the actual SDK domain compiler. Compilation digest: `5fd751692992ece94f0662609253e8bc17bc3fc4f67fabdd8690c12c49e3dcaa`. Its 12 proposed generated files were not applied and do not implement or deploy a bank adapter. The saved contract is compilation evidence, not a proof object.

Receiz MCP project inspection confirmed all three installed package versions. Its constitutional context was simulation-only, unconfigured and had no allowed commands. Inspection is not artifact verification or financial permission.

MCP's application-contract proposal was saved as `receiz.app.json`. The SDK 129 compiler initially refused the proposal without the current operation-authority matrix (`V127_APPLICATION_OPERATION_MATRIX_REQUIRED`). The contract now carries the exact unchanged matrix exported by SDK 129, and its compiler succeeds with digest `c4e0cff348b62f31db2bb2ffdeec533a92ca3a6d476757bb9b559ac58a7875e1`. These declarations are the protocol's authority requirements, not claims that all app features are operational. No generated project adapter was applied.

Remaining MCP static findings require context: the bank deliberately composes its own private device adapter in `native-identity.ts`; pure SDK imports and type-only imports are not Node compiler imports. Compiler calls use `@receiz/sdk/compiler`. The inspection's generic idempotency warning includes GET-only public routes, service-worker cache mechanics and private storage. Native execution retains the exact semantic key and attempt before submission. The prior card/native intake subsystem is separately documented and reviewed; this inspection does not replace its evidence or establish live bank execution.

## Observed checks

- `npm test -- --reporter=dot`: **168 tests, 48 files passed**.
- `npm run build`: TypeScript and production build passed.
- Actual SDK refusal tests reject raw custody JSON, a same-named issuer without the trusted policy pin, reconstructed receipt plans, foreign-application plans and reconstructed verified transition sets.
- Native execution recovery tests use explicitly labeled boundary fixtures for choreography. They are not positive proof admissions or live financial tests.
- Isolated browser origin `127.0.0.1:5199`: **11 native execution vault checks passed**, including concurrent starts, encrypted complete-source retention, immutable intent, terminal monotonicity and late/replaced/removed identity refusal. Dummy bytes only; no real ID/account/credential/payment/ownership was created.
- The existing isolated private-vault regression page passed **10 checks** after the storage upgrade.
- Actual preview `127.0.0.1:4173`: the user's existing identity restored and the same $0.00 shared account was freshly read. Its held balance painted on reload without an Updating state, before controls enabled after canonical reopening.
- At 390 × 844 the existing console and bottom navigation remain intact. Profile's explicit read-only connection check displayed actual missing native scopes. The viewport was reset, the temporary test tab closed, and the preview remains at Account.

Evidence images in the task visualization directory: `native-bank-account-mobile.png` and `native-bank-permissions-mobile.png`.

## Exact remaining boundary

1. **Native service qualification is unavailable.** The public registration is created and the active client is `rc_uV6aT6wZJCQDspB0_SJ1DcEm`. The user approved the open ID's native consent, and the exact grant/introspection succeeded. Receiz then returned HTTP 503 / SERVICE_CAPACITY_UNAVAILABLE during service qualification. No positive capability report was admitted. Grants remain short-lived; account approval does not prove native services, sources or financial authority.
2. **Custodian source is absent.** Receiz/@receiz and the selected Kojib address configure delivery metadata. They do not supply a sealed custody domain-authority policy, an admitted issuer role, authenticated inspection evidence or the operator's signing custody. No positive receipt issuance/import path has been qualified.
3. **Bank backend composition is absent.** The inspected Receiz host `prepareExecution` accepts single native value/access operations and complete world composites. It returns `UNSUPPORTED_ATOMICITY` for multiple operations and unregistered custom bank operations. This change has not implemented/applied a production adapter or database migration. Native subject publication/session/replay, original-source preparation, atomic payment plus ownership/backing, exact committed recovery and live browser callbacks remain required.
4. **Live evidence is absent.** No custody receipt, ownership transfer, bank/user fractional sale, buyback, physical redemption, currency issuance, currency transfer, backing commitment or currency redemption was executed. No public deployment or full bank release lock occurred. The fresh final native-subsystem review remains pending completion of that implementation.

Do not enable the financial buttons, label these capabilities live or declare this plan complete from compiler output, fixture tests, permission introspection or a shipping address.
