# Receiz v129 → Bankeiz: remaining money connections

Audited 19 October 2026 against Bankeiz `e8155ff`, the installed SDK, MCP server
and AI Skills, all **129.0.0**, and the pinned Receiz sources carried by Bankeiz.
This is an implementation/contract audit with local regression checks. It did
not execute a payment, enroll a device, inspect private phone storage, change a
service or establish new production qualification.

## Decision

**Keep working Send and Receive. Finish the existing Receiz connections beneath
the banking experience. No confirmed SDK primitive gap currently requires v130.**

That is not a claim that every journey is already complete. There are specific
Bank composition gaps, Receiz host/source gaps and a real-device custody blocker.
They must not be collapsed into either “upgrade the SDK” or “add a new Bank wallet.”

Receiz remains responsible for identity, balances, exact value rules, payment and
ownership effects, source admission, custody and execution receipts. Bankeiz is
responsible for clear banking presentation, selecting the existing operation,
lossless transport, encrypted retention and understandable recovery. MCP exposes
the same primitives to trusted agents; AI Skills specify their correct use. They
do not create an additional money system or replace financial admission.

## Working foundation — preserve it

| Journey | Existing Receiz connection | Current Bankeiz evidence |
| --- | --- | --- |
| Open an account | Genuine Identity Seal, device signing, proof-authority grant and `connect.wallet()` | Connected. Same Reserve/Settlement source; retained local view and background additions. |
| Send value | `connect.transfer()` plus Receiz Wallet quote, exact original nonce/outcome and public-note route | **User confirmed live payment success.** Reserve first, Settlement remainder; one component shown alone and split amounts only for a composite payment. Do not replace this with the separately prepared native-payment family. |
| Receive value | Existing public username, Bank payment-request link/QR, scan and Wallet recipient resolution | **User identifies this as working.** Receive displays the username, without UUID or `.receiz.id`; amount requests retain the existing URL contract. |
| Payment recovery | Existing Wallet result lookup and encrypted checkpoint | Connected; unknown results retain the original nonce. Failed unissued Notes are cancelled through the native checks before Send/logout; issued/funded/unreadable custody is preserved. |
| Market and asset values | Existing Receiz Market sources, exact carried valuation inputs and local Kai pulse | Connected. Current `/market/shares/quote` and `/market/shares/trade` composition is distinct from the generic backed-asset writer. Its completion evidence must be recorded separately from normal Send. |
| Proof inspection | `artifacts.verifyAndOpen`, canonical v129 verification, carried Groth16/Poseidon and exact original bytes | Connected in Ledger/History/receipt technical depth and downloadable offline verification kit. A thin wallet capsule is labelled separately from a complete verified original. |
| Local public Ledger save | Existing v129 offline sealer and canonical reopen | Completed local Memory Crystal save/open, using already-held records and display context; no Ledger refetch or Crystal service needed for this path. |
| Public discovery and PWA | Public Receiz projections, retained operands and the existing versioned shell | Explorer, public Ledger, live-value projection, cold/warm reopening, unique sharing cards and static public guides are implemented. This is separate from qualifying offline financial custody. |

Sources: [identity composition](../src/receiz/native-identity.ts),
[Wallet sender](../src/receiz/wallet-send.ts),
[Receive](../src/features/account/LivePayments.tsx),
[Market adapter](../src/receiz/market-trade.ts),
[local Ledger verification](verification/2026-10-19-local-ledger-crystal.md),
[receipt provenance](verification/2026-10-19-ledger-causal-history.md).

## What still needs connection

