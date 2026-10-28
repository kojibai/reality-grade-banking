# Preserve Original frequency through valuation views

The original sigil frequency was omitted from compact valuation seeds and
several metadata adapters. The existing valuation algorithm already accepts
frequencyHz; no formula, coefficient or valuation version changes here.

Bankeiz retains that optional source operand in current Wallet inputs, public
Original values, charts, Ledger indexes, inspection and receipt transport. These
paths share one metadata adapter instead of maintaining three copies. Cache
equality includes frequency. Invalid supplied frequency is rejected. An omitted
legacy public display frequency can be completed from the same bound Original
with matching core operands; conflicting explicit inputs remain rejected.

An Original uses its sealed moment's frequency while evaluation advances in
Kai. Account totals are sums; they do not have one replacement frequency. The
existing generic wallet quote continues using its documented neutral-frequency
policy. Its absent input is explained in the disclosure rather than displayed
as the literal word undefined.

Current and reconstructed model valuations can change. Signed Originals,
completed transaction amounts, event order and recorded Kai coordinates are
unchanged. Older carried inputs still reproduce their previous calculations.
No database dependency, request, source re-verification, reload or cache clearing
was added. No production data is changed by this patch.

The corresponding client-compatible native calculator sources and reproducible
application modules include the same field support. Published locked npm
packages, verifier roots and signing authority are unchanged. The native source
manifest records the composition inputs and their hashes.

Receiz counterpart: df7cd0d23. Its 93 scoped pricing, Wallet, execution and
recovery tests pass. A wider private-PBI gate test fails identically on untouched
Receiz HEAD 630f47004; that separate existing failure and the local full-project
TypeScript heap limit are documented with the counterpart change. No gate was
weakened to obtain passing results.

Qualification on isolated main 8c9edbb with these changes and a clean, offline
`npm ci` installation of the exact lockfile: 658 files / 4,049 tests passed,
zero skipped; the complete production build passed, including exact native
source correspondence, licensing, source archive and offline-shell checks.
The first local build caught an existing installed React/lockfile mismatch;
qualification used the locked installation instead of changing the lockfile.
A restricted test run could not listen on localhost in two HTTP tests; the full
run with localhost access passed without changing those tests.

This field-preservation correction does not resolve the separate historical
Phi/USD aggregate divergence identified on klok. No zero-Phi account fix or
financial reconciliation is claimed here. Deploy the matching Bankeiz reader before enabling the updated
Receiz producer; old readers may omit unknown calculation operands.
