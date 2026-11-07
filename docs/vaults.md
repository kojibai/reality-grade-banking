# Private Vaults and independent recovery

A Vault is a private, portable proof container. It carries complete funded Note images and owned Originals, including their existing proof and continuity. Creating a Vault creates no additional account and moves no ownership. Its saved contents open locally; no Bankeiz server is needed to discover what the file already carries.

## Create, add and save

Open **Account settings → Your vaults → Create a vault**. Give it a name and choose whether to add passkey protection. Review and approve the local container.

- **Add money** opens the existing funded Note flow. Once that operation completes, its actual Note image, including scoped per-Note authority, is retained inside the Vault. Funding remains the existing Note operation; the Vault adds no new money or settlement rule.
- **Add a Note** retains the exact supported, complete Note image. A funded Note's own source establishes its recorded value. A bare image or a funding record missing its required per-Note authority cannot stand in for the complete private Note.
- **Add an original** retains the complete, already-owned Original. Its owner, contents, provenance and history remain intact. Storage in a Vault is not an ownership transfer, sale or second financial holding.
- **Save private Vault** saves the complete current container as a canonical PNG Original. Open the saved file to inspect its contents. Save again after adding anything: an older file cannot carry a later addition.

The ordinary account signing key and Identity Record are never placed inside this container. A Note may carry its own narrowly scoped per-Note key, which authorizes only that Note under its existing contract.

The displayed **Stored Notes** total is the recorded funded value carried by the saved Note sources. It is not another account balance or a statement that a historical Note remains unspent. Using a recovered Note still follows its existing receiving, consumption and continuity rules.

## Private original and optional protection

Without passkey protection, the private PNG contains its complete private sources. Keep it private: a person holding it can recover those sources and any per-Note authority they contain.

Optional protection encrypts those same contents through the existing WebAuthn PRF path. Opening the protected original requires the original PRF-compatible passkey at its registered relying-party origin. Device and passkey-provider support govern whether that credential is available on another device. A new passkey or ordinary Identity Record cannot decrypt the protected file.

**Save recovery original** is an explicit, separate choice for a protected Vault. It produces an unprotected private Original carrying the same exact sources. Keep that recovery copy in private custody, separately from the protected primary file. It can be opened by the included independent reader without Bankeiz availability, a login or the original passkey origin. Creating it does not remove protection from the primary Vault.

## Recover the actual sources

Open a saved private Vault to restore the container locally. Its source readers verify the canonical enclosing file, each owned Original and each supported Note. A complete funded Note includes its per-Note authority; the ordinary account's private signing key is not needed to inspect or recover these files.

Use the source's export control to recover its exact original bytes. The recovered Note or Original is the same supported source retained in the Vault, not a reconstructed amount, thumbnail or replacement financial object. A compatible implementation can then apply that source's existing rules. Recovering an Original does not change its owner; recovering a Note does not create a second credit.

Funding and any interrupted funding recovery remain in the existing Notes flow. Only a completed, admitted Note is added to the container. The Vault adds no financial request journal, transfer control or second recovery operation.

## Independent offline inspection

The standalone browser reader is `/vault-verifier/v1/verify.html`. Save it with the private Original or recovery copy. Its canonical artifact verifier, Note and Original readers and pinned issuer material are included; it makes no network requests, signs nothing and grants no execution authority.

After it opens a complete private container, choose **Save Note** or **Save Original** to recover an exact carried file. The reader reuses the admitted sources for these downloads. Keep the recovered files private; a funded Note retains its scoped authority.

For machine-readable local inspection:

```sh
node public/vault-verifier/v1/verify.mjs /path/to/vault.private.png
node public/vault-verifier/v1/verify.mjs /path/to/vault.recovery.private.png
node public/vault-verifier/v1/verify.mjs /path/to/vault.recovery.private.png --extract /private/recovery
```

Exit 0 means the carried evidence verified. Exit 1 means rejection. Exit 2 means a usage error or protected contents that require the original passkey. A protected file whose outer seal verifies is reported as unopened; encrypted contents are not reported as verified. Inspection output omits Note private keys, phrases and private source bytes.

The explicit `--extract` action first verifies the complete file, then saves exact sources under digest-based filenames with private permissions. It does not overwrite an existing output. Default inspection does not write private files.

Rebuild with `npm run vault:reader:build`. `build.json` records the exact included inputs and output digests; the adjacent source map and license notices accompany the reader. Structural schemas describe the transport, while canonical admission verifies its proof.

## Existing Vaults and public proofs

Previously saved account-custody Vaults retain their original reader and financial contracts. Their existing sources, custody, history and operations are preserved. Existing public Vault proofs remain read-only selected evidence and carry no private access authority. The public route `/vault/<vault-id>/?proof=<sha256>` and independent reader continue to inspect that exact published proof family.

New private proof containers do not create those child accounts, transfer investments or publish their contents. Sharing a private file shares its private sources; use the existing explicit public proof tools when the intention is public evidence.

## Performance and preservation

Ordinary account, Market and public page startup do not open Vault contents. Vaults load on explicit entry. During one unlocked lifetime, accepted unchanged sources are reused and only additions cross admission. Opening a saved file admits its complete carried evidence once, without rediscovering it through a server or rebuilding account history. The independent offline inspection kit is separate from ordinary application startup.
