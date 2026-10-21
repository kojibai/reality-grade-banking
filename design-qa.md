# Public profiles design qualification

final result: passed

## Target and evidence

Selected reference: centered identity header and both collection layouts in
`exec-e990def9-4e20-465e-aa3e-515207c2b084.png`, plus the approved compact identity
popover. Production uses actual Receiz profile media and content; the fictional
Alex Morgan/ocean assets in the design were not substituted for a real identity.

Rendered public profile: `http://127.0.0.1:5449/bjklock/`, mobile390×844 and
desktop1280×900, device scale1. Mobile controls use the controlled fixture at
`http://127.0.0.1:5448/tests/browser/profile-controls.html` with no account writes.

Comparison evidence is kept outside the repository:

- `/tmp/bankeiz-profile-design-comparison.png` — normalized source and rendered mobile region.
- `/tmp/bankeiz-profile-mobile.png` — actual profile header/socials.
- `/tmp/bankeiz-profile-desktop.png` — responsive actual profile.
- `/tmp/bankeiz-profile-identity-mobile.png` — PBI evidence.
- `/tmp/bankeiz-profile-inline-mobile.png` — inline existing image viewer.
- `/tmp/bankeiz-profile-id-mobile.png` — compact username availability/editor.
- `/tmp/bankeiz-profile-social-links-mobile.png` — additional named links.

## Comparison

The existing Bankeiz typography, ivory/navy tokens, logo-only header, centered
portrait, cover, blue authorship check, quiet identity controls, primary actions
and one/two-column collection hierarchy match the selected direction. Actual
social icons and the approved Receiz ID/More links controls add one quiet row.
Category/search controls follow the existing Market vocabulary. Asset prices and
movement use real existing source inputs, rather than the reference's illustrative
numbers. The desktop retains the existing product's console frame.

No P0/P1/P2 visual mismatches remain. Mobile header spacing was compacted to bring collection artwork into the first screen; group avatar flex sizing was corrected and recaptured at32×32. The controlled editor uses a stable mock identity matching the actual account owner lifecycle. The source's example cover, portrait, title,
asset artwork and prices intentionally differ from the actual account. The
reference contains no owner editor, so that state follows the existing ID sheet
and mobile input/button system instead of inventing a separate treatment.

## Interaction evidence

The real public browser check passed page identity/nonblank rendering, no framework
overlay, mobile overflow, both collection views, PBI popover, inline existing image
reader, and profile→asset→Back. Column and identity changes made no new data reads.
The controlled mobile check passed compact editor expansion, availability feedback,
acknowledged username save and the extra-links popover. Chat/profile handoffs,
group profile links (also exercised in the mobile browser), same-account edit/upload validation and retained tab state
are covered by targeted component/transport tests.

The final production build and1975 tests across333 files passed.

The in-app CUA browser returned `Local browser use is disabled in Work settings`.
Local headless Chrome was used as the available fallback. Browser runs reported
no JavaScript page errors. An authenticated production account was not edited;
new links and image uploads require their documented Receiz rollout before live
qualification. This record does not claim otherwise.

## Profile and reply refinements · October 21, 2026

The canonical public-route read returned the complete 611-asset collection,
including 99 music assets. A fresh browser received initial response headers in
15 ms and its full document in approximately 3 seconds on this local run; the
upstream read remains real work. With JavaScript disabled, the document already
contained the actual profile and first 24 asset cards. No second browser profile
read was needed. Visible banner, portrait and first artwork were complete when
the interactive first view was inspected. This is not a claim of zero network
latency or a cold-image guarantee under arbitrary network conditions.

Categories included assets beyond the first visible batch, omitted absent
Collectibles, and selected Music from the full collection without a new data
read. The next scroll window expanded from 24 to 48 before its boundary. The
quiet duration control changed the weighted percentage locally. Both the
collection-growth and individual-price sheets opened, switched chart periods
and closed without a source request. The asset sheet places View asset under
the title and the existing Buy ownership / Take cash handoffs below its chart.
No purchase, sale or funding operation was executed during qualification.

The collection curve prepares in the existing local projection worker. On a
611-asset standalone calculation, its first bounded curve took approximately
861 ms off the UI thread and its next completed-pulse update took 19 ms. The
opening baseline and each period's final percentage are covered by numerical
tests. These figures are measurements on this machine, not a device guarantee.

Profile → asset → Back retained the exact same image DOM element. The existing
profile, both tabs and displayed cards remain mounted. Public Activity now uses
compact artwork, publication dates, concise event labels and quiet navigation.
The final mobile 390×844, narrow 320×740 and desktop 1280×900 checks reported no
overflow or JavaScript page errors. Evidence outside the repository:

- `/tmp/bankeiz-profile-first-document-mobile.png`
- `/tmp/bankeiz-profile-activity-final-mobile.png`
- `/tmp/bankeiz-profile-activity-final-desktop.png`
- `/tmp/bankeiz-profile-price-peek-mobile.png`
- `/tmp/bankeiz-profile-showcase-growth-mobile.png`
- `/tmp/bankeiz-profile-final-qa.json`

A synthetic canonical message stream verified incoming human and owner-Twin
portraits, preparation dots before reply content, final reply continuity and
unchanged outgoing bubbles. It used the existing adapter and carried member
image, made no external requests and sent no real messages. Evidence:
`/tmp/bankeiz-chat-reply-typing-mobile.png` and
`/tmp/bankeiz-chat-reply-avatar-mobile.png`. Receiz's early `ai_start` change is
separately committed as `eedb0adb3`; live timing needs that host deployment.

The full Bank suite passed 1,989 tests across 336 files. The production build,
offline shell, conformance separation, source archive, licensing and public-page
checks passed. Scoped Receiz runtime tests passed 5/5 and scoped ESLint passed.
Unrelated Receiz native/Crystal changes were preserved. Download controls,
canonical verification, Note custody and antirollback were not changed.
