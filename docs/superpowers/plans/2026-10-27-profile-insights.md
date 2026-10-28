# Profile Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Preserve unrelated work; the user pushes.

**Goal:** Public Insights and a retained private owner dashboard without adding profile startup work.

**Architecture:** Lazy presentation consumes held public counters and an identity-bound native analytics port. A single explicit protected read supplies native time buckets and breakdowns; account lifecycle owns retention.

**Tech Stack:** Existing React, CSS, Sheet, ValueChart and Receiz native SDK transport.

**Spec:** `docs/superpowers/specs/2026-10-27-profile-insights-design.md`

## Global Constraints

- No profile-load requests, polling, additional dependency or fabricated history.
- Private data never enters the public source or another account's view.
- Existing prices, supply, payment rules, routes and account entry stay unchanged.
- Native provider implementation belongs outside Bankeiz. No deployment or live financial actions.

## Review Focus

- Owner changes while the private read is in flight.
- Missing, non-finite, negative or oversized native metrics.
- Aggregate public totals must not become a historical curve.
- Reopen and period/metric changes reuse the same snapshot.
- Empty and truncated native histories remain accurately labelled.

## Task 1: Qualify and connect the retained owner read

**Files:** `src/receiz/profile-insights.ts`, `src/receiz/profile-insights-access.ts`, `src/receiz/native-identity.ts`, `src/receiz/native-transport.ts`, `src/features/account/PublicProfilePortal.tsx`, `tests/profile-insights-source.test.ts`.

**Interfaces:** `ProfileInsightsSource` binds `accountUid`, `known()` and `read(refresh?:boolean)`. It consumes only the matching protected native analytics response. Profile portal registers that source for the already-open identity.

- [x] Write and run red tests for same-owner admission, malformed data, one coalesced read, reuse and closed-identity refusal.
- [x] Qualify the native same-owner read with required app-state scope. Test owner selection from admitted caller, not query/body.
- [x] Implement the bounded snapshot projection and lifecycle port. Run focused tests; expected all pass.

## Task 2: Public and private panels

**Files:** `src/public-explorer/ProfileInsights.tsx`, `profile-insights.css`, `PublicProfilePage.tsx`, `tests/profile-insights.test.tsx`.

- [x] Write/run red rendered tests: a visitor opens held counters with no request; owner timeline appears from native buckets; filters/reopen reuse; identity change immediately removes private contents.
- [x] Replace the text-only owner entry with the quiet icon for all visitors. Lazy-load the panel; render no hidden chart work before intent.
- [x] Render period metrics, native timeline, originals, listening/commerce, traffic and recent activity. No raw payload or fabricated records.
- [x] Run focused tests, complete suite/build and browser checks, review exact scope, then commit finished source on main.

## Task 3: Ready retained profile value chart

**Files:** `src/receiz/market-projection/useProfileGrowth.ts`, `src/public-explorer/profile-prices.ts`, `PublicProfilePage.tsx`, `tests/profile-value-history.test.tsx`.

- [x] Test the profile paints before worker preparation, the prepared curve is on first open, navigation/reopening reuses it, and closed pulses send no jobs or reads.
- [x] Move the same first curve preparation after profile paint; weakly retain one current derived result and signed-item selection per immutable collection. Keep the existing worker math and financial inputs unchanged.
- [x] Verify full history/math regressions and browser paint; include in final qualification and scope review.
