# Source imagery and universal Deposit direction

## Accepted visual direction

The user selected the first generated Deposit design on 2026-10-26: `exec-60dd2063-5324-43e4-b049-904779081a05.png` under the chat's generated-images directory. Preserve the actual Bankeiz typography, small bank mark, warm white, navy and cobalt, purposeful space and native navigation. The silver source asset and glass/cobalt Original feel physically real and remain connected. Deposit is the primary entry, not a separate crypto economy or feature inventory. Standalone `/exchange/` and the banking popover must reuse the eventual same experience. Preserve actual account entry.

The user then requested the same photographic object imagery across explainer pages, keeping the existing animations and diagrams. Add context-specific, transparent, realistically rendered source/Original scenes, with subtle motion and no gallery framing, backgrounds, price labels or pause controls. Existing actual UI walkthroughs are already grounded in real production components; do not replace them with mockups. Do not add a central navigation runtime or block public first paint for illustrations.

## Native economic direction supplied by the user

The intended interaction is deposit an asset, retain its funded source and admit spendable native value under the actual native valuation/funding rules. Monetary recipients spend the common units; a monetary transfer does not grant a proportional claim to redeem the originally deposited asset. The depositor's later acquisition of BTC or another asset is a new purchase at its available price, rather than a promise to withdraw the original quantity at its old quote. No automatic burn. Keep custody, transferred rights, quote, native monetary admission and ownership explicit. USD is a reference display; Settlement and Reserve remain correctly classified beneath the simple interface. Proving a holding without a deposit remains distinct from contributing/custodying the source and admitting monetary value.

The user wants existing Bank wallet funds and only the required shortfall through existing deposit methods, retaining the same trade and intent. BTC against Bank wallet value must enforce both sides; a signed claim of external delivery is insufficient.

## Exact reuse map and unresolved backend boundary

- Existing actual fiat/card ingress: `src/features/deposit/LiveDeposit.tsx`, `src/receiz/card-deposit.ts`, native identity `beginCardDeposit`/`checkCardDeposit` and verified wallet source paths.
- Existing minimum shortfall, exact retained operation and cancellation/resume: `src/receiz/wallet-send.ts`, `WalletSendOperation.tsx`, `tests/payment-shortfall.test.ts`.
- Existing asset creation, authored source and native funded backing: `CreateAsset.tsx`, `native-asset.ts`, `asset-publication.ts`, `backed-asset-publication.ts`. Sealing, ownership, funding and publication retain their actual native primitives.
- Existing submitted physical-asset intake is intentionally `awaiting-custody`; `deposit-source.ts` requires `createsSpendableValue === false` for its intent payload. An intake record alone is not admitted money.
- Existing Receiz OTC live EVM evidence: `app/lib/proofObjects/evmOfflineProof.ts` and `app/otc/OtcOsClient.tsx` in the selected Receiz main checkout. Wallet attestation and balance/ERC-721 observations are implemented. They do not themselves establish exclusive ongoing custody or native financial admission.
- Existing image-wallet encryption/spending authority: `app/lib/proofObjects/walletImage.ts` and `cashImage.ts`. Reuse the stronger enclosing native Original and its actual owner/continuity boundaries; no subpayload hash may become authority above the Original.
- OTC seed/reconciliation steps include demo keys, synthetic addresses and synthetic transaction hashes. `otcTrust.validateOtcPacket` verifies signed event linkage/presence, not actual external funding/delivery. None may enter a live release path.
- `bank-operation-qualification.ts` deliberately refuses generic unqualified financial effects. Existing direct native asset, wallet and market paths have their own actual source/receipt contracts. No flag, ordinary host JSON or available runtime report may disable that refusal.
- The inspected source does not yet contain a qualified BTC-to-Bank-wallet conditional settlement/custody adapter. This is an implementation boundary to close, not a reason to demote the implemented identity, artifact, custody, native money or ownership primitives.
- The Crystal handoff records unfinished v129 financial cutover and forbids treating focused local parity as full hosted qualification. Do not silently activate global Settlement, invent collateral credit or begin a version relabeling.

## Imagery preflight and contracts

Primitive affected: public presentation of identity, artifacts, custody, source, ownership and monetary uses. Source of truth: unchanged existing native components and proof/financial readers; artwork is explicitly illustration only. Stronger/weaker risk: an illustration cannot establish a deposit, current owner, funding, account result or verifier success. First-paint risk: reserve intrinsic image dimensions; no image or animation may gate content/navigation. External convention: generated materials and browser image mechanics only. Checks: selected source/current screenshot comparison, semantic subject mapping, transparent alpha/size, contained motion, reduced motion, unchanged markup outside insertion, all existing source/route/build/offline contracts. Exact unknown: final responsive appearance and new external-asset settlement adapter remain separately unverified until their checks run.
