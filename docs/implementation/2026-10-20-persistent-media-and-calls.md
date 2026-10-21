# Call and asset playback lifetime audit

Source inspection: 2026-10-20. Bank baseline `d8a9723`; Receiz read-only reference: `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bankeiz-assets-main`. No actual call, message, private lookup or financial operation was performed.

## Confirmed call gap and scoped fix

Before this patch, Bank retained `MessagesSession` after closing Messages, but `MessagesPanel.tsx` rendered `CallPanel` only when `mode === 'call' && active && pageVisible`. Closing the sheet, navigating, changing the selected conversation or hiding the document therefore removed the call owner. `CallPanel.tsx` additionally called `controller.leave()` on `visibilitychange` to hidden, and its Messages button called `controller.close()`. Those are real disconnect paths, rather than an absent floating presentation alone.

The scoped fix retains one held call context independently of the currently selected thread. `CallPortal.tsx` keeps a stable React portal target and moves that same container between the expanded Messages host and the current native modal or document body. This avoids both hidden Bank ancestors on public navigation and native dialog inertness. `CallPanel` changes presentation through CSS while retaining its controller, local/remote stream references and media DOM. Compact controls offer return, microphone, camera and explicit leave; the separate drag handle supports pointer capture and arrow keys, with viewport and visual-viewport clamping. A native state-preserving DOM move is used when available, with ordinary node movement as fallback.

Returning from an actual public pathname must restore `/` as well as the Messages hash. `BankApp` uses `requestBankNavigation()` off-root; the existing `public/learn/learn.js` navigator handles its narrowly scoped `bankeiz:navigate-bank` event through the same remembered-history, head, stylesheet, root and activity-event render pipeline as ordinary links. It performs no document navigation or second runtime mount. Explicit Bank hashes also take precedence over a generic remembered `bankUrl`; hashless Enter Bank links retain their existing remembered destination.

Visibility alone no longer leaves. The existing 2.8-second refresh timer still pauses while hidden; becoming visible refreshes the existing controller. Actual `pagehide`, identity replacement/disposal and component teardown retain cleanup. Start/Join and camera acquisition remain explicit user actions. The transport, permissions, membership serialization, RTC/SFU implementation and source identity are unchanged.

Relevant Bank sources:

- `src/App.tsx`: retained Bank root and `MessagesPanel`, sheet navigation, public-surface hiding, return-to-Messages callback.
- `src/core/bank-navigation.ts` and `public/learn/learn.js`: programmatic return through the existing public navigation pipeline.
- `src/features/messages/MessagesPanel.tsx`: retained private session, held call context, active UI reads and call presentation.
- `src/features/messages/CallPanel.tsx`: single controller lifecycle and single set of local/remote media elements.
- `src/features/messages/CallPortal.tsx`: stable container placement and viewport bounds.
- `src/receiz/native-calls.ts`: existing explicit join, membership cleanup, local track stop, peer/SFU cleanup and permission-gated end.
- `src/receiz/native-identity.ts`: `callTransport.forController()` ownership and serialized membership cleanup, plus `dispose()` cleanup window.

## Receiz reuse evidence

`app/components/layout/GlobalAuthChrome.tsx` mounts `ReceizChatDockHost` in authenticated global chrome. `ReceizChatDock.tsx` holds `callPanelContext` separately from the selected conversation and always composes `ReceizCallPanel`; `closeCallPanel()` changes presentation state only. `ReceizCallPanel.tsx` distinguishes `open` from `hasLiveSession`; refresh and RTC effects continue for a live session when the full panel is closed. Its visibility listener refreshes/reconnects when visible, rather than leaving on hide. Its minimized dock uses a viewport-clamped drag handle, return, microphone and explicit leave. Remote audio sinks are retained separately from muted preview videos.

Bank reuses these lifetime and presentation principles with its existing native call controller. It does not copy Receiz chat, identity, permissions, financial actions, AI agents or call transport code. Bank's already audible remote video elements stay mounted across presentations, so no additional audio sink is introduced.

## Persistent asset music/video: separate queued work

The completed premium audio work retains the same HTMLAudioElement across fullscreen and proof flips. It does not establish app-wide playback lifetime. `ProofMedia.tsx` owns its audio controller, opened file, object URL and position refs; its unmount aborts pending opening and revokes its object URL. A different asset/detail instance therefore cannot promise continuation. Video is likewise owned by the detail's `MediaCanvas` and can change DOM between inline/full views. A persistent asset session host must be designed separately and must retain one verified SDK-opened media source, one element/object URL and one playback state while routes/panels change. It must not reopen/fetch the original merely to minimize or restore it. Explicit new-item replacement, stop, identity teardown and download authority need separate behavior tests.

The Receiz verified player has browser Picture-in-Picture support in `app/[username]/verified/[receizId]/player/VerifiedOriginalPlayerExperience.tsx` (`requestPictureInPicture`, enter/leave event handling and toggle control). That is evidence of native PiP capability for a mounted player, not proof that its media survives arbitrary route teardown. The global call owner above is the confirmed cross-panel reference. Asset persistence remains queued after the current call/history work.

## Scope of continuity

The fix covers closing the Messages UI, switching Bank views/conversations and navigating among retained SPA surfaces while the document remains alive. It removes deliberate hangup on document hiding. WebRTC/media may still be throttled or suspended by the browser, OS, network or device policy; closing the tab/PWA, reloading, process termination, actual page navigation away and identity teardown are not promised background-call runtimes. The UI continues to report the controller's real waiting/connecting/reconnecting state, rather than claiming connection from a join acknowledgement.

## Verification

Focused synthetic controller/component tests and scoped browser evidence are recorded in `docs/verification/2026-10-20-call-continuity.md` and its compact JSON companion. The browser fixture requires explicit harness injection, supplies a canvas video track and a synthetic audio-track object, and mocks the existing delegated transport. It never requests real devices or contacts Receiz/call services. This is lifecycle and presentation verification, not a live network interoperability claim.
