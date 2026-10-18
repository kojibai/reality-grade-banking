# Account opening, original media and installed-app continuity

This change is confined to Bankeiz main. SDK, MCP and AI Skills remain 129.0.0.
No Receiz or Crystal checkout, SQL, live financial transaction or deployment was
changed.

## Entry

A complete, retained account chart returns before optional Ledger enrichment.
A full account source already projected during retention is reused instead of
running its historical calculator twice. Concurrent wallet reads share a single
read; an explicit later refresh still obtains a new result.

Follow-up: a formerly balance-only cache no longer skips account-proof reading
on every reopening. After checking its held carrier and retained original, entry
requests the independently verified complete account source and adopts its
eligible chart before revealing the account. Concurrent entry preparation shares
one attempt. If that source is unavailable, the genuine retained balance and
observations remain accessible without being labeled complete. A local Note
successor never requests an older shared source as its replacement.

Account continuation and proof exchange can overlap. After a validated grant,
the protected wallet read and scope inspection can overlap. An account remains
unpublished until continuation and scope inspection succeed. The exact client,
application and continued account UID bind the prefetched wallet; the normal
wallet parser still rejects another account. Continuation's own wallet is not
used as a substitute for that independent binding check.

Only the SDK's explicit `IDENTITY_NOT_BOUND` response with `writes: 0` permits
one fresh exchange after successful continuation. Replay, permission and transport
errors are not automatically retried. Cancellation and newer local financial
heads retain their existing protections.

Opening motion has no minimum duration or simulated time estimate. Its progress
reflects completed preparation checkpoints and completes in the same React commit
that reveals the prepared identity, wallet and supported history. Reduced-motion
mode retains a static progress display.

The encrypted private activity restore starts beside account preparation. Before
revealing the account, admission waits only for its exact final account UID's
local restore. An identity-instance-scoped cache makes these rows available to
the history hook in its first admitted render; it does not wait for a live
history request. A failed or foreign-account local restore supplies no rows but
does not prevent an otherwise valid account opening. Tests inspect every
published account frame, including a subsequent HTTP503.

## Returning to the account

Focus, visible-document restoration, online recovery, browser back/forward and
the bank surface event refresh the account without hiding its retained view or
displaying an opening state. A burst of wake events shares one pending read.
Hidden documents and non-bank routes do not poll the wallet.
Private history uses the same foreground wake conditions and 60-second cadence,
coalesces overlapping reads, and retains earlier pages when the live head fails.

A complete native account source can revalue its unchanged settlement units at
the published deterministic quote before the network read finishes. While the
account remains visible, a lightweight check publishes at most once per whole
Kai pulse. It does not change financial units, account heads or spending rights.
The existing 60-second network cadence remains unchanged.

Recomputed history is not limited to points witnessed while the application was
open. A complete admitted movement history supplies the held units at each
coordinate, and the unchanged v129 rules value them across all six fitted chart
ranges. A long-outage regression reconstructs unwitnessed intervals, fills each
range across its width and reaches the new evaluation coordinate without making
a network request. The recorded movement count and financial units stay fixed.

Local repricing requires an explicit full-native coverage marker, matching
closing balances and a complete reconciled history. Partial aggregate, legacy,
unknown and old unmarked caches are excluded. Coverage survives encrypted vault
storage; a changed financial head drops it until its source is qualified again.
An unavailable network source keeps the last admitted account visible and marks
synchronization pending instead of replacing the balance or reopening the ID.

Local quote work cannot invalidate a successful note operation or adopt a quote
started before its custody operation. Display-only price differences are allowed
only under the complete native coverage check; financial tuple, account and
other wallet fields must still agree. If a saved note cannot hand off its account
successor, an encrypted same-account quote hold prevents its old units from
resuming valuation after a restart. A genuinely new admitted financial tuple
can reconcile normally. Display quotes never authorize funding.

## Asset chart periods

All, 1D, 1W, 1M, 3M and 1Y reuse the public pricing source. Discovery prepares
the existing shipped and live capitalization inputs beside its catalog read;
a direct object opening can prepare them without first visiting Market or Ledger.
Pending reads of the same endpoint are coalesced with the Market overview.
The parsed public display source is retained separately from private account
storage and restored synchronously after a cold start. Unavailable storage or
transport does not turn an unknown object into a supported valuation model. A supported
sigil's full market item ID, asset UUID and claim pulse must resolve uniquely to
the same row. The contract does not contain an individual artifact digest, so
this association identifies a public display model, not verified ownership.

Each period is computed locally with the existing v129 public valuation law and
its own time bounds, beginning no earlier than the source claim pulse. Period
switching selects an already computed bounded curve. The local Kai clock advances
the headline and all ranges without waiting for another source response. Tests
assert differing ranges and paths, offline advancement and zero added fetches.
Unknown, ambiguous or unsupported source rows keep their supplied untimed chart;
the UI does not invent timestamps or period returns for them.

