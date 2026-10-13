# Public Market verification — 2026-10-13

Installed SDK, MCP and AI Skills: 129.0.0. Actual Receiz public membership and
full quote feed both returned 1,678 showcase objects. The dated seed refresh at
2026-10-13T18:33:13.446Z retained the public owner fields and exact source locators.
No original, ownership, value or financial execution is inferred from the feed.

`npm test`: 75/75 pass across 18 files. `npm run typecheck` and production build
pass. The existing lazy SDK chunk warning remains. Browser checks used Codex
computer use against the production preview at 127.0.0.1:4173, width 390. There
was no horizontal overflow or relevant browser error/warning. Full-catalog
search selected a real @klock showcase object; its sheet showed that actual
owner, local sealing time, Kai pulse, source and verifier links. Public objects
never entered the demo account reducer. Automatic scrolling expanded rows from
50 to 100 without a load-more click. The source collection stayed 1,678.

Independent review of 12e4cf5..8162297 found no Critical and four Important
issues. Each was reproduced by a failing test before one fix pass:

- Known public source, proof and download paths now have separate allowlists.
- Partial refresh retains the last complete collection/cache and marks it stale.
- An original verification result is discarded when ID, digest, URL or request
  generation changes; stale requests are aborted.
- Collection and quote freshness are separate; invalid or failed quotes retain
  cached values with an explicit stale label. Quotes can update when membership
  is temporarily unavailable.

The user then requested automatic scrolling and the actual public owner in
details. Both were implemented with regression tests, using the genuine current
owner field, not creator/name inference. The owner link is public discovery,
not a new bank ownership claim. Review was not repeated; the single fix pass
and full green suite are the verification for the final delta.

## Decisions and remaining small follow-ups

- Proceeded inline under repeated build authorization without another execution
  method prompt. Cost if the requirement changes: adjust this integration.
- Full financial qualification and existing demo conversion remain outside this
  independently delivered public subsystem; they are still part of the user's
  larger unfinished live-bank request. Cost if confused: sample account actions
  could be mistaken for actual execution, so the Demo label and explicit status
  remain until genuine native account integration replaces them.
- Deferred: public object deep-link normalization can drop selection on reload.
- Deferred: membership caching does not yet persist subsequently refreshed quote
  history, so an offline reload can omit previously seen charts.

Enclosing original verification was tested for mismatched/unsupported bytes and
request races, but no publicly downloaded original was independently verified
as part of these browser checks. Native public visibility does not grant private
original download rights. Financial account, custody, issuance, trades, transfers
and reload recovery have not been qualified. See live-bank-status.md.
