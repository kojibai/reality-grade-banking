# Twin display: reuse the open account's existing sources

The saved Twin portrait failed because native relative storage URLs were used
as Bankeiz URLs. The controller now uses the existing Receiz image URL helper
for both saved settings and an accepted portrait result. It preserves the Twin
portrait independently of the account profile image.

Mind was incorrectly dependent on generating another complete portable Twin
export. That pipeline includes source assembly and character/voice work that
is unnecessary for displaying the already-open account. The new Bankeiz panel
has no Mind export request, separate grant, proof admission, value calculation,
background polling or duplicate persisted history.

The existing account Ledger memo supplies the same merged PublicRecord objects
to both conversation context and Mind. Mind retains those records by reference,
including their already-prepared funding disclosures and original Kai. Calendar
and Contacts reuse the held organizer controller; admitted identity originals,
held investments and loaded conversation turns supply the other display nodes.
The display indexes available sources; it does not claim a complete new export.
Missing sources are not substituted with another account or fetched implicitly.

The graph uses original source membership and exact recorded conversation
identifiers. It keeps district boundaries, does not infer relationships from
matching text or amounts, and does not turn dates into sealed Kai. Existing
bounded canvas geometry and native Kai layout are retained. Only the selected
Mind view builds its index, and changes to held Ledger/conversation references
refresh that view. Opening Mind directly does not initialize native settings.

Private Ledger links enter the existing private Ledger panel. Actual proof
objects retain their own asset links; ordinary calendar/contact records do not
receive fabricated asset URLs. Settings connection errors remain visible in the
requested service-backed tab, while an unrelated settings failure cannot hide
local Mind data.

Regression coverage includes native relative portrait paths, unsafe URL refusal,
Mind with an unavailable settings service, direct Mind entry with zero requests,
owner/key binding refusal, the native Contacts shapes, already-projected Ledger
aliases and snake-case Kai, exact source references, and district separation.
Browser checks use explicitly labelled synthetic fixtures; they submit no live
account changes or transactions. Live account-specific latency is not inferred
from fixture timings.

The native relay retains its prior Mind action for compatibility with older
deployed clients. The current Bankeiz client does not call it. No Receiz code,
database migration, financial rules or authorization boundary changes are part
of this correction.

Qualification (latest base `3e9c6c5`, isolated locked dependency installation):

- Full unit suite: 585 files, 3,726 tests passed; zero skipped.
- TypeScript project build and complete `npm run build`: passed.
- `npm run test:browser` and `npm run test:vault-browser`: passed.
- Isolated mobile-width UI fixture: 48 carried originals and 40 loaded turns
  render the existing orb and Continuity views. Direct Mind entry issues zero
  workspace/settings/Mind requests. Visiting Settings and returning to Mind
  reuses the single accepted settings read; console errors/warnings are empty.
- The full suite also exposed an extensionless shared Market import introduced
  in the base. Adding its required `.js` suffix preserves behavior and passes
  the existing plain-Node emitted-API regression test.

No live account sign-in, metered task, portrait generation, payment, trade or
production change was executed during this qualification.
