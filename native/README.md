# Matching native source · v129

This directory supplies the preferred source and build materials for the two native browser modules distributed by this reference application, plus the matching published SDK source. It is a deliberately scoped extraction, **not the Receiz host repository**. The exact files, SHA-256 hashes, upstream source archive provenance and original build inputs are recorded in [manifest.json](manifest.json).

## Rebuild without a private checkout

From the repository root, use Node.js 24 and the public locked dependencies:

```sh
npm ci
npm run native:check
npm run native:rebuild
npm run native:rebuild -- --sdk
```

`native:rebuild` assembles an isolated temporary source tree and compares the resulting bytes to the checked-in artifacts. It checks the exact Offline Note module, read-only receiver, normalized receiver source map, generated SDK sealing core, Kai worker and canonical parser/valuation seams. `--sdk` also compiles and compares all 211 JavaScript files from the published SDK. It performs no funding, signing, account access or network calls. `npm ci` obtains public build/runtime dependencies; no Receiz host checkout or private credentials are needed. Optional `--output /path/to/directory` writes verified modules there. `npm run receiver:build` writes the verified modules back to `public/native/` without changing their hashes or manifests.

| Material | Purpose |
| --- | --- |
| `receiz/app/` | Actual browser note, verification, identity/cryptographic and deterministic source dependencies |
| `receiz/packages/receiz-sdk/` | Matching SDK TypeScript/JavaScript preferred source, schemas, scripts and offline resources |
| `receiz/scripts/`, `receiz/docs/releases/` | Canonical code-generation inputs and registry projections needed by that SDK build |
| `npm/` | Exact seven runtime package snapshots used by the native artifact build |
| `upstream/` | Preferred cryptographic dependency source and build configuration, including source underlying generated browser/WASM distributions |
| `receiz/zk/`, `receiz/circuits/`, `receiz/public/zk/` | Circuit sources, public setup parameters and existing public proof resources |

The source manifest preserves existing native input paths only to reproduce the original build; it does not contain filesystem credentials or grant access to the original installation. General development tools are installed from `package-lock.json`. Upstream build scripts and lockfiles remain beside each preferred source tree; source-archive URLs, exact commits and archive hashes are recorded in the manifest. Upstream trees omit unrelated tests, benchmarks, example assets and installed development dependencies; tests used by the original build recipe remain included.

## Circuit and public resources

`npm run native:resources` checks the four public Bank/SDK resource hashes. For independent circuit verification, install the general-purpose [Circom compiler](https://github.com/iden3/circom) at **2.1.6**, put `circom` on PATH (or set `CIRCOM_BIN`), then run:

```sh
npm run native:resources -- --circuit
```

This compiles `receiz/zk/sigil_proof.circom` with the included Poseidon source, reproduces the exact witness WASM and verifies both existing proving keys against the rebuilt R1CS and included public Powers of Tau parameters. Public `.zkey` and `.ptau` files are proof-generation/setup resources; they are not identity keys, root signer keys or trusted-setup secret entropy. The established setup keys are verified, not regenerated. Do not create replacement setup keys and represent them as the original resources.

## Distribution boundary

Read [DISCLOSURE.md](DISCLOSURE.md) and [NOTICE](NOTICE). The source is usable and modifiable under its applicable licenses; disclosure is intentional. A clone gains implementation knowledge, not production permissions, custody, customer identities, funded balances or official endorsement. Source availability and reproducible bytes are separate from financial qualification.

The normal application build publishes an exact, content-addressed source archive and inventory at `/source/index.json`, linked from `/legal/`. `npm run source:verify -- --rebuild` checks that archive and rebuilds the native artifacts and SDK from its clean extraction, reusing only publicly locked npm dependencies. Preserve the archive alongside the object-code release; do not replace old source archives with unrelated new revisions.

## Application composition changes

Historical wallet display also includes the exact v129 `app/utils/phi-issuance.ts`
source. `manifest.json` records its separate `historicalValuation` provenance and
hash. The application adapter changes only its valuation imports to use the
locked SDK; tests enforce that correspondence. See
[historical account valuation](../docs/historical-account-valuation-v129.md).
These computed chart points are display data, not financial credit or recorded
historical quotes. Native Note/receiver and published SDK bytes are unchanged.

The source commit identifies the upstream v129 base. `manifest.json` additionally records application-specific composition patches with their original and modified source hashes. The Bankeiz WebAuthn realm patch changes only the Bank note browser composition: Bankeiz uses `bankeiz.com`, while existing Receiz Bank credentials retain `receiz.com`. It does not modify the pinned SDK package sources, published SDK JavaScript, verification roots or note custody requirements.

After an intentional composition-source edit, update its indexed source/input hashes and run `node scripts/rebuild-native.mjs --refresh-composition --output public/native`. Normal builds continue to require exact reproduction of the committed artifacts.
