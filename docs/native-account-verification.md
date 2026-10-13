# Native account verification — 2026-10-13

## Actual registration

Created Receiz Bank in https://receiz.com/developers/connect after the user explicitly approved the prepared form at action time. Client **rc_QlCRCxBk8zyT4ajGLrIRPIQd** is active/public, token auth `none`, no client secret. Allowed scopes: openid, profile, receiz:wallet.read, receiz:settlement.read, receiz:reserve.read. Registered local callbacks: http://127.0.0.1:4173/auth/receiz/callback and http://127.0.0.1:5173/auth/receiz/callback. No production domain/deployment or financial write scopes were configured.

## Implemented source path

Canonical SDK129 Identity Seal creation/import -> exact enclosing artifact verification -> genuine identity admission -> private device custody -> explicit signed read consent -> native identity continuation -> source/key/application-bound proof-authority exchange -> actual scope introspection -> `client.connect.wallet()`.

The read returns the same `loadWalletSummaryForUser` as Receiz's own wallet. Exact Reserve, Settlement and total are checked and counted once. A different authenticated user or inconsistent/missing rails cannot paint a balance. Updating Receiz is reflected by the next successful shared read. No separate money store or demo reducer participates.

The recovery phrase is wrapped by a non-exportable AES-GCM device key in a private IndexedDB database. Exact encrypted seal bytes restore and are reverified. Grant bearers remain memory-only and expire according to SDK Kai coordinates. Removing the ID aborts held transport and suppresses late results. Public caches never receive private identity, wallet or personal history.

The five fixed native transport paths are identity enrollment/continuation/exchange, granted-scope inspection and wallet read. No cookie or Set-Cookie forwarding, financial mutation route, generic URL proxy or arbitrary query is allowed. API responses are not cached by the PWA. Wasm/zkey SHA-256 values match the SDK manifest: fc72dd17e30f7e9b178eeac08f1deceec8fff5b757481455e465234fbc35e696 and fc5bc8cce4c43dc163e44bc8a1e52c165b72813a0ccbde7fb1735f3cb01debd4.

## One final independent review and rulings

Reviewer inspected immutable 0b49024..842314a, independently reran110 tests, typecheck and build, and reproduced projection/layout failures without user credentials. No Critical findings. All three Important findings were accepted and fixed in one pass:

1. Local identity owner and global account placement were conflated. Personal history now validates a different carried placement against the account established by native continuation and its matching protected wallet read, preserving the local identity owner. Without that binding it remains unavailable; a foreign binding is rejected. The local/global regression failed before the fix and passes after it. An actual SDK-signed portable fixture also passes, with foreign placement rejected.
2. Current `wallet.activityEvents` exports were ignored. The reader now supports exact native activity IDs, carried Kai, exact cents and the legacy ledger representation. Native `wallet_ledger:<row.id>` derivation removes overlapping legacy rows while keeping the exact current event ID. Activity-only and overlapping-representation regressions failed before the fix and pass after it.
3. Large exact balances overflowed mobile screens. Account/grid children now stay within the viewport and complete values wrap without abbreviation or clipping. The review's390px fixture had579px document width; the same actual component/style check now has390px document width, with every balance digit/cents visible. Desktop1280px check also passed. This is isolated layout evidence, not an actual user balance.

The Minor finding is deferred: My history currently renders all carried rows; bounded expansion and timing on a genuine large private history remain pending. There was no second review. The reviewer declined genuine user creation/import/grant/wallet/reload, custody/trading/issuance, and live private additions, which remain outside demonstrated qualification.

## Final checks and material limits

-114 tests in30 files passed, including actual canonical invalid-source rejection, SDK-signed portable state, grant mismatch/introspection mechanics, shared-wallet exact amounts and delayed-result isolation.
- TypeScript and production build passed. The split SDK/offline chunks no longer emit the previous chunk-size warning.
- Actual mobile entrance390×844: no demo balance, no horizontal overflow and no console errors. Old demo local storage is ignored.
- Actual registration created and observed. Genuine human identity creation/import, grant exchange, shared-wallet read and reload have **not** been observed together. Fixtures do not establish live user qualification.
- My history is only the opened user's carried verified history at its seal head. Live private additions and current personal-history synchronization are unfinished.
- Custody intake, native transfers, fractional trading, currency issuance, funding/ownership qualification and atomic financial recovery remain unfinished. Existing native Receiz wallet actions are exposed through user-operated links. No real funds were moved by the agent.

The human must create or import their own ID privately in the local app to supply private signing custody and validate the live shared read. Keep the Identity Seal, recovery phrase and grant credentials out of chat. Browser credential/account creation policy requires this user-operated step; it is not evidence of financial execution merely because the native SDK methods exist.

## Onboarding correction from user review

Create opens a new Receiz ID/wallet; Import opens an existing ID/wallet. The misleading “Use my existing wallet” checkbox was removed. The chosen Create or Open action supplies explicit approval after displaying the exact read-consent statement. This changes no scopes and grants no financial writes.

Final entrance labels approved by the user: **Enter** and **Use existing ID**. Enter creates the first-time native ID; Use existing ID performs local import/open; returning custody opens Account directly.

Latest copy refinement: centered **Create your account** above **Enter**; secondary **Use existing account**. Receiz ID terminology is explained inside the existing-account opening step.

## Later observed user stage and in-app conversion

The user-operated device identity was subsequently restored and its protected shared wallet read succeeded at preview4173, including under the replacement card-enabled client at 17:28:25 local. Creation itself, existing-ID import and live payment were not observed. External wallet action links have been removed; see in-app-payments-verification.md for the new in-app flows and their remaining limits. The earlier three-finding native-reader review was not repeated.
