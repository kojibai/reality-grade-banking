# Ledger causal evidence and transfer performance

The expanded Ledger record and the standalone receipt now use the same local
causal projection. A native card's opening value and seal coordinate, recorded
funding slices, acquisition, ownership appends and custody moments are preserved
separately. The transfer-versus-current comparison uses integer-cent arithmetic;
its percentage and direction do not modify a receipt or constitute spendable funds.

## Source and verification boundaries

- Native card causal panels and complete `causalOwnershipProofs` appends preserve
  their exact source IDs, amounts, allocation rules and predecessor hashes.
- Generic `receiz.proof-history.v1` graphs retain their recorded parent links,
  public ownership transitions and exact KKS coordinates. Missing parents, cycles,
  conflicting identities and future states are rejected or excluded.
- An original already opened successfully through the shared canonical reader
  contributes its history without another read, request or verification pass.
  Its artifact digest must match the selected record. Display-only JSON never
  gains canonical or financial admission by being shown in a timeline.
- The build-time local seed enrichment retains all 45,663 existing records and
  adds native causal context to 104 records. All carried individual card models
  expose their bound opening-value origin. The compressed seed grows by about
  45 KB and remains beneath the existing 32 MiB decoded-size bound.
- Existing normal wallet transaction projections carry Reserve/Settlement
  components, but not a complete origin allocation for each payment. The UI
  states this boundary. It does not assign current inventory, neighboring
  credits, matching amounts, actor IDs or a newly invented FIFO policy to an
  earlier send. Extending that coverage requires the native transaction's
  carried funding-source closure; this patch does not claim it exists in a thin
  wallet feed. The display now omits an empty funding section instead of
  presenting the balance split as a funding origin or saying funds have no
  source. Already-carried history remains visible, and a subsequently opened,
  digest-bound original fills the same view through its existing subscription.
  Acquisition-only history is labelled causal history. Coverage boundaries
  remain in the exported inspection data; hiding an empty section does not
  establish a complete allocation.
- In-app receipts retain selected private context by reference for the current
  navigation only. Copied receipt URLs continue to omit private details. Public
  context beyond the existing URL-size limit is explicitly marked omitted;
  full selected-record JSON remains available in the inspector.

## Performance and checks

History parsing is memoized by source identity. Already-open JSON payloads are
decoded once. Deep timelines render only when expanded and progressively reveal
the remaining carried steps. The receipt's pulse subscription is isolated from
its static history, and links/JSON exports are memoized against stable operands.
No provenance display starts IO or executes a transaction.

The public Ledger's source-coverage counter counts the four feeds represented
in retained records (including a successfully read empty feed). Latest-page
pagination and refresh completeness remain separate and still control earlier
history reads. A partial head refresh no longer makes a retained feed disappear
from this count. The count is not hardcoded: an unavailable feed with no retained
rows remains uncounted. The header also links to the existing public Explorer.
At 390 px, all four navigation links fit without horizontal overflow; the live
Ledger showed 47,318 records and 4/4 represented sources without console errors.

Single-component funding displays one amount; Reserve and Settlement labels
appear together only for an actual composite payment. Source-event labels and
the underlying technical evidence remain exact.

Browser verification at 390 × 844 confirmed the $33.52 native transfer fixture,
locally advancing live value, return percentage and seven carried purchase,
allocation, ownership and custody moments on the standalone receipt. No console
warnings or errors were observed. The source boundary remains visible.
