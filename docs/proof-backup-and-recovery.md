# Proof backup and recovery

Open your Receiz ID panel in Bankeiz and expand **Proof backup**. These controls use the pinned v129 verifiers and local encrypted storage. They request no new account access and execute no financial action.

## Save your proofs

**Save proof backup** downloads a private `bankeiz.proof-backup.v1` JSON collection containing the exact owned originals and asset definitions held on this device, verified transaction recovery evidence, and retained note images and completed deposit receipts. The collection is bound to the opened identity and application. Every original is reopened by its v129 verifier before export; a filename, claimed balance, digest or transport envelope is never proof admission.

Keep this downloaded file secure: it contains private proof data and is not password encrypted. Imported custody is encrypted at rest with the device's nonextractable wrapping key. The download does not include that key, an unlock phrase, permission tokens, unfinished payment attempts or hardware-bound note credentials. Back up the Identity Seal separately using the existing **Back up my Identity Seal** control.

## Import originals or recovery evidence

1. Open the matching Identity Seal.
2. Choose **Import backup or proof**, then select the collection, an original proof, a complete transaction recovery JSON file, a note PNG, or a complete note deposit receipt.
3. Bankeiz reopens the original sources locally and displays a verified review. Review the filenames and transaction coordinates.
4. Choose **Import verified proofs** to retain the complete batch. Cancel leaves storage unchanged.

The import preserves exact bytes and deduplicates already readable originals. When restoring the same Identity Seal after removing it from this browser, verified originals replace inaccessible old-key ciphertext atomically. A concurrent identity change or conflicting storage snapshot prevents a partial save. Unrelated identities, live payment checkpoints and note custody are untouched.

Collections support up to 1,000 sources, 32 MiB per source and 64 MiB of original bytes; the encoded download is limited to 90 MiB. Imports also enforce cumulative stored-proof limits before committing. Oversized, foreign, incomplete or altered collections are refused without partial retention. Keep the original files when a limit or verification error is reported.

## What recovery establishes

An imported owned original can be reopened in the existing asset view. **Saved receipts & recovery proofs** lists retained evidence and offers **Save original** for byte-exact re-export. Complete execution recovery sources are verified with the Bank application audience before their coordinates are shown.

Receipt import is evidence retention. It does not resubmit a payment, issue or redeem a note, credit a balance, replace an unresolved transaction, register hardware, or restore spendable note custody. A copied note image preserves carried proof; device custody still follows the native qualified handoff. Private deposit receipts remain bound to their receiving identity.

## Verification boundaries

The automated suite tests canonical refusal using the installed SDK, and separately labels simulated admission fixtures used to test UI choreography. Isolated browser fixtures exercise actual IndexedDB/WebCrypto storage, exact-byte reopening, remove/reopen/restore, concurrent deduplication, bounded all-or-none writes, and preservation of pending transaction state. These checks do not claim a positive funded transaction, hardware ceremony or credit qualification.

The shared Crystal financial writer remains a separate integration boundary. This local proof feature neither depends on that writer nor changes its implementation.
