# Calculated funding attribution and public presentation

## Implemented

- Restored exact source operands from retained Receiz card causal proof appends:
  825 source identifiers and 218 source hashes, without changing the original
  action records, their amounts, coordinates, entry hashes or proof heads.
- Followed an explicit native market credit reference to its existing proof
  object and original artifact digest. Related records reuse the loaded index.
- Calculated FIFO funding context for 87 of 88 historical Wallet transfers in the
  current read capture. The public seed retains its 45,663 existing records and
  adds three actual newer records from the existing public Wallet endpoint.
- The one-time input contains 1,336 curated original wallet rows for seven
  sending accounts. Account IDs, arbitrary metadata, note tokens and provider
  credentials are not copied into the public context. Only the referenced
  source credits and their selected proof operands are retained.
- Incoming transfers and note deposits follow their exact foreign keys to
  already calculated parent transactions where available. Parent transaction
  amounts describe their full funding basis, separately from the selected
  transaction's attributed slice. The capture includes 28 such parent
  transaction references across seven public records.
- Reuse this context for the same exact private transfer and its in-app receipt.
  Private context never enters a shareable receipt URL. Complete SDK-admitted
  same-account wallet rows can also calculate attribution locally.
- Preserve enriched context across thin refreshes under the same wallet
  witness or causal proof head. Inspection version 4 upgrades older device
  caches through the existing seed reader, without clearing custody.

## Attribution calculation

This is an explicitly requested calculated convention, not a newly issued
funding-allocation proof, a balance admission or an execution input.

FIFO credits use Receiz's existing card interval-overlap rule, ordered by
recorded creation time and source ID. Reserve follows exact cents and the
recorded Reserve component. Settlement follows carried Phi micro-units; using
old credited dollar values incorrectly runs short as the deterministic USD
conversion changes. Each rail consumes only its own credits. For a mixed original,
`floor(grossPhi * reserveCents / totalCents)` micro-units correspond to Reserve;
the remainder enters or consumes the separate Settlement queue. Cumulative integer
remainder allocation maps those selected Phi
slices to the exact recorded Settlement cents. Both original credit quotes and
the selected transaction's attributed dollar amounts remain inspectable.

Calculations reject future sources, duplicate entries, foreign account rows,
uncovered intervals, changed component amounts and disconnected parent graphs.
Positive native Phi must be covered; historical cents cannot replace an uncovered
Phi interval. Full fractional-second timestamp precision is retained, and linked
parent transactions use their own operands rather than inheriting the child's split.
No current holdings are projected backwards to invent original membership.
No new per-row requests, source polling or valuation clock is introduced.

The reusable local seeding tool performs no fetch. Source capture SHA-256:
`e8be9d8d1995ededb7449e21361c05243bc18936692436d1d74274b808299c48`.
The earlier exact native card-source capture SHA-256:
`327b81ccc39d816dd5fc3298d4ab2543fab01e935c2d923555445b205e169870`.
Those operator input files stay outside the repository.

## Historical proof cohorts

The original v1 profile backfill counted both owned public originals and exact
received originals. Replaying that original rule recovered all ten recorded
cohorts: 208 member references, including the largest 174-original cohort.
Received references join on slug, uppercase code, pulse and anchor. Owned
originals take precedence when both sources reference the same original.
Creation and first-received times must precede the original computation.
Current ownership alone is not used to infer historical membership.

The one-time replay is display reconstruction, labelled `reconstructed-membership`.
It does not manufacture a historical allocation proof or a dollar slice for each
member: v1 also used then-current authorship, follower and engagement inputs that
were not individually frozen in the aggregate credit. FIFO remains at the source
credit level. Each member links to its exact original public verifier. Fourteen
legacy two-segment original locators carry no pulse; they keep their recorded
creation date without deriving an invented pulse from upload time.

The existing compressed Ledger seed retains only the three cohorts referenced
by these transactions (192 member references), shared across 49 records
through `detailContexts`. Members render only when expanded, in batches of 30.
Per-row receipt URLs omit this large optional context; same-document receipts and
local Ledger archives keep the full record. This adds no runtime source request,
no balance mutation, and no new valuation or verification pass.

Replay input SHA-256:
`862d983fc4aed3cd1099ac7e71eb03babe96bb9e4c86c81d9386838766d36d6e`.

