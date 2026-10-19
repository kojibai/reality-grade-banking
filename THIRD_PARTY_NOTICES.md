# Third-party inventory and distribution review

Original Bankeiz reference work is licensed under [GPL-3.0-only](LICENSE), with scope in [LICENSING.md](LICENSING.md). These notices preserve existing dependency rights; they do not relicense upstream work or certify complete source delivery.

## Read-only native receiver bundle

`public/native/receiver-verifier.v129.mjs` and its complete `.map` are compiled from Receiz v129 native sources at the commit in their [manifest](public/native/receiver-verifier.v129.manifest.json). The source map embeds the actual imported source text, including upstream license comments where present. The manifest identifies each embedded path and SHA-256. It is not a substitute for dependency licenses or the preferred source/build materials required by applicable terms.

| Component in the source map | Version | Declared license | Included notice |
| --- | --- | --- | --- |
| `@noble/hashes` | 2.3.0 | MIT | [License](public/native/licenses/noble-hashes-2.3.0-MIT.txt) |
| `ffjavascript` | 0.3.1 | GPL-3.0 | [Copying](public/native/licenses/ffjavascript-0.3.1-GPL-3.0.txt) |
| `snarkjs` | 0.7.6 | GPL-3.0 | [Copying](public/native/licenses/snarkjs-0.7.6-GPL-3.0.txt) |
| `hash-wasm` | 4.12.0 | MIT | [License](public/native/licenses/hash-wasm-4.12.0-MIT.txt) |
| `fflate` | 0.8.3 | MIT | [License](public/native/licenses/fflate-0.8.3-MIT.txt) |

The bundled `ffjavascript` browser distribution incorporates additional code. The existing dependency tree includes `wasmcurves@0.2.2` and `wasmbuilder@0.0.16`, each declaring GPL-3.0; their [wasmcurves](public/native/licenses/wasmcurves-0.2.2-GPL-3.0.txt) and [wasmbuilder](public/native/licenses/wasmbuilder-0.0.16-GPL-3.0.txt) texts are retained too. The `hash-wasm` distribution also retains its embedded Microsoft TypeScript helper notice in the source map. This is a scoped observed inventory, not a representation that every production transitive component has been legally cleared.

## Application dependencies and assets

The coordinated `@receiz/sdk`, `@receiz/mcp-server` and `@receiz/ai-skills` packages are pinned to 129.0.0 and declare MIT in their published package metadata. That declaration does not remove their dependencies' separate terms. The Bank's original native runtime and built application also use the existing cryptographic dependency tree, so review must cover the complete distributed application, not only the new verifier.

Other direct/runtime dependencies are recorded by `package-lock.json` and their own installed notices. QR decoding retains [jsQR's Apache-2.0 license](src/vendor/jsqr/LICENSE); the build publishes its exact text at `/legal/vendor/jsqr-Apache-2.0.txt`. Note typography retains [Cinzel's SIL Open Font License](public/notes/fonts/OFL.txt). Public sharing artwork uses unmodified Inter 4.1 Regular and SemiBold from the [official Inter release](https://github.com/rsms/inter/releases/tag/v4.1), under the retained [SIL Open Font License](scripts/social/fonts/OFL.txt), published at `/legal/vendor/Inter-OFL.txt`. These fonts are build inputs, not browser font downloads. [Note artwork provenance](public/notes/README.md) describes the generated presentation assets; artwork never grants financial authority.

## Compatible grant and source delivery

The owner authorized modification-friendly GPL-compatible terms on 2026-10-15. The earlier branding-only proposal is superseded. No no-modification rule, paid certification requirement or trademark policy is imposed as an extra condition on GPL software rights.

The installed production dependency graph also declares GPL terms for `@iden3/bigarray@0.0.2`, `@iden3/binfileutils@0.0.12`, `fastfile@0.0.20` and `r1csfile@0.0.48` (including its `ffjavascript@0.3.0`). Keep each component's applicable terms and source. The emitted `/legal/dependencies.json` records installed production package versions, declared licenses and supplied notice files; it is an observed inventory, not a legal clearance or source-completeness certificate. Some published packages declare a license without shipping a standalone notice; the inventory discloses that rather than inventing an upstream copyright notice.

Supply complete corresponding source and required build/installation materials for covered object-code distributions. The matching native input source, SDK source, preferred cryptographic dependency sources and build materials are supplied in [native/](native/README.md) and included in the build’s content-addressed source download as described in [SOURCE.md](SOURCE.md). A source map, package metadata, an upstream URL or copied license text alone does not establish the complete required delivery.

The unmodified root GPL text is obtained from the [SPDX license-list-data GPL-3.0-only text](https://github.com/spdx/license-list-data/blob/main/text/GPL-3.0-only.txt). Its SHA-256 is pinned by the license checker. Bundled upstream notice texts are preserved as distributed by their packages. Keep their attributions; do not replace existing MIT/GPL/font permissions with project-branding rules.
