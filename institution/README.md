# Receiving proof-backed and proof-native value

**Your value should carry its proof.** This directory is the developer entry point for accepting, holding and transferring value while preserving verification, ownership and history.

Settlement is **proof-native value**. Reserve is **proof-backed funds**. Both require verified sources, an explicit rail, qualified authority and continuous history. A denomination, account balance, image or service response is a projection of evidence; it cannot create spending authority.

This is a reference implementation and integration contract, not a blanket institution certification. The [machine-readable profile](receiver-profile.json) reports the supported surfaces and the evidence still required. Original reference code is [GPL-3.0-only](../LICENSE), permitting modification and redistribution under its terms. Bankeiz.com is the official reference implementation. Separate [branding](../TRADEMARKS.md), [conformance claims](../CONFORMANCE.md) and [source-distribution requirements](../SOURCE.md) preserve their own distinct boundaries; upstream dependencies keep their existing terms.

## Start here

For a payment link, website button or merchant checkout, start with
[Accept payments](accept-payments.md). The lifecycle below covers deeper
receiving and execution integrations.

```sh
git clone https://github.com/kojibai/reality-grade-banking.git
cd reality-grade-banking
npm ci
npm run receiver:check
npm run receiver:inspect -- /absolute/path/to/original-note.png
```

`receiver:check` validates pinned packages, bundled source integrity, canonical KaiSigil temporal vectors and refusal of forged note inputs. Its success means these local checks passed. It does **not** authorize a credit, grant production access or assess your institution.

The [Conformance Console](https://bankeiz.com/conformance/) offers the browser reference checks, original-note inspector, qualification requirements and JSON evidence export. Run locally at `/conformance/` after starting the app. File inspection remains on the device; a reference pass never awards institution conformance. The recorded MCP baseline is identified separately from the checks executed in the browser.

`receiver:inspect` opens an original held Note PNG or completed account-destination terminal under the native v129 canonical roots. A successful inspection establishes the carried chain only. It does not check whether another device has since transferred or consumed the note, acquire its current custody or redeem it. Artwork without carried proof is refused. This command is read-only and requires no account, signing key, client secret or live payment.

| Lifecycle | Implementation path | Current boundary |
| --- | --- | --- |
| Inspect a Reserve Note | [Read-only verifier](receiver-verifier.entry.mjs), original PNG and pinned roots | Implemented; no credit authority |
| Hold a qualified Reserve Note | [Qualified custody and receiving request](notes.md) | Supported native flow; requires attested hardware and receiver-bound handoff |
| Transfer a Reserve Note | Native exact-head custody transition and updated original PNG | Supported native flow; copied artwork is insufficient |
| Deposit a Reserve Note | Native consumption plus once-only Reserve credit | Bank integration present; live release prerequisites remain |
| Receive or transfer digital Settlement / Reserve | [SDK edge payment lifecycle](digital-payments.md) | Bank native Wallet Send is implemented; each institution still binds and qualifies its own adapter |
| Hold and transact Settlement Notes | [Signed rail extension contract](../docs/settlement-note-contract.md) | Native signed rail implemented; live custody/host qualification remains |
| Receive a completed account Note offline | [Account-destination contract](../docs/note-account-deposit-v129.md) | Recipient-bound terminal verification and retention; connected credit before account spending |
| Create online without attested custody | [Continuity boundary](../docs/note-continuity-standard.md) | Connected profile implemented; requires its configured host and schema; does not qualify protected offline custody |
| Claim institution conformance | [Requirements and independent evidence](receiving-standard.md) | Receiver-specific assessment required |

## Integrate the full lifecycle

1. Read the [receiving standard](receiving-standard.md) and [holding and recovery rules](holding-and-recovery.md).
2. Select the exact capability and rail. Follow [notes](notes.md) for PNG carriers or [digital payments](digital-payments.md) for edge transfers. Do not turn one into the other by changing a label.
3. Register your own application and bind your own receiver identity, audience, consent and qualified custody. The Bank's public client ID is not authorization for a different origin or institution.
4. Retain exact sources and operation/recovery coordinates before execution. Independently reopen complete evidence at each trust boundary.
5. Run the local checks, then provide the positive, refusal, concurrency, recovery and real-device evidence in the [qualification checklist](qualification.md). Have the implementation independently reviewed before live use.

## v129 toolchain

The reference pins `@receiz/sdk`, `@receiz/mcp-server` and `@receiz/ai-skills` to **129.0.0**. The active ruleset is **127.0.0**; both digests are pinned in [receiver-profile.json](receiver-profile.json). Retained method names such as `V124` and `V125` are part of the coordinated v129 package surface, not instructions to install older packages.

The SDK supplies runtime verification and execution primitives. MCP supplies agent tools whose opaque handles remain in trusted-host custody. AI Skills explain the required laws and exact SDK/MCP mapping. People using a finished receiver do not need to run MCP or AI Skills themselves. Neither tool descriptions nor model output are proof authority.

Read these installed resources before implementing financial execution:

- `node_modules/@receiz/ai-skills/receiz-value-execution/SKILL.md`
- `node_modules/@receiz/ai-skills/receiz-value-execution/references/sdk-map.md`
- `node_modules/@receiz/ai-skills/receiz-value-execution/references/mcp-map.md`
- `node_modules/@receiz/ai-skills/receiz-offline-first/SKILL.md`
- `node_modules/@receiz/ai-skills/receiz-portable-continuity/SKILL.md`

## Auditable verifier

The checked-in [read-only module](../public/native/receiver-verifier.v129.mjs), [complete source map](../public/native/receiver-verifier.v129.mjs.map) and [input-hash manifest](../public/native/receiver-verifier.v129.manifest.json) are sufficient to inspect the actual code without a private source checkout. They are loaded only when used, outside the Bank's initial screen path. No signing or funding interface is exported.

Maintainers can reproduce the modules with `npm run native:rebuild`, or write the verified outputs with `npm run receiver:build`. The matching source and build materials are included in [native/](../native/README.md); no private host checkout is required. Use `npm run native:rebuild -- --sdk` to reproduce the published SDK JavaScript too. The build manifest records the original source revision and every embedded source hash; it is provenance, not proof authority.
