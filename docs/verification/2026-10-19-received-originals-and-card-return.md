# Received originals and saved card-return continuation

19 October 2026. Receiz SDK, MCP and AI Skills remain pinned to **129.0.0**.
These checks use local code, exact transport fixtures and synthetic UI records.
No live ownership claim, card charge, money transfer, device enrollment or
private-message read was performed.

## Received originals

- Deposit → A proof object loads the receiving adapter on demand. Opening the
  bank does not initiate proof receiving, new network reads or ownership effects.
- The exact selected file is locally verified through `artifacts.verifyAndOpen`.
  A review is bound to the actual SDK-issued source object and its digest.
- An already-owned original is retained locally using the existing proof vault,
  with its existing 32 MiB input limit and no ownership HTTP request.
- A supported foreign bearer original requires explicit approval. The adapter
  checkpoints its original bytes before calling `ownership.claimBearerAsset`.
  The native source coordinator owns idempotency; Bank adds no ownership ledger.
- The returned original is canonically reopened. The asset identity, payload,
  provenance root, prior append prefix, exact source digest, prior owner/head,
  new owner and new head must agree. The predecessor and owned successor are
  retained in one existing IndexedDB proof-batch transaction.
- A lost response remains unknown. An explicit resume reuses the same source;
  a saved verified successor awaiting disk retention resumes locally without
  another claim request. An unresolved checkpoint prevents destructive ID removal.
- Offline Notes and Reserve funding originals stay on their dedicated paths.
  Receiving a proof is not presented as a cash deposit.
- Received predecessor originals are a distinct evidence kind in the encrypted
  backup library; importing their evidence cannot make them owned holdings.

The native proxy now permits multipart only on the exact bearer-claim and
verification routes, preserves binary bytes and the SDK’s required continuity
headers, and excludes cookies and unrelated headers. The receiving input is
bounded to 3 MiB before any claim, beneath the deployed multipart transport cap.

## Card returns

The provider return carries only a public session reference into the account’s
Deposit route. It can select only a checkout already saved under the open ID.
The existing Receiz status check still verifies the same session, account and
amount. A paid session awaiting credit remains pending and does not reopen the
card payment form. No return creates a checkout or asserts credit from a URL.

Ordinary reopening retains its existing blank chooser and amount entry. Saved
checkouts resume only through an explicit selection or the provider-return link.
The return reference is consumed after selection so reopening cannot repeat it.

## Validation

- Typecheck passed.
- 49 focused tests passed across received-proof state, receive UI, proof backups,
  constrained binary proxy, card return and existing Send/Receive presentation.
- Full suite: **248 files / 1,461 tests passed** with two workers after the
  review fix. A first maximally parallel suite hit the unchanged 5-second market
  history test timeout; no market code or test timeout was changed.
- Production build passed, including the complete offline shell, source archive,
  licensing, conformance separation and all public-page metadata checks.
- The built public guide’s footer stayed within document width at 320, 360, 390,
  430, 768 and 1024 px; body layout remained block at every width.
- Read-only review found an identity-change UI race. The adapter now resets
  per-identity loading state; stale completion cannot unlock a newer operation.
  The added regression and the 12 receiving tests passed after the fix.
- Browser preview exercised explicit resume → held original, saved session →
  same-account credited view, and the grouped footer. Preview effects are clearly
  labelled synthetic and provide no live financial qualification.

Remaining host boundaries: linked-media backed issuance is still refused by
Receiz’s current native asset domain, and full account export must not replace a
stronger local custody head with a stale server source. Offline Notes remain a
separate saved-checkpoint, real-device custody and disconnected-execution task.
