# Business booking conversation design

> Completion checkpoint: the approved interaction is implemented in Bank main3114642 and Receiz mainfd7cf17e5. The separate approved paid-booking plan extends the original free-booking phase. Earlier planning holds below are historical; current production activation and final release qualification are tracked in docs/releases/4.0.0-qualification.md.

Status: user-approved interaction; implementation awaits root review of source/billing coupling. Planning baseline: Bank main `37a7fe9`; Receiz main checkout `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bankeiz-assets-main`. This document authorizes no production edits, payments or migrations.

## Outcome

A visitor booking a Business host with an enabled, booking-capable public Twin starts in a focused conversation with that real owner's Twin. Regular accounts retain the existing calendar-first booking flow. The calendar remains available inside the conversation without navigation, lost drafts or another availability request.

## Governing source and boundaries

- Public presentation and permitted actions derive from the existing public calendar source, canonical owner entitlement, configured public Twin, and runtime policy. A scheduler button, avatar, blue check or Premium entitlement alone does not qualify this Business experience.
- The existing `POST /api/world/profile/{username}/stream` runs the real owner brain, source retrieval, native memory, Contacts and booking tools. Do not use the authenticated owner `/api/developers/twin/{username}/message` route for visitors.
- `prepare_booking` creates the complete visible review in an accepted native reply. Only a subsequent explicit human confirmation through `confirm_booking` may create the appointment. Retain the existing owner/visitor/thread/parent-operation checks.
- Visitor cookie and thread are existing conversation coordinates, not Receiz Identity, owner access, payment permission or a new session authority.
- The initial question is presentation copy, not an accepted generated Twin reply or a fabricated native memory entry. No welcome/model call occurs on open.
- All eventual Twin replies stream immediately through the real public runtime. Provisional deltas do not establish accepted memory, contact saves, bookings or payments; only accepted final native output does.
- This scope implements free appointments. No prices, paid booking fields, payment writes, booking-payment claims, migrations, or finance policy changes belong here.

## Approved interaction

The Business variant has a compact owner header and logo-only Bankeiz mark. It does not repeat a large marketing introduction above the conversation. Its first prompt is booking-focused; the approved BJ example is: “When’s a good time for you and BJ to speak? I’ll check his calendar.” For another owner use the actual displayed name and neutral pronoun. Keep this introductory presentation separate from the accepted message timeline.

The transcript has a bounded scrolling area, a persistent composer, immediate typing feedback, and streamed replies. Enter sends; Shift+Enter inserts a newline; IME composition never sends. Every editable input, textarea and select renders at a minimum of 16px on all viewports.

The Twin reads the owner's actual full availability, offers a few genuine alternatives, reuses known visitor details and earlier exact conversation, and asks only missing questions. No invented time, unanswered required question, unsourced contact detail or generated success may be treated as accepted.

“Choose a time” slides **down over the entire chat box, including the composer**. It is an opaque, bounded layer occupying the same box height, with its own internal scroll. It presents the existing calendar, questionnaire and confirmation/review fields. A visible Back action restores the still-mounted transcript, scroll position and unsent draft. Selected day/time, timezone and form drafts remain mounted too. Overlay controls must not leave a keyboard tab path into the covered chat. Reduced motion substitutes an immediate transition. Escape/back closes the overlay before closing the enclosing profile Sheet.

Use one `PublicBookingPage` lifetime and one `createPublicBooking` service. Keep the current `day`, `slot`, `step`, `draft`, `confirmation`, unknown-result and submission-lock state. Do not mount a second calendar component with a separate availability hook/controller.

## Initial mode and first paint

The first accepted held availability chooses one mode for that page/service lifetime. A later capability decorator or background refresh cannot swap a settled calendar into a chat, or a settled chat into a calendar. A deliberate owner/link change creates a different lifetime.

Before first availability, render only an honest bounded booking opening frame using already-carried owner information. Do not settle calendar controls and replace them when eligibility arrives. If held availability exists, reuse it synchronously. Profile booking must still open on the first tap, begin the existing one availability request alongside optional code preparation, and retain the same service when hidden/reopened. No speculative request, Twin model call, World-shell GET or Identity creation occurs before opening or on open.

Regular accounts receive the current calendar, questionnaire, unknown-outcome handling and native confirmation flow; conversational code is neither mounted nor requested for them.

## Eligibility projection

Add an optional public-calendar decorator:

```ts
type PublicBookingConversation = {
  state: 'ready' | 'unavailable' | 'unknown';
  ownerUserId: string;
  username: string;
};
```

