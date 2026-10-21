# Backed Content Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user selected implementation here on main.

**Goal:** Publish a rich authored asset with backing as the same native financial asset, preserving exact funding, private account boundaries and recoverable delivery.

**Architecture:** Admit the prepared authored source beneath the existing native asset runtime before it accepts a linked definition. Extend the existing holding issuer/verifier with a closed public snapshot variant of the same native asset. A recoverable Bank operation binds that retained source, accepted financial operation and public certificate, then uses the existing Showcase publisher.

**Tech Stack:** Existing native asset runtime/effect/holding authority, canonical v129 source verifier, exact-byte custody, encrypted Bank operation state, React native ownership actions, Node/Vitest tests.

**Spec:** `docs/superpowers/specs/2026-10-21-asset-composer-and-publication-design.md`.

## Global Constraints

- Receiz's frontend, composer UI, styling and user flows remain unchanged.
- Prepare and retain the authored source before funding. Resolve the original financial operation before continuing publication.
- Publication failure cannot undo an accepted debit, charge again or mint another financial asset.
- Private execution receipts contain account balances and must not be published.
- Use the existing native ownership/offer/redemption paths. An available public valuation does not supply a funded offer.
- Keep automatic Reserve-first then Settlement funding, exact components, current authority checks and antirollback unchanged. Legacy null-linked definitions and private holding certificates remain valid.
- Rebuild included native sources/manifests; preserve 129.0.0 package pins. No push, deployment, SQL migration or live financial operation is authorized by these implementation checks.

## Review Focus

1. A valid authored source belongs to another owner: reject before funding (Task 1).
2. Funding commits but its response is lost: recover that exact operation before any publication retry (Task 3).
3. A public certificate exposes account UUID, key/wallet/authorization hashes or private balances in its bytes: reject the public package (Task 2).
4. A public listing routes its profile ID into generic share issuance: refuse; use the native asset ID and real offers (Task 3).
5. Publication succeeds remotely but times out locally: recover the same source/package, with one debit and one public member (Task 3).

## Prerequisites and interfaces

Read and complete `2026-10-21-asset-composer-media.md` and `2026-10-21-asset-publication-adoption.md`. Receiz paths below are relative to its existing main worktree. The existing source and financial authorities must be composed; these interfaces add no independent issuer, verifier or money writer.

### Task 1: Bind the authored source into native asset preparation and execution

**Files:** Receiz `app/lib/wallet/bankNotes/{nativeAsset,nativeAssetEffect.server,nativeAssetRuntime.server,nativeAssetHolding}.ts`, source/projection types that copy their closed definitions, new `nativeAssetAuthoredSource.server.ts`, and `app/lib/wallet/__tests__/bankNativeAssetAuthoredSource.test.ts`; Bank `asset-definition.ts`, `native-asset.ts`, `native-asset-protocol.ts`, and corresponding tests.

**Interfaces:** Add optional `authoredSource:ImportedProofSourceReference` to the existing fund request only. Implement `admitNativeAssetAuthoredSource(input:{reference:ImportedProofSourceReference;ownerReceizId:string;resolveSourceBlock:ExactByteBlockResolver}):Promise<{artifactSha256:string}>` using the existing canonical source opening/admission path. The accepted financial command's `definition.linkedProofDigest` binds that exact digest. Requests with no source retain `linkedProofDigest:null`.

- [ ] Add genuine canonical-source tests for correct owner, foreign owner, mutated bytes, unresolved block, digest mismatch and prepare/execute replay. A response-loss retry must retain the same native asset ID and intent; Reserve-only, Settlement-only and mixed plans must conserve their exact backing components. Test the source reference changing after displayed approval.
- [ ] Run the new Receiz file and Bank native asset/definition tests; verify RED at the missing source admission boundary.
- [ ] Admit and retain the selected complete authored source through authenticated canonical custody before planning the financial command. Reject missing/foreign/digest-mismatched sources before any financial effect. Bind the reference in the signed request/review and the exact linked digest in the accepted plan/state. Retain the existing current-head, consent, revocation, source and recovery checks; do not merely remove the current non-null-link refusal.
- [ ] Run `pnpm test:crystal-native-bank-assets-closures` and the new authored-source test file; run Bank `native-asset.test.ts`, `native-asset-backing.test.ts`, `asset-definition.test.ts` and `native-asset-holding.test.ts`. Existing null-linked fixtures must remain accepted. Distinguish detached Settlement arithmetic from hosted admitted Settlement funding in the evidence.
- [ ] Commit exact owned files in both repos: `feat: bind backed issuance to its admitted authored source`.

