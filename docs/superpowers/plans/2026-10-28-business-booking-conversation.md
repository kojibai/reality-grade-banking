# Business Booking Conversation Implementation Plan

> Completion checkpoint: the approved interaction is implemented in Bank main3114642 and Receiz mainfd7cf17e5. The separate approved paid-booking plan extends the original free-booking phase. Earlier planning holds below are historical; current production activation and final release qualification are tracked in docs/releases/4.0.0-qualification.md.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Root executes after reviewing source/billing coupling; do not begin production changes from this plan yet.

**Goal:** Give Business hosts with an enabled booking-capable Twin a real conversation-first public booking experience while preserving regular calendar booking and native confirmation law.

**Architecture:** Add a compact eligibility decorator to the existing availability read, then compose the existing public Twin stream with per-owner visitor continuity. Keep one mounted booking controller and its existing calendar/form states, using a full-box overlay for manual selection. Native full availability and normalized shared-link options feed existing booking tools and accepted-review confirmation; no alternate scheduler or authority is introduced.

**Tech Stack:** Existing Bank React/TypeScript, CSS, Vitest/happy-dom, Vite/Vercel public API adapters; Receiz native public Twin runtime and Contacts/Calendar tools, existing Node/tsx contract tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-28-business-booking-conversation-design.md`

## Global Constraints

- Baseline Bank main `37a7fe9`; Receiz checkout `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bankeiz-assets-main`. Preserve all other dirty work and main HEAD advances.
- Free appointments only. No price fields, payment writes, migrations or paid-booking behavior changes. Wait for root's source/billing contract review before production edits.
- Business entitlement + configured enabled public Twin + native reply/booking permission; regular accounts keep calendar-first behavior.
- One existing availability GET on open; no extra client capability/session/World-shell/welcome request and no Identity creation.
- Choose initial mode once from the first held availability. Reuse held truth immediately; never replace a settled view because a background decorator arrives.
- The opening question is presentation, not an invented accepted Twin reply. Actual replies use the owner's real streamed native brain.
- Existing native exact accepted review → later explicit human confirmation is mandatory. Client context never grants permissions.
- Enter sends, Shift+Enter adds newline, IME composition never submits; all editable controls have computed font-size ≥16px.
- Manual overlay slides down over the entire bounded chat including composer, with internal scroll; chat and calendar/form states remain mounted.
- Public preview remains six slots; conversation tools use all actual offered slots and the same normalized shared-link options.
- No speculative profile booking reads before first tap; hiding/reopening preserves the selected profile service and drafts.

## Review Focus

- A legacy/unknown eligibility decorator never becomes an invented Free entitlement or a late visible mode switch — Task 1/4 tests.
- A valid eighth slot or changed shared-link questionnaire remains bookable with the exact reviewed duration/answers — Task 2 tests.
- A lost stream or explicit yes on another owner/thread/parent cannot duplicate or confirm a booking — Task 3 tests.
- The full-height manual layer covers the composer and traps focus without erasing unsent chat, selected time or questionnaire drafts — Task 4/browser tests.
- Owner/link changes, IME composition and late old-owner responses cannot leak data or submit an accidental booking — Task 3/4 tests.

## File structure and interfaces

Bank paths below are relative to `/Users/bjklock/Kai-Turah/bank`; Receiz paths to the designated main checkout.

- Receiz `app/lib/world/server.ts`: export one compact `loadWorldPublicBookingEligibility(owner)` composition using the existing agent reader, canonical plan/runtime policy and a compact avatar-head projection with the existing exact selection rule; do not export private internals broadly or load full World surface.
- Receiz `app/api/calendar/embed/[username]/route.ts`: add the optional eligibility decorator in the existing GET, with compact gate work concurrent with calendar settings/events.
- Receiz `app/lib/calendar/server.ts` and shared calendar option normalizer: reuse native schedule/question parsing across availability, chat and confirmation. Preserve legacy defaults for absent options.
- Receiz `app/lib/world/runtime.ts`: internal full booking availability + normalized booking context; booking-only priming; existing real brain/tools remain the execution path.
- Receiz `app/lib/world/guestProfile.ts`, public profile route and stream route: accept/normalize the bounded booking context as data; existing idempotency/metering contract stays intact.
- Receiz `app/lib/world/profileConversationBooking.ts`: carry normalized schedule/question context through the existing accepted proposal and exact confirmation; no new token/verifier.
- Bank `src/receiz/organizer-types.ts` + `public-booking.ts`: parse optional `PublicBookingConversation`, expose the service's immutable username/options, preserve known/read/confirm behavior.
- Bank new `server/public-booking-conversation.ts`: public cookie/calendar/stream relay. Modify `server/bank-api.ts`; reuse its Vite middleware and existing `/api/bank/(.*)` production rewrite. No new Vercel function required.
- Bank new `src/receiz/public-booking-conversation.ts`: per-owner/link controller; pending operation, accepted stream and native memory projection only.
- Bank new `src/features/booking/BookingConversation.tsx`: bounded transcript, composer and presentation opener, receives controller and manual-overlay opener.
- Bank `PublicBookingPage.tsx`, `booking.css`, `ProfileBooking.tsx`, booking `main.tsx`: integrate the single controller/service and mounted manual layer; preserve all existing manual states.

```ts
// Optional decorator inside the existing native availability response.
type PublicBookingConversation = {
  state: 'ready' | 'unavailable' | 'unknown'; ownerUserId: string; username: string;
};
// Add to BookingAvailability: conversation?: PublicBookingConversation.
// Existing service also exposes immutable username/options; .availability and .confirm stay.

