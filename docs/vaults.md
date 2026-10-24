# Private vaults and shared proof

A Vault holds the actual supported money sources, asset originals and investment ownership certificates. Its private original carries its custody, contained sources and operation history. A separate public proof discloses selected holdings without carrying access authority.

The native rules remain the rules for money, ownership, consent and once-only execution. Saving an image, changing a displayed amount or copying a source cannot create spendable value.

## Opening and recovery

Open **Identity → Your vaults**. Create a named vault or open its complete private PNG. The default private original is a bearer credential: anyone with that file can use the Vault authority it contains. It contains the separate Vault key, never the ordinary account's signing key or Identity Record.

Optional passkey protection encrypts that private authority using the existing WebAuthn PRF protection. Opening a protected original requires its original PRF-compatible passkey at the registered relying-party origin. The saved original and access to that passkey are both necessary. An ordinary Identity Record cannot replace either one. Real-device support and replacement-device recovery depend on the authenticator/provider; synthetic qualification is not a claim that every provider supports recovery.

Before the first custody creation or a new financial operation, the interface requires saving and reopening the exact prepared private original. The encrypted local journal retains the exact requests and admitted outcomes. After an operation, save the updated private original to carry its new state to another device. A file saved before an action does not contain an unsaved later outcome.

## Value movement

- **Balance:** issue the existing funded Note from the owner into the Vault's separate custody. Reserve and Settlement retain their existing source rules.
- **Card:** retain one exact checkout, reconcile that checkout, then move its admitted funded value. A checkout status alone is not money evidence. An unknown checkout creation must be reconciled before another request can replace it.
- **Original:** move an admitted supported asset in kind. Its original, quantity, ownership and history remain connected.
- **Investment:** move admitted Market ownership units in kind with their cost basis and source history. Depositing or returning those units is not a sale or a new purchase.
- **Send or return:** review the exact source, amount and destination. Returning value targets the original owner's admitted account ID, including after a display-name change. Sending resolves a Receiz ID during preparation and binds the actual recipient in the approved request.

Every financial action reserves capacity for the complete resulting private source before an irreversible mutation. Retained stages use exact request digests and operation IDs. Lost responses remain pending; recovery checks or replays the same approved request. It does not invent a replacement transaction or report a successful movement from a transport response alone.

The current release opens saved contents offline. Funding, custody changes, sending and returning use the connected financial contracts. Historical verification works offline; it does not establish present unspentness. Fully offline financial execution is a separate integration contract.

## Public proof and QR

Select holdings under **Share proof**. The shared PNG contains the selected native witnesses and a holder signature. It carries no private key, phrase, login record or spendable bearer token. Its QR identifies the Vault and the exact public proof digest. Publishing the exact record is an explicit, separate choice; an unpublished QR locator cannot fetch an unpublished record.

`/vault/<vault-id>/?proof=<sha256>` opens a dedicated public reader without mounting the ordinary account application. A recipient can also open the saved public original. The reader verifies its enclosing artifact before projecting the carried public evidence. Private originals are refused by the public evidence reader.

A public proof establishes the disclosed evidence at its recorded coordinate. A genuine old proof remains genuine; it does not assert that all holdings remain unspent today. Copying public evidence gives no authority to enter the account or Vault.

## Independent inspection

The standalone browser reader is `/vault-verifier/v1/verify.html`. Save it for local use. Its complete reader, canonical artifact verification, native source admission and pinned issuer material are included. It makes no network requests and grants no authority. Open only files you intend to inspect; keep private originals private.

For machine-readable local inspection:

```sh
node public/vault-verifier/v1/verify.mjs /path/to/vault.public.png
node public/vault-verifier/v1/verify.mjs /path/to/vault.public-proof.json
node public/vault-verifier/v1/verify.mjs /path/to/vault.private.png
```

Exit 0 means the carried evidence verified. Exit 1 means rejection. Exit 2 means a usage error or protected private contents that require the original passkey. A protected file whose outer artifact verifies is explicitly reported as unopened; the reader does not claim to have verified its encrypted contents. Output is allowlisted and omits keys, recovery phrases and private source bytes.

Rebuild the reader with `npm run vault:reader:build`. Its `build.json` records source and output hashes; `inspector.js.map` contains the corresponding bundled sources, with license notices beside the reader. Structural schemas describe interchange shapes; they do not replace cryptographic admission.

## Performance and preservation

Ordinary account startup does not import, open or inspect Vault contents. Vault code and its native reader load only on explicit entry. The public Vault route uses its own entry; the large independent inspection kit is not included in ordinary startup or offline-shell precaching.

Existing signed originals and financial records are retained. Recovery appends admitted outcomes; it does not delete original ledger history or mutate a sealed source. A derived display/index is subordinate to that retained evidence. The connected Note funding repair separately preserves the prior index and verifies original-record fingerprints.

## Verification boundaries

Automated checks cover exact prepared-file reopening, optional protection, source substitution, identity mismatch, capacity before mutation, lost results, exact-request recovery, immutable public disclosure and credential-free inspection. Native test fixtures exercise actual cryptographic/source contracts; browser presentation fixtures do not grant financial authority.

The approved production custody migration is applied, with existing balances, holdings, Ledger rows and funding functions verified unchanged. Application rollout remains separate. Local tests do not exercise real funds. Real Face ID and replacement-provider passkey recovery must be qualified on supported devices before making device-specific claims. See the [release verification record](verification/2026-10-24-vault-release.md) for the exact checks and scope.
