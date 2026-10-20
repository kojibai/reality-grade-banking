# Synthetic complete-source account Note fixture

These compressed files contain a complete v129 terminal and native credit,
not truncated proof JSON or mock success responses. `metadata.json` identifies
the exact Receiz source revision, synthetic receiver, Note, amounts and public
test roots. No production identity keys, credentials or trust roots are included. Any
recoverable identity material belongs exclusively to this synthetic fixture. Tests supply the explicit synthetic root policy.

The isolated generator uses actual native funding, qualified sender
consumption, terminal verification, recipient account/key binding and the
native atomic writer. It creates **no receiver custody slot**. Concurrent
identical redemption submissions produce one credit. Synthetic authenticators
and financial ingress are clearly confined to the upstream test fixture;
network access is forbidden and temporary source stores are removed on exit.
This does not certify physical hardware or a deployed service.

Optional regeneration requires the recorded Receiz checkout, its locked
local test dependencies and this repository's rebuilt native composition:

```sh
node --conditions=react-server --import tsx \
  /path/to/bank/scripts/testing/create-note-account-receipt-fixture.mts \
  /path/to/receiz /path/to/output
```

Run from that Receiz checkout. The generator refuses a different source
revision or SDK version. It writes new synthetic IDs, keys and proof objects;
compare behavior and provenance rather than expecting identical randomized
proof bytes. Normal Bank tests read these retained public synthetic sources
and do not require a second checkout, live account or network.

Evidence boundaries and the complete field/operation contract are in
[the implementation specification](../../../docs/note-account-deposit-v129.md).
