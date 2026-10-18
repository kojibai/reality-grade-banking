# Historical account valuation verification

Scope: Bankeiz's v129 historical display projection and retained first account
frame. The user approved recomputing past dollar values at their past Kai
coordinates. No financial writer, package version, Receiz checkout or SQL is
changed. No real account, funds, disclosure or deployment is exercised here.

## Source and behavior

- Exact pinned pricing source SHA-256:
  `69622c017e955734525e121a7b27bdaa42066932657b145e02be493792de9c74`.
  The application adapter differs only in its two SDK valuation imports.
- Golden rates and a separate parity probe reproduce the existing wallet
  calculation. Actual accepted Phi and Reserve deltas remain unchanged;
  recomputed historical values are tagged separately from recorded quotes.
- The timeline starts at the earliest sealed activity of a complete supported
  source. Complete admitted same-owner carriers must reconcile both rails and
  gross Phi, including intermediate balances and action ownership.
- Tests cover safe numeric portable fields, unsafe/foreign/incomplete refusal,
  actual SDK-signed synthetic portable state, unsigned snapshot alias rejection
  as a source, current checkpoint precedence, all ranges, sparse cache upgrades,
  stronger local Note heads and ordered post-import cache writes.
- Existing sparse caches require one local source enrichment before they can
  retain the new computed series. Missing sources do not manufacture history.

## Checks

- Full suite: 648 tests across 153 files passed; typecheck passed.
- Isolated Chrome: 180 combinations across five synthetic histories, three
  rails, six periods and 393 × 852 / 1280 × 900 viewports. Full plotting width,
  selected range coverage, keyboard inspection, no horizontal overflow and no
  console errors. Historical period switching also passed with networking off.
- Local Vercel build, emitted function checks, native source/resource hashes
  and exact source-archive inventory are the release artifact gates.
- Independent review found and rechecked numeric compatibility, intermediate
  balance, action ownership, cache upgrade and delayed-write fixes. No open
  findings remained before final release checks.

The read-only Receiz MCP application check did not execute: the tool returned
`Device execution failed; inspect held proof state before repeating this
attempt.` It was not retried and is not counted as a passed check. The actual
v129 SDK, local build and browser results above are separate evidence. No live
financial operation was attempted.
