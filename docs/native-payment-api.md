# Native payment and account-proof wiring — v129

The Bank's Send review now uses the existing native financial writer through
v129 authenticated `client.request`. It preserves the current amount, rail,
recipient, exact review, final approval and recovery controls. It does not
manufacture a generic SDK committed execution. SDK, MCP and AI skills stay at
129.0.0.

## Payment contract

All three routes are authenticated, non-cacheable POSTs beneath
`/api/connect/bank/payments/`, with exactly one `applicationId` query parameter.
There is no account selector. The host derives the caller from existing v129
proof-authority authentication and reopens the currently registered device key.

- `prepare`: the exact `send-value` request in
  [native-payment-protocol.ts](../src/receiz/native-payment-protocol.ts). It
  resolves the recipient from the native profile source, reopens both original
  wallet prefixes and derives the available amount and exact Phi. It writes no
  financial state. Reserve preserves its funded dollar denomination and original
  Phi backing. Settlement spends only actual unencumbered native Phi.
- `execute`: the unchanged prepared packet plus the existing device's
  `receiz.identity.login_proof.v1` over a domain-separated review challenge. The
  encrypted ticket holds the private plan, both source heads and receiver
  balance; none of those private balances appear in the public review. The
  shared writer locks both account/key histories and the global financial
  source, checks current keys, quote, heads, expiry and exact consent, and
  commits paired debit/credit and one activity/Kai allocation.
- `recover`: `{nonce, planDigest, ticket?}` under read-only `receiz:domains.read`.
  It never submits or repeats a transfer. A committed result reopens the same
  native financial source and returns the retained public receipt. Before a
  conclusive result, the original intent stays pending. An expired ticket may
  receive a signed zero-write proof only after the native writer has completed
  durable recovery, found no matching commit and fenced the expired plan. HTTP
  failures and an absent row are never zero-write certificates.

The public receipt/refusal is carried in an exact v129 Record → Seal bundle,
with a separate signature in the existing native financial-root domain. The
client verifies both layers, the exact reviewed intent, account key, owner,
application, receipt time and result type. A valid ordinary document seal does
not establish a payment. Receipt issuance time is separate from the original
transaction Kai coordinate, so cold recovery does not rewrite the transaction.
The immutable receipt association is written atomically and synced to durable
storage; a response loss cannot change the original financial result.

The browser retains the signed intent in encrypted, identity-bound IndexedDB
before submission. Its existing device lock and CAS prevent replacement of a
pending request. Identity removal remains blocked while a payment is unresolved.
Verified payment receipts can be saved through transaction recovery and included
in the existing proof backup/import; neither contains a signing key or login
capability. No payment is authorized merely by opening a receipt.

## Trusted host startup

Receiz main's `nativePaymentApi.server.ts` and `accountProofStartup.server.ts`
select the existing native stores using:

- `RECEIZ_FUNDED_WALLET_SOURCE_DIRECTORY`
- `RECEIZ_ACCOUNT_SOURCE_DIRECTORY` (or existing `RECEIZ_SOURCE_DIRECTORY`)
- `RECEIZ_BANK_APPLICATION_ID` — `rc_2d1wcGkAYfmCi5kGT3J89gkl` for the public Bankeiz registration (a public coordinate, not a client secret)

Both directories must be the same absolute durable source directory. Startup
never initializes empty stores or falls back to another writer. Selection is
latched per worker; a changed configuration fails closed. Pending payment tickets
use the existing `RECEIZ_SESSION_SECRET` for private choreography, not as a
financial signature. Rotating it can invalidate an unsubmitted quote; committed
recovery still works through its original nonce and plan digest. The existing
financial signing/canonical sealing configuration remains required. These
adapters add no SQL or external database service.

The account-proof API uses the authenticated v129 principal on private reads.
Anonymous live continuation reopens the previously published root-signed
identity and native current key history before producing anything new. The
legacy v1 writer allowlist is separate from native v2 financial-root verification;
its empty state does not prevent requesting a v2 source. Publication still needs
explicit disclosure consent. The original snapshot remains immutable; disabling
live updates survives restart and prevents its old link from resuming.

## Evidence and limits

Tests use real v129 cryptography, native account/key sources, the durable shared
writer, ephemeral test roots and explicitly simulated paid ingress. They cover
paired Reserve transfer, conservation, exact retry, cold recovery, expiry,
stale heads, overdraws, consent/application/recipient substitution, public
snapshot/latest reads, live refresh and revocation. Browser tests separately
check composition and real untrusted-source refusal. They do not execute live
financial transactions or qualify a processor or hardware authenticator.

This wiring does not invent native Settlement ingress, accepted ownership,
funded offers or physical custody. The current v4 account-proof producer admits
complete native cash, asset, offer and transaction history, admitted lawful
sources, the accepted private owner archive and native Note funding/redemption
closures. Unsupported imported artifact genesis, entitlement policy and fresh
current-device Note inventory require their actual source admission; see
[source closure scope](private-artifact-and-note-source-closures-v129.md).
Missing scope is unavailable, never silently represented as zero. Outstanding
origin Note funding is separate from spendable cash and current possession.
Non-payment asset actions keep their separate
financial qualification boundary. Production operation also requires pushing
both commits, deploying the host with its existing admitted sources/signers and
verifying the deployed device-authorized flow.