| Priority / result | Present v129 machinery | Exact remaining connection | Owner / version decision |
| --- | --- | --- | --- |
| **P0 · Open existing Note custody** | Encrypted Note state, exact source references, same-ID wrapping-key continuity and compare-and-swap writes | Diagnose the actual affected PWA's `offline-note-checkpoint · OperationError` against its existing key/IV/AAD/ciphertext. Determine the failing binding and recover only through genuine retained sources. The actual phone decryption failure has not been captured or repaired. | Bank storage/diagnostics; **no v130 shown necessary**. Do not reset state, rotate the key, clear site data or declare an unreadable record empty. |
| **P0 · Qualify Note custody on the actual device** | v129 trusted attestation, non-backup credential policy, sequential assertions and irreversible exact-head consumption | The supplied iPhone response reports `fmt:none`, counter `0`, UV yes, backup eligible yes and backed up yes. Missing trusted attestation and positive backup flags prevent this credential qualifying. Correctly transporting the same bytes cannot supply the missing evidence. The browser adapter currently explicitly requests a platform authenticator. | **Device/custody blocker**, not an encoding fix. No qualifying iPhone-only Safari/PWA path has been demonstrated under the current constraints. A proven browser-compatible custody adapter would be needed if the platform credential cannot qualify. An SDK version number alone cannot fix this. |
| **P0 · Complete disconnected Notes** | `createBankPreparedBrowserRuntime`, `preparedBrowser.ts`, `localAccountCredit.ts`, `localCreditJournal.ts`, complete funded sources and the existing account successor | Connect already prepared funding/receiving capacity, local issue → handoff → deposit → credit → spend, exact restart recovery and the same Receiz writer's reconnect reconciliation. Keep outstanding device value unavailable to online spending; adopt the verified successor once. **`BANK_PREPARED_NOTE_CREDIT_ENABLED` is currently `false`.** | Bank + Receiz host qualification using v129. Do not flip the flag until real devices and shared-writer reconciliation pass. Current normal Note creation still requests funding online; normal deposit still requests redemption credit online. |
| **P1 · Full funding origin on every receipt** | Existing native source graphs, card causal appends, generic proof DAGs and canonical original transport; shared Inspector/receipt projection already displays carried history | The user-authorized calculated FIFO view now follows complete same-account originals, separate funding units and exact parent foreign keys. It is explicitly a calculated attribution, separate from an original payment allocation. Exact native source links remain preserved. The original owned-and-received rule now reconstructs all ten historical aggregate-credit cohorts (208 member references); per-member historic amounts are not invented. One captured mixed payment still lacks a carried Settlement credit basis. | Receiz source/output projection + Bank reader. **No confirmed SDK gap.** Never infer historical membership from current inventory, nearby credits or matching amounts. See the [attribution verification](verification/2026-10-19-wallet-fifo-and-public-footer.md). |
| **P1 · Portable full account after local money actions** | v129 complete account-source/owner-archive verification, account proof, replay, encrypted local ledger and proof library | Reopen a complete same-owner source frontier containing the accepted cash, assets and outstanding Note lineage. After local credit, carry the new source into export/sharing and online synchronization. Current `accountProof()` rejects a stronger local custody head rather than publishing an older server view. | Receiz source delivery/reconciliation + Bank adoption. Existing v129 primitives; actual source availability must be verified. Ordinary working Send does not depend on adding this separate full-account family. |
| **P1 · Backed assets with attached originals** | Moment sealing already carries media and long-form text. Plain-definition native backing/ownership/trade/redemption reviews are wired to Receiz. | `CreateAsset` currently refuses funded creation when media, long-form moment content or a linked proof is selected (`BANK_ASSET_MOMENT_SOURCE_REQUIRED`). Bind the already-sealed moment original into the existing Receiz backed-issuance source and its typed receipt, preserving the complete media and exact funding. Qualify delivery of the resulting holding and later redemption. | Bank + Receiz asset-domain contract. **Not complete and not just a UI toggle.** Generic v129 source transport exists; no SDK-level v130 requirement established. The domain must actually admit the content/backing relationship. |
| **P1 · Use acquired originals end to end** | `artifacts.verifyAndOpen`, `ownership.claimBearerAsset`, native holdings and existing execution/recovery | For a supported purchase, preserve the actual payment/seller proceeds and complete delivered original, perform the existing canonical claim when required, retain the sealed successor and make the supported acquired asset usable. A locally held original alone is not a new cash credit. | Compose current Receiz operations; prove the selected asset family live. No new Bank marketplace, ownership ledger or valuation engine. |
| **P2 · Card-funded money journey** | `connect.checkout`, `connect.checkoutSession`, Receiz's embedded card UI and exact session recovery are already connected | Qualify the complete actual card payment → same-account Reserve credit → usable balance → existing Send path. For a purchase shortfall, return to the original quote/review after genuine credit. Never treat checkout completion as asset delivery or settlement. | Existing Receiz payment host + Bank continuation, using v129. This audit did not perform a card payment. |
| **P2 · Named merchant card acceptance** | Current `payments.embeddedCheckout` creates a session for an already admitted Receiz merchant; existing username requests already support receiving Wallet payments | Reuse the existing merchant/payment surface, keeping merchant identity, amount, reference, real proceeds and receipt connected. Add a Bank-facing entry only where it simplifies the existing Receiz journey. | Bank presentation/current Receiz host configuration. A card session by itself does not complete this journey. No duplicate merchant backend. |
| **Expansion · External wire/payout, recurring billing, formal refunds and organizational administration** | Mixed current/native and historical interfaces; see the classification below | Identify the actual current Receiz operation and its source-bearing outcome before adding controls. Bank's Wire option currently has no account-bound instructions, and no complete external withdrawal journey is established here. A return payment is not automatically a formal refund/invoice adjustment. | Receiz service/domain work where absent; then Bank composition. **Cannot truthfully call all these ready-made v129 wiring today.** Existing SDK contracts may suffice once their host exists; a new SDK binding is a candidate for v130 only if the current canonical APIs cannot express it. |

