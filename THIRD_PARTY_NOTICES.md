# Third-party inventory and distribution review

These notices identify existing dependency rights. They are not a new license for the Bank's original work and do not establish distribution compliance for a combined build. Review this file with [LICENSE-PROPOSAL.md](LICENSE-PROPOSAL.md) before public redistribution or making reuse claims.

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

Other direct/runtime dependencies are recorded by `package-lock.json` and their own installed notices. QR decoding retains [jsQR's license](src/vendor/jsqr/LICENSE). Note typography retains [Cinzel's SIL Open Font License](public/notes/fonts/OFL.txt). [Note artwork provenance](public/notes/README.md) describes the generated presentation assets; artwork never grants financial authority.

## Unresolved release gate

The requested license prohibits modifications except narrowly defined branding. Existing GPL grants and obligations cannot be overridden by that restriction. Counsel must evaluate the combined work, the scope of covered/separable files, distribution terms and complete corresponding-source/build obligations before a public release. A source map, an upstream URL or copied license texts alone do not settle that analysis. This repository does not claim that a branding-only license is currently compatible with the combined distribution.

Keep copyright, license and attribution notices, document the exact distributed versions, and provide the legally required corresponding source/materials under the applicable terms. Do not apply a blanket restrictive license to third-party code or claim that this proposal removes existing MIT/GPL modification rights.
