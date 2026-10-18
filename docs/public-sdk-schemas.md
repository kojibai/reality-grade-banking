# Public SDK schema distribution

`writePublicSdkSchemas(directory = 'dist')` in
[`scripts/build-public-schemas.mjs`](../scripts/build-public-schemas.mjs) copies
the complete installed `@receiz/sdk@129.0.0/schemas/` tree to
`/schemas/sdk/v129/`, without parsing/reserializing the published bytes or
rewriting `$id`, `$schema`, `$ref`, filenames or generation directories. The
installed package currently retains 47 schemas in v120, v122, v125, v126 and
v127. SDK package v129 is distinct from those schema generations.

The static `/schemas/` page uses the existing Bankeiz branding profile,
navy/paper palette and font stack. It includes individual schema downloads, a
deterministic schema-only ZIP, and a manifest containing source package paths,
canonical IDs, SHA-256 digests, byte sizes and coordinated SDK/MCP/AI Skills
versions. The manifest also records exact installed documentation digests and
version-pinned references. It is distribution metadata, never a new proof
schema or verification authority.

The builder derives the release from the exact application dependency pin. It requires the lockfile, all three installed packages and retained native manifest to match that release. It accepts
only regular `v<number>/*.schema.json` files, and checks local/absolute-ID
reference closure before writing. It publishes no runtime, fixtures, proving
resources, signing material, identity files or custody state. The existing full
native source archive remains available at `/source/index.json`.

## Build and upgrade integration

The public-page build calls this before the offline/source release checks:

```js
import { writePublicSdkSchemas } from './build-public-schemas.mjs';
await writePublicSdkSchemas('dist');
```

`/schemas/` is included in the public sitemap and linked from the Ledger and Conformance surfaces. For a standalone local build:

```sh
node scripts/build-public-schemas.mjs
```

No application API route, database write, upstream package change or new
runtime dependency is required. Static deployment should serve the generated
files directly. The page has no JavaScript or account runtime dependency.

## Canonical construction and verification

The page references the installed v129 SDK artifact and offline-sealing guides,
full MCP documentation and AI Skills `receiz-proof-skill` /
`receiz-offline-verifier-skill`. Existing SDK `assets.createProofObject` native
Record → Seal issuance, `artifacts.download`, `artifacts.verifyAndOpen` and
offline file tools keep their original requirements. Schema validity does not
grant ownership, spending, public disclosure or domain admission authority.

Public Ledger restrictions are explicitly the Bankeiz application’s publication
scope beneath canonical Receiz verification. Complete enclosing originals,
trusted roots, actual native issuer/scope and domain continuity remain
authoritative. Private Identity Seals, account/custody material, credentials and
spendable Notes are outside this public input scope. The private
intelligence-source Crystal workflow remains separate from the supported
public Ledger PNG carrier; neither a picture nor a wrapper substitutes for its
verified carried original.

## Verification

`npx vitest run tests/public-sdk-schemas.test.ts` builds into a temporary
directory and checks every published schema against the installed bytes,
manifest size/digests, all JSON references and their pointer targets, ZIP
validity/exact bytes/determinism, the schema-only output inventory and useful
download/documentation links in the static page.

## Coordinated v130 release

`npm run release:check` and the production build fail on mixed package, lockfile, installed or native source manifest and retained SDK package versions. The page, ZIP filename, manifest, generation root, schema catalogue, package commands and documentation URLs derive from that validated release. Installing the coordinated v130 packages and updating their matching native distribution will generate `/schemas/sdk/v130/` from the actual new SDK bytes. No v130 artifact is published in advance.

This automates distribution metadata, not protocol qualification. Review new package API/schema/skill changes and requalify actual construction, original verification, Ledger publication/Crystal continuity, receiver behavior and compatible retained v129 files. Follow [the release process](release-process.md#coordinated-sdk-mcp-and-ai-skills-release); a version match alone does not qualify those functions.
