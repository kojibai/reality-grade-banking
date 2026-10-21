# Call continuity verification — 2026-10-20

The confirmed hangup paths and Receiz source comparison are recorded in [the implementation audit](../implementation/2026-10-20-persistent-media-and-calls.md). This patch retains the existing native call controller and one media tree across presentation changes. Persistent asset music/video remains separate queued work.

## Focused checks

The call tests plus related navigation tests passed **77 tests in 10 files** with `--maxWorkers=1`; the exact command is in the JSON evidence. The visibility regression was observed failing before the change. Coverage includes explicit Start/Join, StrictMode replay, hidden-document retention, pagehide cleanup, compact cancellation of unresolved device acquisition, Messages close/restore/thread changes, one explicit leave, stable portal media identity and viewport bounds. The existing native controller tests passed unchanged.

`call-public-navigation.test.tsx` composes the real App, MessagesPanel, native call controller and production public navigator with unrelated account panels mocked. It first reproduced Return to call remaining on `/asset/example/`. It now verifies return from that actual path and `/learn/guide/` to the root Messages hash, the same root/video/stream, restored head/styles, open full dialog, one join, no implicit leave and no runtime reload. It also checks explicit anchor hashes and rejection of a non-Bank navigation request.

`npm run typecheck` passed. The scoped `git diff --check` passed. The parent runs the complete suite/build and owns the commit.

## Browser evidence

Installed Google Chrome through bundled Playwright checked the real `MessagesPanel`, `CallPanel`, native controller, `requestBankNavigation()` and production `learn.js` navigator using `tests/browser/call-continuity.html` at **320, 390, 430 and 1280 px**. Public asset and guide navigation change the actual pathname and hide the retained root; restoration uses the deployed navigation event, rather than a fixture state reset. The fixture does nothing without explicit `window.__callQaHarness=true` injection. It uses a synthetic canvas video, synthetic audio-track object and in-memory delegated responses; it never acquires actual devices, sends a message, joins a host call or requests external services. Its canvas frame timer exists only to generate test media, and is stopped during cleanup. No production polling was added.

Verified at each width:

- No media acquisition before explicit Join. Exactly one acquisition and one membership join across minimize → close Messages → public navigation with hidden/inert Bank → another native Sheet → restore → select another conversation → return to the held call.
- The exact same video DOM node and stream stay playing, with advancing media time, no track stops and no membership DELETE before an explicit end/leave.
- Microphone/camera controls update the held synthetic tracks. Voice-only presentation shows an avatar while retaining the media element.
- Mobile touch dragging, pointer dragging, keyboard arrow movement and keyboard restoration work. Dragging stays within the viewport; simulated safe-area insets and a 280 px visual viewport bound and resize the compact window.
- No horizontal overflow. Reduced-motion presentation has no animation. The full panel, compact video and voice avatar were visually inspected.
- Explicit End for everyone sends one permission-gated end PATCH, stops both local synthetic tracks and does not send a redundant leave. No page errors, console errors or external network requests occurred.

A separate 390 px run disabled `Element.moveBefore` to exercise ordinary DOM movement. The same media node/stream continued playing through the full sequence.

A second isolated browser check added two remote presentation streams through a **test-only snapshot projection**, while retaining the real local controller. Their audio came from locally generated WAV capture tracks. Both remote video elements stayed unmuted, playing and bound to live audio tracks when minimized; the nonprimary preview used opacity zero and inert controls, with `display:block`, and returned using the same DOM. This checks the presentation's effect on audio-capable sinks, not real remote RTC delivery or acoustic output.

Compact results: [JSON evidence](2026-10-20-call-continuity.json). Screenshots and temporary browser drivers remain under `/private/tmp/bankeiz-call-continuity-qa`, `/private/tmp/call-continuity-qa.mjs` and `/private/tmp/call-remote-audio-qa.mjs`.

## Practical limits

These checks prove retained UI lifetime and synthetic media behavior in Chrome. They do not prove host RTC/SFU deployment, physical iPhone background behavior, or continued calling after tab/PWA closure, reload, process termination, network loss or OS suspension. Actual pagehide and identity teardown still clean up the call. Document visibility by itself no longer deliberately hangs up.
