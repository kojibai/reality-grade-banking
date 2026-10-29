# Profile booking cold-load timing

## Report and exact boundary

The user reported that public profile /bjklock/ and its booking panel felt slower
inside Instagram than Safari. Safari's settled layout and working behavior must
remain unchanged. This qualification uses the existing public profile, booking
service and components. No Identity, payment, Calendar policy, native API,
pricing, SQL or source-admission behavior changes.

Public reads with Safari and Instagram user-agent headers returned the same
profile code and 611 Originals. A controlled mobile Chromium run with those
headers is not an iOS Instagram or Safari engine test. The profile's complete
current collection read and a separately CDN-cacheable standalone asset remain
different document paths; their visibility and source rules are unchanged.

## Confirmed cold waterfall and correction

The production profile trace made one availability GET. After that response,
React's nested lazy boundary started the separate BookingConversation script.
A warm module cache can hide that request; a fresh session incurs it.

BookingOpening now lives in its own lightweight module. The profile imports
only that held-owner frame. The existing lazy booking editor imports its
conversation directly, so its code loads with the editor after booking intent,
in parallel with the same availability request. Native availability still
chooses Calendar or conversation. No model call, speculative availability read,
profile-entry booking editor or additional timer is introduced. Closing retains
the same service, DOM, draft, offered times and completion state.

## Before/after evidence

The same production-bundle browser harness used a 300 ms availability response
and a 300 ms cold conversation-script delay. A MutationObserver recorded the
actual visible composer publication, rather than automation polling latency.

- Before: accepted availability to visible composer 324 ms; one late
  BookingConversation request. The no-late-download assertion failed.
- After: accepted availability to visible composer 15 ms; no late conversation
  request. The assertion passed. Both runs made one availability GET and had no
  page errors. These are controlled cold-load measurements, not deployed iPhone
  latency guarantees.
- A rendered regression failed before the fix: conversation code remained
  unloaded while the first requested availability was pending. It passes after
  the fix, and also verifies zero booking code/requests before the profile tap,
  one read afterward, and no conversation rendering before accepted availability.

## Preservation checks

- Booking suite: 157 tests passed in 19 files.
- Profile suite: 153 tests passed in 32 files (some booking tests overlap).
- TypeScript passed; both source-bound product and meeting preview guards passed.
- Before/after production Vite builds passed.
- All 16 existing browser cases passed at 320, 390, 768 and 1280 pixels, covering
  standalone and profile sheets, Twin and Calendar modes, streaming, review,
  Enter, overlay focus, questions, draft/slot/scroll retention and reopening.
  Each flow retained one availability read with no speculative model request.
- Forty before/after screenshots have unchanged geometry and content. Thirty-
  seven are pixel-identical; three differ by one blue-border pixel by three
  color-channel levels. Phone opening and questionnaire captures were inspected.
  No screenshot contradicts the preserved booking surface. No CSS was changed.

Evidence is retained outside the repo under
/private/tmp/bankeiz-instagram-investigation/ and
/private/tmp/bankeiz-booking-cold-fix/. Browser plugin was unavailable; the
existing Playwright qualification and temporary production-bundle harness were
used. Native iOS Instagram timing and the deployed fix remain separate checks
after the user's push/deployment. No customer booking, message or payment was
created during qualification.
