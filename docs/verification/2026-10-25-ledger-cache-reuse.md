# Ledger cache write reuse

The Ledger keeps its complete recorded history. An append must not repeatedly
sanitize the same saved predecessor or retain a deep copy of that history.

## Confirmed work removed

A public Ledger trace showed 17 calls to `parsePublicNetworkCache`, taking about
4.3 seconds of aggregate CPU during opening and inspection. Background writes
were rereading and normalizing the previous complete cache. These were cache
parses, not 17 cryptographic verifications.

The writer now retains only its latest successfully committed snapshot. A random
generation stored in the existing atomic write identifies that exact predecessor.
Another tab's write, a legacy writer, or a different generation still takes the
existing validation and merge path. Failed writes never replace the predecessor.
Every disk restore continues to validate its input. The marker grants no proof,
account, ownership or spending authority.

Recorded projection objects are made immutable once and shared with that snapshot.
Current producers append or replace records; they do not edit saved objects in
place. A WeakSet avoids revisiting shared nested objects without retaining old
snapshots. No history, proof object, funding source or account cache is deleted.
No request, timer or database operation was added.

## Measurements

A controlled Chrome benchmark used the same 45,666 public seed records and five
real IndexedDB writes. Repeated writes fell from approximately 550 ms to 255 ms
(about 54%). The retained heap increase was approximately 5.3 MB. An intermediate
deep-copy approach retained approximately 54.6 MB extra and was discarded.

These are cache-write measurements, not whole-page load times or an iPhone paint
qualification. Physical-device scrolling remains a separate observation.

## Verification

- Five regressions cover local reuse, foreign and legacy writes, unsuccessful
  writes and immutable recorded rows. The reuse regression was observed failing
  before the implementation.
- Focused cache and Ledger rendering selection: 26/26 passed.
- Serial complete suite: 3,143 passed; the existing
  `tests/note-account-deposit.test.ts` case “verifies a sender-consumed deposit for
  a receiver with no qualified custody” exceeded its unchanged 30-second limit.
  The unchanged file then passed 8/8 in a separate 15.33-second run.
- Type checking passed. No test was skipped or had its timeout increased.
- Independent review approved the final immutable-sharing patch and audited the
  current record producers and consumers for in-place mutation.

Payment execution, pricing, receipts, disclosure and global synchronization are
unchanged. This commit does not activate offline Send, Buy or Sell.
