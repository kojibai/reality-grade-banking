# Bankeiz prepared transactions — native adapter handoff

This is the remaining **native preparation boundary** for the Bankeiz actions. It is additional to the native wallet/note writer and public account-proof endpoints. Bankeiz composes SDK, MCP and AI skills **129.0.0**; no package release or SQL migration is requested. Implement in the owning Receiz/Crystal task. This Bankeiz change does not change that branch.

The browser interfaces, exact transaction review, encrypted intent retention, canonical `stagePrepared` / `execute`, original-coordinate recovery and same-owner accepted-source retention are wired. **A passing UI/composition test does not qualify native financial execution.** Receiz main inspected at `6877b4fe1d23d2d5b8eb7575fc285aad1a480ec2` has no preparation route below. Never present an unavailable adapter as a successful transaction.

## Endpoint and admission

`POST /api/connect/bank/prepare?applicationId=rc_uV6aT6wZJCQDspB0_SJ1DcEm`

The body is exactly:

```ts
{ applicationId, actorSubjectId, authoritySessionHandle, request,
  sourceArtifacts: ReceizPortableSealedArtifactV124[] }
```

Resolve the actual admitted caller, same registered application/audience, current source-bound authority session and required rail/namespace scopes. Bind `actorSubjectId`, request actor and complete current sources. An alias, request digest, session shape, OAuth grant, wallet response or server row is not ownership or funding authority. Bankeiz does not silently expand access: missing native grants use the existing explicit Bank connection consent before preparation.

Selected locally held originals are supplied in `sourceArtifacts` after canonical verification and same-owner binding. Only requested asset/linked-proof digests are read from encrypted custody; identity/login sources are refused. A public asset may instead be resolved by its exact original digest. Verify the complete originals independently; do not accept a private Identity Seal or key file as an asset. This source list is not ownership or funding authority.

Preparation returns candidates only: **no debit, value lock, ownership change, custody acceptance, issuance or financial commit**. Persisted candidate materials need safe cleanup and retry behavior. Execution remains a separately reviewed SDK command.

## Exact request

```ts
type Request = Input & {
  schema: 'bankeiz.operation-request.v1';
  applicationId: string;
  requestId: string; // browser-generated UUID for this review attempt
  actorReceizId: string; // must match the admitted identity, never self-authority
};
type Rail = 'reserve' | 'settlement';
type Input =
  | {kind:'send-value'; rail:Rail; amountUsdCents:string; recipient:string}
  | {kind:'exchange'; rail:Rail; amountUsdCents:string; assetDigest:string}
  | {kind:'send-ownership'; assetDigest:string; quantityMicro:string; recipient:string}
  | {kind:'sell-share'; assetDigest:string; quantityMicro:string; rail:Rail; buyer:'bank'|'market'}
  | {kind:'buy-shares'; assetDigest:string; quantityMicro:string; rail:Rail}
  | {kind:'redeem-asset'; assetDigest:string}
  | {kind:'fund-asset'; definition:AssetDefinition; rail:Rail; amountUsdCents:string};
type AssetDefinition = {
  name:string; symbol:string; units:string; description:string;
  linkedProofDigest:string|null;
};
```

All monetary/quantity fields are exact nonnegative integer strings, up to 40 digits; user-requested amounts/quantities are positive. `quantityMicro` uses 1,000,000 units per displayed unit. Asset references are lowercase SHA-256 digests of complete original sources. Resolve and verify actual current ownership, custody, supply, backing and available funded offers; Market membership and deterministic display value alone do not establish an executable offer.

For public aliases use canonical v129 recipient resolution, its same-request authenticated locator and receiving-source admission. Bind the resulting recipient, requested alias, operation nonce, source and destination heads. Do not trust an echoed recipient string or silently substitute the destination.

## Exact response and plan binding

```ts
{ schema:'bankeiz.prepared-operation.v1',
  plan:ReceizOperationPlanV124,
  transitionSet:ReceizPortableExecutionTransitionSetV124 }
```

No extra wrapper/flags/summary. Maximum full JSON wire is **24 MiB**. Return explicit unavailable, capacity or stale-head errors instead of partial sources, fake success or truncation. Use `Cache-Control: no-store`; never emit private material to logs/public witnesses.

The browser validates the actual SDK plan and independently verifies every complete transition source through unmodified `verifyReceizPortableExecutionTransitionSetV124`. It requires:

- Exact registered application, `attemptId === request.requestId` and `semanticIdempotencyKey === digestReceizCanonicalV122(request)`.
- One SDK atomic registered custom operation in **`custom:bankeiz`**, with the canonical custom-reducer binding, full participant/head set and source-derived native laws. There are no hidden extra operations.
- The operation inside the canonical `exactPlanBytesB64u` contains exactly:

