# One Note flow, exact funding continuity

The user enters an amount. The account supplies Reserve first and Settlement for any remainder; no source selection is needed. Only a mixed allocation shows a breakdown.

| Actual funding | Title | Caption | Redemption basis |
| --- | --- | --- | --- |
| Reserve only | Reserve Note | Proof-backed value | Original USD denomination and accepted backing Phi |
| Settlement only | Settlement Note | Proof-native value | Exact accepted Phi |
| Both | Settlement Reserve Note | Proof-backed Native value | Original Reserve component plus exact Settlement Phi |

The title describes signed funding already admitted by Receiz. It cannot change that funding. Settlement dollars on the image record value at creation; exact Settlement Phi is preserved, and its current valuation may change.

The shared renderer preserves the two existing engravings and adds the third matching masthead and SR serial. Preview artwork is unissued and has no spendable authority. Review is read-only; confirmation reuses its exact quote, then retains the exact signed operation before one consequential request. Unknown outcomes recover that same operation.

Complete composite `fundingParts` travel through authorization, funding, handover, original PNG, debit opening, cancellation, credit and deposit opening. Removing or changing the split invalidates the proof. Both original components retain their units and sources.

## Native proof and API composition

Settlement authorization, allocation, qualified custody, funded image admission, terminal redemption and credit verification use distinct source-bound schemas. The API enforces each rail's own write scope. The protected issuer refuses any opening that differs from the original signed amount or rail. Existing Reserve sources and interrupted attempts remain compatible.

The host composition is `createBankNoteServicesForSource` in `app/lib/wallet/bankNotes/sourceServices.server.ts`. The Note APIs now supply the shared native account/activity writer with exact source retention. When native custody is selected, matching absolute account and funded-wallet source directories are required; no failed native source can fall back to the compatibility writer or install schema at runtime. The host integration contract is [bankeiz-settlement-notes.md](https://github.com/kojibai/receiz/blob/main/docs/integrations/bankeiz-settlement-notes.md).

## Remaining production boundary

The main Note API selector now uses the native source writer and refuses missing or conflicting configuration. Nonzero Settlement still needs its complete admitted value source; it cannot be created from a Reserve valuation or display balance. The isolated tests do not establish production authentication, physical-device qualification or a deployed financial journey. Allocation, consumed terminal custody, capacity, activity and exact outcomes use the same native commit domain.

Connected Wallet compatibility requires the two migrations named in [connected-notes-v129.md](connected-notes-v129.md). This checkpoint changes no package version. Installed SDK, MCP and AI skills remain 129.0.0. Existing real-device and production release prerequisites remain in `offline-notes-release.md`.

## Fully disconnected acceptance target

Create note, qualified handoff, image import, deposit and the receiving balance credit must succeed on two devices with all network requests blocked. This is stronger than creating an image offline or queuing redemption. Initial identity/device enrollment and exclusive funding preparation may occur before disconnection; no online allocation, attestation renewal or credit signature may be required during the tested transaction.

The native integration must expose the existing qualified device-held funding budget for local issuance and return a verified, complete account successor on local deposit. It must bind the original allocation, exact rail and redemption rule, receiver identity and custody, consumed note head, new account head and original idempotency identity in one accepted local transition. The same held value cannot remain spendable in the note or the sender's account. A copied image, restored old device state, repeated deposit, interrupted commit or later replay must never issue a second credit. The receiving user must be able to use the resulting local value before reconnecting. Synchronization must preserve this exact accepted transition and resolve conflicts without rewriting it.

The included `bankNotes/browser.ts` retains the fresh online funding/redemption profile. `preparedBrowser.ts` supplies the separate prepared-resource journey: local issuance, handoff, verified local credit and respend without network requests. The final consumed descendant can later redeem through the native writer against its original exclusive pool; a locally credited terminal cannot also become online credit. These source paths preserve the existing screens and remain subject to the release gates. An optimistic balance increment, queue acknowledgment, client-signed summary or alternate root does not qualify a financial transition.
