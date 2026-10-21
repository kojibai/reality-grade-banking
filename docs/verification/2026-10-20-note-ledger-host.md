# Modern Note movements in the Receiz Ledger

Receiz main commit: `35891d794` — Project connected Note movements into Wallet
Ledgers. Reviewed patch SHA-256:
`69b2b97141e345a4fb572034c2d6fa4c8c69b031e046d4a581e44ff38494c92d`.

## Change

The existing global and private Wallet Ledger readers now project modern Note
creation, deposit and monetary refund movements for Reserve, Settlement and
composite funding. Native selection reads the existing admitted immutable
ActionLedgerHistory and exact financial effects. Explicit native absence uses
the existing compatibility writer's committed Wallet/allocation/redemption
records. A selected native refusal never falls through to SQL.

Exact original movement IDs, units, rates, funding components, source digests
and carried coordinates are retained. Private bearer authority remains bound to
the requesting account. Public identifiers stay opaque; no private account
opening, bearer, signing key or private receipt file enters the public feed.

Pagination preserves Kai, exact timestamp microseconds and category/tie
positions. Conditional responses describe the final combined page. Immutable
prefix ordering is reused; only bounded page candidates receive proof
formatting, including a one-row window over 10,000 Notes. Deep raw searches can
still scan the cached prefix. Opaque continuation requires the existing
WALLET_PUBLIC_IDENTITY_SECRET or RECEIZ_SIGNING_KEY; missing configuration
returns an explicit availability error instead of losing tied rows or exposing
private raw coordinates.

The service reports already-deposited only for an exact terminal already
credited to the same account. Original replay remains recoverable; a mismatch
or unknown service failure does not become a false duplicate verdict.

## Verification

- Independent review bound all 14 file images and reproduced the conditional,
  pagination, source-split and proof-work failures before correction.
- Independently rerun focused route/source/HTTP tests: **55 passed**. Parent
  reran the same 55 against the actual applied checkout: **55 passed**.
- Two actual native writer fixtures passed with synthetic funds and sources,
  including once-only consumption and real debit/refund projection. No live
  financial action was performed.
- All 14 changed runtime/test paths passed scoped ESLint. Eight changed runtime
  roots introduced zero TypeScript diagnostics; 24 dependency diagnostics match
  the existing baseline exactly. This is not a full-host typecheck claim.
- After application, `governance:check`, `governance:evidence-check` and
  `governance:verify-artifact-signature` all passed.
- Exact file/hash, clean-path and whitespace checks passed. Only reviewed paths
  were staged. The other developer's unrelated `supabase/.temp/cli-latest`
  change was preserved and excluded from the commit.

## Boundary

No schema, financial writer, source selector, account entry, signature,
antirollback requirement, client polling interval or package version changed.
No deployment, push, production query-plan assessment, private account read or
full Receiz release gate was performed. Actual global delivery follows operator
deployment and exact-build qualification. Route/source evidence has no visual
screenshot; no production rendering result is claimed.