`ready` requires `canUseBusinessTwinOperations(canonicalPlan)`, `resolveWorldTwinAvailability(...).canOpenConversation`, and existing runtime `canReply` + `canBook`, with scheduling enabled. Read only minimal owner plan/agent/avatar/settings sources. The current avatar loader resolves source URLs and full avatar data; do not call it for eligibility. Reuse its exact revision/updatedAt/render/isCurrent selection rule on a compact persisted-head projection, without source URL resolution, feature maps or media reads. Do not load World ventures, receipts, presence, proof brain or model merely to choose a booking view. Start that compact work in parallel with the existing calendar settings/events work. Return it in the existing availability response; no second client capability read.

Unavailable decorator source is `unknown`, not an invented Free plan or permission grant. Calendar availability remains usable; absent/unknown/legacy decorator chooses calendar once. Runtime permissions and entitlement still check the actual operation independently; this field grants no execution authority.

## Public continuity and request schemas

Reuse the existing `receiz_world_visitor` public guest cookie handling from the cooperative relay. The existing availability GET is the read that establishes it. Do not add a separate continuity GET, widen native owner grants, forward owner cookies/Authorization, or issue an Identity.

Use `/api/bank/booking/{username}` GET/POST for the existing calendar read/manual confirmation and `/api/bank/booking/{username}/conversation` POST for the stream. Both dispatch through existing Bank API/Vite adapters. Validate the route username, public link-option allowlist and same-origin write boundary. Forward only the selected public visitor cookie, bounded native payload, ordinary user-agent and platform-attested address; never caller-selected owner/session headers.

The relay derives `threadKey = 'booking:' + sha256([username, visitorKey, normalizedLinkOptions]).slice(0,40)`. This is a continuity coordinate, not a new verifier/token. Different owners or normalized link contexts do not share mutable controller state. Browser clients never select a private thread.

The browser message body carries `message`, retained `clientOperationId`, `quoteExpiresAt`, `clientUserMessageId`, `clientAssistantMessageId`, `replyToOperationId`, locale and timezone. The server supplies `action:'message'`, the existing visitor/thread, `deliveryMode:'text'`, `allowBrowserVoiceFallback:false`, and booking-specific `clientContext` with Bankeiz app/origin, validated owner booking path, title and purpose. Exact retries retain the original operation tuple. A fresh message uses a fresh operation and references the last accepted parent. Do not synthesize messages or acceptance when a stream is interrupted.

The current `nativeFetch` relay deliberately uses `credentials:'omit'` and strips guest cookies; do not silently repurpose it for visitor continuity. The booking-specific public relay composes existing public primitives and leaves private account transport unchanged.

## Full availability and shared-link context

`loadWorldPublicProfileContext` already reads full calendar availability but currently truncates `view.booking.slots` to six. Retain full availability internally for conversation tools and `prepare_booking`; keep the public World preview at six. Offer a few slots in the answer, but permit choosing any valid offered slot.

Shared-link options are the existing `slotMinutes`, `hourStarts`, `weekdayIndexes`, `daysForward`, `timezone`, and `questions`. Parse them with the same native normalizers used by calendar GET, never as instructions or permission. Use the same normalized schedule and question templates for the initial availability, tool reads, exact accepted booking proposal, manual selection and native confirmation. Bind that context to the accepted proposal/thread so confirmation cannot silently change duration, required questions or time after review. Reuse `createPublicCalendarBookingByUsername` for overlap, source-operation idempotency, meeting link and invitation; do not build another scheduler.

Booking-specific context is data. Scope the runtime prompt change to a validated Bankeiz booking surface. It must not change normal public Twin conversation, owner/private Twin, meeting Twin or native plan/brain/tool behavior elsewhere.

## Continuity, failure and privacy

Keep each owner's transcript, pending request, last accepted operation, draft and manual form state inside the selected controller lifetime. A plain hide/show preserves it; owner/link replacement disposes the old transport and never paints its late response in the new owner. Do not copy unsent manual-form drafts into owner memory. Reuse already-volunteered/accepted contact facts through existing native tools.

Messages remain usable across ordinary questions and booking turns. No response or booking is called confirmed until its native accepted result. Preserve current manual `BOOKING_OUTCOME_UNCONFIRMED` behavior and prevent a fresh duplicate booking while outcome is unknown. A public Twin outage does not remove the manual overlay or its drafts. Disabling the Twin during an open chat refuses subsequent native action normally; it does not silently rewrite the settled UI.

## Review prerequisite, not new permission

Before execution, root must settle the billing audit's source contract: whether booking price/qualification is represented in the same accepted review tuple. This free-flow plan must not accidentally create an alternate unpaid route around a separately configured paid appointment. No payment mechanism is assumed or implemented here. Exact native question-override parity is a required implementation repair, not permission to treat a client question array as owner authority.
