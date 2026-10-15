# Public source boundary

The goal is independent implementation and verification of proof-object continuity. Developers receive the source needed to study, modify and rebuild the distributed native modules and SDK. Hiding these browser algorithms would not provide production authorization or protect a private key.

## Intentionally public

- The actual browser note creation/receiving/redemption composition, qualified-custody checks and read-only verifier source.
- Matching SDK implementation, public schemas/registry projections, canonical deterministic rules and code-generation inputs.
- Cryptographic dependency source, build configuration, public circuits, verification/proving keys and public setup parameters.
- Reproduction instructions, immutable input hashes, upstream provenance and applicable notices.

Some of this implementation was already distributed as browser JavaScript and a complete receiver source map. This package makes its preferred source directly usable. GPL permissions allow independent implementations and competing services. Brand protection distinguishes the official reference; it does not prevent lawful modification or competition.

## Kept outside this extraction

- The broader Receiz host backend: API routes, databases/migrations, signer-service implementation and operator deployment configuration.
- Operator credentials, production bearer tokens, root private signing keys and secret trusted-setup entropy.
- Customer Identity Seals, unlock/recovery phrases, device custody stores, private account data and customer financial evidence.

The public circuit/proving resources do not grant authority to spend funds or issue a trusted receipt. Existing authority checks, source admission, custody requirements and service permissions remain in force. Public client IDs, verifier public keys and endpoint names are public integration coordinates, not secrets.

`native/manifest.json` names every included source/package file. `native:check` rejects unindexed additions, symlinks, private configuration/key-container paths, private-key blocks and common credential patterns. These checks are a release safeguard, not a proof that a general secret detector can recognize every possible secret. Review new source extractions before updating their manifest. Do not add whole private checkouts, operator environments or customer fixtures to make a build pass.
