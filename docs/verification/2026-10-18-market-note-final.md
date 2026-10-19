# Manual Market, saved Note failure and final verification

## Result and release boundary

Bank's public Market review now uses the original Receiz manual `/market` quote,
trade writer, funding rules and position accounting through the v129 SDK's
`client.request`. Public discovery does not grant ownership or movement authority.
The new authenticated Receiz endpoints must be deployed along with this Bank
client. No production deployment, SQL application or financial action was performed.
Existing SDK/MCP/AI Skills packages remain 129.0.0. Twin automation mandates and
the native proof/custody verifiers are unchanged.

Read scopes are `receiz:twin.read` and wallet read; manual submission additionally
requires `receiz:twin.write`. Consent explicitly describes manual purchases and
sales. The registered Bank application remains the audience. Review only reads
an advisory quote. Final approval fixes a buy budget or six-decimal sell quantity;
execution applies the original Market's current pulse, bid/ask and funding rules.
A public discovery object without a supported Market listing has no enabled
trade action. All objects retain the same proof-economy capitalization framing.

The encrypted request and nonce are saved before the first POST. A lost response,
HTTP failure after admission, absent original or mismatching original stays
unknown. Recovery only reads the original nonce; it never resubmits. Only the
narrow OAuth 401/403 codes rejected before admission become `not-sent`. Original
trade, current position and matching wallet ledger rows are bound to the actor,
item, side and nonce. Actual traded quantity comes from the trade, not the current
position total. Original integer strings and complete returned rows are retained.
Unresolved Market requests participate in the existing mutual exclusion and ID
removal guards. Unreadable Note custody or a local Note head still blocks new
connected transactions; there is no empty-state fallback.

## Current iPhone Note evidence

The user supplied `Stage: offline-note-checkpoint · OperationError`. The saved
identity check has completed before this stage; AES-GCM then fails to open the
separate Offline Note checkpoint. This is before registration or Face ID. It does
not establish the credential format, counter or backup flags and does not prove
which key, bytes, browser behavior or other condition caused authentication to
fail. Source/history review found no verified alternate key or address that can
recover that phone record. The exact encrypted record has not been deleted,
rewritten, reset, migrated as empty or treated as an unissued zero-value state.

Send and Market now show this bounded custody stage instead of attributing the
failure to the receiving service. Identity transport and signer errors retain
their own stages and are not described as checkpoint failures. Existing
[Safari/PWA registration requirements](../iphone-offline-note-registration-v129.md)
still apply after the checkpoint can open. Consumer iPhone browser registration
remains unqualified: no actual compatible device evidence or real-device financial
create → send → deposit → credit → spend run was available in this verification.
`BANK_PREPARED_NOTE_CREDIT_ENABLED` remains false. No native app, weaker counters,
backup-eligible credential acceptance or relaxed previous-head checks were added.

## Verification

- Bank full suite: 1,153 tests across 207 files passed after the final diagnostic
  distinction. Production build and `npm run vercel:check` passed. An earlier
  simultaneous build/test run timed out `proof-verifier-resource.test.ts` at its
  existing five-second limit; the complete rerun after the build passed. The
  existing happy-dom script-loading refusal is printed by a negative verifier
  path; it did not fail the final run.
- Production offline integrity: final build identity and resource count are
  recorded by `npm run build` / `node scripts/check-offline-shell.mjs`. The prior
  full PWA lifecycle evidence is in [the close/reopen report](2026-10-18-pwa-close-reopen-final.md).
- New tests exercise fixed budget/quantity, exact review approval, source
  mismatches, failed persistence, lost response, original-only recovery, OAuth
  refusal, the registered application, mutual pending guards and route restoration.
- A separate read-only code review caught registration arguments, navigation,
  OAuth refusal and unsupported discovery-item affordances; all were corrected
  and covered before commit.
- In a new isolated browser origin, the actual installed SDK completed a synthetic
  manual trade through deliberate response loss. The visible result showed one
  submission and one refresh. Reloading reopened its retained original record
  with the submission count still one. A second fixture returned the exact Note
  checkpoint error before any quote or new submission. These fixtures use no
  account, credentials, external service or money.

![Synthetic SDK trade recovered from its original rows](/Users/bjklock/.codex/visualizations/2026/10/19/01a151a7-653d-78b2-8710-bd8fd82700c4/market-manual-trade-recovered.png)

## Original native Note execution

The unmodified native protocol suites ran in the isolated Receiz main checkout:

```sh
node --import tsx --test --test-concurrency=1 \
 app/lib/wallet/__tests__/bankFundedNote.test.ts \
 app/lib/wallet/__tests__/bankSettlementRoundtrip.test.ts \
 app/lib/wallet/__tests__/bankLocalAccountCredit.test.ts \
 app/lib/wallet/__tests__/bankLocalCreditCompatibility.test.ts \
 app/lib/wallet/__tests__/bankPreparedBrowser.test.ts \
 app/lib/wallet/__tests__/bankNativeNoteWriter.test.ts \
 app/lib/wallet/__tests__/bankNoteImage.test.ts \
 app/lib/wallet/__tests__/kairosNotePwaCustodyAdapter.test.ts \
 app/lib/wallet/__tests__/kairosReservePwaCustodyAdapter.test.ts \
 app/lib/wallet/__tests__/bankNoteBrowserCustodyTransport.test.ts
```

All **36 tests passed**, zero skipped, in 606.96 seconds. They cover Reserve and
Settlement funding, direct and offline-respend native histories, allocation crash
cancellation, mixed-rate Reserve precision, exact source-bearing images, prepared
browser create/send/deposit/respend with networking disabled across restart and
changed receiver quotes, strict-counter qualification, cloned/restored state and
receiver rejection. Test-only hardware/vendor roots and adapters do not qualify
an actual iPhone. Passing these tests is protocol evidence, not permission to
activate the unqualified production browser path.
