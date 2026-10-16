# Public account proof: exact Crystal handoff

Bankeiz uses SDK, MCP and AI skills **129.0.0**. This integration needs no financial command, SQL migration, new verifier root or package-version change. Receiz/Crystal source production remains in its owning task; this Bankeiz commit does not modify that branch.

## Required source

Expose a dedicated **public native account statement** derived from one accepted account/journal snapshot. Identity binding, Reserve cents, Settlement micro-Phi, full accepted transaction history and account head must refer to that same snapshot. A wallet response, cache, user-supplied amount or browser-signed summary is insufficient.

Supply the exact native writer's public ownership coordinate and an independently reopened production specimen. `ACCOUNT_PROOF_WRITERS` in `src/receiz/account-proof-policy.ts` is intentionally empty until that writer/projection is qualified. Populate it in a reviewed Bankeiz commit; a source/API response cannot pick its own trusted writer. No secret environment variable is needed.

This is **writer-attested account evidence at an accepted head**. It is not a new spendable balance, payment capability, independent replay of every underlying operation, legal identity verification, deposit guarantee or proof that no later activity exists. The pinned writer must already be authoritative for admitted account state; any user's otherwise valid native seal is insufficient.

The source must be a complete canonical-root-verifiable `receiz.native-record-seal`, readable by v129 `createReceizClient().artifacts.verifyAndOpen()`. Use native Record -> Seal beneath the admitted writer and preserve genuine ownership/claim/path bindings. Export via `transportReceizSealedArtifactV124`. Do not reconstruct admissions/verifier results or replace canonical roots/callbacks.

Create a **new, public-only payload**. Never embed/append private account snapshots, Identity Seals (including encrypted keys), key files, phrases, login challenges, tokens, recovery files, hardware capabilities, pending intents, private messages or unknown namespaces. Test the **whole emitted carrier**, including attachments/trailers, for credential leakage. The public key proves a Receiz ID binding, not a verified legal name.

## Authenticated source endpoint

`GET /api/connect/account-proof?applicationId=<Bankeiz registered application ID>`

Use existing `receiz:wallet.read`, `receiz:settlement.read`, `receiz:reserve.read` scopes. Resolve the account from the admitted caller; accept no user/account selector. Return `Cache-Control: no-store` and this exact JSON, with no extra `ok`/`wallet` wrapper:

```ts
{ schema: 'bankeiz.account-proof.v1', sdkVersion: '129.0.0',
  source: ReceizPortableSealedArtifactV124 }
```

The transport is not authority. Bankeiz checks exact fields, encoding, size and digest bindings; opens the complete native source under the installed v129 roots; requires the qualified writer; and only then inspects its verified payload. Limit the complete wire to **24 MiB**, including base64, and **100,000 transactions**. Return explicit unavailable/capacity errors instead of truncation. Reading performs no account write, financial action or public disclosure; prefer a retained source for that head.

### Exact verified payload

```ts
{
  schema: 'bankeiz.public-account-statement.v1', applicationId: BANK_APPLICATION_ID,
  account: {
    receizId: string, // canonical artifact-owner ID, not a display alias
    keyId: string, alg: 'Ed25519' | 'P-256', publicKeyRawB64u: string
  },
  checkpoint: {
    accountHead: string,             // accepted native account head
    identityBindingDigest: string,   // digestReceizCanonicalV122(account)
    genesisHead: string, historyHead: string, transactionCount: number,
    kaiUPulse: string,               // genuine source time
    reserveUsdCents: string, settlementPhiMicro: string,
    historyDigest: string            // digestReceizCanonicalV122(transactions)
  },
  transactions: [{
    sequence: number, transactionId: string,
    eventDigest: string, previousEventDigest: string, kaiUPulse: string,
    kind: string, description: string,
    reserveDeltaUsdCents: string, settlementDeltaPhiMicro: string
  }]
}
```

Digests are lowercase SHA-256 coordinates. Amounts are exact integer strings; only deltas may be negative. Use contiguous sequence 1..count, unique IDs/event digests, nondecreasing times not exceeding the source time, and an intact causal chain from `genesisHead` through `historyHead`. Accepted deltas reconcile to both final balances without negative intermediate balances. Empty history means zero balances and `historyHead === genesisHead`.

Do not manufacture a zero opening or opening credit to conceal missing history. A migrated account needs its lawful complete origin/evidence; otherwise this profile is unavailable. Fees, locks, allocations, redemptions and corrections follow the native writer's existing account model. If it cannot satisfy this projection, return unavailable and supply the actual source contract for review rather than weakening native semantics. The writer establishes completeness through `accountHead`; caller counts/hashes alone cannot. Bankeiz reconciliation is read-only validation, never a new financial reducer or authority.

