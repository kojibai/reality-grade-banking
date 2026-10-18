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

The runtime callback receives `(amountUsdCents, noteId, compact, rail)`. The Create note panel's **From** field selects Reserve or Settlement; the same choice drives the preview and exported image. A retained attempt keeps its exact rail and source through restart. Deposit derives its account from the admitted source and displays exact Phi for Settlement.

## Native proof and API composition

Settlement authorization, allocation, qualified custody, funded image admission, terminal redemption and credit verification use distinct source-bound schemas. The API enforces each rail's own write scope. The protected issuer refuses any opening that differs from the original signed amount or rail. Existing Reserve sources and interrupted attempts remain compatible.

The host composition is `createBankNoteServicesForSource` in `app/lib/wallet/bankNotes/sourceServices.server.ts`. The Note APIs now supply the shared native account/activity writer with exact source retention. Matching absolute account and funded-wallet source directories are required; no database fallback or automatic installation is selected. The host integration contract is [bankeiz-settlement-notes.md](https://github.com/kojibai/receiz/blob/main/docs/integrations/bankeiz-settlement-notes.md).

## Remaining production boundary

The main Note API selector now uses the native source writer and refuses missing or conflicting configuration. Nonzero Settlement still needs its complete admitted value source; it cannot be created from a Reserve valuation or display balance. The isolated tests do not establish production authentication, physical-device qualification or a deployed financial journey. Allocation, consumed terminal custody, capacity, activity and exact outcomes use the same native commit domain.

This checkpoint includes no new database migration or package version change. Installed SDK, MCP and AI skills remain 129.0.0. Existing real-device and production release prerequisites remain in `offline-notes-release.md`.

## Fully disconnected acceptance target

Create note, qualified handoff, image import, deposit and the receiving balance credit must succeed on two devices with all network requests blocked. This is stronger than creating an image offline or queuing redemption. Initial identity/device enrollment and exclusive funding preparation may occur before disconnection; no online allocation, attestation renewal or credit signature may be required during the tested transaction.

The native integration must expose the existing qualified device-held funding budget for local issuance and return a verified, complete account successor on local deposit. It must bind the original allocation, exact rail and redemption rule, receiver identity and custody, consumed note head, new account head and original idempotency identity in one accepted local transition. The same held value cannot remain spendable in the note or the sender's account. A copied image, restored old device state, repeated deposit, interrupted commit or later replay must never issue a second credit. The receiving user must be able to use the resulting local value before reconnecting. Synchronization must preserve this exact accepted transition and resolve conflicts without rewriting it.

The included `bankNotes/browser.ts` retains the fresh online funding/redemption profile. `preparedBrowser.ts` supplies the separate prepared-resource journey: local issuance, handoff, verified local credit and respend without network requests. The final consumed descendant can later redeem through the native writer against its original exclusive pool; a locally credited terminal cannot also become online credit. These source paths preserve the existing screens and remain subject to the release gates. An optimistic balance increment, queue acknowledgment, client-signed summary or alternate root does not qualify a financial transition.
