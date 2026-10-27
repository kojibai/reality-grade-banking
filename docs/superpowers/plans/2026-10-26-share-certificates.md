# Bankeiz owner-only share certificates

User-approved contract: only the issuing owner deposits the certificate. Anyone buys shares through its public Bankeiz link or QR. The file is safe to show, print and share. Public purchases move shares from that certificate to the buyer and pay the certificate owner through the existing atomic purchase writer.

## Primitive and authority binding
Certificate, ownership and Settlement remain in the existing market_share_notes, market_export_share_note, market_import_share_note, market_purchase_share_note_with_wallet and market_sell_share_note_to_liquidity. Canonical whole-artifact read-only verification precedes PNG payload projection; a generic document is not admitted as a native custody Source. The authenticated existing owner is required at both API and SQL deposit boundaries. No new issuer, identity, registry or bearer authority is introduced.

Existing note metadata retains exact accepted import receipts for every nonce. The existing Market closure journal supplies refusal fences below the existing writers. Export/import and closure share an owner/nonce transaction lock. Owner top-up moves exactly its already-recorded purchase from position to certificate in one transaction. Public URLs and local display observations grant no financial authority.

Account entry is unchanged. New code loads on explicit certificate/public-link actions. The encrypted existing operation store and exact blob archive retain attempts and originals; no database-version change or new entry prerequisite. Financial retries keep their original nonce. A confirmed insufficient-funds closure allows funding; absence alone never clears a pending request. Funding return retains the certificate token and original full purchase budget.

## Progress
- [x] Reuse cookie financial handlers through explicit sessions and bounded authenticated Connect adapters.
- [x] Add exact owner-only deposits, receipts, refusal fences, and atomic owner purchase-to-certificate transfer.
- [x] Add custom Bankeiz certificate artwork, QR and owner-only deposit caption.
- [x] Add partial export/deposit, owner listing, public purchase/sale, updated download, copy/QR and live chart/history.
- [x] Add /shares/<token>/ and preserve existing account/funding flow.
- [x] Review financial recovery, quantity conservation, pending-target binding and canonical verification. Reviewer Important findings have targeted regression checks.
- [x] Finish the locked production build, law/governance gates and mobile/desktop certificate evidence.
- [x] Commit only owned paths on both main checkouts.

## Evidence
Real Groth16-sealed certificate opens through the canonical read-only reader; altered payload fails. Disposable PostgreSQL tests cover non-owner rejection, partial/full/earlier-nonce retries, exact large costs, owner top-up rollback/idempotence, and cancellation fences. Account entry freeze passes 57 tests. Full Receiz release freeze is outside this scoped feature verification.

## Final verification
Both live migrations are applied as 20261027044345 and 20261027045224. Owner deposits and closure functions remain service-role only. Disposable PostgreSQL tests preserve exact partial/full quantities, cost splits, retries and cancellation races. The real Groth16 certificate test verifies the enclosing artifact and rejects tampering. Bankeiz passed its full 3,733-test suite, followed by focused tests for the final owner actions and navigation refinements. The exact-lock production build passes, including the existing shared public runtime budget. Receiz scoped TypeScript, certificate tests, account-entry freeze (57 tests), primitive/visual/repo-only law gates and all three governance controls pass. The full Receiz TypeScript check exceeded the default Node heap; scoped verification completed. The broader value-loop suite retains two unchanged legacy copy mismatches outside this feature; no assertions or unrelated visible copy are relaxed. Browser evidence confirms phone width 390 and desktop width 1280 without horizontal overflow; the example preview moves no real funds.
