# Source and reproducible distribution

Original reference software is [GPL-3.0-only](LICENSE). Preserve [NOTICE](NOTICE), [third-party notices](THIRD_PARTY_NOTICES.md) and existing upstream terms. Matching source availability, reproducible bytes and financial conformance are separate questions.

## Source supplied with each build

`npm run build` produces a content-addressed `.tgz` under `dist/source/`, an exact file/hash inventory at `/source/index.json`, and a direct download from `/legal/`. The archive contains the application preferred source, tests, configuration/lockfile, documentation, runtime assets and the matching native source/build package in [native/](native/README.md). `SOURCE-ARCHIVE.json` inside the archive names and hashes every included file.

The archive uses the explicit allowlist in `scripts/source-files.mjs`. It excludes `.git`, installed `node_modules`, build output, operator environment files, credentials, account storage and the maintainer’s temporary source-assembly workspace. Native files are additionally checked against the exact [manifest](native/manifest.json) and [disclosure boundary](native/DISCLOSURE.md). A clone receives implementation code and applicable reuse rights; it does not receive production authority or a private backend.

## Rebuild the application and native artifacts

Use Node.js 24 (the CI version) and npm. Public dependency installation needs network access; native reproduction after installation does not.

```sh
npm ci
npm test
npm run typecheck
npm run receiver:check
npm run native:check
npm run native:rebuild -- --sdk
npm run build
npm run source:verify -- --rebuild
```

The final command validates the archive against the exact release sources, extracts it into an empty temporary directory and builds the full application and rebuilds both native modules and all 211 published SDK JavaScript files using only publicly locked npm dependencies. It does not read the original Receiz checkout or access private services. Standalone recipients can extract the archive, run `npm ci` there, and use the same commands.

| Artifact | Matching source and verified reproduction |
| --- | --- |
| `public/native/offline-notes.v129.mjs` | Original browser dependency closure, seven exact runtime package snapshots, pinned esbuild recipe; all 288 original input hashes and 295 composed note inputs and exact module bytes |
| `public/native/receiver-verifier.v129.mjs` and `.map` | Original browser closure and institution entry point; exact module bytes, ordered 225 carried sources and normalized source-map bytes |
| Published v129 SDK JavaScript | Full matching SDK preferred source, canonical generators/registry projections, TypeScript 5.9.3 and package compaction script; all 211 JavaScript output hashes |
| SDK sealing core and Kai worker | Canonical unbundled source and exact generated output comparison |
| Public proof WASM and setup keys | Included circuit/Poseidon source, public Powers of Tau parameters and existing public resources; hash checks plus optional independent circuit verification |

`native/manifest.json` records exact source provenance, preferred upstream cryptographic source trees, build input paths and SHA-256 hashes. `scripts/rebuild-native.mjs` uses the included files, not a private host checkout. The old build command names remain local wrappers around that same recipe. Developer tools and public npm dependency installation are pinned by `package-lock.json`; dependency terms remain in force.

For circuit verification, install general-purpose Circom **2.1.6** and run `npm run native:resources -- --circuit`. It reproduces the witness WASM exactly and verifies the original public proving keys against the rebuilt circuit. Existing setup keys are not regenerated; secret setup entropy is neither needed nor supplied. See [native build instructions](native/README.md) for tool configuration and scope.

## Retention and operator releases

Keep the matching archive available alongside its covered object-code release. Its content-addressed URL, SHA-256, source-tree hash and file count are in `/source/index.json` and `/legal/release.json`. Preserve prior archives when continuing to distribute older artifacts. A new deployment must not turn an older build’s source link into unrelated source; archive retention belongs in the operator’s release process.

GPLv3 sections 1 and 6 define Corresponding Source, delivery methods and applicable Installation Information. Include operator modifications and any additional materials required for that operator’s covered build. A successful local rebuild is evidence about the named artifacts, not a blanket legal certification of every downstream distribution or an institution conformance assessment. Root and upstream licenses govern their respective work.

The official source repository is [kojibai/reality-grade-banking](https://github.com/kojibai/reality-grade-banking). [Bankeiz.com](https://bankeiz.com/) is the official reference implementation. Independent operators identify their own exact source, service, permissions and qualification evidence.