### Task 2: Issue a privacy-preserving public position snapshot

**Files:** Receiz `nativeAssetHolding.ts`, `nativeAssetHolding.server.ts`, `nativeAssetRuntime.server.ts`, and `app/lib/wallet/__tests__/bankNativeAssetPublicProjection.test.ts`; Bank `native-asset-holding-protocol.ts`, `native-asset-holding.ts`, new `native-asset-public.ts` and `tests/native-asset-public.test.ts`.

**Interfaces:** Add `NativeAssetPublicProjection` beside the existing holding type, with schema `receiz.bank.native-asset-public.v1`, its public variant signing domain, the existing root KID/signature, public asset ID/definition/supply/backing/status/issuance/current-source/head time and an explicit issued-at coordinate. It omits the private `holder`, holding quantity and locked ask quantity. Extend the existing signature verifier with a distinct public read function; the private holding reader must refuse the public variant. Expose `publicProjection(principal,assetId)` on the same existing native runtime/Connect dispatcher, returning the exact sealed public certificate.

- [ ] Write tests `public_bytes_exclude_private_position_fields`, `public_variant_cannot_be_opened_as_holding`, `tampered_public_snapshot_rejects`, and `public_projection_reuses_native_asset_identity`. Search the decoded sealed payload for fixture account/key/wallet/authorization hashes and balances, asserting absence rather than hiding fields during rendering. Assert repeated reads at the same accepted asset head reuse the same retained certificate.
- [ ] Run the new Receiz and Bank files; verify RED.
- [ ] Reuse the existing financial root signer, canonical enclosing seal, accepted history selection and exact certificate custody. Sign only the closed public payload; never serialize a private receipt/certificate and delete visible fields afterward. The snapshot describes an existing state and cannot authorize an ownership or money transition.
- [ ] Rerun public and private holding verification tests, source tamper and current/revoked principal tests. Inspect actual exported bytes, not only JSON field names in the UI.
- [ ] Commit: `feat: expose closed public native asset snapshots` in each affected repo.

### Task 3: Recover one funded publication and route its native actions

**Files:** Create Bank `src/receiz/backed-asset-publication.ts` and `tests/backed-asset-publication.test.ts`; update `native-identity.ts`, `asset-publication.ts`, `CreateAsset.tsx`, `public-market.ts`, `public-asset-manifest.ts`, `features/market/{PublicAssetDetail,PublicAssetTradePortal}.tsx`, `features/assets/LiveOwnership.tsx`, and public trade host routing. Receiz `showcase/{bankAssetContent,importedSourceProjection}.ts`, `app/lib/market/publicProfileAssets.ts` and their tests. Document the behavior in `docs/public-asset-publication-v129.md` and `docs/automatic-asset-backing.md`.

**Interfaces:** Produce `createBackedAssetPublication` using the existing publication controller and native operation dependencies. Its retained stages are `source-held → funding-pending → funded → publication-pending → published`; each stores the original source/intent, native operation nonce and native asset ID when known. The public content projection carries `nativeAsset:{id,issuanceSourceSha256,headSourceSha256,publicCertificateSha256}` only after verifying the public certificate and its authored-source link. Generic profile-share issuance must reject this native binding.

- [ ] Write response-loss/restart tests for every stage, rejected source, changed draft after funding, repeated delivery and cancellation before approval. Assert exactly one accepted financial operation/debit, one native asset ID, one stable public member, retained source on failure and no private balances in public bytes. Route tests must prove a native-backed listing never submits `profile:<name>:<id>` as a generic trade target, and no matching funded offer yields no fabricated instant sale.
- [ ] Run the new recovery and public/native routing files; verify RED.
- [ ] Prepare/admit the authored source before existing financial review; after acceptance recover the original result, request/retain the public snapshot once, and seal one public package binding the exact source and certificate through the canonical composer path. Resume publication only thereafter. Use the adoption handoff from the prior plan. Dispatch native actions to existing offers/ownership/redemption and preserve their liquidity/whole-supply rules; keep unbacked asset trading unchanged.
- [ ] Run the full Bank suite, typecheck, native rebuild/check and production build; the Receiz native closure/holding/authored-source/public-projection suites and accepted-discovery tests; and browser create→pending retry→profile→Market→native action review at 390/1440 px. Perform no live money action. Document local proof evidence separately from remaining hosted source/Settlement qualification and any limits not qualified.
- [ ] Commit verified owned Receiz changes first, then Bank: `feat: publish backed content as its existing native asset`. Provide both SHAs for the user to push; do not tag or claim a new public release.
