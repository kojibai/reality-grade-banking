# Transaction critical-path measurements

Date: October 22, 2026. Baseline source: `1254a0d`.

## Method

`node scripts/measure-execution-critical-path.mjs` launches one isolated Vitest process using the actual Send and Market controllers. All originals and transport are synthetic shape fixtures; there is no account, credential, proof admission, card authorization or live financial request. Each request injects 15 ms and the optional display callback injects 30 ms. Twelve warm samples per operation follow a separate first-controller/SDK-use sample. This measures adapter behavior, not production network performance or a native local financial commit. Review and construction timings are reported separately from approval-to-result.

## Before changes

| Operation | Approval-to-result p50 | p95 | Outcome GETs | Financial dispatches |
| --- | ---: | ---: | ---: | ---: |
| send | 78.85 ms | 83.73 ms | 1 | 1 |
| buy | 47.35 ms | 48.12 ms | 0 | 1 |
| sell | 47.50 ms | 54.40 ms | 0 | 1 |

Send additionally opens/reuses a conversation; Market does not. All controllers retain the unknown request before dispatch, validate the exact original and retain the terminal original before publishing or returning success. Complete Market responses already avoid recovery reads. Incomplete and lost responses use one original lookup without another dispatch.

The installed SDK `docs/connect-transfers.md` documents a returned ledger event/proof bundle; it does not guarantee the exact `found/source.transfer/source.message` response required by Bank’s observation validator. `connect.transfer` forwards the response; a synthetic full-original response proves conditional admission only. No production transfer was authorized for this measurement. A deployed Send that returns an incomplete acknowledgment still requires the original GET; no round-trip saving is claimed for that response shape.

Baseline verification: 57 tests passed; one opt-in timing test skipped in the normal suite. The measurement runner separately executed that test.

## After removing redundant waits

Same runner, fixtures, request latency, display latency and sample count. The
complete Send POST passes the same validator as an outcome read and its exact
original is retained directly. Missing/mismatched/lost responses still perform
one original read and never another financial dispatch. Terminal retention
failure stays recoverable and does not produce success or another read.

Accepted-state publication stays awaited. An explicit optional `afterRecorded`
hook follows it without holding completion open. In the production adapter,
Send publishes the authenticated absolute balance before optional chart work;
Market adopts its absolute position before optional invalidation/refresh.
Neither synthesizes cash balances from subtraction or share arithmetic. The
existing request coalescing, revision/identity guards and notification behavior
remain in place.

| Operation | Approval-to-result p50 | p95 | p50 reduction | Outcome GETs |
| --- | ---: | ---: | ---: | ---: |
| send | 32.40 ms | 34.77 ms | 46.45 ms | 0 |
| buy | 16.29 ms | 20.88 ms | 31.06 ms | 0 |
| sell | 16.29 ms | 16.41 ms | 31.21 ms | 0 |

These are controlled adapter measurements with synthetic injected delays, not
production speed guarantees. The Send saving consists of one conditional
15 ms outcome read plus 30 ms of optional display waiting in this fixture.
Market already avoided the read; its fixture saving is the optional display
wait. The production Market adoption path was already short, so this does not
establish a 30 ms production Market saving. Preparation/quotes, dispatch,
source validation and durable retention remain required in the connected path.

The actual Send adoption helper is also tested with chart work held indefinitely:
its accepted absolute balance publishes and its callback completes first; a later
chart result cannot roll a newer account head back. Mounted Assets and the open
investment view retain inline absolute holding updates, including full liquidation.
No new polling, notifications or initial-page requests are introduced.
