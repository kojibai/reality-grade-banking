# Contributing

Reality-Grade Banking is the Bankeiz reference implementation; Bankeiz.com is the designated official reference. Read the [current capabilities](README.md) and [receiving requirements](institution/receiving-standard.md) before proposing a change. Original work is licensed under [GPL-3.0-only](LICENSE). Contributions intended for this project are offered under that license unless already identified under compatible separate terms. Contributors retain their copyright; no ownership assignment is required.

For a bug, include the expected behavior, minimal reproduction, exact build/package versions, and redacted refusal/verification coordinates. Keep Identity Seals, phrases, private sources, account details, signing keys and bearers out of issues and fixtures. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

For changes accepted into the official reference, verification, value, custody, admission, execution, recovery, trust roots or conformance requirements require an explicit design and independent review. GPL recipients remain free to modify and redistribute outside this upstream review process. Do not weaken a requirement to resolve a UI or transport failure. Keep presentation work separate from financial authority changes. A display or language refinement must preserve the same operational capability and evidence boundary.

Preserve the [loading invariants](docs/loading-invariants.md): carry available source fields through the initial presentation, reuse retained results, and keep passive preparation outside document loading. Validate cold entry with delayed resources; a warm cache can hide a missing field or loading barrier.

Run `npm test`, `npm run typecheck`, `npm run receiver:check`, and `npm run build`. Add meaningful refusal/recovery tests when changing a financial boundary. Keep all three Receiz packages coordinated and retain source/hash provenance for generated modules. Do not edit generated verifier bundles by hand.

Use synthetic, visibly nonfinancial fixtures. Never run a live financial action to satisfy an automated check. A production release requires the separate user-operated and independently reviewed evidence described in [qualification.md](institution/qualification.md).
