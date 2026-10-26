# Messaging Calendar and Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Connect the approved Messages, Contacts, Calendar and booking experience to the same Receiz ID records without adding work to ordinary messaging or login.

**Architecture:** Compose the existing scoped account transport, contact/calendar record operations and public booking service. A lazy account-scoped organizer controller shares reads and admitted display state; focused Bankeiz components present it inside the existing sheet. Preserve existing provider record semantics, identity isolation and financial paths.

**Tech Stack:** TypeScript, React 19, existing Receiz SDK and host primitives, Lucide, Vitest, existing encrypted identity storage.

**Spec:** [Approved design](../specs/2026-10-26-messaging-calendar-contacts-design.md).

## Global Constraints

- Same existing Receiz contacts/calendar/booking records; no duplicate system.
- Zero organizer reads at login or ordinary Messages opening.
- Retained state first; no repeat reads for category taps/search or known range.
- User-controlled writes, no automatic retry or live test invitations/bookings.
- Work here on main, preserve the other developer's files; user pushes.
- Public guests cannot enter private organizer surfaces.

## Review Focus

- Identity switch during a request: discard late results and refuse further old-account writes.
- Signed-out/incomplete/foreign-owner responses: preserve admitted content and report access failure.
- Timezone and daylight-saving boundaries: send actual available slot instants, never a guessed offset.
- Lost response after a write: retain the draft and report uncertainty without automatic duplication.
- Conversation-to-person-to-calendar navigation: preserve draft, scroll, active call and back destination.

### Task 1: Existing record access

**Files:** Receiz owner-access helper and existing contacts/calendar routes; Bank `src/receiz/organizer-paths.ts`, `native-transport.ts`, `native-identity.ts`, `config.ts`; matching tests.

**Interfaces:** Existing cookie flows remain unchanged. Existing app-state read/write scopes admit the verified bearer subject to the same owner operations. `permittedOrganizerPath(url, method)` permits only the required record/booking paths and bounded query coordinates.

- [x] Write failing tests for verified owner/scope, invalid bearer precedence, foreign object access, and narrow proxy paths.
- [x] Run the failures, compose existing authorization/CRUD functions, then run those tests and existing route regressions.
- [x] Add lazy `OpenIdentity.organizer(approved?)` access with explicit consent and account/lifetime checks; no changes to ordinary login or messaging scopes.
- [x] Commit the tested provider access separately from Bankeiz integration.

### Task 2: Shared organizer records

**Files:** Create `src/receiz/native-organizer.ts`, `organizer-retention.ts`, `organizer-types.ts`; extend existing encrypted identity retention; tests.

**Interfaces:** `createNativeOrganizer({accountUid, request, retained?, onChange?, assertOpen})` exposes known contacts/ranges, deduplicated reads, supported contact/event writes and booking settings. It retains only admitted display, never tokens or pending side effects.

- [x] Test no constructor requests, concurrent read reuse, known range reuse, incomplete/foreign responses, write merge and no retries, identity closure and bounded encrypted retention.
- [x] Watch tests fail; implement parser/controller using exact existing wire formats and run them green.
- [x] Verify serialized display excludes credentials and public booking URLs exclude private data.

### Task 3: Approved Messages experience

**Files:** Modify `src/features/messages/MessagesPanel.tsx`, `messages.css`; create focused `organizer/` views and tests.

**Interfaces:** Lazy `OrganizerPanel` takes the open identity, requested screen/person, back and message callbacks; it shares one controller for that identity. Existing Messages owns conversation/draft/call state. Organizer panels never replace the identity session.

- [x] Test Contacts/Calendar controls, consent, same-record creation/edit/import, appointment preparation, availability/custom-link controls, copy check and preserved conversation draft/back state.
- [x] Implement the exact approved visual using existing sheet and tokens; no new dependency or nested dialog.
- [x] Test request counts: ordinary Messages zero, switching/searching retained views zero, one request per missing collection/range.
- [x] Run existing Messages/typing/calls/credit/payment regressions and types.

### Task 4: Public booking and full qualification

**Files:** Bank booking route entry/views and narrow public transport; existing route/build configuration; integration and rendered tests.

**Interfaces:** `/book/:username` presents existing public slot and booking operations with the same supported override parameters and confirmation record. Owner controls remain absent.

- [x] Test default/custom links, timezone/DST, unavailable/taken slot, guest questions, uncertain outcome, confirmation and guest privacy with synthetic fixtures.
- [x] Implement route, booking UI and existing confirmation/ICS links without private reads.
- [x] Run targeted tests, full unit suite, types, production build, existing browser gates and source/native checks appropriate to the change.
- [x] Capture mobile screenshots/DOM, assess request counts and initial bundle boundary; one fresh whole-integration review, fix material findings, then commit owned files on main.

## Execution record

Visual approved. User requested implementation here and preserved main/push workflow. Calendar/contacts now precede the unfinished offline transaction integration. Provider access must be resolved against the existing primitives before shipping controls; simulated preview behavior never counts as an implemented service.


## Qualification and rollout

The final integration review found and corrected four cases: public booking and owner Calendar now share the selected record Source; pre-read contact writes remain partial until a complete read merges them; calendar pages require explicit owner/completeness/pagination admission; guest details survive a rejected slot and time change. Regressions failed before the corrections and passed afterward. See [Messages organizer behavior](../../messages-organizer.md).

The unit suites, types, production build and local mobile rendered journeys qualify the implementation with synthetic records. No real message, invitation, booking or financial operation was submitted. The full native tool path still requires the application's registered scope and the same owner's configured native runtime. These commits do not provision or deploy that runtime. Push and deploy the service update before the Bankeiz interface, which consumes its admitted Calendar page envelope.

Ruling: provider commits were consolidated after the whole-integration review rather than committed before the interface tasks. This keeps the shared calendar correction in the same qualified change; it costs a larger review range, covered by one fresh full-integration review and focused regressions.

Ruling: rendered browser qualification used the actual components and synthetic transports through the available in-app browser, rather than launching a second browser automation runtime. Existing unit/build/source checks were run unchanged. This provides local visual and interaction evidence, not physical iOS or production-host execution evidence.

Offline Send/Buy/Sell remains a separate unfinished integration and is next after these Messages changes.
