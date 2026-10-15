# Matching Reserve and Settlement Notes

The requested experience uses one note design and one Create note / Deposit note flow. Reserve Notes are funded from Reserve and redeem into Reserve. Settlement Notes must be funded from Settlement and redeem into Settlement. Neither a printed title nor a browser-selected account can change the rail of an admitted note.

## Redemption rule

The owner selected exact Phi redemption for Settlement Notes on October 15,
2026. A Settlement Note locks a fixed `amountPhiMicro` and returns that same
amount to Settlement on redemption. Its current dollar display follows the
canonical deterministic rate; a printed dollar denomination does not promise
a fixed dollar payout. Reserve Notes retain their original dollar denomination
and redeem into Reserve. Transfers, exports and retries preserve the source's
rail and redemption basis.

## Implemented presentation

The shared renderer accepts a typed rail and produces matching RESERVE NOTE / SETTLEMENT NOTE mastheads, PROOF-BACKED VALUE / PROOF-NATIVE VALUE subtitles respectively, exact denomination, four corner amounts and amount-in-words. The print line and RN/SN serial prefix identify the rail. These templates are unissued artwork until the existing native financial workflow admits a note.

The Bank's runtime callback still receives only `(amountUsdCents, noteId, compact)` and defaults to Reserve. No Settlement create option has been enabled in the real money flow. No note source, funding request, signature purpose, transport schema, account mutation or redemption behavior has been changed by the artwork work.

## Required native extension

The existing Receiz host explicitly admits `receiz.bank.reserve-allocation.v1`, derives funding from `settledBalanceUsdCents`, activates qualified Reserve custody and emits `receiz.bank.note-reserve-credit.v1`. Its atomic accounting functions debit and credit funded Reserve. Reusing those proofs with a Settlement label would be incorrect.

Before enabling Settlement Notes:

1. Bind `settlement` into the signed funding authorization, exact verified account predecessor, allocation artifact, qualified consumption chain, complete note source and terminal credit. Preserve legacy Reserve source verification and recovery.
2. Derive available Settlement from verified proof-carried sources and their lawful admission, including exclusive allocation/encumbrance. An observed display balance or a database row alone must never authorize funding. A note allocation must remove the same value from other spending paths.
3. Require one atomic Settlement debit per exact operation and one atomic Settlement credit after irreversible exact-head consumption. The receiver cannot select Reserve for a Settlement source or convert the source by editing a request or the image.
4. Retain exact-Phi redemption for Settlement and original-dollar redemption for Reserve, together with the selected account head and rail, through retries, transfer, image saving and redemption. Recovery must never allocate or credit another rail, abandon an unknown outcome, or recover a different amount.
5. Test real v129 sealing/admission, source mutation and rail substitution rejection, once-only issuance/redemption, concurrent double spending, interrupted outcomes, restoration, older Reserve notes and the complete image round trip. Require the existing independent-verification, conformance and release gates before claiming live Settlement support.

This is an integration contract, not evidence that the Settlement financial extension is implemented or qualified. Existing Reserve financial release prerequisites remain in `offline-notes-release.md`.
