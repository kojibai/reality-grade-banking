# Native bank domain preparation — 2026-10-13

The full live bank domain is unfinished. This change preserves the existing mobile console and adds source verification, conservation and execution recovery composition. It does not activate custody issuance, ownership transfers, sales or currencies.

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

1. **Native registration approval is pending.** The prepared public registration adds the eight native scopes and preserves existing read/card scopes and callbacks. It has not been created. The active client remains `rc_ELkGAUBINd9Nw4bE5zMqUsgc`. Each user's private native consent remains separate from app registration.
2. **Custodian source is absent.** Receiz/@receiz and the selected Kojib address configure delivery metadata. They do not supply a sealed custody domain-authority policy, an admitted issuer role, authenticated inspection evidence or the operator's signing custody. No positive receipt issuance/import path has been qualified.
3. **Bank backend composition is absent.** The inspected Receiz host `prepareExecution` accepts single native value/access operations and complete world composites. It returns `UNSUPPORTED_ATOMICITY` for multiple operations and unregistered custom bank operations. This change has not implemented/applied a production adapter or database migration. Native subject publication/session/replay, original-source preparation, atomic payment plus ownership/backing, exact committed recovery and live browser callbacks remain required.
4. **Live evidence is absent.** No custody receipt, ownership transfer, bank/user fractional sale, buyback, physical redemption, currency issuance, currency transfer, backing commitment or currency redemption was executed. No public deployment or full bank release lock occurred. The fresh final native-subsystem review remains pending completion of that implementation.

Do not enable the financial buttons, label these capabilities live or declare this plan complete from compiler output, fixture tests, permission introspection or a shipping address.
