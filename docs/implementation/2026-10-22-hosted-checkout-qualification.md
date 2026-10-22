# Hosted checkout qualification — 22 October 2026

Bankeiz's hosted checkout composes the installed Receiz SDK 129.0.0 with the
existing device identity, Wallet, card and Note adapters. Package version stays
2.0.0; this document does not publish a release or qualify live settlement.

## Implemented behavior

- `/pay/<username>/` accepts an optional editable USD amount. Invalid requests
  stop before device entry. Card returns have a separate exact parser.
- An empty supported device creates its identity automatically. Existing
  custody is restored; restoration failure offers retry/import without replacing
  it. Identity Record saving is optional and reuses the original image.
- Card, Balance and Note are explicit choices. The review binds the stable payer
  and receiving account, cents, funding limit, selected Note sources and one
  payment reference before financial execution.
- Reserve, Settlement and Settlement Reserve Notes use the original native
  admission and receiving rules. Received value waits for confirmed credit.
  An increased card shortfall requires renewed approval; another Note can be
  added to that review without repeating confirmed deposits.
- Card completion continues the approved payment. Back preserves a submitted
  or funded attempt. Checking uses its retained original, not another payment.
  An old card return can display its original recorded receipt without consuming
  a newer attempt. An earlier unpaid or expired return also retains its own
  outcome and cannot substitute the newer payment. A URL or completion message
  alone cannot establish payment.
- Receive offers Send and Checkout links. The selected URL feeds sharing, copy,
  QR and NFC. Website buttons and profile Pay open the hosted checkout through
  normal document navigation. Existing Send and separate embedded-card tools
  retain their respective paths.

## Observed automated and browser evidence

The full local suite passed **386 files / 2,312 tests**. Focused tests exercise
URL/return validation, creation and custody races, retained approval, all three
Note adapters, lost responses, credit/journal interruptions, exact card limits,
concurrent approvals, receipts and acceptance tools. Subsequent review fixes,
are recorded below.

## Independent review and recovery corrections

An independent review identified four gaps. Each correction began with a
failing regression; the combined focused verification then passed **129 tests
across 9 files**, with type checking passing:

- **Receiving ownership before approval.** A foreign-addressed Note is refused
  before payment approval is retained, so the user can go Back and select or
  import the correct identity. The preflight reads canonical source and local
  receiving custody without enrolling, claiming or sending the Note.
- **Interrupted handover recovery.** A connected Note's retained receiving
  request and handover are recovered even if interruption preceded receiving
  queue persistence. Recovery never allocates another receiver or replaces the
  original request. Genuine legacy incoming originals use independently opened
  commitments matched to the active encrypted receiving slot.
- **Historical unpaid returns.** The matched checkout identity and outcome
  accompany return inspection. An expired earlier session cannot display or
  operate on a newer checkout for the same merchant.
- **Complete funding consent.** Note review binds and displays selected Note
  value, existing balance contribution, card shortfall, Note surplus and any
  card-minimum remainder. Changed observed funding requires a new approval and
  does not repeat confirmed deposits.

Isolated Chrome exercised the real checkout component, controller and Wallet
validator against synthetic transports. No live card session, Note claim,
identity enrollment or transfer was created:

| Scenario | Observed result |
| --- | --- |
| 320, 390, 768 and 1440 px | No horizontal overflow; keyboard focus reaches the home link; Balance records one payment |
| Reduced motion | Normal layout and interaction with reduced-motion preference |
| Each Note rail | Received status does not send; confirmation continues once; deposit count remains one |
| Card and Back | One retained card session; Back/Resume creates no second session |
| Wrong return session | Refused without a payment or card creation |
| Matching and historical return | Original pending payment or recorded receipt reopened, without duplicate transfer |
| Real browser IndexedDB | Synthetic empty guest custody can be replaced and cleared correctly |
| Cold route | Recipient and amount paint while device entry is deferred |
| Invalid local route | Dedicated error document, without falling through to the account app |
| Production preview | Dedicated emitted checkout document and readable shell with JavaScript execution disabled |

The production-preview capture contained 29 local requests: checkout assets,
shared identity-module dependencies and the favicon. Device entry was replaced
with an unresolved module stub to avoid enrollment. There were **zero payment
API, Market catalog, account-history data or messaging requests**, and no chart
worker. Shared identity helpers are still preloaded by Vite; this is not a claim
that all identity code has been removed from the automatic account-entry path.

## Build and distribution

The following checks passed locally: release alignment, type checking, institution
receiver checks, native source/resources, SDK source rebuild, production build,
exact offline resources and public entry/import boundaries. The source archive
was extracted into a clean temporary directory and rebuilt successfully,
including the hosted HTML entry and all 211 SDK JavaScript outputs.

The static checkout document and its lazy assets participate in the existing
content-hashed offline build. Request parameters, payment responses and private
custody are not added to the public cache. The source archive includes `pay/`.

The available emitted Vercel dispatcher passed its fixture-only check. That
artifact predates hosted checkout: the new checkout rewrites were checked from
source and through local development/production-preview routing. No deployment
or fresh hosted-provider build was performed by this task.

## Remaining host and device qualification

Separately authorize and record a real card payment and SCA return, confirmed
recipient credit, a physical original of each supported Note type, minimum-card
remainder, changing Settlement value, interrupted mobile custody and account
continuity across devices. Verify Safari/PWA and in-app browser returns on the
actual deployment. Synthetic evidence above does not replace these checks.

At a counter, the merchant confirms the incoming payment in their own account or
Ledger. The public link is an editable request, not an immutable sale or invoice.
No card-present terminal, order webhook or automatic fulfillment API is added.