```ts
{ schema:'bankeiz.operation.v1', request, terms }
```

`request` must canonically equal the reviewed request. The enclosing registered payload uses the SDK's `receiz.custom-reducer-operation.v124` schema and namespace. **This is an application adapter, not a new financial authority.** Its qualified reducer must compose existing native funding, ownership, custody and backing admissions and atomically commit every required participant. A signed request echo or metadata-only append is insufficient. Do not replace native financial operations with an application-only ledger or callback that approves arbitrary deltas.

If the native implementation cannot supply this projection under unmodified v129 verification, return unavailable and provide its actual admitted operation/source contract for review. Do not invent roots, reducer authority, registry discovery, verifier results or capabilities to fit this interface.

## Verified terms

Terms are inside the exact plan, never a separate API quote:

```ts
{
  debitUsdCents:string, debitPhiMicro:string,
  creditUsdCents:string, creditPhiMicro:string,
  feeUsdCents:string, quantityMicro:string,
  assetDigest:string|null, recipient:string|null,
  expiresAtKaiUPulse:number
}
```

`debitUsdCents` is the principal debit; any additional fee is separately displayed and included in **Total debit**. Exact Phi amounts bind the actual native movement and price basis, including applicable debits; dollar display does not replace native authority. `creditUsdCents` is net proceeds; a fee withheld from sale proceeds must not also debit the seller's wallet. Genuine full Kai coordinates and native candidate/session expiry remain authoritative; the integer is only the review-expiry projection.

Exchange total debit (principal + fee) cannot exceed the requested amount. Payment principal and asset backing principal equal the requested amount; fees require explicit final review. Ownership send/redemption in this profile cannot debit funds or charge fees. Sale cannot debit the seller's existing funds. Requested asset/recipient/quantity must match exactly; purchases/exchanges require positive delivered units and cost. No extra fields are accepted. Define and verify all asset issuance units, redemption terms and delivery obligations in the native source.

## Native effects and atomicity

- Payment: actual source debit and receiver credit together; correct rail, alias binding, exact amount, available balance and replay protection.
- Ownership: current complete enclosing source, lawful transfer rights, exact eligible units and all ownership/backing/sale locks; preserve immutable object identity and history.
- Sale/purchase/exchange: an admitted funded offer, exact consideration, seller net proceeds and buyer delivery in one accepted operation. No custody relocation is implied by a fractional sale. Bank liquidity must actually exist.
- Physical redemption: require whole eligible ownership or expressly admitted collective redemption terms and the actual custodian's release process. A financial proof cannot prove that a parcel was delivered.
- Funded asset: verify definition/issuer, exact lawful supply and backing terms; commit actual native backing simultaneously with issuance. Locked backing must stop being freely spendable; do not double-count or create value from a definition.

Return complete candidate sources, signed capabilities and required identity evidence in their canonical private transport. Bankeiz's unmodified SDK must admit them. Existing SDK execution endpoints must commit atomically, return complete canonically verified recovery and resolve the original semantic idempotency coordinate after a lost response. Successful transport/staging is not successful financial execution.

## Qualification required

The current Bankeiz `assertBankOperationQualified` gate deliberately refuses preparation and execution. The generic v129 portable transition verifier alone does not bind an append's event to a custom operation's financial terms. Supply the actual admitted financial reducer/effect contract and verifiable bindings before this gate can be replaced by verification. A deployment flag, allowlisted endpoint, signed echo or generic provenance append is insufficient.

Deliver real positive specimens independently verified under unchanged v129 roots, not mocked custody. Prove every supported kind, both rails where applicable, conservation, custody/ownership continuity, complete funded asset delivery and restoration of resulting account/asset sources. Include mutation refusal, stale/concurrent heads, overdraw/oversell, locked backing, whole-redemption eligibility, wrong recipient/application/actor, tampered terms, candidate/session expiry, atomic zero-write failure, lost-response recovery and duplicate-confirmation refusal. Move no real customer funds during agent verification.

The browser retains the exact intent and sources before submission, including the authenticated account subject identifier. Unknown outcomes block replacement preparation. Committed recovery survives local source-restoration failure and remains exportable; unfinished restoration retries before a later preparation. Only that exact account subject's successor is classified as account coordination; other acquired subjects remain original assets. Successful restoration is durably marked so later preparation does not depend on revalidating an expired old execution capability. Original and successor sources are preserved, never rewritten.

Provide endpoint deployment/commit evidence, supported operation kinds, the admitted domain/reducer/source bindings and independently reopened test specimens. Then qualify the deployed Bankeiz flow with a human-operated test transaction. The native wallet writer, Note allocation/redemption and public account-proof sharing keep their separate contracts and cannot be inferred from this adapter's success.