For Notes, these are **three separate tasks**: saved-state readability, real device
qualification and disconnected financial composition. Fixing one does not imply
the other two are fixed. The public device sealer used by ordinary proofs and
Ledger Crystals is also separate from strict spendable Note custody.

Details: [iPhone evidence](iphone-offline-note-registration-v129.md),
[local-credit release boundary](native-offline-credit-qualification.md),
[Note composition](../src/receiz/native-identity.ts),
[prepared-credit selector](../src/receiz/config.ts),
[asset form refusal](../src/features/assets/CreateAsset.tsx),
[native asset contract](../src/receiz/native-asset-protocol.ts),
[account source closures](private-artifact-and-note-source-closures-v129.md).

## SDK, MCP and AI Skills: callable is not necessarily implemented

The installed `RECEIZ_HTTP_OPERATION_SUPPORT` source table contains **93 SDK
methods: 21 `current-http` and 72 `historical-http`**. This counts source contracts,
not production readiness or all canonical/local SDK primitives. The MCP JSON
adapter inventory has a different scope: its documentation identifies 86 bindings
(17 current, 69 historical), plus separate exact-artifact financial adapters.

Relevant current routes include Wallet read/transfer, card checkout creation and
status, named-merchant embedded checkout, supported Twin operations and selected
webhook endpoint operations. Even `current-http` has semantic limits:

- `connect.mintNote` is a disabled legacy route returning
  `wallet_note_receiving_seal_required`; it cannot replace the receiver-bound
  custody path.
- `connect.claimNote` / `payments.embeddedNoteClaim` are legacy token claims, not
  canonical receiver-bound portable custody admission.
- `commerce.oneClickCheckout` creates a card session. When positive Wallet
  funding is proposed it returns `wallet_settlement_execution_required`, applies
  zero Wallet funds and makes no card request. It is not a hidden substitute for
  the working payment execution path.

The SDK explicitly classifies these useful-looking surfaces as historical HTTP:
merchant onboarding/profile/capabilities, customer portals/orders, formal refund
creation, subscription creation/cancellation, tax/shipping quotes, payout
creation/status, generic inventory/fulfillment, tenant roles, audit/compliance
exports, notification and event services, and older media upload/transform routes.
Their default calls fail with `RECEIZ_HISTORICAL_CONNECT_HOST_REQUIRED` before
HTTP. An access token, MCP tool name or new Bank button does not supply the host.
Do not enable legacy transport on the default Receiz origin or silently replace
these semantics with ordinary transfers.

The full MCP library does expose existing canonical financial primitives:
Wallet transfer, exact-source bearer claim, v123 execution/outcome lookup,
v124 source/session/qualification and v125 sender/receiver edge transfers. Its
confirmation and private material-reference rules remain intact. The connected
marketplace profile's allowed actions remain separate from the full distribution;
this audit does not change profiles or execute a financial MCP action.

The v129 AI Skills agree: project already-held truth first, sync verified additions
after the known head, preserve exact public/private boundaries, and separately
prove funding, payment, seller proceeds, bearer delivery, claim, custody and use.
They explicitly distinguish offline file sealing from admitted money movement.

Authoritative installed references:

- `@receiz/sdk/docs/historical-http.md`
- `@receiz/sdk/dist/httpOperationSupport.js` (executable classification table)
- `@receiz/sdk/docs/registered-native-runtime.md`
- `@receiz/sdk/docs/v125-edge-value-transfers.md`
- `@receiz/sdk/docs/app-runtime-commerce-cloud.md`
- `@receiz/mcp-server/README.md` — current financial adapters and webhook contracts
- `@receiz/ai-skills/receiz-commerce-skill/examples/create-no-db-store.md`
- `@receiz/ai-skills/receiz-proof-authority/examples/registered-native-session.md`
- `@receiz/ai-skills/receiz-offline-first/SKILL.md`

