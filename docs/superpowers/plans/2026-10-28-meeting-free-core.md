# Meeting entrance and optional Twin plan

> Execute inline using existing primitives; preserve other agents' work on main.

## Binding specification

- /meet/ Start a meeting only navigates to the meeting entrance. No account or
  room is created until the person chooses Enter, Identity Record or PBI there.
- Existing native create/restore/import and openPbiAccount remain the entry
  authority. A successful explicit recovery continues to that meeting.
- Video, voice, chat, payments, calendar, capture, ending and meeting proof work
  without a Twin. Only Twin calls require its access/permissions.
- End preserves the meeting record; automatic Twin wrap-up requires known host
  access. A rejected Twin ask becomes a conversational upgrade/setup response.
- Show a quiet inline Business review and existing-ID entry in the Twin pane.
  Imported identity re-enters under its actual role; it never becomes the host
  merely by having a paid plan.
- Passport-shaped Identity Record uses a person silhouette and key, no globe.
- Keep editable mobile control text >=16px without disabling manual zoom or
  reducing large amount fields. Use static CSS, no focus-time network or observers.
- /meet/ demonstrates actual Messages -> Calendar -> Meet now -> Join controls.

## Preflight

Primitive: Identity, account continuity, call membership, meeting proof, Settlement.
Source: Existing native identity/PBI, accepted calendar invitation and actual call
state; actual host runtime authorizes shared Twin. Retained access is presentation.
Risk: identity/session/ownership, first paint, paid-tool scope, presentation drift.
No new authority, credential, source fallback, payment or database schema.
External mechanics: browser CSS sizing only. No external product model.
Baseline: current main plus our d2b23c2/d55eb06 and Receiz b147151e2.
Contracts: meeting-identity/session, entrance-start UI, free-End/upgrade UI,
mobile rendered input sizes and interactive public meeting-start walkthrough.
Uncertainty: physical iPhone keyboard/biometrics and later deployed host timing.

## Tasks

- [x] Recovery continues to meeting; entrance precedes account/room creation.
- [x] Free meeting lifecycle and optional shared/own Twin access UI.
- [x] Static input sizing and person-based Identity Record icon.
- [x] Real product creation tutorial on /meet/.
- [x] Targeted RED/GREEN, full isolated suite/build, browser visual evidence,
      entry freeze, fresh scoped review, commit only owned main changes.

## Implementation ledger

- Recovery, explicit creation entrance, free End and optional upgrade: focused tests observed RED then GREEN (9 tests in prior session). Cancellation and accepted identity-switch coverage preserved.
- Ruling: Remove the experimental host-plan read from admission. Existing Twin routes already authorize every ask; a plan read must not add a dependency or DB latency to free meeting admission. Known local access paints immediately; an unknown shared entitlement is resolved only when someone explicitly asks the host Twin. Cost: a guest may see the optional upgrade after that first ask rather than before it.
- Shared the exact Messages navigation and Calendar shortcuts components with the build-only walkthrough. No mounted public account, request, room, payment or identity action.

- Final review found three Important identity handoff defects: failed admission hid the retry error; same-account fresh Identity retained disposed capture closures; active capture finalized after canonical identity disposal. All enter one fix pass.
- Fixed first two with immediate old-room removal plus explicit identity revision; failed-admission private-room contract observed RED then GREEN. Added same-viewer remount contract.
- Fixed captured-media ordering by composing existing stop/finalize before canonical import/PBI; the recording-identity contract observed recovery-before-finalize RED, then GREEN. Cancellation keeps the call and retained captured material. No new identity authority.
- Review boundaries: physical iPhone biometric/focus behavior and deployed host/billing/media were not exercised by the read-only reviewer. Controlled browser evidence and local tests cover their local integration boundaries; no live mutation is claimed.

- Visual evidence rejected the first tutorial layout: the existing centered navigation transform clipped the new example. Added browser bounds coverage, observed RED at 320px, corrected only the inert wrapper, then GREEN at 320/390/440/768/1280px.
- Checks: 4,107 tests / 668 files, isolated production build, 57 canonical entry-freeze tests, visual/primitive/repo-only doctrine gates and all three governance checks pass. No production DB/account/call/billing mutation. Final browser command is wired into test:browser and cleans up its own server/cache.
- Fresh review: three Important findings fixed; none deferred. Reviewer’s physical-device/live-service boundaries remain explicitly unverified. Ruling above preserves admission latency; a guest’s first explicit shared Twin ask may discover an upgrade rather than preloading a plan source.

- One full-suite run hit an existing one-second money-chat assertion during a cold lazy-module transform; all 85 Messages tests passed in isolation. Aligned the fixture's existing cold-module setup by importing `money-conversation` alongside its other lazy dependencies before tests. No UI timeout was relaxed and no money behavior changed. Final full gates rerun after this harness correction.
