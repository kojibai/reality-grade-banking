# Current Bankeiz capabilities and operating boundaries

Updated for the v1.0.0 release preparation on October 20, 2026. This is the
current capability map. Older dated verification records retain their original
observations; they do not override a newer implemented connection or qualify
a later deployed build.

Bankeiz is the live product built on Receiz. Its open implementation also
includes receiving requirements, independent inspection, matching native
source and integration materials. Product release publication follows the
[versioned qualification record](releases/1.0.0-qualification.md).

## Product connections

| Capability | Implemented connection | Assessment boundary |
| --- | --- | --- |
| Account and Receiz ID | Existing Identity Seal creation/import, device-held authority, retained account projection and same-ID communication access | Complete history/holdings depend on the exact admitted source scope; a current balance does not invent a missing historical timeline. |
| Send and Receive | Existing Receiz Wallet recipient/quote/transfer, profile/contact search, receiving links, exact nonce recovery and automatic Reserve-first funding | Existing working path, reported successful by the user. A new deployment is assessed with its original receipts and exact account bindings. |
| Card deposits | Existing Receiz embedded checkout, exact session retention, return and credit confirmation | Provider payment and accepted Reserve credit are distinct; the final production path needs its actual credited source. |
| Connected Notes | Existing account authorization, exact native funding/claim, automatic Reserve/Settlement/composite composition, encrypted source/intent retention and exact recovery | No offline-custody enrollment for ordinary connected creation. Required Note migrations are installed; exact deployed financial evidence remains part of release qualification. |
| Offline Note receipt | Verify and retain a completed addressed original without receiver custody enrollment, then reconcile once through the existing connected credit path | Locally received value is distinct from confirmed spendable account credit. Before another account spend, reconcile the actual credit. |
| Protected continuous-offline custody | Existing native qualified authority, handover, exact-head consumption and antirollback contract | Genuine protected state, prepared resources and physical-device qualification remain required. Bank's prepared local-credit selector remains disabled pending qualification. |
| My history | Account-bound retained history, All/Sent/Received views, familiar event names, exact transfer values and confirmed Note receipt projection | Only admitted original debit/credit IDs become financial activity. Pending receiving requests and unconfirmed outcomes do not create credit rows. |
| Global/private host Ledger | Receiz commit `35891d794` projects modern Reserve, Settlement and composite Note creation/deposit/refund from the selected native or explicit compatibility source | Source correction is committed; deployed delivery is assessed after operator push/deployment. Native refusal cannot fall through to SQL. |
| Funding detail | Carried source relationships and calculated oldest-available-first FIFO attribution, including multiple proof/funding sources | Calculated pooled attribution is labeled as such. It does not rewrite an individual allocation recorded by the original transfer. |
| Public Market and Explore | Existing public originals, content categories, retained valuation operands, charts, discovery, source inspection and individual asset pages | Valuation, backing, supply, available liquidity and executed price remain distinct. Missing operands never acquire invented history. |
| Asset ownership actions | Standalone Buy ownership/Take cash reuse the existing Receiz Market quote/trade/recovery and account/card-return path | Only supported assets/actions are offered. Actual paid credit and live purchase/sale are assessed separately from synthetic browser fixtures. |
| Public original creation | Seal one exact source and publish it through the owner's canonical Receiz Showcase and existing discovery projection; interrupted delivery resumes the same original | Qualify actual fresh/existing Showcase publication and Market visibility on the deployed build, including media and interrupted delivery. |
| Asset media and proof back | Same mounted original through object flip/full view, carried live-player manifest material, native audio controls and individual sharing art | Playback is retained within the mounted asset. App-wide persistent music/video is follow-up work. Display artwork never substitutes for the original proof. |
| Messages, groups and assistant | Existing Receiz conversations, network profile search, contacts, encrypted local inbox retention, real typing/streaming and entitlement-bound assistant/upgrade flow | Reuses Receiz communication and access. No separate Bank identity or messaging service; selected context and financial approvals retain their own boundaries. |
| Calls | One existing native controller/media lifetime across Messages closure, selected-thread changes and retained public navigation; draggable compact controls and actual SPA restore | Browser/OS/network suspension and process termination are outside the documented in-app lifetime. Synthetic browser checks do not establish a real two-device network call. |
| Public Ledger and Memory Crystal | Existing source inspection and local export/reopen of the already-held Ledger/display context | Local save requires no extra Ledger fetch or Crystal service. Consent-bound publication/disclosure has its separate native contract. |
| Account proof and verification | Existing original-source reader, deliberately shared proof, exact snapshot/live selector and native v4 closure support | Complete private owner archives, actual source availability, disclosure authority and physical custody remain specific to the admitted closure; unsupported components are not invented. |
| Public guides | Retained same-document pages, category/audience explanations, source-backed depth, unique public metadata and responsive shared footer | Pages explain implemented scope; no guide or social preview grants financial authority or certifies an operator. |

