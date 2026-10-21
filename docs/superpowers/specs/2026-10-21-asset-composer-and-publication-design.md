# Asset composer and public delivery

**Status: Proposed addition to the approved automatic-backing work. Not implemented.**

## Outcome

One Create an asset experience prepares a complete public original in Bank's
visual language, using Receiz's existing composer/source machinery. A song,
book, image, video, document or text-only object should have the appropriate
fields and presentation. The creator chooses the work and its content; source
construction, exact-byte custody and profile/Market delivery happen underneath.

## What is missing today

Bank's `asset-moment.ts` embeds up to eight files and 6 MiB of bytes as base64
inside one JSON payload. `native-identity.createAsset` additionally bounds that
payload at 10 MiB. The first file doubles as primary media; there is no independent
cover choice. The UI exposes a compact moment form, and publication currently
loses much of its music/book metadata. Raising those constants would increase
memory use without providing large-file transport or correct public metadata.

The Receiz import projection also assumes file zero, limits imported asset
resource indexes to 0–7, and defaults covers/distribution metadata to null.
Those source readers must evolve with the composer; UI fields alone cannot
make the resulting public object correct.

## Form and source roles

- Lead with Create an asset, Title and Description. Use Moment for a text-only
  moment where that is the actual content, rather than naming every work a moment.
- Keep primary media distinct from an optional cover and attached files. Selecting
  an image as artwork does not make it an audio track or an attached document.
  Show the selected cover clearly and let the creator change it or its crop.
- Infer a useful media form from the selected primary file; allow a supported
  type to be selected explicitly. Preserve real file type and exact bytes.
- Music exposes the existing creator/release/genre/credits/distribution fields;
  books expose author/subtitle/language/edition/publisher/ISBN and book cover;
  video exposes poster/credits; images and documents retain their appropriate
  previews and fields. Optional long form remains separate from EPUB/PDF content.
- Attachments form an ordered list with name, role and optional description,
  multiple selection, removal and clear primary/cover indicators. Reuse the
  canonical attachment/source commitments rather than another media store.
- Keep code/supply and proof details discoverable beneath the main content
  controls. Preserve the current financial definition rules until the backing
  source-link extension below is verified.

## Large files and recoverable custody

Extract a headless preparation interface from Receiz's existing profile composer,
local composer anchor, source outbox and media sealing helpers. Bank keeps its
own components and styles; it does not import the Receiz profile page tree.
Keep original bytes in existing File/Blob custody, hash incrementally, and seal
compact descriptors plus canonical commitments. Do not base64-expand every
attachment into the authored JSON.

Use existing complete-source block transport, stored-block reuse and final
closure: 1 MiB blocks in batches of at most 16. Compose the required authenticated
source/attachment transport through the existing Connect boundary; do not bypass
it with a caller-selected upload origin. Verify complete source closure before
reporting public delivery. Interrupted upload resumes the same source and blocks.

Receiz's configured composer envelope is 200 proof attachments / 10 GiB aggregate,
a 10 GiB primary upload setting, 12 MiB cover and 100,000 text characters. Its
streaming media sealer currently caps individual files at 500 MiB, and import/
closure paths have additional budgets. These constants are not an end-to-end
capacity qualification. The implementation must honor the narrowest actual
path, show that effective limit before processing, and qualify larger capacities
through cold reopening, retry, playback and download. No unlimited-file claim or
blanket memory-limit increase is part of this design. Existing v1 moments remain
readable with their exact historical contract.

## Profile and Market publication

Reuse `createConnectedAssetPublicationRuntime`, which already composes canonical
source admission, placement, Showcase append and publication. Its accepted
publication path already updates public profile discovery and Market indexes;
do not create a second listing API.

Expose the existing verified local Original and Showcase head through a local
admission result/callback. Adopt the same stable object in the owner's current
profile/Showcase and local Market collection immediately, including artwork,
media kind, title, metadata and proof coordinates. Retain local admitted state
through navigation. Display delivery status separately; local admission is not
an invented public acknowledgment.

After the existing public publication succeeds, reconcile that object against
the accepted discovery source. Replace Bank's 60-second catalog-membership and
profile-refresh waits with publication-aware adoption/invalidation. A stale read
cannot remove the just-admitted object or duplicate it. Retry replays the same
source and placement, without asking the creator to post again.

## Backed content and public financial scope

The approved automatic-backing contract creates a plain native financial asset
and position proof. Its current definition forbids a non-null linked proof.
It does not publish a rich authored work automatically.

Extend that existing source-link contract to bind funding to the selected
canonical authored source. Verify its identity, exact source digest and ownership
through the existing source admission path. Do not merely call unbacked creation
after funding and present that as the same financial asset.

Reuse the existing native holding-certificate issuer/verifier for a closed public
projection of the same asset ID, issuance/current source, supply, backing,
status and explicit as-of coordinate. Private execution receipts contain account
balances and must not be published. Existing private position certificates also
carry account/key and wallet/authorization hashes; if a public variant is needed,
remove those fields in the signed payload itself rather than hiding them in UI.
This is a public projection beneath the existing financial authority.

Prepare and retain the authored source before funding. Resolve the original
financial operation before continuing publication. A public package binds that
exact authored source and public position certificate; retries retain the same
package and native asset ID. Publication failure cannot undo an accepted debit,
charge again or mint another financial asset.

Public projections must carry the native asset identity and accepted execution
source. Its actions use the existing native ownership/offer/redemption paths,
with their real ownership and liquidity requirements. Do not route its profile
listing ID into generic profile-share issuance or count the same backing twice.
An available public valuation does not supply a funded offer.

## Implementation and acceptance boundaries

Bank changes cover the draft/form, typed previews, authenticated transport,
custody/recovery, public URL validation and retained profile/Market projections.
Receiz changes cover the headless canonical composer interface, typed imported
source schema/projection/resource indexes, local admission handoff and backed
source/public-position contracts. Native SDK source changes must use the
repository's source/resource rebuild workflow; no silent patch to a pinned
generated runtime is permitted.

Accept only after image collections, music plus artwork, EPUB/PDF plus cover,
video plus poster, text-only and mixed attachments preserve their exact roles,
metadata, bytes and proof through publish, cold open, download and retry. Qualify
large-file memory/transfer behavior and effective limits on the supported browser
path. Verify immediate retained profile and Market appearance, one public object,
native backed-asset routing, no private-balance disclosure, and no second financial
execution after response loss. Keep the existing simple creation and playback
paths working throughout the upgrade.
