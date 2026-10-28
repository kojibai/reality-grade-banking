# Bankeiz Meeting Rooms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. The user approved the interactive full-camera design and explicitly requested implementation on main, preserving other agents' changes.

**Goal:** Schedule one native calendar appointment with a meeting link and email/calendar invitations, join a mobile-first full-screen video/chat room with the existing Twin, retain and seal the captured meeting, and arrange a context-aware follow-up in conversation.

**Architecture:** Compose the existing calendar confirmation invitation, owner calendar command/ledger, admitted Receiz Identity, chat conversation/calls/RTC/SFU, actual owner/public Twin runtime and canonical offline sealer. The calendar confirmation key grants access only to its meeting conversation. A room never authenticates a guest as an email recipient or host. The media elements and controller persist across overlay/layout changes. Meeting recordings remain privately held until an explicit owner sharing action.

**Tech Stack:** Existing React/Vite Bankeiz, Next.js Receiz routes, SDK v129, existing chat/LiveKit transport, browser MediaRecorder, canonical offline Record/Seal, current Resend delivery and ICS.

**Spec:** User-approved `meeting-room-concept.html` in this chat; latest user instruction adds a Twin-led follow-up from the real conversation and unresolved questions. Implementation scope includes both Bankeiz main and the necessary Receiz main backend composition.

## Global Constraints
- No account-entry changes; reuse existing identity entry. Never turn an invitation into host-account access.
- Known held identity/calendar/conversation/proof truth paints immediately. No new calls on ordinary account/panel first paint.
- No new provider, authority, signature, root or database migration. Existing primitives carry identity, membership and sealed proof.
- Actual received media establishes connectivity. Browser permission remains explicit. Recording and AI participation are visible and scoped.
- Room tools are dismissible overlays over full-screen video. Two-person swap/drag; group speaker following with optional pinning.
- Complete captured evidence survives failures; do not truncate histories or claim absent media was recorded.
- No automatic duplicate sends, meeting creation or metered Twin requests after ambiguous acknowledgments.
- Only task-owned changes are staged/committed, on main; no push/deployment.

## Review Focus
- A forwarded/guessed/cancelled meeting link may not select a host account, expose private context or another conversation.
- Lost response, double tap, concurrent host/guest join, identity closure and React replay must not duplicate rooms, invites or active media.
- Mobile keyboard, rotation, background/rejoin, autoplay denial and device-permission denial preserve the room and captured evidence.
- Large transcripts/media require bounded storage/presentation, complete export and honest capture/error states.
- Follow-up scheduling requires a real agreed time and participant scope; generated suggestions cannot impersonate calendar or payment success.

### Task 1: Native meeting invitation and admission
**Files:** Receiz `app/lib/calendar/bankMeeting*.ts`, `app/api/calendar/events/route.ts`, `app/lib/calendar/server.ts`, existing confirmation/ICS/invite delivery, new `app/api/calendar/meetings/[eventId]/[key]/route.ts`; Bank organizer types/path/client and CalendarViews.
**Interfaces:** calendar input `meeting?: boolean`, existing confirmation key in governed metadata; room GET returns public appointment/host projection; authenticated POST joins the one conversation bound to that appointment, returning conversation/call/actual viewer UID and host permission.
- [x] Write/run failing tests for invitation binding, key mismatch/cancellation, concurrent/double join and public-field redaction.
- [x] Compose existing owner calendar commands and confirmation loader; deterministic room URL; existing member/call primitives.
- [x] Add branded invitation with Join and Google/Outlook/ICS actions; preserve ordinary appointment behavior and truthful delivery summary.
- [x] Pass focused calendar/chat/access contracts and type checks.

### Task 2: Actual Bankeiz meeting room
**Files:** new `meet/index.html`, `src/features/meeting/*`, `src/receiz/meeting*.ts`, scoped identity meeting connector, existing call adapter/paths, Vite/Vercel routing.
**Interfaces:** open identity through existing restore/create; one meeting connector holds exact combined calendar/chat permissions; existing NativeCallController and NativeMessaging carry transport and membership.
- [x] Write/run failing client and rendered room tests for explicit media admission, stable media elements, draggable/switchable camera views, group speaker follow/pin, overlays, leave/rejoin and failure states.
- [x] Implement the approved responsive room, arrival, native chat, screen share, people and media controls.
- [x] Keep all known content and media stable; stop task-owned resources on terminal leave.
- [x] Verify in browser at 320,390,1280px and two independent browser contexts with actual RTC test media.