## v130 escalation rule

No package upgrade is recommended by this audit. Escalate a **specific missing
contract**, with the current v129 attempt and failure, only after determining that
the existing native source/domain or artifact transport cannot express it.

1. **iPhone custody:** if no available Safari/PWA mechanism can provide the
   existing nonrollback evidence, request a proven compatible custody adapter and
   physical-device evidence. Preserve antirollback. A new version cannot
   manufacture attestation, a non-backup credential or irreversible state.
2. **Funding provenance:** first expose the actual already-recorded native source
   closure through existing exact-artifact transport. A new protocol/binding is
   required only if the native payment primitive does not retain a sufficient
   allocation/closure. That absence is not resolved by displaying more fields.
3. **Funded media or business operations:** qualify the current Receiz domain
   contract first. Add a new typed binding in v130 if needed to expose a new
   source-admitted effect. Keep the effect in Receiz, not a parallel Bank engine.

## Completion order and evidence

1. Preserve working Send/Receive and their exact recovery. Keep the already
   completed Market/PWA/Ledger/receipt work.
2. Deliver the complete payment/account source closure into the existing views.
   This remains first in the user's current implementation order. Removing the
   empty funding panel is complete; universal funding-origin display is not.
3. Finish media-bound backed issuance and the selected asset's acquisition/use
   lifecycle through Receiz; then qualify card-funded continuation and any
   deliberately selected business/institutional extensions.
4. Finish the shared institutional footer across the public copy pages.
5. Resolve the real Note checkpoint diagnostic and compatible device path.
6. Qualify prepared offline issue → handoff → deposit → credit → spend, restart
   and reconnect, with unchanged antirollback and one accepted economic effect.

### Read-only funding-source investigation

On 19 October, the user authorized a one-time Supabase investigation and source
backfill preparation. No database rows or original proof objects were changed.
The current Receiz database contains 88 Wallet transfers and all 88 corresponding
message originals. Neither transfer metadata nor the originals' `walletTransfer`
contains `fundingSources`, `fundingBasis` or `causalLineage`. The exact subject
source, subject append, profile source projection, domain checkpoint source and
domain replay source tables each currently contain zero rows. This describes
those particular storage tables, not the existence of proof objects in other
file or device custody.

The actual card implementation is
`app/lib/game/sportsArenaCardCausalOwnershipProof.ts`: it records its native
`pack_slot_fifo_remainder_v1` or `single_card_settlement_v1` attribution, original
credit/source identifiers and the predecessor causal append. Its supporting
reader is `sportsArenaCardCausalOwnershipProof.server.ts`. That per-card
attribution must not silently become an asserted allocation rule for an older
Wallet transfer whose retained execution only promises `settled_first_then_phi`.

`app/lib/wallet/server.ts` already evaluates Settlement from the source-derived
artifact base plus lawful-action value and the recorded ledger delta. This is
the implementation to reuse. `app/lib/wallet/chartSource.ts` explicitly exports
`current-object-valuation-and-recorded-movements`; it starts the currently held
objects at their seal coordinates. Those chart operands are suitable for their
documented calculated portfolio view, not independent evidence of every past
owner/visibility interval or historical funding allocation.

The next source connection must locate the existing historical enclosing
originals and accepted predecessor/source frontier, preserve the unchanged
transfer original, and carry the derivation into its receipt. An exact origin
attribution cannot be manufactured from today's inventory, a neighboring credit,
or the valuation equation alone. Generic v129 exact-artifact transport exists;
this investigation has not established an SDK version gap or a completed
historical backfill. It also does not label any funds as having no source.

Every completed journey needs its genuine source, accepted result, retained
original, updated same account and recovery from lost responses. Rendering a
success screen, passing a fixture or shipping a package alone is insufficient.

For a seamless experience, reuse the known account, held originals, source head
and deterministic operands. Keep modules lazy, deduplicate pending reads and
append verified changes behind the displayed view. A refresh is for discovering
new accepted state; it must not be a second prerequisite for displaying an
already verified result. No new per-pulse pricing request or Ledger source crawl
belongs in these connections.
