# Same-page PBI and Market review

The existing entrance fingerprint now runs the canonical passkey ceremony without a popup or navigation. An existing passkey recovers its selected global account. Only completed system registration creates a new account. Identity's optional passkey connection stays bound to the open account and uses the existing PBI identity-key enrollment to sign its public profile. Identity Record entry, ordinary Enter, Vault access rules and financial execution are unchanged.

No PBI preparation runs during startup. Local signer preparation and explicit account recovery overlap. Connection reuses the known account, removes the unnecessary most-recent-credential lookup, and reads the exact credential selected by the ceremony for profile signing. The profile's confirmed authorship append retains existing assets and metadata without another profile request.

The temporary canonical session is HttpOnly, Secure, SameSite=Strict and limited to closed ceremony routes. Binding cannot renew its five-minute lifetime. Anonymous challenges go directly to the canonical host to preserve each visitor's existing rate limits. Native source verification remains mandatory when native account storage is selected. The established legacy recovery contract remains explicit; a native source failure cannot downgrade to it.

## Market work removed

Prepare and execution each previously read and validated the same Market checkpoint twice while already holding the operation locks. Each now reads it once and shares that validated checkpoint with the cross-family pending-action guard. That guard still checks all historical pending state, the other operation families and Note custody.

Sell review explicitly omits the unused spendable-wallet/settlement projection. It retains the same current listing, deterministic quote calculation, exact owned shares, live-state and native-asset checks. Buy keeps its balance and pressure checks. Actual submission, execution, nonce matching and recovery are unchanged. These are dependency/read-count reductions; no production millisecond savings are claimed from fixture timings. Connected review remains a connected request; fully offline financial execution is a separate unfinished task.

## Verification

- Bank: typecheck and complete production build passed; 3,055 tests passed across 491 files, zero skipped.
- Service integration: 41 affected tests passed, including real native account history and credential lifecycle originals. Ordinary account-entry freeze: 57 passed, zero skipped. Service typecheck passed with its 8 GB compiler heap.
- Fresh review findings were reproduced as failing tests, corrected once, and included in the passing suite: older owned passkeys, current credential originals, anonymous rate-limit isolation, and the temporary session deadline.
- Isolated Chrome with a virtual authenticator created a passkey at the canonical RP, then authenticated it from Bankeiz's origin. Canonical client-data, RP hash, user verification and signature checks passed. The selected account stayed the same, the URL stayed on Bankeiz, and zero popups opened. Fixture evidence: `/private/tmp/bank-pbi-browser/result.json` and `same-page.png`. No real account, credentials or payments were used.
- Cancellation, wrong account, changed identity, wrong origin, invalid signature and unavailable native source are refused. Errors stay on the existing screen in plain language.

Physical iPhone/Safari behavior and live profile-signing enrollment have not been tested. Browsers need Related Origin Requests support for the shared RP. Unsupported browsers remain on this page and can use their Identity Record. Deploy the service contracts and domain association before the Bank client. The separately approved verifier allowlist update is now live: both exact Bankeiz origins pass, all seven prior origins still pass, and an unrelated origin remains refused. No real account enrollment was used for qualification. The service-side activation and preservation record is maintained with that integration.
