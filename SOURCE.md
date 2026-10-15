# Source and GPL distribution

Original software in this repository is [GPL-3.0-only](LICENSE). Preserve [NOTICE](NOTICE), [third-party notices](THIRD_PARTY_NOTICES.md) and upstream terms. This is a build/source map, not an assertion that an incomplete source package satisfies the license.

## Application

Preferred source lives in `src/`, `server/`, `api/`, `scripts/`, `conformance/`, `institution/`, `branding/` and the root configuration/lockfiles. Tests and documentation explain behavior. Runtime assets, note presentation sources and font provenance are in `public/` and `public/notes/README.md`. Dependencies retain their licenses.

Follow the Node/npm requirements in [README](README.md), then `npm ci`, `npm run build` and `npm run preview`. A build does not establish receiver qualification.

## Native artifacts

| Distributed artifact | Matching source/build materials |
| --- | --- |
| `public/native/receiver-verifier.v129.mjs` | Adjacent complete `.map` and input-hash `.manifest.json`, `institution/receiver-verifier.entry.mjs`, `scripts/build-receiver-verifier.mjs` |
| `public/native/offline-notes.v129.mjs` | Adjacent `.manifest.json`, exact Receiz v129 native input tree, `scripts/build-offline-note-runtime.mjs` |
| SDK and ZK resources in the covered build | Exact versions, preferred source and required resource-generation/build instructions |

Native rebuild scripts currently require a separate matching Receiz v129 checkout and its build dependencies. The receiver manifest identifies its source revision and imported hashes. Its source map exposes imported text, but an upstream browser bundle may itself require additional preferred source/build inputs. The note runtime manifest does not embed its complete source. This repository alone is not claimed to reproduce every native module.

## Release obligations

For distributed covered object code, including browser JavaScript/WASM where applicable:

1. Record the exact source revision, patches, lockfile, build commands and environment requirements, plus module/resource hashes.
2. Provide complete matching Corresponding Source required by GPLv3 sections 1 and 6: original app/native source, necessary dependency source and scripts/materials controlling compilation and installation. Include applicable Installation Information. General-purpose tools and qualifying System Libraries follow the license's own exclusions.
3. Use a permitted source-delivery method for its required period. With network downloads, provide clear access to the corresponding source alongside object-code access. A mutable default branch, source map alone, license declaration or unsupported promise of later source is insufficient.
4. Verify a recipient can rebuild from the supplied materials without the maintainer's private checkout. Document non-bit-reproducible inputs accurately. Keep upstream copyright/license notices intact.
5. Exclude private credentials, Identity Seals, customer/account data, signing keys and bearers. Document operator configuration using public/synthetic fixtures.

**Current native release-material requirement:** assemble and verify the complete matching preferred native/dependency source and build materials before treating a native binary distribution as complete. License adoption grants modification rights; it does not retroactively certify missing materials or relicense the rest of the private Receiz host repository.

The official source location is [kojibai/reality-grade-banking](https://github.com/kojibai/reality-grade-banking). Forks/operators must identify their own exact source and release materials. Bankeiz.com identifies the official reference, not a corresponding-source archive for every operator's build.
