# Account navigation reuses the held balance

## Cause and change

Internal `popstate` and `receiz-bank:surface` returns called the remote wallet reader after local Kai valuation had already succeeded. After the read deadline, or following a failed read, an internal return could therefore produce a refresh warning over a complete held balance and chart.

`useNativeAccount` now paints the complete admitted observation and calls the existing identity-fenced, single-flight local valuation on an internal return. Navigation itself does not assert a financial state change. If the complete observation is absent, the existing bounded reader remains available. Scheduled inbound reconciliation, connectivity wakes, explicit Refresh, accepted observation events, recorded payments, custody and transaction checks are unchanged. Genuine prior failures remain visible; this change does not hide them.

The repeated-return regression previously made two additional `readWallet` requests after one actual failed refresh. It now makes zero additional requests. No elapsed-time saving is claimed from that request-count measurement.

## Verification

- Five focused suites: 58 tests passed, zero skipped.
- Frozen account entry: seven suites, 62 tests passed, zero skipped.
- Full production command `node scripts/vercel-npm.mjs build`: passed, including typecheck, source archive, offline shell, public first paint, frozen entry and deployment packaging.
- Independent review found no changed reconciliation deadline, identity race or listener leak.

Local verification logs: `/private/tmp/bankeiz-ledger-20261106/balance-navigation-final-tests.log`, `balance-navigation-freeze.log`, and `build-balance-navigation.log`.

This document records local qualification. A new commit is not evidence of production deployment or physical-device verification.
