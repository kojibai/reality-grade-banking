# Market review work reuse

The review and Confirm paths both hold the existing account-execution and Note locks. The Market controller read and validated its complete encrypted checkpoint after the cross-family pending guard had already loaded and validated that same checkpoint. This did not add a rule; it repeated storage, decryption, and canonical hashing of the complete retained trade history.

The controller now validates once under those same locks and gives that exact snapshot to the cross-family guard. The guard still scans every historical/current Market status, all other payment families, Note custody and pending issuance. It does not memoize across actions or skip validation of new state. Confirm still independently checks the current state again after review, retains the exact request before POST, and resolves unknown outcomes by the existing original-read route.

Both Buy and Sell benefit: two checkpoint reads become one per operation; the duplicate full-history validation is removed. This is an operation-count result, not a claim that the remaining service quote is instantaneous. The quote service still supplies an advisory live preview; Confirm keeps the current execution contract.

Regression: the native identity integration test first failed with two reads for both sides, then passed with one. The full Bank suite passed: 3025 tests, 487 files, zero skipped. TypeScript passed. No pricing, balances, confirmation, nonce, original retention or execution endpoint changed in this commit.