The follow-up browser check uses the real direct-object component rather than
manually publishing its pricing store from the fixture. All six controls worked
at 390- and 1280-pixel widths. Switching all periods made zero requests. Reloading
with the pricing endpoints blocked showed six controls in the first asset DOM
frame from the retained source. The value label reads “Market Value.” The only
console error was the test fixture's absent favicon; no runtime error was seen.
An object's longer ranges legitimately share its complete available history when
the object is younger than those ranges. The chart never precedes its origin.

## Original media

Some retained public entries pointed to the separate download-sale route. Public
carried material now resolves to its exact artifact endpoint. Discovery and the
public relay retain a compact material locator; the relay allows only fixed
credential-free public endpoints with redirects disabled. The enclosing artifact
and opened payload must still verify with the installed SDK and match the
expected artifact digest.

The existing public seed gained 138 compact locators only where both object ID
and enclosing digest matched. Its pricing and observation time were unchanged.
Older ledger links consult this retained locator index before remote discovery.
The witnessed cached-link flow opened and decoded a real verified image in
2.198 seconds: local seed request 106 ms, artifact relay 371 ms, followed by SDK
verification and decoding. No remote membership request was needed. Unavailable
historical sources and changed-digest originals are not replaced.

The detail order is value/chart, ownership actions, original media, source and
inspection pills, then description and source details. Image opening, zoom and
closing were checked at mobile and desktop sizes.

## Carried text and captions

The reader opens long-form text from its original signed public Moment, rather
than expanding an unrelated caption. The installed SDK verifies the Moment;
its exact post path, anchor, creation coordinate and attached image digest must
match the selected object. The carried text must also match its own SHA-256.
Changing a text character, post coordinate or attached image causes rejection.
Reading a public Moment does not assert ownership or spending authority.

A real public 17,952-character essay is retained as a documented public test
fixture. Mobile verification used its exact signed bytes for the intermittent
record transport while keeping SDK verification and the original image real.
At a 390-pixel viewport the reading paper is 326 pixels wide; the caption and
destination pills remain within the dialog. Text sizing, long-form scrolling,
Escape, focus return and reduced-motion behavior were checked. Closing the text
reader keeps the underlying asset sheet open.

Captions remain escaped plain text in a restrained object-note surface. Explicit
HTTP(S) destinations appear as separate URL pills. Credential-bearing URLs and
other schemes never become active links; duplicate destinations collapse to one.
The complete destination remains available to assistive technology and on hover.

## Public Ledger continuity

Current-source polling is independent of the public discovery count. The Ledger
controls and display share one GET-only in-flight source read. A new original
must pass the existing canonical verifier and full-prefix continuation check
before its exact bytes and latest pointer advance atomically. The previous
original remains available during an outage. Repeated reads of byte-identical
originals reuse their already verified review; matching a digest alone is
insufficient.

Supported canonical action fields can fill missing display rows while retaining
compatible source details. Conflicting hash metadata is not carried into that
row. This does not qualify wallet, graph or proof-source completeness and does
not change their interrupted-page anchors. The newest display cache renders
before optional shipped-seed enrichment. Its immediate coalesced persistence
queue survives component unmount; older tabs cannot rewind its freshness date or
revive withdrawn graph/proof entries through a newer complete anchor.
If source synchronization finishes after navigation, it also persists the
supported derived activity before returning acceptance. A failed display write
reports that limitation while leaving the retained original intact.

Read synchronization does not publish files or grant access to private originals.
The existing digest-bound review, explicit public-sharing consent and read-back
verification still govern uploads. A verified local addition becomes globally
available only through a successful publication to the existing source service.

## Branding and calculator

The bank-building icon uses a restrained navy surface, a soft inset edge and a
light architectural mark. PWA 192/512 and Apple 180 PNGs derive reproducibly from
one font-free SVG, remain opaque and preserve the building within the mask-safe
area. The offline shell retains them. Cards are counted within the Market's
proof-object total.

The illustrative calculator explains cash-equivalent contributions effective at
sealing or later pulses, defaults a new entry to the origin, and keeps the
existing v129 `expectedCashflowPhi` operands and discount calculation. Entered
amounts do not establish asset backing or perform a credit.

## Live verification boundary

An actual owner-held legacy Identity Seal was tested. Its retained snapshot
contained identity/profile information but no wallet timeline. A cold attempt
before the changes reached the account in 11.559 seconds with a current-balance
line, not a complete historical chart. The later retained-source opening reached
its first account frame in 2.027 seconds; its history was still incomplete.
Those observations do not establish a sub-second full-history login guarantee.

During subsequent verification, the production wallet endpoint returned HTTP500
and the account-proof source returned HTTP503. Server logs reported incomplete
wallet-value projection and unavailable replay retention. The existing wallet
completeness guard predates this change. The Crystal preview was ready on its
own branch; the proposed production Crystal hostname did not resolve. No branch
was promoted, merged or reconfigured by these checks.

A complete actual-account historical first frame and reliable cold live entry
remain unverified while those sources are unavailable. Synthetic signed-source
and source-bound cache tests exercise the local settled-frame path separately;
they are not substitutes for that live verification.
