# Shared public Ledger verification — 2026-10-13

The Ledger uses the same public actions, wallet, graph and showcase sources as Receiz Mind Activity. Source-prefixed IDs retain separate public witnesses; the displayed count is source entries, not unique financial transactions. A real retained public capture supplies 45,663 source entries; the browser observed 46,505 after current additions. Its local observation date stays visible until every source completes a live refresh.

Public refreshes are independent, paged, bounded, GET-only and credential-free. The UI renders 50 rows initially and automatically adds 50 before the viewport reaches the end. Details show carried Kai coordinates, exact public cents, native cryptographic aliases and safe public source links. Public projection never substitutes for canonical enclosing proof or financial authority. My history does not show global or demo activity.

## Independent final review

The fresh reviewer found no Critical issues and three Important issues. All three were accepted at their supplied severity and fixed in one pass:

1. An interrupted head catch-up could be saved as complete and skip the gap after reload. Persistence now retains the complete source anchor IDs independently of newer additions. Legacy caches without those anchors are incomplete until the real seed or complete source establishes them again. A save/reload/resumed-gap hook regression failed before the fix and passes after it.
2. Additive persistence revived entries removed from complete graph/showcase snapshots. Complete snapshots replace that source family, and observation ordering rejects older delayed snapshot saves. Actual save/reload tests for both families failed before the fix and pass after it.
3. Malformed rows silently became successful empty snapshots. Every required row ID must be valid before the page can be accepted. Malformed-page tests failed before the fix and pass after it; explicitly valid empty snapshots remain supported.

No Minor issues were raised. There was no second review. The reviewer declined to judge full private account integration and financial conversion, upstream proof correctness, or sustained deployment performance; those claims remain outside this projection change.

## Checks

- Focused public-network suite: 14 tests passed after three independently reproduced RED failures.
- Full suite: 92 tests in 23 files passed.
- TypeScript and production build passed. The existing lazy SDK chunk size warning remains.
- Production browser: actual 46,505 source entries, 50 initial rows, no horizontal overflow at the default narrow viewport. Earlier mobile checks observed automatic 50 → 100 rows and My history isolation.

The bank's private identity/account conversion and financial qualification remain separate unfinished work. Public bank actions will appear only when genuine admitted bank execution produces a public source record.
