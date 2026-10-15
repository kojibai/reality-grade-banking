# Contributing

Reality-Grade Banking is a reference implementation of Receiz Bank. Read the [current capabilities](README.md) and [receiving requirements](institution/receiving-standard.md) before proposing a change. The branding-only license structure is [proposed, not effective](LICENSE-PROPOSAL.md); this document grants no reuse rights or copyright assignment.

For a bug, include the expected behavior, minimal reproduction, exact build/package versions, and redacted refusal/verification coordinates. Keep Identity Seals, phrases, private sources, account details, signing keys and bearers out of issues and fixtures. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

Changes to verification, value, custody, admission, execution, recovery, trust roots or conformance requirements require an explicit design and independent review. Do not weaken a requirement to resolve a UI or transport failure. Keep presentation work separate from financial authority changes. A display or language refinement must preserve the same operational capability and evidence boundary.

Run `npm test`, `npm run typecheck`, `npm run receiver:check`, and `npm run build`. Add meaningful refusal/recovery tests when changing a financial boundary. Keep all three Receiz packages coordinated and retain source/hash provenance for generated modules. Do not edit generated verifier bundles by hand.

Use synthetic, visibly nonfinancial fixtures. Never run a live financial action to satisfy an automated check. A production release requires the separate user-operated and independently reviewed evidence described in [qualification.md](institution/qualification.md).