### Task 3: Twin, meeting record and follow-up
**Files:** meeting-specific Twin composition beneath `app/lib/world/runtime.ts` and existing owned usage/streaming, transcript/export route admission, Bank meeting record/capture/continuity, identity-owned canonical sealing and encrypted storage.
**Interfaces:** meeting context is shared evidence beneath actual Twin scope; streamed generated interpretation stays separate from accepted actions; confirmed follow-up uses the existing owner calendar command and email delivery; final meeting proof is sealed by the existing canonical sealer and remains privately held.
- [x] Write/run failing tests for real Twin binding, scope isolation, complete chat/transcript context, remaining questions and confirmed follow-up replay.
- [x] Capture actual permitted media/transcript, retain privately during recording, and export complete canonical sealed meeting proof without conflating captions/AI notes with recorded media.
- [x] Let the Twin suggest/ask a time and create the follow-up only on an agreed exact appointment; preserve attendees and continuity without re-entry.
- [ ] Verify canonical proof/tamper behavior, calendar/email outcomes and denied/unconfigured provider states.

### Task 4: Whole-flow qualification and commit
- [ ] Run Bank test suite/type/build and account-entry/identity/storage regression contracts; Receiz affected calendar/call/Twin/law/entry gates, types/lint/build as applicable.
- [ ] Browser journey: create appointment → invitation links → fresh guest identity → two-way actual video/chat → permitted Twin → capture → sealed proof → conversational follow-up.
- [x] Fresh independent review of exact owned diff, resolve material findings with regression tests, preserve other work.
- [ ] Stage exact owned hunks/files and commit main in each changed repository. Report exact remaining production/provider/device boundaries; do not claim undeployed live verification.

## Qualification evidence (2026-10-27)
- Affected Receiz calendar/chat/Twin regressions: 71 passing. Account-entry freeze: 57 passing. Meeting booking email result retested after fixture alignment. No schema migration or live DB mutation.
- Affected Bank media/meeting/identity/organizer regressions: 143 passing. Exact task snapshot with npm lockfile dependencies passed the complete production build, including offline/source/license/public gates. Shared installed React versions differ from the lock; they were left untouched.
- Chromium: two independent contexts, actual mesh RTC with test camera/microphone tracks (received video readyState 4, 640px), cross-device chat, controlled streamed Twin reply and real audio waveform, actual MediaRecorder bytes, retained archive and terminal track cleanup. Desktop 1280px; phones 390px and 320px; landscape 844×390. Narrow overlay bounds asserted.
- Browser AI response/signaling/email transport are controlled fixtures; browser sealing uses a test sealer. Production identity custody uses the existing owned canonical sealer and verifies its artifact. No live provider email, paid Twin request or user-identity proof issuance was performed by QA. Physical iPhone and deployed SFU/TURN behavior remain deployment checks.
- Independent final read-only review: no further actionable P1/P2 findings. Source receipts remain authority; group layout/control logic has no new participant cap, and existing SFU transport is reused.
- Deployment: Receiz API changes first, then Bank. Existing calendar invitation/email, actual call/ICE/SFU, SDK and Twin provider configuration remain required. Meeting links do not identify guests as the host; guests enter through canonical own Identity.

- Broader exact-dependency Bank run: 647 files passed; 3,988 tests passed and one pre-existing proof-fixture test timed out at 5 seconds during the concurrent build. The unchanged-main fixture suite passed all 11 tests, and the same 11 tests passed on the meeting snapshot when rerun alone. No proof code or timeout was weakened.
- Final composition with main `8f8b3e9`: typecheck, generated product-preview check and 143 affected tests passed. The other agent’s grant/balance/Kai commit is preserved as the parent; uncommitted profile-insights work is excluded.
