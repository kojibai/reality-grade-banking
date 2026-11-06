# Captured public-data checks — November 6, 2026

All **11 conditional captured-data checks ran and passed**. Their nine complete
test files passed **83 tests, zero failures and zero skips**, in 69.55 seconds
with one worker. These are existing checks enabled with public captures; no
test, fixture baseline, guard, SDK dependency or production code was changed.

The candidate was the clean locked build at
`/private/tmp/bankeiz-cli-footer-build-20261106`, qualified for `eca52da5`.
The ordinary suite's skips indicate missing opt-in capture paths, not disabled
application checks. This run supplied all of those paths.

## Inputs and assertions

| Input | Exact captured scope | SHA-256 |
| --- | --- | --- |
| Public membership | 1,685 Originals, including all 612 BJ Klock Originals and the target exactly once | `ebfdf9cb6e259ccf885dfb5c50d576fb523020a9d767a7581cfdcbf86d093637` |
| Public quotes | All 1,685 quotes carry share inventory, including all 612 BJ Klock rows | `9dcb86c0eb9486c03f02d96d946e20e876094a97e96eebef67a91878c62aa300` |
| Sports | 1,962 rows, retained without duplicating sealed history | `d6665ac39884741e8d05cc126f626f7537d3c8391fdf125e8deef1dde76947cb` |
| Capitalization | 2,933 value rows; exact mixed-cohort arithmetic | `106707cb6a2beb8f2b2887893509b73e75cf0e2109aa559666322684741e747b` |

The checks cover retained Ledger capacity, all-612 profile capitalization,
append-only history extension, carried Original and share fields, membership
restore after storage quota, pricing checkpoints, Sports classification and
retention through repeated Market opening.

The Ledger test uses the existing production membership curator. Its first run
correctly refused raw membership plus the retained Ledger because that combined
input exceeded the unchanged 32 MiB material guard. Curating the same public
membership at its existing production boundary preserved all 1,685 Originals,
the revision and all 612 profile rows. The final run passed without raising a
capacity or weakening an assertion.

The retained Ledger contained **45,673 records, including 1,685 proofs**, with
the target once and inspection version 4. All retained non-proof financial
fields compared exactly. This establishes the captured baseline; it does not
establish that every newer live financial record is already in a saved page.

## Evidence and limits

The captured public responses came through the existing public reader. No
private account, financial operation, production write, fresh signature or
SDK change was needed. Absent historical supply facts remained absent.

The exact report is retained at
`/private/tmp/bankeiz-captured-checks-20261106/qualification.json`, SHA-256
`83d4b9567469133b7ccb52844e69aa52fcf6b1986c3bde1187fddf8c121ac92f`.
The same directory contains `run-final.sh`, `tests-final.json`, `tests-final.log`,
the input manifest and the initial capacity refusal.

These results establish local public-display and arithmetic assertions.
Deployment, accepted publication currentness and the user's phone remain
separate verification states.
