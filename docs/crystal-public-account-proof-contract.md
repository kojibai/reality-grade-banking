# Public account proof: source and disclosure contract

Bankeiz uses SDK, MCP and AI skills **129.0.0**. This integration adds no financial command, SQL migration, verifier root or package-version change. The native account producer independently reopens its accepted source frontier; private retention and public disclosure remain separate operations. Crystal deployment and protected custody qualification remain with their owning task.

## Required source

Expose a dedicated **public native account statement** derived from one accepted account/journal snapshot. Identity binding, Reserve cents, Settlement micro-Phi, full accepted transaction history and account head must refer to that same snapshot. A wallet response, cache, user-supplied amount or browser-signed summary is insufficient.

Native v2–v4 statements use the existing pinned financial-root signature in addition to canonical Record → Seal verification. `ACCOUNT_PROOF_WRITERS` is the separate legacy v1 writer allowlist; it stays empty and does not block a native source. A source response never selects its own trusted root. See [native payment and account-proof wiring](native-payment-api.md) for trusted source selection and current coverage.

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

### Current v4 and legacy payload

Current production uses `bankeiz.public-account-statement.v4`. Its complete
frontier binds native cash, asset/offer history, lawful inventory, the selected
private owner archive and native Note funding/redemption sources. Public
components remain separate from spendable cash. The exact closed parser is
`src/receiz/account-proof-statement.ts`; [source closure scope](private-artifact-and-note-source-closures-v129.md)
documents private retention, historic replay and the current-device custody
boundary. The v1 shape below is retained for compatibility; it is not the
current v4 production contract.

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
  sourceDigest, accountHead, liveUpdates, idempotencyKey, consentProof }
```

The key is `digestReceizCanonicalV122({keyId, ...commandWithoutIdempotencyKey})`, excluding `consentProof`. The existing v129 identity signs the base64url-encoded canonical JSON `{schema:'bankeiz.account-proof-disclosure-consent.v1',keyId,command}` where `command` includes the key. `consentProof` uses the existing `receiz.identity.login_proof.v1` signature container; its domain-separated challenge authorizes only this exact disclosure command, never login or financial execution. Independently derive the public key binding from the admitted caller, verify the signature, and refuse extra command fields. Retain the exact consent bytes in private content-addressed custody.

Resolve the retained complete source; verify same account and the accepted account head. The first checkbox approves public disclosure of **both balances and all transactions**. A separate default-off checkbox authorizes **future public statements** until revocation. Stale account/consent heads must conflict instead of silently publishing different data. Exact retries are idempotent; lost responses may already have published data. An already accepted enable request cannot re-enable sharing after revocation.

Off switch:

```ts
{ applicationId, action: 'disable-live-updates', expectedSharingHead, idempotencyKey, consentProof }
```

Revocation needs **no fresh balance proof**. Atomically advance the sharing head, stop future disclosure/background publication and disable the latest route for every original link covered by that consent. Return off status only after durable acceptance. Do not revoke financial custody or delete private history. Previously published snapshots and copies can remain readable; the UI explains that. Test worker/cache/mirror/retry races so no post-revocation proof leaks through an old lease. Status and revocation must work after reload. CAS conflicts require re-reading the consent head, never blind overwrite.

Return 409 for head conflicts, 413 for capacity, and structured unavailable when production source creation is not qualified. Never return an unsigned successful balance or silently downgrade to a wallet observation.

## Native disclosure coordinator

Receiz's `app/lib/wallet/bankNotes/accountProofSharing.ts` composes these disclosure rules with the existing v129 `ReceizAdmissionStore` and exact private source storage. Its publish commit includes the native account coordinate as a read dependency, so account-head changes conflict atomically. Snapshot and live reads reopen the original consent; live reads recheck the consent head after opening the source. Worker publication cannot commit through revocation. This coordinator creates no wallet, funding or public account statement.

The four HTTP routes above are implemented through `accountProofHttp.server.ts` and `accountProofApi.server.ts`. Private requests reuse the existing v129 proof-authority bearer checks, including admitted owner, key, application and scopes. Anonymous reads do not load private authentication. Bodies are bounded to 64 KiB for sharing commands; all account-proof responses are non-cacheable. No request can select a user, writer or runtime. The Bank client recovers a lost publish/off response by reading the accepted status; it does not automatically submit a replacement command. Publication success still requires independently opening the anonymous original.

Trusted native startup selects the v4 account-proof producer and shared durable disclosure writer when the same absolute account/wallet source directory and registered application are configured. Explicit trusted runtime installation remains supported; a direct factory installation must opt into `includeSourceClosures: true` for v4. No HTTP caller can install a runtime or choose a source directory. Missing or unsupported source scope is not an empty portfolio.

Source tests cover real native account/key and financial histories, exact public v4 production, private archive admission, Note funding/redemption lineage, cold historical replay, persistent-process sharing recovery, live updates and revocation with ephemeral test roots. Retained v2/v3 snapshots keep their original replay rules. This is local implementation evidence, not deployed financial or physical-device qualification. The v1 writer allowlist remains empty; native statements always require the pinned financial-domain signature.

Each digest URL retains its first publication's consent epoch. An old static link cannot become live, and a revoked link cannot restart live updates through reusing its artifact. New consent needs a freshly sealed public artifact, even when the underlying wallet head is unchanged. The source producer must support that refresh without a wallet write. Exact accepted request retries remain idempotent; an unchanged live-worker source is a read-only retry within its current epoch.

## Production evidence to retain

1. A real native specimen independently opened under unmodified v129 roots, with genuine writer/identity binding, same-head balances and equivalence to the complete native journal projection.
2. Whole-carrier credential-leakage checks. The exact source and PNG must fail identity login/import and authorize no payment.
3. Mutation refusal: wrong writer/account/application, changed balances, omitted/reordered/duplicate history, bad parents/commitments, future time, capacity overflow, ambiguous heads and rewritten/pruned updates.
4. Anonymous snapshot/latest routes, explicit publication consent, CAS/idempotent lost-response recovery, future publication only inside live consent, and revocation across restart/cache/worker races. No funds move.
5. PNG round-trip through `/verify/`, QR decoding, offline carried-source verification and immutable URL binding. New exports require source age **≤30 Kai pulses**; older valid files remain historical evidence, never latest-head assertions.

Bankeiz tests cover actual installed-v129 forgery refusal and separately labeled composition; host tests reopen genuine native financial source fixtures. Neither substitutes for a deployed production specimen under the existing canonical roots. This contract uses v129 primitives without a package release.
