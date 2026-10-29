# Available balance context implementation plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Explain a zero spendable balance only when the current evaluated value is below previously used value; remove the explanation as soon as the difference clears.
**Architecture:** Carry the exact difference as optional display material from the existing single valuation pass into its existing wallet history point. Read only the matching latest displayed point. Add a restrained disclosure beneath the balance that opens the existing balance popover. Keep Settlement visible for this edge case and put the detailed explanation and negative intermediate value inside its existing dropdown. The hint targets and expands that exact dropdown through the existing sheet route. Financial rules, proof sources, ledger, execution and account entry remain unchanged.
**Tech Stack:** TypeScript, React, existing deterministic wallet projector, Vitest.
**Spec:** User instructions in this chat; Receiz truthful-speed and source-never-representation-authority invariants.

## Constraints and review focus
- Preserve the existing value and change hierarchy; the front hint sits below the chart.
- No new network request, valuation pass, timer or financial mutation.
- Every existing amount remains identical; ordinary zero and positive accounts gain no extra UI.
- A missing, mismatched, foreign, malformed or older point supplies no number.
- Display the current difference, not a fixed future sell target. One cent beyond the difference is conditional on current values.
- Value growth and credits can remove the disclosure without a sale.
- No changes to another agent's dirty files.

## Tasks
- [x] RED projection arithmetic, zero-only/matching-point disclosure, automatic removal, interactions.
- [x] Implement the optional point projection and restrained disclosure.
- [x] Focused/full tests, types, generated previews/build and mobile visual verification.
- [x] Independent final review and scoped main commit.

## Verification
- Full Bank suite: 4,468 tests in714 files passed before the separately tested request-validator/calendar correction.
- Final request/calendar/retention suite:112 passed; final TypeScript build passed.
- Original availability projection and inspection changes were tested RED then GREEN. Independent final review findings on retained expansion and dialog scroll timing were fixed with failing regressions first.
- Browser320/390/768px: exact Settlement dropdown visible below sticky header,12px restrained disclosure, recovery removes hint, ordinary positive-account screenshots byte-identical, no browser errors or overflow.
- Production build passed, including generated product-preview CSS and final offline/source/archive checks.
- All21 unrelated dirty files are protected by byte hashes during scoped integration.