One mixed transfer has a recorded Reserve/Settlement split but no carried
Settlement-native credit basis in the captured rows. Its exact 31/69-cent split is
retained without borrowing Reserve origins to manufacture Settlement attribution.
Calculated credit attribution covers 87 captured transfers. Historical membership
is recovered for all ten aggregate seeds, while per-member historical amounts
and universal cryptographic genesis closure are not newly asserted. No v130
capability gap has been established, and no antirollback, authority or custody
check was weakened.

## Public Ledger and footer

Public amounts expand their rows with a visible chevron. Supported asset values
show the same directional percentage treatment and chart projector as Market.
Immutable individual-copy models are parsed once and reused. Fixed cash amounts
do not acquire a fabricated market return. Full receipt inspection is deferred
until opened; same-document navigation retains its original context by reference.

One semantic footer is shared by Learn, public guides, legal notices, schemas,
Explorer, Ledger, verification and conformance. Navigation is grouped into Bank,
Understand, and Standards & technology, followed by privacy and source notices.
Older footer styles were removed. Minifying the existing public navigation
script keeps combined compressed Learn CSS/JS below the existing 12,000-byte
budget; no budget or verification assertion was relaxed.

## One payment, two source records

Receiz's delegated transfer route appends `wallet.transfer.connect` after the
Wallet transfer succeeds. The action records execution; `chat_transfer` records
the movement. These are distinct originals for the same payment, not evidence
of two debits.

Ledger presents the movement as **Value transfer**, with **Delegated wallet
transfer** nested beneath as **Same payment · execution record**. The execution
amount appears only inside inspection, labelled **Referenced transfer amount**.
Both the public and account views, and the same-document receipt, use this
presentation. The archive still retains every original row, raw kind, amount,
coordinate and proof field. Counts of payment activity use the grouped view;
source-record counts retain both originals.

Pairing requires the exact transfer foreign key, the same projection authority,
and agreeing dollar amounts and native Phi where both are carried. A public
Wallet alias can reuse its already-bound native transfer FK. Ambiguous movement
references or contradictory amounts stay separate. Times, names, matching amounts
alone and adjacent list positions cannot establish a link. The existing source
index supplies connected inspection; no per-payment fetch is introduced.

## Verification

Focused tests cover integer FIFO, live-conversion units, prior spending, exact
transfer links, private receipt boundaries, ancestry validation, real carried
sources, cache upgrades, shared charts and amount-button expansion. Full suite,
production build and mobile browser evidence are recorded with the commit.

- `npx vitest run --maxWorkers=1`: 244 files, 1,427 tests passed. Serial execution
  avoids local CPU stalls observed during the parallel run; no assertion or timeout
  was relaxed. The focused review also rechecked all three corrected edge cases.
- `npm run build`: production compilation and the existing offline, licensing,
  corresponding-source, conformance and public-page checks.
- Compared the previous and current compressed seed: all 45,663 prior records
  retain their identities, existing money operand values, coordinates and evidence
  exactly. Exact foreign-key-bound native funding components are added where absent.
- Browser: actual October 19 $1 payment displays the named originating proof,
  the same calculated funding context on its receipt, and no mobile overflow
  at 390 pixels. The shared footer was checked at the same width.

### Follow-up validation

- Mobile footer hotfix committed separately as `46ae8a4`. The scoper rejects
  selectorless rules instead of promoting them to `html.learn-surface`. The
  440-pixel Learn preview retains a 440-pixel scroll width, block root layout,
  and no root-wide text decoration; existing nonempty layout rules are unchanged.
- Full follow-up suite: 246 files / 1,441 tests pass. Two subsequently added
  native-alias and linked-receipt regressions also pass (11 tests across their
  two focused files). TypeScript and the production build pass, including all
  existing offline-shell, public metadata, licensing and source archive checks.
- Independent read-only review rechecked the cohort cutoff on both binding
  paths and the payment presentation; no blocking findings remained.
- Compared all 45,666 records against the preceding commit: no changed original
  identity, money operand, coordinate, evidence or pre-existing source detail.
- Browser: a clearly labelled synthetic linked-payment fixture at 390 pixels
  has no horizontal overflow, displays one primary amount and keeps the exact
  execution record lazy and independently inspectable. No payment was executed
  during this check.
