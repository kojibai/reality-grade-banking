# Market and Explore feed entry

User-approved scope: one subtle icon at the top of each asset collection, opening the existing Feed full-screen over the current page. Close restores the exact underlying Market/Explore position. Reopen restores the same Feed filter, current object, scroll and media position.

- Primitive affected: public proof/media presentation; existing ownership and payment action handoff.
- Source of truth: already-held Market catalog and the existing public Feed/readers; existing signed-in Bank action controller or public hosted action controller.
- Stronger/weaker truth risk: none is granted by the icon, presentation or carried catalog. No new identity/writer/authority.
- First-paint risk: keep the Market DOM mounted and display its held first artwork immediately; lazy-load only Feed code after intent. No duplicate discovery/identity read.
- External convention: browser dialog/scroll mechanics only.
- Required checks: retained DOM and no fetch on opening; exact existing buy/send handoff; explicit close remains available; media suspension/reopen; TypeScript, product previews, production build, full unit suite and live browser geometry.
- Exact uncertainty: user-browser rendered overlay and reopen behavior must be observed before completion.

Implementation: retain one closed Sheet after its first opening, with inactive Feed suspending media and hidden work. Read/browse panels are existing Feed views. Full asset inspection uses the existing Market asset Sheet; video pauses underneath and resumes on return. Buy/pay from authenticated Market use its existing account action. Public Explore retains the existing hosted payment and purchase behavior.

No default account name changes are included in this step. That user-requested shared root projection remains queued until Feed completion.


## Completed follow-up scope

Profile collections expose the same small Feed icon beside their one- and two-column controls. Their Feed retains only that profile's carried rows and reuses the existing continuation cursor/busy state. Market and Explore reuse their held catalog. Automatic and manual global discovery are disabled in embedded Feed; the standalone Feed keeps its global discovery behavior.

Songs expose a Lyrics icon when carried long-form text exists. The existing canonical text reader opens over the same playing audio element. PDF/document stages show the actual document page through the existing safe document coordinate or canonical proof-media reader, with stable first-page retention. They never substitute receipt artwork as the document cover.

The profile server renderer excludes the intent-only browser Feed runtime from its settled first-paint bundle. Its visible icon uses the same source as the client.

## Evidence and final review

- Actual profile: 611 carried objects; third icon beside existing view controls; overlay closes without changing profile scroll or DOM.
- Nonzero retained position: second document LET THE HARVEST TESTIFY returns at scrollTop 844 after closing across a settled layout frame.
- Music: I BUILT THE BRIDGE continues playing while its verified carried lyrics are open; browser audio time advanced from 142.87 to 163.29 seconds without remounting.
- PDF: I MOVED AUTHORITY INTO THE OBJECT displays its actual first page; mobile stage is 390 × 844 with document scrollWidth 390. Screenshots are retained in the verification workspace.
- Prior review findings fixed with failing-then-passing regressions: direct Close for empty filters, preserved stage gestures within an outer dialog, StrictMode media source replay and media-position retention, closed HostedCheckout session rejection isolated from its replacement.
- Final added-scope review: global browse/refresh could escape profile scope, and sparse filtered pages could stop continuation. Both fixed with failing-then-passing regressions: embedded discovery controls stay scoped, and existing cursor/busy continuation traverses pages with no filtered matches without duplicate reads.
- Focused verification: 66 tests in 15 files passed; TypeScript and generated-preview checks passed. Production build/full suite are integration gates and their final output is recorded with the commit evidence.

No additional primitive, issuer, identity authority, discovery request or financial writer was introduced. Existing public proof, canonical media verification, ownership/payment actions and account entry remain the governing implementations.

Build-budget ruling: retain eight diverse carried seed objects instead of twelve; the identical current/neighbor stages first paint, and the existing coalesced shipped catalog appends the remaining objects in the same order. This removes unused initial JSON without adding a read or changing the visible stage. The production document's existing 600 kB cap remains enforced. The build also now checks the actual carried reserved-route projection, fixing its mismatched return-property name.
