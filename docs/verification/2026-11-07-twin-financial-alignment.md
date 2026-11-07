# Twin financial review alignment — 2026-11-07

The Twin’s structured history and commitment read tools now expose the same fields, nullable defaults, UTC date formats and pagination bounds used by Bankeiz. Their output retains the existing owner-bound money action envelope. History reads normalize null optional filters and cap larger positive page requests at the existing 20-record bound, retaining nextOffset and exact string amounts.

A saved MONEY_QUERY_INVALID history read can be checked once during explicit recovery if it is now valid under the aligned contract. Its exact fingerprint and receipt ID remain bound together. Accepted reads, unknown effects and financial writes are not replayed by this repair. A newly generated, distinct query retains its own exact receipt.

## Changed source

- Bankeiz: src/receiz/money-history-query.ts; src/receiz/money-conversation.ts.
- Receiz service: app/lib/world/ownerMoneyTools.ts.
- Regression tests: Bankeiz tests/money-history-query.test.ts and tests/twin-financial-review.test.ts; Receiz app/lib/world/__tests__/ownerMoneyReadTools.test.ts.

## Passing local verification

- 63 focused Bankeiz tests across eight files: query defaults and bounds, real same-owner Ledger parser/reader, native request and SSE response parsing, actual workspace execution, pagination, exact large integer amounts, retained continuations and recovery without duplicate effects.
- Eight service and cross-repository integration checks: actual Agents SDK tool invocation and model-visible JSON schema, native action envelope, Bankeiz execution and owner-bound tool results parsed by the actual service context reader. Seven existing private continuity/delivery checks also pass.
- npm run typecheck in Bankeiz; targeted strict TypeScript compilation of the service implementation and regression tests.
- Frozen account-creation source check; whitespace checks in both repositories.
- Independent review of the scoped patch found no actionable findings.

The remote model/HTTP replies were fixtures in integration tests. These tests exercised the actual service tool invoker and local consumer chain without using a production identity, financial data, payment effect or paid model request. No deployment or live mobile verification is claimed.

## Full-suite results outside the repaired flow

The full Bankeiz run completed: 983 test files passed, seven failed; 6,257 tests passed, 17 failed, 11 skipped; two listener exceptions occurred because the sandbox denied local HTTP listening. The named failures were:

- `tests/certificate-live-page.test.tsx > cold certificate paints the existing full chart from its carried seed and advances value without more requests`
- `tests/cooperative-preview.test.ts > preserves the actual preview availability query through the native calendar bridge`
- `tests/cooperative-preview.test.ts > flushes native text over real local HTTP before the upstream response completes`
- `tests/ledger-scroll-tools.test.tsx > keeps separate searches and filters across tabs and installs no inactive scroll listener or pending frame`
- `tests/live-ledger.test.tsx > presents one payment with its exact delegated execution beneath it in both Ledger views`
- `tests/public-ledger-scroll-tools.test.tsx > reveals retained search and activity categories upward, hides them downward and preserves filtered rows without reading sources`
- `tests/public-ledger-scroll-tools.test.tsx > listens only while the retained Ledger route is active and cancels a queued hidden-route frame`
- `tests/public-ledger-scroll-tools.test.tsx > waits for the public workspace natural position, including reduced-motion focus and retained reopen`
- `tests/public-ledger-value-ui.test.tsx > opens an object from its amount and shows the existing Market chart and an inline change without another request`
- `tests/public-ledger-value-ui.test.tsx > uses the same plain titles in public rows and expanded details for every Note composition without fetching`
- `tests/public-ledger-value-ui.test.tsx > selects the requested public record when returning to an already mounted Ledger`
- `tests/pwa.test.ts > opens current online HTML on new navigation while the controlling build keeps its exact held assets`
- `tests/pwa.test.ts > preserves the requested navigation path, query and credentials while bypassing the browser HTTP cache`
- `tests/pwa.test.ts > retains installed HTML on server failure without saving the failed update into its cache`
- `tests/pwa.test.ts > retains installed HTML on non-document response without saving the failed update into its cache`
- `tests/pwa.test.ts > retains installed HTML on foreign redirected document without saving the failed update into its cache`
- `tests/pwa.test.ts > aborts stalled navigation headers after1500ms and keeps the installed document usable`

An isolated rerun with local listeners permitted completed in 2.20 seconds. The certificate and cooperative preview files passed; 31 tests passed and 14 failed across these five Ledger/PWA files. Their failures concern public quote requests and worker navigation; this repair does not edit those files or behaviors:

- `tests/ledger-scroll-tools.test.tsx > keeps separate searches and filters across tabs and installs no inactive scroll listener or pending frame`
- `tests/live-ledger.test.tsx > presents one payment with its exact delegated execution beneath it in both Ledger views`
- `tests/public-ledger-scroll-tools.test.tsx > reveals retained search and activity categories upward, hides them downward and preserves filtered rows without reading sources`
- `tests/public-ledger-scroll-tools.test.tsx > listens only while the retained Ledger route is active and cancels a queued hidden-route frame`
- `tests/public-ledger-scroll-tools.test.tsx > waits for the public workspace natural position, including reduced-motion focus and retained reopen`
- `tests/public-ledger-value-ui.test.tsx > opens an object from its amount and shows the existing Market chart and an inline change without another request`
- `tests/public-ledger-value-ui.test.tsx > uses the same plain titles in public rows and expanded details for every Note composition without fetching`
- `tests/public-ledger-value-ui.test.tsx > selects the requested public record when returning to an already mounted Ledger`
- `tests/pwa.test.ts > opens current online HTML on new navigation while the controlling build keeps its exact held assets`
- `tests/pwa.test.ts > preserves the requested navigation path, query and credentials while bypassing the browser HTTP cache`
- `tests/pwa.test.ts > retains installed HTML on server failure without saving the failed update into its cache`
- `tests/pwa.test.ts > retains installed HTML on non-document response without saving the failed update into its cache`
- `tests/pwa.test.ts > retains installed HTML on foreign redirected document without saving the failed update into its cache`
- `tests/pwa.test.ts > aborts stalled navigation headers after1500ms and keeps the installed document usable`

The complete suite is not green. No assertions, SDK guards, account entry or unrelated working-tree changes were altered to change these results.