## Public image and immutable reader

The owner reviews and approves publication before **Create proof image & link**. Bankeiz independently reopens the anonymous public source before exporting the final image.

The **2160 × 2700 PNG** carries the exact wire in one uncompressed standard `iTXt` entry named `bankeiz.account-proof`. It prints a QR and `https://bankeiz.com/verify/<native artifact SHA-256>/`. Pixels, URL and metadata are transport/presentation. The reader extracts the exact carried source and runs v129 verification. Screenshots or recompression cannot replace the original proof. JSON remains a reader-compatible transport.

`GET /api/account-proofs/<sourceDigest>` is anonymous and returns the immutable source wire above, only after explicit publication. Never forward private account responses or credentials. Bankeiz proxies only this fixed digest route without cookies/auth; the recipient verifies locally. A publish-success field is insufficient: anonymous source opening must succeed and match the reviewed digest.

`GET /api/account-proofs/<originalSourceDigest>/latest` may return a newer public source **only while live-sharing consent remains active**. Preserve the original immutable snapshot URL. The reader requires the same writer, public identity/key and genesis, nondecreasing source time, and an exact full-history prefix. It refuses account substitution, history rewrites/pruning and rollback. Unsupported key rotation/branch conflicts require stronger explicit continuity evidence. An offline file proves only its carried head; newer shared sources are identified separately.

## Consent, live sharing and off switch

`GET /api/connect/account-proof/sharing?applicationId=...` uses existing read scopes and returns only the admitted account's status:

```ts
{ schema: 'bankeiz.account-proof-sharing.v1', sharingHead: string,
  liveUpdates: boolean, latestSourceDigest: string | null }
```

`sharingHead` is the native consent/revocation CAS head. `POST` to the same endpoint additionally requires existing `receiz:domains.write` and the owner's exact disclosure intent. Existing native consent/source mechanisms must bind caller, application, source and expected heads; an OAuth grant alone does not authorize disclosure. This is not a blanket financial-write grant.

Publish:

```ts
{ applicationId, action: 'publish', expectedSharingHead,
  sourceDigest, accountHead, liveUpdates, idempotencyKey }
```

The key is `digestReceizCanonicalV122({keyId, ...bodyWithoutIdempotencyKey})`. Resolve the retained complete source; verify same account and the accepted account head. The first checkbox approves public disclosure of **both balances and all transactions**. A separate default-off checkbox authorizes **future public statements** until revocation. Stale account/consent heads must conflict instead of silently publishing different data. Exact retries are idempotent; lost responses may already have published data.

Off switch:

```ts
{ applicationId, action: 'disable-live-updates', expectedSharingHead, idempotencyKey }
```

Revocation needs **no fresh balance proof**. Atomically advance the sharing head, stop future disclosure/background publication and disable the latest route for every original link covered by that consent. Return off status only after durable acceptance. Do not revoke financial custody or delete private history. Previously published snapshots and copies can remain readable; the UI explains that. Test worker/cache/mirror/retry races so no post-revocation proof leaks through an old lease. Status and revocation must work after reload. CAS conflicts require re-reading the consent head, never blind overwrite.

Return 409 for head conflicts, 413 for capacity, and structured unavailable when production source creation is not qualified. Never return an unsigned successful balance or silently downgrade to a wallet observation.

## Evidence Crystal must deliver before enabling the pin

1. A real native specimen independently opened under unmodified v129 roots, with genuine writer/identity binding, same-head balances and equivalence to the complete native journal projection.
2. Whole-carrier credential-leakage checks. The exact source and PNG must fail identity login/import and authorize no payment.
3. Mutation refusal: wrong writer/account/application, changed balances, omitted/reordered/duplicate history, bad parents/commitments, future time, capacity overflow, ambiguous heads and rewritten/pruned updates.
4. Anonymous snapshot/latest routes, explicit publication consent, CAS/idempotent lost-response recovery, future publication only inside live consent, and revocation across restart/cache/worker races. No funds move.
5. PNG round-trip through `/verify/`, QR decoding, offline carried-source verification and immutable URL binding. New exports require source age **≤30 Kai pulses**; older valid files remain historical evidence, never latest-head assertions.

Bankeiz tests cover actual installed-v129 forgery refusal and separately labeled simulated positive composition. **Simulations do not qualify a native writer or enable its pin.** Existing v129 Record -> Seal/verifier primitives can carry this statement without a package release. Missing native writer/disclosure capability belongs in the owning Crystal task; Bankeiz must not bypass it.
