# Inline account PBI correction

User-directed behavior, October24: pressing the existing fingerprint invokes account creation or recovery on the Bankeiz screen, through the system authenticator. No popup, blank tab or navigation to Receiz. PBI remains optional; Enter and Identity Record entry are preserved.

## Required flow

1. Use existing native passkey challenge, user verification, registration fallback and account-selection primitives. Explicitly associate Bankeiz with the canonical RP through WebAuthn Related Origin Requests. Preserve exact challenge, origin, RP hash, credential ownership and replay checks. Unrelated origins stay refused.
2. Host only presentation and browser credential invocation in Bankeiz. Anonymous challenge creation reaches the canonical host directly through an exact-origin CORS route so each visitor keeps the existing anti-abuse limits. Use a narrow same-origin transport for session-bearing operations; the temporary canonical session remains HttpOnly, bounded and inaccessible to scripts. Do not proxy arbitrary paths or bodies or add startup requests.
3. Create the local device identity concurrently where independent. Bind it only after successful native PBI to the exact selected account. Preserve the actual accepted binding proof; an HTTP success or bare account UID cannot replace that proof. Qualify both supported source-storage modes without fabricating native history.
4. Native PBI failures, cancellation, absent domain association and unavailable binding sources leave account/Identity Record custody unchanged and show plain language. No silent ordinary-account fallback.
5. Reuse the same inline transport for the optional Identity passkey connection. Connection must remain bound to the active identity and cannot choose another account.

## Execution and verification

Inspect the exact live failure/configuration and write reproducing tests before implementation. Separate service and Bank changes on main; user pushes. Test source admission, signed binding, RP/origin boundaries, cancellation, no-popup behavior, account selection/new registration, wrong-account/session races, temporary-cookie boundaries and unchanged ordinary entry. Use virtual authenticators/synthetic signed originals; no real enrollment or funds. Run account-entry freeze, affected tests, typechecks, complete Bank suite/build and one fresh whole-change review. Commit only after passing checks.

The same-screen request authorizes this integration correction. It does not authorize weakening account proof, silently granting extra access, production configuration changes, migrations or deployment.

## Recovery ruling, after primitive inspection

The established PBI recovery primitive proves the canonical account, then binds the local Receiz key; `docs/pbi-recovery-receiz-id-binding.md` explicitly distinguishes that from native historical enrollment evidence. The current Bank adapter wrongly requires a native history source even when the canonical account runtime is using its existing legacy binding implementation. Reuse that established legacy recovery path only when native account storage is not selected. Require its exact successful signed binding, recovered account match, and subsequent fresh key-based canonical account/Wallet admission before durable Bank custody. Keep the accepted binding original and strict verifier mandatory whenever native account storage is selected; errors in that selected runtime cannot fall back. Never invent a native predecessor, source receipt or history for the legacy branch.

Use the canonical `receiz.com` RP through Related Origin Requests. Existing passkeys select the same global account; only a completed explicit system registration creates an account. Account connection authenticates the already open account through its signed switch, reuses an existing credential when available, and enrolls one only when absent. Profile signing composes the existing identity-key challenge, SDK local assertion verification, and identity-key PBI enrollment/public authorship publication. A passkey registration alone is not reported as profile PBI authorship.

The Bank transport carries only the existing canonical session in a temporary HttpOnly, Secure, SameSite=Strict cookie limited to ceremony routes. It adds no session issuer or token. The canonical JWT issuance time additionally bounds use to five minutes; Receiz continues signature, account, revocation, challenge and replay verification. Ordinary entry/import, Vault rules, financial execution and first paint stay unchanged.

## Review corrections and release dependency

Existing passkeys use discoverable account selection, followed by an exact active-account check during connection. No most-recent-credential shortcut can exclude a passkey held on another device. Current native credential lifecycle originals are admissible; a later accepted use must not be mistaken for a missing registration. Profile signing selects the exact credential returned by that ceremony. Binding cannot extend the temporary session deadline.

Live read-only checks confirmed that the profile-signing verifier also needs Bankeiz's exact production origins in its existing allowlist. This is deployment configuration, separate from SDK behavior and the code commits. No production configuration change is implied by the implementation plan.
