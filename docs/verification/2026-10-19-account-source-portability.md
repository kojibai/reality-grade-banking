# Private account source portability

## Change

The existing private proof backup now includes the exact account original kept
by the local account ledger. Import admits it through the existing canonical
account verifier and same-owner binding. It is stored as encrypted
`account-source` evidence, separate from owned assets and pending operations.
No new network request, Supabase runtime, signer, funding effect or backend is
introduced. Collection and verification are lazy, on explicit backup/import.

After complete batch admission and atomic evidence retention, compatible native
account history may be restored through the existing local ledger. The original
continuation checks reject branches and preserve a later retained source. A
local Note successor or newer wallet arriving during retention wins. The user
sees whether history was restored or originals were retained without changing
the account view. Failed projection leaves the original recoverable for explicit
reimport, including after interrupted projection; it never reports restored
funds. Unknown account aliases are not imported from user JSON.

Private historical backup uses exact held bytes. Fresh public statement export
continues to enforce its existing age limit; a private backup does not establish
a fresh balance or restore hardware-bound Note custody. No signing key or unlock
phrase is added to this archive.

## Evidence

- New behavior was tested red before implementation, then green.
- Real pinned v129 verifier rejects a forged account source without network,
  archive commit or view restoration. Positive orchestration fixtures explicitly
  mock admission; they are not issuer/device qualification.
- Existing account-ledger tests cover same-account history extension, older
  sources, branches, CAS races, cash-only restrictions and stronger Note heads.
- Private library tests cover exact-byte export/import, explicit review,
  commit-before-restoration, evidence-only fallback, mixed-invalid zero writes,
  and deduplication at 1,000 members and 64 MiB.
- Fresh review found the pre-dedup capacity bug; it was reproduced and fixed.
  Follow-up review found no remaining issue.
- Actual Chromium IndexedDB fixture at isolated `127.0.0.1:5419` passed 14
  storage checks, including account-source encrypted reopening, separation from
  spendable assets, pending-operation preservation and concurrent deduplication.
- Mobile interface fixture measured `clientWidth:390`, `scrollWidth:390`.
  Screenshot: `account-proof-backup-mobile.png` in the current task's visual
  artifacts. The fixture connects no account or money.

Final verification: `npm test -- --maxWorkers=2` passed 249 files / 1,475 tests;
`npm run typecheck`, `npm run build` and `git diff --check` passed. The full test
run emitted a Happy DOM warning that dynamic `snarkjs.min.js` script loading is
disabled in that synthetic DOM; no test failed. This is not a browser or device
Groth16 qualification claim. The build verified the complete offline shell,
corresponding-source archive, licensing, public metadata and navigation.

## Remaining boundaries

Actual phone checkpoint decryption, qualifying nonrollback device custody and
prepared disconnected Notes remain last. Complete local-Note successor source
closure is not supplied by a historical public account statement. Funded media
holdings and scoped messaging host exposure are detailed separately in
`docs/receiz-v129-media-and-messaging-contracts.md`; they are not claimed complete.
