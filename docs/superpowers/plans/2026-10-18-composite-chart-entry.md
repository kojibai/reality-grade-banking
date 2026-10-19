# Composite chart and account entry implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. The user has directed inline execution and one next commit containing the chart and opening experience.

**Goal:** Show calculated Settlement, Reserve and combined value history from retained object origins and account movements, with fitted periods and settled account entry.

**Architecture:** Reuse Receiz's existing `projectGlyphEconomy` and `composeWalletDisplayedTotals` read law; do not confuse this display model with a public account proof or spending authority. Retain its owner-bound operands and original account movements privately, fit all six periods before admission, and calculate only new endpoints after initial construction. Keep native statements and locally committed Note successors above the legacy read model.

**Tech stack:** React, TypeScript, exact integer wallet arithmetic, the existing v129 valuation primitives and encrypted identity vault.

**Spec:** User instructions in this conversation: use the capitalization chart model, retain both rails, first object/event anchor, full-screen explicit login, no repeated opening animation on device resume.

## Global constraints

- SDK, MCP and AI Skills stay at 129.0.0.
- No SQL migrations, live transactions, pushes, deployments or edits to the Receiz/Crystal working branch.
- Use the isolated Receiz main worktree for a necessary authenticated source reader.
- Never serve private source captures publicly or invent historical owners, receipts or financial authority.
- Do not commit until the chart, its real account source and opening experience have been checked together.

## Review focus

- A public subset cannot represent a full private account portfolio.
- Profile seeds cannot count twice alongside object intrinsic value.
- A pending or consumed Note head cannot be overwritten by display calculations.
- Every rail's movement and percentage must use the selected period.
- An old authenticated source cannot trim retained history or replace a newer account head.

### 1. Reusable composite source and deterministic projection

- [x] Pin the exact profile glyph inputs, source read fields, wallet movements and Reserve projection used by the current host wallet.
- [x] Add a bounded owner-bound authenticated display source through the existing wallet read capability; no new financial contract or SDK version.
- [x] Test first sealed origin, incoming/outgoing ownership coordinates, all ledger directions, profile seed exclusion, both rails, endpoint reconciliation, malformed/foreign inputs and a superseding local Note head.
- [x] Retain exact source privately; build all six fitted ranges once and append only newly entering edges/endpoints.

### 2. Account preparation and period parity

- [x] Wire retained source into account preparation before the visible account frame.
- [x] Keep source capture, computed valuation and recorded history distinguishable. Calculated history uses the same scope explanation as capitalization.
- [x] Test all six account/object periods on a real older object and the authorized BJ Klock account; record actual start/end coordinates, first frame contents and requests.

### 3. Explicit opening and device resume

- [x] Make explicit identity inspection/import/create a full viewport surface using the existing seal artwork and real completion checkpoints.
- [x] Resume retained device identity without replaying the explicit opening animation or waiting for optional network enrichment.
- [x] Check cold/warm resume, source outage, identity removal/replacement, reduced motion, mobile and desktop.

### 4. Commit gate

- [x] Run targeted regression checks, the complete Bankeiz suite and production/offline/source build sequentially.
- [x] Run relevant Receiz source-reader checks if that repository changes.
- [x] Review the immutable diff, confirm both main checkouts and commit locally. User pushes.

### Follow-on work after this commit

- Shared market/ledger media and full-text reader; caption link pills; card owner/seal details and pack-opening additions.
- Offline Note registration: identify the unsupported returned WebAuthn format without weakening custody qualification.


## Qualification record

- The new source is an optional, owner-bound extension of the existing authenticated `GET /api/connect/wallet/me?history=1` read. It retains canonical profile glyph inputs and all monetary rows, including rows omitted from the public activity projection. `after` is an overlapping append cursor; retained original movement IDs cannot be rewritten.
- Each capture must reconcile exactly to the authenticated wallet's total, Settlement, Reserve and Phi before chart adoption. The authorized real-account capture matched all four fields exactly. The browser test supplied that captured optional field privately because the new host route is not deployed yet; production activation requires deploying the Receiz commit.
- Display history uses current admitted objects from their sealing coordinates plus recorded wallet movements, following the capitalization-style request. It is explicitly a calculated portfolio view, not proof of every past owner/visibility interval or a substitute for a public account proof. No missing historical financial authority is invented.
- The exact unsigned v129 valuation arithmetic is generated from the pinned SDK, with trace collection/signing omitted from the display evaluator. All 360 parity cases match the SDK; the build rejects source drift.
- Ordinary local pulse advancement retains the held past and computes new endpoints. A newly synchronized movement or object interval reconciles only the affected calculated suffix and adds its exact before/after edges. Tests cover a payment learned inside a locally advanced interval, multiple object births/exits, older server quotes and stronger local Note heads.
- Browser checks witnessed six distinct windows on an older proof object and the authorized account, with no horizontal overflow. All/1Y correctly coincide when the source is younger than a year. API requests were blocked for retained-device reopening and period switching.
- Measured device-identity restore: 507 ms after module loading; retained account preparation: 0 ms. Cold development-page first account frame: 2,284 ms, chart already present, no explicit-login animation. These measurements do not establish a universal sub-second cold login or eliminate initial source preparation.
- Explicit opening fills the viewport on mobile/desktop, reports actual identity/account checkpoints and respects reduced motion. Returning device identity does not replay it.
- Complete Bankeiz suite, TypeScript and production/offline/source build passed. Receiz chart source checks, account-entry freeze suite and TypeScript passed. No SQL, SDK-version, financial execution, working-branch, push or deployment changes.
