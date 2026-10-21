# Premium audio presentation verification

Verified 2026-10-20 against the local Vite application at `127.0.0.1:5442`.

The audio presentation now has album artwork, the carried object title, play/pause, an accessible seek range, real elapsed/duration labels, ±15-second controls, and desktop mute/volume. Coarse/mobile surfaces leave volume to the device. Native media events update controls; no playback polling, animation-frame loop, library, AudioContext, new media request, or autoplay was added.

One native `HTMLAudioElement` stays mounted in `ProofMedia`. The visible controls move into the existing full-view dialog while the same element, verified blob, time, volume, and paused state continue. The proof-side flip retains that element too. A native playback error offers the exact already-opened audio for download.

## Focused verification

- `npx vitest run tests/proof-audio-player.test.tsx tests/proof-media-view.test.tsx tests/asset-object.test.tsx tests/proof-media.test.ts --maxWorkers=1`: **33 passed**, 4 files.
- `npx tsc -b --pretty false`: passed during this change.
- `git diff --check`: passed for the owned media, tests, and audit document.
- New tests first failed against the old native-only player, including the old fullscreen audio-element replacement; they then passed against the new controls.

## Real-browser presentation checks

An isolated Chrome browser used the real `PublicAssetDetail`, `AssetObject`, `AssetProofBack`, and media controls at 320, 390, 430, and 1280 CSS pixels. The fixture supplies synthetic artwork and a local 60-second WAV through a harness-only module replacement; original requests and all other external requests are blocked. This checks presentation and interaction, not proof validity or live financial support. The committed fixture renders no asset outside that explicit harness.

All four widths passed: no horizontal overflow; complete 13-row proof back; keyboard activation and return focus on the flip control; no autoplay; real duration; play/pause and ±15-second controls; the same playing audio element through full view and proof flips; one media-open call; zero original fetches; zero other external requests; and zero page/console errors. Desktop mute/volume responded to keyboard input.

At all three mobile widths, native touch dragging on the seek range advanced audio to approximately 45 seconds while playback continued and the object stayed on its front. Horizontal artwork swipes flipped to proof; vertical swipes scrolled 183–186 pixels without flipping. Reduced-motion emulation removed the float animation. Screenshots of front, back, and full-view audio were inspected; an accidentally visible duplicate seek label was removed before the final pass.

Compact measurements are in `2026-10-20-premium-audio.json`. Screenshots and the local harness remain under `/private/tmp/bankeiz-asset-object-audio-qa` and `/private/tmp/asset-object-qa.mjs`; no generated images are committed. Chromium mobile emulation does not establish physical iPhone/Safari qualification.

The separate `docs/implementation/2026-10-20-get-paid-integration.md` is a source audit for later work. No payment/merchant/Note-status product change or execution was performed as part of it.
