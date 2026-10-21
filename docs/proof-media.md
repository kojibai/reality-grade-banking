# Original media view

Proof objects, deposited assets and Ledger inspection share the same restrained
media surface. Opening is deliberate. For sealed-original inspection, the unchanged, included v129 canonical
read verifier opens the complete original, and its artifact digest must match the selected
source before any verified payload is presented. Public display roles are distinguished below. No media preview grants ownership,
financial value, admission, or permission to publish.

Held originals open locally. Public material opens at its exact immutable public
CORS URL; other public originals use the existing bounded original relay.
Both preserve fixed public URL contracts, omitted credentials, cancellation and
16 MiB media reading budget. PNG originals have a separate 32 MiB budget,
matching Bank's existing per-source custody capacity. Streamed bytes must have
the PNG signature; the canonically verified payload must also be PNG. The
canonical verifier, pinned roots, non-PNG, JSON and archive limits are unchanged.
Large PNGs are omitted from the existing 16 MiB media cache. Proof inspection
and its downloaded HTML/Node tools use the same PNG budget while retaining
their existing 24 MiB boundary for other original formats. These are local
resource limits, not protocol validity or financial-admission rules.
A held asset definition can resolve its exact
`linkedProofDigest` against the same identity's held originals; that referenced
original is independently reopened. A URL or arbitrary attachment metadata never
substitutes for carried media. No account/source API or SDK schema changes.

Older image listings can separate a public image from a separately sold sealed
Original download. When discovery already carries that public image, Market and
the standalone page display, enlarge and zoom it directly. This path neither
starts the download-sale endpoint nor reads another listing or runs a verifier.
It is labeled **Public image** and does not publish a verified-original report,
payload digest or free sealed-original download. Self-contained public material
continues through canonical verification as before. Receipt artwork is not
substituted for a public image in this path.

When a visitor opens an inline object or standalone original, its public essay
prepares alongside the media, without blocking the media view. The full-text control reads its existing canonical receipt once and
requires the selected post coordinate, bound original digest and text hash to
verify. Reading does not require purchasing a separate image download. A source
HTTP 402 during an explicitly requested sealed-original inspection is described
as a separate creator download, rather than invalid proof or an unavailable
service. It never triggers a purchase automatically. The verified public reading is retained in a bounded, 24-entry memory cache keyed by the exact post coordinate and original digest. A pending read is reused on tap; changing the selected post cancels and discards stale work. No feed-wide essay prefetch or polling is added.

Images have a full view with zoom and native touch scrolling. Verified audio and video
use native controls; expansion preserves playback position. Public videos use
their existing Receiz playback URL directly. An explicitly ungated legacy video
can use its already-carried native media source. The browser streams ranges,
without first downloading a 29–403 MB movie through the 16 MiB sealed-original
reader. Playback starts only by user action; a profile's deliberate video-open
action may request playback, subject to browser policy. Native fullscreen uses
the same video element. This public playback is not labeled Original verified.

PDFs render page images in a dedicated, lazily loaded Mozilla PDF.js reader,
with page navigation, zoom and retained position. Nearby profile document cards
render the first page once, retain a lightweight image, and release their reader.
One shared worker and four recent unused public documents bound retained work;
an actively viewed document remains available. Fonts, character maps and image
decoders are served locally and requested only as required. No PDF scripting,
XFA forms or embedded HTML is mounted in the page.

The `GET /api/bank/public-document?source=<public-Receiz-URL>&asset=<asset-id>`
transport relays only fixed public PDF roles. It preserves single byte ranges,
streams with backpressure, omits cookies and bearer credentials, refuses
redirects/non-PDF responses, and retains upstream paid/private/missing refusals.
It buffers no complete document and enforces a 128 MiB response boundary.
Profile previews exclude the separate Original-download endpoint, preserving
paid gates and download allowances; an already-public, source-bound PDF material
package may be displayed instead.
Public documents do not acquire a verified-original badge through this path;
canonical proof inspection remains separate and unchanged. If an existing
public PDF preview is unavailable, the original canonical reader remains the
fallback. Verified generic payloads bearing the PDF marker are recognized locally.

Long text and HTML are
read as inert text; markup, scripts, external resources and hyperlinks do not
execute. EPUB books have their own paged reader with a cover, spine contents,
reading size, light/dark paper, retained position and carried raster illustrations.
The accompanying long-form essay keeps its separate reader and position. A
generic verified ZIP payload is recognized as EPUB only with its carried OCF
`mimetype` marker and container index; filename alone is insufficient. Placeholder
EPUB metadata such as “Unknown” uses the already-carried asset title for display
and the suggested download name, without changing original bytes or proof.
Unsupported formats remain exact downloadable
files for their native applications, including active SVG content.

The EPUB reader checks central/local ZIP bounds before decompression, rejects
overlapping entries and incompatible declarations, limits archive size and
materialized chapter text, and never follows a reference outside the carried
archive. Streaming decompression checks actual output sizes and CRCs rather
than trusting declared lengths. Manifest references and unique illustrations
are bounded, duplicate illustrations are opened once, and only one bounded book
page mounts at a time. Plain long-form text uses one whitespace-preserving block.
The ZIP reader is the same pinned `fflate` release already present in
the SDK dependency tree, declared explicitly by Bankeiz for its presentation
use. It does not alter canonical verification or admission.

Object URLs are associated with the exact currently selected media and released
when it changes or closes. Document download URLs are inert, including HTML.
Reduced motion disables depth/spin. Pointer movement adds a small perspective
effect to the resting object, without motion sensors, camera access or tracking.
The native modal traps focus, supports Escape, restores its opener and uses the
existing nested scroll lock. No new upload, sharing or financial action occurs.
