# Existing Receiz messaging transport implementation plan

> **For agentic workers:** Use inline `superpowers:executing-plans`; the independent Receiz host bridge is delegated under the parallel-agent workflow. The user authorized execution and main commits, retaining the push.

**Goal:** Carry existing Receiz chat/AI/call HTTP contracts through Bank's no-cookie native transport, with real incremental AI response streaming.

**Architecture:** Keep route authorization and message/call effects in Receiz. Add an exact chat route allowlist and one Web-standard bounded native relay reused by the Vite adapter and production entry. Keep SDK/MCP/AI Skills at129.0.0. No Supabase client, new conversation backend, auto-send retry or invented settled message proof.

**Tech Stack:** TypeScript, Web Request/Response/ReadableStream, Node HTTP, Receiz v129.

**Spec:** `docs/receiz-v129-media-and-messaging-contracts.md`.

## Global constraints

- Omit cookies and redirects, accept only Receiz upstream and exact methods/UUID/query shapes.
- Preserve upstream status/refusal and exact bytes; keep membership/scoped principal checks in Receiz.
- No live conversations, messages, calls, permissions or grants are exercised by tests.
- Stream loss is ambiguous delivery, never a zero-write result or automatic resend.
- Offline Notes and custody remain untouched and last.

## Review focus

- Foreign origins/selectors/duplicate queries and unknown methods must fail before upstream fetch.
- The first AI delta must reach the production response before the upstream closes.
- Cancel/abort must stop upstream reading and forwarding without leaking headers/cookies.
- Truncated/over-limit streams must error rather than append a fake completion or JSON error event.
- Existing binary claims, ordinary JSON and source refusal routes must preserve bytes/status.

### Task 1: Lossless native chat relay

**Files:** `src/receiz/native-chat-paths.ts`, `native-transport.ts`, `server/native-account.ts`, `server/bank-api.ts`; native-chat and production API tests.

**Interfaces:** `permittedNativeChatPath(url:URL,method:string):boolean`; `relayNativeAccount(request:Request):Promise<Response>`. Existing Node middleware adapts Request/Response without buffering streaming output. `handleBankApi` dispatches native requests directly to the same relay before its buffered public middleware adapter.

- [x] Write and run failing exact-route, incremental-production-stream, abort/cancel and byte/status-preservation tests.
- [x] Add allowlist and relay; consume bounded bodies once, forward PATCH as well as POST, enforce bounded streaming with cancellation/backpressure.
- [x] Run focused tests, complete suite/typecheck/build and independent review; commit on main.

## Execution ledger

- Base: Bank `c95c1b3`. Existing proxy buffers complete upstream and middleware output; chat scope exposure is being investigated separately in Receiz.
- Ruling: Reuse a single Web relay for native requests rather than broaden the generic buffered public adapter. This keeps public proof transports unchanged and allows real SSE in development and production.

### Task 2: Same-account messaging composition

**Files:** `native-messaging.ts`, `native-twin.ts`, `native-calls.ts`, `native-calls-sfu.ts`, `native-identity.ts`, encrypted exact messaging consent, config and tests.

- [x] Existing conversation/history/participant IDs, bounded responses, incremental AI events, older-page merge and ambiguous-send preservation; focused tests observed failing before implementation.
- [x] Exact same-identity messaging approval and checked scoped bearer held privately inside Identity Seal closure. Retain only the exact encrypted consent choice; no token in UI or device consent storage.
- [x] Calls use existing server-selected mesh/SFU topology, call authorization and membership. Media begins only on explicit join/start; departure cleans up tracks and membership.
- [x] Owner Twin uses existing owner JSON runtime, metering, memory and proposal-only actions. Selected Bank display excerpts are optional, owner supplied context, never canonical proof citations.
- [x] Complete integration checks and whole-change review.

### Task 3: Approved Bankeiz interface

**Files:** lazy `MessagesPanel`, `CallPanel`, ConsoleShell header entry, existing sheet/back routing, tests and browser fixture.

- [x] Connect Your Twin default, existing Messages inbox, history pagination, direct/group creation, active conversation calls and optional selected Bank context.
- [x] Suspend background reads/streams/media on hiding or leaving. Preserve retained conversation and unsent draft; no automatic resend.
- [x] Verify mobile width, keyboard/input sizing, real integration against controlled HTTP fixtures, and unchanged first paint.
- [x] Commit on main without pushing; document host deployment and exact application registration prerequisites.

## Approved interface and rulings

- User approved the mobile prototype and explicitly requested production execution. One restrained header icon beside ID; Your Twin first, Messages inside the same sheet; no new bottom navigation or additional account.
- Ruling: chat authorization stays in Receiz's existing OIDC validator and service routes. Host-only chat scope exposure does not modify the frozen v129 SDK catalog or create a second chat backend.
- Ruling: no owner-private web Mind route exists. Use the existing owner Twin engine and clearly disclosed selected Bank excerpts, retaining its Business/credits entitlement. Do not substitute generic group agents, public visitor context or a new Mac dependency for the owner's Twin.
- Ruling: existing owner Twin API returns its bounded prior API-lane memory only after an ask; it is not an all-memory/private-Mind export. The interface must preserve this boundary.
- Ruling: a 5xx or lost non-idempotent message/group response has an unknown outcome. Refresh retained server history before another send; never retry automatically.
- Ruling: keep independent domain bearer access while valid so ordinary Wallet refresh does not force redundant chat grants. Revocation and membership remain checked by Receiz on each request.

## Current execution evidence

- Task 1 transport: original focused route/production stream/cancel/bounds tests, independent review, and prior complete Bank suite 254 files / 1,494 tests passed before new UI composition.
- Task 2 root: 59 focused transport, identity, messaging and selected-context tests passed; subsequent 5xx ambiguous-outcome regression observed red then green (49 identity/messaging tests).
- Task 3 header and browser-back contract: 2 tests observed red then green.
- Independent call/Twin workers retain their focused evidence in the verification notes; final whole-change checks still pending.

- Final review: one fresh whole-change review, no Critical issues. All nine Important findings fixed with focused regressions. No deferred minors were reported.
- Final Bank suite:262files /1,566tests passed; TypeScript and complete production/offline/source-archive build passed. Final compact-height CSS correction was checked in the browser and included in the final build.
- Final host integration rerun:49tests passed; two harness failures (SSR React-server condition and missing synthetic session environment) were corrected without source changes. Those scope render/parity suites then passed7tests. Prior full host TypeScript/account-entry/law gates remain recorded in upstream verification notes.
- Receiz main commit:4caf3a54f. No deployment, application-registration mutation or push performed.
