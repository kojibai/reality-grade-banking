# Public native transaction receipt qualification

`public-transaction-event.json` is the already-public Receiz Wallet projection for
`transfer:e8cb37b488de16493acbd226`, pulse `15045683`. No private account material is included.

`public-transaction-native.png` was downloaded on 2026-11-08 through the actual
Bankeiz Ledger file button in an isolated local checkout. The button uses the
existing Receiz `/v/` native receipt exporter with this carried event. The
canonical production-root verifier accepts the PNG and its embedded native
`receiz.wallet_ledger_receipt` envelope. No test root or Bank seal is used.

SHA-256: `52fa021e164bbe672c5611675b90ee6fa308af51f9f3bf4472b60e156e51aaa3`
Size: 94,388 bytes. The actual downloaded ZIP contains these identical bytes and
its extracted `verify.mjs` accepts them with network access disabled. This
qualifies the receipt export and its carried evidence, not live balances or
transaction authorization.

`public-transaction-without-moment.png` qualifies the same public event with its optional Moment locator absent, as in `includeReceiz=0` private rows. Both files came through the unchanged native exporter; no transaction was executed to produce these fixtures.
