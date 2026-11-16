# Shared Showcase continuity repair

Bankeiz must immediately display its held accepted collection and advance Profile, Explore, Market, Discover, Feed and Ledger through the installed Receiz membership and public-profile delivery contracts. Delivery metadata is not proof authority. Account creation, custody and the SDK admission guards are unchanged.

## Confirmed failures

- The direct full-profile branch retained its initial Originals independently of later shared membership. Header replacement did not replace that collection. First creation selected fresh input; later updates could remain behind the full-reader branch (`1c551048`, November 5).
- The November 14 directory observer delivered owner headers but had no membership transition. Its stream consumers were concentrated in Discover, so standalone public views could miss delivery entirely (`ad304ca1`, `8c2c188c`). An in-flight header walk also swallowed a repeated event and unchanged descriptive timestamps could suppress the full details read.
- The initial compiled document incremented the same display revision used to reject obsolete asynchronous reads. A newer durable CacheStorage collection was therefore rejected on restart, or only its headers were recovered (`1c551048`, `cf258dca`, extended by `ad304ca1`). Complete saved data could become stale merely because HTML attached first.
- Display timestamp comparisons could veto an already selected shared successor. Feed retained an older prepared pointer. Cold Ledger had rows but did not restore the whole shared collection for subsequent delivery.
- Thin membership delivery could omit compatible inventory, history, charts and custom artwork before other views received the successor.

## Live prepared-material gate

A read-only live comparison confirmed native `/api/market/public-membership` had 1,693 Originals with native revision `1693:21b3233b2c5b0c38`, while `?representation=selected` had 1,692 and retained Cadence's old `A Place Kept Open` Original. The selected representation omitted both new Cadence header and avatar Originals. Bankeiz's ordinary membership and Ledger proxy unconditionally requested that prepared representation and required its material revision header.

Ordinary discovery now reads the native complete public membership through the existing curator and canonical completeness parser, using bounded opaque ETags. Explicit saved-page preparation continues to request the selected representation and enforce its exact material-root header. The public display path no longer depends on prepared publication catching up.

## Repairs and regression boundaries

Existing shared consumers subscribe to the existing Receiz public delivery. Profile details and membership advance independently; explicit edits get a trailing pass and bypass descriptive-timestamp reuse. The existing membership reader handles missing or changed collection bytes, including final withdrawal to an empty collection.

The publisher carries compatible display operands once before notifying consumers. Full-profile results keep their exact enclosing document basis so a subsequently selected shared membership replaces their list, while header-only changes do not truncate a newer full read. Exact owner/account bindings and privacy refusals remain enforced.

Only the actual first HTML module entrance is a boot fallback. It paints immediately while bounded local restoration continues. A saved successor can replace that fallback without a date/count comparison or Source request. A genuine later document or membership transition still defeats a delayed cache read. Cold tests include null display timestamps, cache completing before/after mount, empty membership, quote/header edits, privacy refusals and later accepted state.

The compiled browser regression is registered in `test:browser`. It holds APIs stalled for first-frame/hydration checks, delivers two accepted changes, checks shared views and compatible operands, restarts Chrome with retained state, and independently cold-opens Feed and Ledger. Local tests, build output, GitHub CI and live deployment must be reported separately; passing an initial item count does not establish future continuity.

## Email message entrance

A distinct confirmed cookie race occurred when a second email link was opened with a previous message session: the external start omitted Strict cookies, while the same-origin continuation received the old session and rejected the pending link. The pending link now redeems its own token and exact recipient; the previous session cannot authorize adopting it. Unit/wire tests and real Chromium/WebKit Strict-cookie flows cover this repair. The supplied historical token was unavailable when replayed, so its original generic screenshot cannot be conclusively attributed to this race.
