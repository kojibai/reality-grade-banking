# Discover and Feed verification — 2026-10-30

The user selected the first discovery composition and asked to preserve the existing Feed opening, closing, ordering, categories and resume behavior. This change composes the existing public proof-object collection, Feed, media readers, identity artwork and actions.

## Governing boundary

Public content and owner presentation come from the existing public source. The display index, thumbnails, short username labels and music controls admit no identity, ownership, payment or proof. Account entry and all financial execution remain unchanged. Profile artwork uses the original account coordinate, never asset release time or current time. Full IDs and canonical URLs retain their exact bytes.

## Visual comparison

- [Approved reference](approved-reference.png) establishes the restrained two-column mixed-media gallery, small creator row and compact discovery controls.
- [Mobile implementation](mobile-final.png) preserves that hierarchy with real carried content. Images, books, text moments and videos use their existing media roles.
- [People and Identity Seals](people-seals-short-handles-mobile.png): chosen photos remain first; deterministic Identity Seal artwork fills accounts without one. Short handles display the suffix, while the exact full account path remains the href.
- [Scroll reveal](scroll-reveal-mobile.png): upward scrolling restores search/category controls; downward scrolling hides the same controls without remounting the gallery.
- [Feed popover](feed-popover-mobile.png): the selected work opens in the existing full-screen viewer and closes to retained gallery state.
- [Lyrics](lyrics-final-mobile.png): carried audio text paints directly in the reader; current music keeps playing. No heavy media-reader loading step is needed for this text.
- [Centered controls](music-final-centered.png): at 390 × 844, play, progress container and slider centers are all x=195; document overflow is zero.
- [Art-only return control](music-final-mini.png): 114 × 48 pixels, album art + Pause/Play + Stop; accessible song labels remain available.
- Compact profile footer: [mobile](profile-footer-mobile.png) and [desktop](profile-footer-desktop.png). The full marketing footer remains on marketing routes.

The latest source-bound mobile screenshots confirm the requested public proof/media hierarchy. No current screenshot contradicts the claimed portrait, handle, control geometry or gallery behavior. A development static-module import error found during QA was corrected; the fresh playback run has no Vite error overlay. A separate mini-player navigation check found and corrected an opened music view remaining over its destination profile; navigation closes presentation only, keeping native sound and the return control.

## Functional evidence

- Source search/filtering is local and pure; it does not request profiles, quotes or financial operations.
- People append 20 at a time from the full existing index before its horizontal end (fixture 20 → 40 → 55); no fixed overall limit or profile fan-out.
- Real browser: Play → immediate lyrics → close Feed → playing art-only control → reopen at retained time. One playing native audio and one ready next stream.
- Real browser: [profile navigation](music-profile-navigation.png) dismisses the opened music view (zero open dialogs), retains one native audio owner and exposes the art-only return control. Explicit Pause/Stop remain user controls.
- Natural Ended advancement and pause-then-swipe behavior were exercised in the browser. Unit coverage also holds a source continuation beyond the originating view close and rejects it after Stop or an explicit different queue.
- Production HTML retains all exact page/Bank CSS with lossless shared references; no destination stylesheet request or replacement account is introduced.
- Feed and Discover are in source inventory and offline routes. The original budgets are unchanged (600 kB Feed, 700 kB Discover; shared JS+CSS 15 kB gzip).

## Exact untested boundaries

No payment, trade, identity recovery or production mutation was performed in visual QA. Physical iPhone lock-screen/background suspension is not certified by desktop browser testing; native MediaSession and document-held audio are implemented, but operating-system process termination cannot retain a web document. Legacy public rows without admitted name-choice provenance retain their source name; the code does not guess an explicit choice from a username prefix. Exact paid Original download work is a separate follow-up requested after this page work.


## Final commands

- Bank `npm run typecheck`: passed.
- Bank full suite: 4,619 of 4,622 passed on its first run; two tests could not bind localhost under the sandbox and passed when rerun with localhost permission. The remaining lossless navigation CSS test exposed missing whole-style interning; it passed after correcting the implementation without relaxing its assertion. All other 4,619 passed.
- Final focused set after those corrections and the added mini navigation contract: 6 files, 14 tests passed; the separately run HTTP set passed 2/2.
- `npm run build`: passed all production, entrypoint, native-source, conformance, license, offline, source-inventory and public-page checks. Initial Feed document 461,778 bytes and Discover 560,848 bytes, below unchanged 600,000/700,000 limits.
- Native root change `1bf06230f2d1fd3a46f83c56500426c529874044`: full typecheck, account-entry freeze 57/57, source/name 5/5, visual evidence, primitive binding, repo-only reasoning and all three governance controls passed.
- Physical-device background playback, paid transactions and live account restore were not exercised here.

- Short-handle search was tested red/green: searching `@fyudsis` finds the same account and work as its full internal handle, without changing the stored username or destination. Two focused files, 11 tests passed.
- A clean source-archive extraction completed a full production rebuild, reproducing native modules and the locked SDK from included sources.


Final combined-main verification: `npm run typecheck` passed and the complete suite passed **761 files / 4,638 tests**, including the preserved ownership work. The final clean source-archive extraction also completed the full production build with all source, offline, conformance, metadata and public-page checks passing. No test assertion was relaxed to admit a visual or primitive regression.
