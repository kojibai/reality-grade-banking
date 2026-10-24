# Ledger held funding and switching verification

Verified on 2026-10-24 using synthetic account/public records and the retained signed v129 connected Note fixture. These changes reuse immutable evidence already held by Ledger. They add no per-row requests, proof admission, financial writer, or navigation changes.

## Note funding continuity

The native receipt reader returned the original Note funding statement alongside a deposited credit, but `note-history.ts` retained only the credit. It now preserves the signed parent debit ID, operation ID, funding pulse, and issuer key ID through the existing curated `noteReceipt` projection. Its live admission cache retains the same fields. Parent and credit Note IDs, operations, rails, and amounts must agree.

The wallet record parser and shared receipt keep the existing Note ID, including its permitted public alias, for exact funding-root selection. Creation rows can reuse an already-held attribution by exact debit ID or a matching Note creation graph. Deposits can reuse the held creation graph through their exact Note ID and signed debit reference. Joins reject conflicting amounts, native units, operations, funding coordinates and deposit coordinates. Available subpulse coordinates must fall within the signed pulse; compatible sparse copies can contribute their existing coordinates without being treated as conflicting evidence. No incomplete feed becomes a new FIFO input.

The existing Receiz `main` response already carries Note funding graphs. Inspected commit: `343a5ca2140722b46082da064e5b543777d5011b`.

- `app/lib/wallet/nativeNoteLedgerProjection.ts`, `nativeNoteFundingContextPage`, selects the delivered Note roots and debit/credit roots from the admitted native prefix.
- `app/api/wallet/ledger/route.ts` merges those graphs into the existing authenticated ledger response.
- `app/api/wallet/ledger/public/route.ts` merges the permitted public graph into the existing public response.
- `app/lib/wallet/fundingContinuity/noteProjection.ts` preserves the admitted offline Note/credit ancestry and allocation original.

Bank's funding trace previously discarded proof-basis nodes after their object references and omitted `originalDigest` on other nodes. It now shows the carried funding original and exact digest, preserving each available Note, credit, and parent payment along the selected closure. A connected Note's delivered allocation original is shown as that original; this does not claim a deeper source graph when none was carried. The signed standalone Note receipt itself contains exact native funding references, rather than the wallet response's full disclosure graph.

The actual signed fixture test confirms the final records exclude `privateAccountOpening`, `noteIdentityRef`, `noteAuthority`, and `publicKeyRawB64u`. Public rows cannot inherit private ancestry. Original bytes, private openings, account identifiers, and custody material do not enter the newly displayed funding graph.

## Reused display work

| Synthetic transition | Before | After |
| --- | --- | --- |
| Return to a previously displayed 50-row category | 50 rich receipt regenerations | 0 |
| Hide a mounted 50-row Ledger with the real valuation hook | 50 rich receipt regenerations | 0 |
| Quick My history to Public return with fresh heads | 4 repeated source-head reads and 1 proof synchronization | 0 repeated reads or synchronization |

Row presentation is weakly retained by immutable record and valuation-source identity. Changed records or active valuation sources still prepare their current values. Hiding Ledger preserves its last prepared value source while its network and clock effects pause; reopening immediately adopts the newest shared source. This removes proven transition work, without claiming that a particular user's intermittent delay or device timing has been measured.

The public hook now separates its mounted source lifetime from active polling. Already-started reads can settle while the view is paused; a quick return reuses their rows and references. Polling and public sync listeners pause while inactive. Returning after the existing 60-second interval, explicit refresh, source failures, or active wake events can still discover additions. A seed-revealed history repair that arrives during a pause waits until reactivation and then reads only the affected source. The existing inactive retained-cache preload remains unchanged and starts no live heads, seed request, or proof synchronization.

## Verification

Focused Vitest command: `npx vitest run tests/note-history.test.ts tests/ledger-funding-context.test.ts tests/ledger-funding-history.test.ts tests/ledger-funding-trace-ui.test.tsx tests/ledger-render-work.test.tsx tests/public-network-hook.test.tsx tests/ledger-value-source.test.tsx tests/private-history-hook.test.tsx tests/public-network.test.ts tests/ledger-receipts.test.ts --reporter=dot`.

Initial focused result: 10 test files and 107 tests passed. Independent review then reproduced a missing Note alias in shared receipts and insufficient amount/coordinate guards in an inferred display join; regressions were observed failing and both were corrected. `npm run typecheck` and scoped `git diff --check` also passed. Checks cover the signed native Note fixture, permitted disclosure, exact parent joins and conflicts, receipt round trips, producer-shaped graph rendering, repeated category preparation, active/inactive value retention, accepted live additions, paused polling, and deferred history repair. The parent integration runs the final full suite and build.

Held immutable display is reused. Fresh arrivals preserve the live update flow. No stronger source or verified evidence is replaced by weaker UI state. The tests use synthetic records and do not open a real identity or submit an operation.
