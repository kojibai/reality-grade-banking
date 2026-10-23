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