// Normalized input descriptor; data only, resolved by existing native normalizers.
type PublicBookingLinkContext = {
  scheduleConfig: PublicCalendarScheduleConfig;
  customQuestions: PublicCalendarQuestionTemplate[];
};

type PublicBookingMessage = {
  id: string; role: 'user'|'assistant'; body: string;
  status: 'pending'|'streaming'|'accepted'|'interrupted';
};
type PendingBookingMessage = {
  message: string; clientOperationId: string; quoteExpiresAt: string;
  clientUserMessageId: string; clientAssistantMessageId: string;
  replyToOperationId: string|null; locale: string; timezone: string;
};
type PublicTwinBookingConfirmation = {
  eventId: string; title: string; startAt: string; endAt: string;
  attendeeName: string; attendeeEmail: string; timezone: string|null; location: string;
}; // Exact existing WorldAgentBookingConfirmationView projection.
type PublicBookingConversationSnapshot = {
  draft: string; messages: readonly PublicBookingMessage[]; busy: boolean;
  pending: PendingBookingMessage|null; lastAcceptedOperationId: string|null;
  error: string; bookingConfirmation: PublicTwinBookingConfirmation|null;
};
// New Bank controller owns UI projection, never execution authority.
createPublicBookingConversation(input: {
  username: string; options: URLSearchParams; request: typeof fetch;
}): {
  known(): PublicBookingConversationSnapshot;
  subscribe(listener: () => void): () => void;
  setDraft(value: string): void;
  send(): Promise<void>;
  retry(): Promise<void>;
  dispose(): void;
};
```

Route contracts: `GET /api/bank/booking/{username}` returns the existing calendar envelope + optional decorator and sets the existing public visitor cookie. `POST` on that route forwards current manual booking payload/meeting:true plus existing visitor continuity. `POST .../conversation` accepts message operation fields, locale/timezone and the allowlisted link descriptor; derives owner/thread/server booking context and relays the native SSE. Preserve upstream accepted memory, bookingProposal/bookingConfirmation and errors; text projection may omit performance media as current cooperative relay does.

### Task 1: Eligibility and one-read public entry

**Files:** Receiz `app/lib/world/server.ts`, `app/api/calendar/embed/[username]/route.ts`, new `app/lib/world/__tests__/publicBookingEligibility.test.ts`; Bank `src/receiz/organizer-types.ts`, `public-booking.ts`, `tests/public-booking.test.ts`.

**Interfaces:** Produce `PublicBookingConversation` decorator. Consume existing canonical `getPlanForUser`, `canUseBusinessTwinOperations`, `resolveWorldTwinAvailability`, `normalizeWorldAgentPolicy` and `resolveWorldAgentRuntimePermissions`. No billing writes or full World surface.

- [ ] Write RED eligibility tests: Business/Pro/Enterprise + configured public-ready agent + canReply/canBook + enabled scheduler is ready; Free/Premium, missing/disabled agent/avatar or booking policy is unavailable; source failure is unknown, never an invented Free plan. Assert no full World/brain/welcome, full avatar/media source URL resolution, feature-map hydration, or entitlement-grant write is called. Test compact avatar selection against the existing revision/updatedAt/render/isCurrent ordering.
- [ ] Run `node --conditions=react-server --import tsx --test app/lib/world/__tests__/publicBookingEligibility.test.ts` in Receiz; verify intended RED.
- [ ] Implement `loadWorldPublicBookingEligibility({ownerUserId,username,displayName,schedulerEnabled}):Promise<PublicBookingConversation>` and compose its read concurrently in the existing calendar GET. Keep real calendar usable if only optional gate evidence is unavailable.
- [ ] Add/observe RED Bank parser tests for ready/unavailable/unknown/absent decorator, owner mismatch rejection, no second availability request; implement optional parsing and immutable service username/options.
- [ ] Rerun new Receiz test and Bank `npx vitest run tests/public-booking.test.ts tests/booking-link.test.ts --configLoader runner --no-cache`; require GREEN.
- [ ] Review/commit only Task 1 owned paths after root permits execution; exclude other dirty work.

### Task 2: Real booking context, all slots and shared-link parity

**Files:** Receiz `app/lib/world/runtime.ts`, `guestProfile.ts`, `profileConversationBooking.ts`, public world route/stream route, `app/lib/calendar/server.ts`, native shared option normalizer; tests `app/lib/world/__tests__/worldProfileRouteContract.test.ts`, `profileConversationBooking.test.ts`, relevant calendar option tests.

**Interfaces:** Add internal `bookingAvailability?:PublicCalendarAvailabilityView|null` to `WorldPublicProfileContext`; preserve `view.booking.slots.slice(0,6)`. Thread normalized `PublicBookingLinkContext` as non-authority data through existing preparation and accepted proposal (optional on legacy accepted proposals so their existing default-context confirmation remains valid); confirmation passes those exact normalized options into `createPublicCalendarBookingByUsername`.

- [ ] Write RED real-runtime tests: choose valid slot 8, ask for different day, reuse prior name/email, required custom question once, shared-link duration/timezone/question override parity, booking-focused prompt, public preview still exactly six, normal profile/private/meeting Twin prompts unchanged.
- [ ] Run `node --conditions=react-server --import tsx --test app/lib/world/__tests__/worldProfileRouteContract.test.ts app/lib/world/__tests__/profileConversationBooking.test.ts`; verify failures describe truncated/default-only context.
- [ ] Implement full internal availability from the already-loaded native result; use it in get_current_availability and prepare_booking. Normalize shared-link context with the existing calendar validators; preserve defaults when absent. No new availability discovery just to replace an already-held source.
- [ ] Scope booking priming to validated Bankeiz booking page context. Make context explain purpose, real options and natural intake; retain existing runtime policy, owner proof brain and exact-source contact validation.
- [ ] Extend the existing accepted proposal with normalized calendar context and verify it again on confirmation; changed owner/visitor/thread/parent/options cannot confirm a different review. Do not accept model-provided consent or bypass overlap/idempotency/native meeting/invitation paths.
- [ ] Rerun native route/booking/calendar tests; require GREEN and verify unknown booking outcome is never reported booked. Review/commit only owned Task 2 paths.

### Task 3: Per-owner public continuity, stream and safe retries

**Files:** Bank new `server/public-booking-conversation.ts`, `src/receiz/public-booking-conversation.ts`; modify `server/bank-api.ts`, `public-booking.ts`; tests new `tests/public-booking-conversation.test.ts`, `tests/public-booking-relay.test.ts`, existing `tests/public-booking.test.ts`.

**Interfaces:** Implement route/controller contracts above. Reuse cooperative relay cookie, bounded input/SSE and native accepted-source patterns without copying its hardcoded bjklock singleton/global transcript. Existing availability request establishes cookie; derive owner/link-scoped thread server-side. No separate continuity GET.

- [ ] Write RED tests for one open GET, no model/welcome call, same cookie across read/message/manual submit, owner/thread isolation, ignored forged owner/auth headers, exact request retry after interrupted stream, accepted parent linkage, rejected/released/indeterminate operation handling, complete accepted reply with large optional performance ignored for text delivery, no fabricated booking.
- [ ] Run `npx vitest run tests/public-booking-conversation.test.ts tests/public-booking-relay.test.ts tests/public-booking.test.ts --configLoader runner --no-cache`; verify intended RED.
- [ ] Implement public relay GET/manual POST/stream dispatch through existing Bank API adapter. Preserve status/errors, actual booking receipts and accepted native memory. Do not alter `nativeFetch` owner credential/allowlist boundary.
- [ ] Implement controller snapshot/subscription, draft, send/retry/dispose, pending exact operation and last accepted parent. A new owner/link aborts old work; late events cannot enter another controller. No unsent form draft becomes an owner memory record.
- [ ] Rerun tests; verify no extra open request, no duplicate native booking after unknown result, stable streaming message identity and native source mismatch rejection. Review/commit owned Task 3 paths.

### Task 4: Mounted conversation/calendar experience

**Files:** Bank new `src/features/booking/BookingConversation.tsx`; modify `PublicBookingPage.tsx`, `booking.css`, `ProfileBooking.tsx`, `main.tsx`; tests new `tests/booking-conversation.test.tsx`, existing `public-booking-page.test.tsx`, `profile-booking-first-open.test.tsx`, `booking-timezone.test.tsx`, `booking-render-work.test.tsx`; browser fixture/script next to existing booking checks.

**Interfaces:** Consume one `Service=ReturnType<typeof createPublicBooking>` and one conversation controller per selected owner/link lifetime. Keep existing day/slot/step/draft/confirmation/unknown-result/submission lock state in PublicBookingPage. The manual layer uses that same existing subtree, not another booking component/hook.

- [ ] Write RED tests for initial ready→chat and absent/unavailable/unknown→existing calendar; first held source chooses mode once, later capability refresh cannot swap it; no before-tap reads; hide/reopen uses one service/request.
- [ ] Add RED interaction tests for real streamed turns, Enter/Shift+Enter/IME, unchanged unknown manual outcome, all draft/scroll/day/time/timezone/questionnaire preservation after repeated overlay transitions, no covered-composer keyboard interaction, owner change isolation.
- [ ] Run `npx vitest run tests/booking-conversation.test.tsx tests/public-booking-page.test.tsx tests/profile-booking-first-open.test.tsx tests/booking-timezone.test.tsx tests/booking-render-work.test.tsx --configLoader runner --no-cache`; verify intended RED.
- [ ] Implement compact owner/logo header, booking introduction as presentation, bounded transcript/composer and immediate feedback. Choose initial mode once from first held availability; preserve regular calendar content and behavior.
- [ ] Place the existing manual calendar/details/confirmation subtree in a same-height opaque layer anchored to all four chat-box edges, downward entry, internal scroll, inert covered chat, Back/Escape restoration and reduced-motion behavior. Preserve mounting/state; set editable controls ≥16px.
- [ ] Rerun targeted tests; render 320/390px mobile and desktop. Browser assertions: no document horizontal overflow; manual layer bounding rectangle contains composer; computed editable sizes ≥16; Enter/IME behavior; repeated Back restores actual text, selection and scroll.
- [ ] Capture desktop/mobile actual UI screenshots/recording; contradictory visible evidence blocks completion. Review/commit only owned Task 4 paths.

### Task 5: Integration and release evidence

**Files:** Affected source-bound booking/product preview outputs only if source rendering changes; one validation note under `docs/validation/`.

- [ ] Run all Bank booking/cooperative/meeting tests plus `npx tsc --noEmit --pretty false --incremental false`; run new native eligibility/context/booking tests and existing account-entry freeze if shared identity/storage is touched. Run `git diff --check` over owned paths.
- [ ] Run the repository build/preview guards. Regenerate only outputs whose actual source changed and inspect their diff; do not include unrelated agents' generated outputs. Run the full release-required gates root selects for integration and report every failing/unrun boundary by name.
- [ ] Use controlled native fixtures to prove free real-brain booking review→later yes→one native event, native meeting link and actual inviteSummary; test slot taken between review and yes. Do not send live invitations or create live appointments for QA without the existing user's relevant authorization.
- [ ] Obtain independent final source/whole-diff review; address concrete findings with RED→GREEN tests. Record exact commands, visual evidence and source boundaries in validation note. Root reviews paid-booking source coupling before any claim of paid-flow completion.
- [ ] Commit only owned reviewed changes on main after verification, leaving all other dirty work intact; report commit(s), checks, visual evidence and no truth downgrade.

## Exact remaining mechanics boundary

The native calendar GET supports question overrides in its route-local parser, while `loadPublicCalendarAvailabilityByUsername`/`createPublicCalendarBookingByUsername` presently use saved question templates; public Twin preparation also only sees the six-slot public view. Task 2 explicitly repairs this parity through existing normalized calendar context and the accepted proposal, not a client authority wrapper. Root's pending billing/source audit must decide how a separately configured paid appointment is represented in that same accepted tuple before implementation; this plan adds no price/payment schema and makes no bypass assumption.

## Plan self-review

Spec mapped to Tasks 1–5; each Review Focus item has an owning RED test. Decorator/interface names are consistent; unknown capability never asserts Free. Existing manual state is reused, no parallel hooks. Both repositories have explicit owned paths. No production edits, new dependencies, new permission layer or migration are part of this planning artifact.
