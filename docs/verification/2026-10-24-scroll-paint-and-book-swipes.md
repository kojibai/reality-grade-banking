# Scrolling investigation and book gestures

The reported symptom is missing painted content during ordinary scrolling down
and back up on Explore, Ledger, Market and their popovers. It also occurs in
Safari and the installed PWA. It is not restricted to the essay reader or to
pulling beyond a page boundary. The user clarified that it happens on the
list pages before opening a proof object.

## Investigation boundary

A comparison with the historical Receiz profile correction found the earlier
removal of paint culling, repeated filter/shadow animation and forced media
layers. Those exact page-wide patterns were not found in Bankeiz's plain list
styles. The complete essay text is retained in the document; scrolling does
not fetch or lazily mount it.

A separate proof-object idle-animation cost was measured, but it was not a
confirmed cause of the reported plain-list symptom. The proposed proof-object
CSS change and its associated browser assertion were therefore withdrawn at
the user's direction. Existing object motion, flips, pointer tilt, navigation
and dialog backdrops remain unchanged. No page-wide paint fix is claimed.

Desktop Safari and Chromium did not reproduce the intermittent iPhone
blanking. Physical iPhone evidence remains necessary to establish the exact
trigger. Do not replace this missing diagnosis with speculative transforms,
forced layers, culling, scroll handlers or changes to retained content.

## Book pages

A single deliberate horizontal touch gesture turns exactly one existing local
book page: left advances; right returns. Existing first/last-page boundaries,
page buttons, keyboard controls, contents, type size, paper theme, illustrations
and retained position remain. Vertical gestures, small drags, multi-touch,
cancelled or stale gestures, and text selection do not turn pages. Native
vertical scrolling and pinch zoom remain enabled. The book paper identifies
itself to the existing outer proof-object swipe exclusion, so turning a book
page cannot flip the enclosing proof object.

The gesture tests failed before implementation. Browser checks with actual
touch input at 390px and 1440px verified forward/backward page turns, native
vertical scrolling, retained controls and outer proof flipping, with external
services blocked. They used synthetic local text and submitted no account or
financial operation. Physical iPhone gesture verification remains separate.

## Verification scope

The built-app browser gate checks cold artwork, owner portrait preparation,
retained return navigation, copy feedback, absence of live service requests,
and the installed offline shell. These checks do not establish offline
financial execution. The existing financial rules and synchronization paths
are outside the book gesture change.

On the final source, with the original proof-object effects restored:

- `npm run build` passed, including the offline shell and source inventory checks.
- `npm test -- --maxWorkers=4` passed all 2,990 tests in 484 files, with no skips.
- The existing built-app browser gate passed at 390px and 1440px, including
  installed offline launch.
- Native touch gestures and coordinate taps passed on the synthetic local book
  fixture at 390px and 1440px. Native vertical scrolling moved the paper by
  137px and 207px respectively; page turns, contents, type controls and the
  original outer proof flip remained functional. No runtime errors occurred.

Browser plugin not available: verification used installed Chrome through
Playwright, with external services blocked. The local fixture was
`http://127.0.0.1:5467/book.html`; the built-app gate used its isolated local
server. Screenshots and logs are retained outside the repository under
`/private/tmp/bank-scroll-paint/`. Neither this desktop browser run nor the
passing tests reproduce or establish a fix for physical iPhone raster blanking.

An initial full test run also exposed the existing Business-entry cancellation
race. A delayed surface event could recreate an abandoned request for a new
identity while the old Business-entry hash remained selected. Cancelling the
bound intent now retires that entry hash; a focused regression reproduced the
failure before the correction. It neither creates an account nor changes
authentication or assistant permissions.