## Value and source rules

Reserve retains its admitted funded denomination and backing. Settlement
retains exact Phi and the supported deterministic dollar presentation. One
account displays their supported total, and automatic funding preserves each
component in the original result.

Historical charts use admitted movements, actual supported origins and the
pinned pricing method. Computed valuation samples are distinct from dated
transaction quotes, current spend authority and realized proceeds.

The selected native source remains stronger than a database, service response,
cache or interface label. Original values, participants, exact coordinates and
financial results must bind to the existing admission and execution contracts.
A selected absence/refusal cannot silently activate another financial writer.

## Connected Notes: current state

Online creation on devices without qualified offline custody is implemented
through the distinct connected-account profile. It preserves exact account
authorization, funding, retained private Note custody and once-only claim.
The [connected contract](connected-notes-v129.md) and
[continuity standard](note-continuity-standard.md) define the boundary.

The reviewed [production migrations](verification/2026-10-20-production-note-migrations.md)
were installed after checking actual schema/history. The user subsequently
reported successful creation and deposit on an iPhone. That report is useful
product evidence; it is not an independent inspection of private receipts or
complete qualification of every rail/device/recovery case.

Bank's receipt-backed activity projection is committed in d8a9723. The separate
[Receiz host correction](verification/2026-10-20-note-ledger-host.md) is committed
in `35891d794` and preserves modern source splits, opaque/tie-safe cursors,
conditional responses and bounded proof formatting. Real global delivery
follows deployment of that host correction.

## Separate integration families

The existing working Wallet Send and current Market share-trading path are
distinct from the additional generic prepared native asset/payment families.
The latter retain their own source and execution qualification; they are not
a prerequisite for an ordinary working Wallet transfer.

- **Funded native assets and offers:** exact backing locks, conserved supply,
  signed positions, paired effects and redemption require the actual qualified
  selected custody and available offers. Public original sealing is a separate
  publication action; it does not fabricate cash backing.
- **Physical assets:** intake/definition and carried delivery instructions do
  not themselves prove custodian acceptance, title, transferable rights or a
  completed physical redemption.
- **Wire deposits:** no routing instructions are invented. Actual
  account-bound instructions and operator banking configuration are required.
- **Programmable automatic spending:** no old demonstration rule is promoted
  into a live mandate. Source-bound limits, revocation and qualified execution
  remain a separate financial integration.
- **Consent-bound source publication:** local retention/inspection and public
  disclosure are separate actions. Neither a local export nor a successful
  upload grants new credit, ownership or future-history permission.

See [native assets/account proofs](native-assets-and-account-proofs-v129.md),
[source closures](private-artifact-and-note-source-closures-v129.md) and
[the complete release process](release-process.md) for those exact contracts.

## Follow-up product work

Preferred display currencies and crypto equivalents, email-address payments,
expanded merchant/no-code checkout, Note QR claim/status and app-wide persistent
asset playback remain queued. Existing USD presentation, receiving links and
mounted media do not imply these additional capabilities have shipped.
[The implementation queue](implementation/remaining-work.md) records their
intended scope.

## Evidence discipline

Local source tests, independent review, browser behavior, installed schema,
deployed host and physical-device financial qualification are separate
records. Version pins and a successful build do not substitute for actual
financial outcomes. Preserve originals and exact pending intents throughout
recovery, upgrade and rollback.

No new root issuer, identity service, financial database, messaging backend,
native application or weaker antirollback has been introduced by these
presentation/integration changes.
