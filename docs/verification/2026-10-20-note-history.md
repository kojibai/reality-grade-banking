# Connected Note history and repeated deposit

The existing connected Note custody already retains verified funding receipts,
their private account openings and confirmed deposit-credit receipts. My
history previously read the account-history feeds and entry-time Identity Seal
projection without adding these newer receipts. The public Receiz Ledger also
has an older event filter; its separate host correction is not established by
this Bank change.

## Bank change

`createNoteHistoryReader` reopens the exact retained funding/credit sources,
checks their source digests and native verifier result, and binds account,
signing key, Note, operation, amount and rail before projecting an activity row.
Reserve, Settlement and composite sources use the same path. The original debit
or credit Ledger ID remains the display identity. Dates derive from native Kai;
pending receiving requests and unconfirmed credits create no financial row.
Bounded public receipt fields remain available in expanded details. Private
account openings and signing material never enter a display row.

Existing live verification results and exact-source admission promises are
reused. Empty custody does not load the Note verifier. A local, account-bound
event adds confirmed activity without another history request or polling. A
late encrypted-history save merges newer admitted rows instead of erasing
them. Original receipt custody remains durable in its existing encrypted store.

For a repeat deposit, an exact locally confirmed Note is detected before a new
self-transfer or submission. The UI says **This Note has already been
deposited.** The actual legacy `wallet_note_already_claimed` code has the same
message. Generic native conflicts are not presented as proven duplicate
deposits; unknown results and service failures retain their recovery behavior.

No financial writer, funding rule, receiver binding, signature, antirollback
check, network polling interval, or schema is changed here. No Note or funds
were created, deposited or moved by these checks.

## Checks and boundary

The complete Bank suite passed 309 files / 1,866 tests before the final small
post-import reader-reuse guard; focused Note/history checks were rerun for that
guard. TypeScript and production-build results belong to the final commit
verification. Browser asset/audio tests are documented separately.

The user reported successful connected creation and deposit on the iPhone.
This report is not an independent inspection of those private receipts or a
full physical-device qualification. Global Ledger event delivery still needs
the matching Receiz host projection for both selected native sources and the
existing compatibility writer. Its completion and deployment must be reported
separately.
