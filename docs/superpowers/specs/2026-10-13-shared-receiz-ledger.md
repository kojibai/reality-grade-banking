# Shared Receiz ledger and account source

The bank is another interface to the existing Receiz account. It must not issue
a second wallet balance or convert old demo JSON into money. Its native identity,
Reserve and Settlement source must be the same source used by Receiz wallet.
The protected `/api/connect/wallet/me` route calls `loadWalletSummaryForUser`, the
existing Receiz wallet loader. Read through SDK `client.connect.wallet()` with
actual native identity consent and an active dedicated registration. App/native
qualification and financial mutation remain separate from those read projections.

Public Ledger is the full public activity surface from Mind: public action
ledger, wallet ledger, Proof Graph rows and public showcase proof objects. Mind's
public reader delegates to Receiz's existing public GET contracts. Use those same
sources, native SDK wallet methods where available, and bounded cursor paging.
The public action wire currently uses `actions`, although SDK's declaration says
`events`; retain the actual observed contract rather than inventing response data.

Use the unchanged Ledger visual container and My history / Public tabs. Default
to Public until an actual identity is connected. My history is only that user's
admitted personal history, including their real bank actions. Existing demo events
must never appear as public or personal live history. This subsystem may show a
not-connected personal pane until native account integration is available.

Show local dates; preserve carried Kai uPulse/pulse, source hashes and source
locations in details. Public projection is not enclosing artifact verification
or causal financial authority. Default actor labels use the cryptographic aliases
already supplied by native public feeds. Never publish private Mind memory or
fetch private account endpoints in the public proxy. Do not infer current owner,
actor, exact amount or proof from a summary. Public amounts use native exact
USD cents; no demo conversion basis.

Read public source families independently, retaining successes when another fails.
Deduplicate by source + exact source ID, not claimed timestamps. Retain source
provenance when the same underlying event has different public witnesses. Never
sum such rows as transaction volume or claim their count is unique transactions.
Page all history without a first-page ceiling; repeated cursors fail closed.
Refresh heads without throwing away held older history. Infinite scrolling should
render incrementally, with stale/partial coverage visible.

Seed initial discovery from Mind's actual complete public-source capture dated
2026-10-02, clearly labeling cached data until reads update it. The capture contains
45,660 public source entries and has complete progress for every source family;
it is a public projection, never imported as a private Memory Crystal or proof.
No external dependency or provider. SDK/MCP/AI Skills stay at 129.0.0.
