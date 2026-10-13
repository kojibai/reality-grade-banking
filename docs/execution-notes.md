# SDD ledger — plan: docs/superpowers/plans/2026-10-12-receiz-bank-console.md

Execution: approved native implementation with a final independent review.
Base: 8bb4f5d.
Pre-flight: Task 1 shell consumes Task 2 state only after it exists; use presentation props, not a second balance store.
Pre-flight: Tasks 3–5 share BankOperation and exact rail strings; all demo mutations go through one atomic reducer.
Pre-flight: real SDK runtime verification custody must remain outside persisted BankState.
Ruling: this was an empty, dedicated project directory with no repository or existing code; initialize a local feature branch and build in place — no unrelated checkout can be affected; cost if wrong: work would need moving to a managed worktree.
Ruling: stocks and programmable-money Rules were added by the user after approval; extend the existing asset deposit and account-detail flows — no new navigation or live financial authority; cost if wrong: adjustment to intake copy and rule controls.

Task 1: user correction — Deposit appears only in bottom navigation; Send and Receive replace the three central actions. Updated image reference and spec.
Task 1: complete (commits 8bb4f5d..7eddd19, tests: npm run build → ✓ built in 944ms)

Task 2: Ruling: user replaced automatic bank acquisition with custody, divisible ownership, bank/market liquidation and buy-back. Account total now includes held assets once, with liquid rails separate — direct latest user instruction; cost if wrong: balance presentation and custody transition changes.
Task 2: Ruling: deterministic exact USD math is explicitly demonstration-only; actual v129 quote/proof readers remain the live authority — avoids blocking first paint on a large SDK module; cost if wrong: demo display can differ from an admitted live price basis.
Task 2: RED observed absent model modules; GREEN 15 account/money contracts. Currency backing cases remain owned by Task 4.
Task 2: complete (commits 7eddd19..c892eb1, tests: npm test →    Duration  261ms (transform 43ms, setup 0ms, collect 54ms, tests 14ms, environment 0ms, prepare 95ms))

Task 3: actual v129 verifier tests reject ordinary text and serialized verification claims; verification grants neither value credit nor ownership. Custody deposits preserve whole/fractional ownership, with platform/market liquidation following separately.
Task 3: complete (commits c892eb1..4a697a4, tests: npm test →    Duration  508ms (transform 91ms, setup 0ms, collect 115ms, tests 225ms, environment 0ms, prepare 162ms))
Task 4: complete (commits 4a697a4..0d8bdb7, tests: npm test →    Duration  374ms (transform 106ms, setup 0ms, collect 276ms, tests 177ms, environment 1ms, prepare 323ms))

Task 4: fractional sale and buy-back exercised in Browser/IAB: 1 oz → 0.5 oz → 1 oz, Bank vault unchanged. All 30 contracts green. Original redemption quantity regression RED→GREEN.
Task 4: Ruling: integrate Task 5 sheet routing alongside Market to make ownership sending and proof actions respond immediately — common state and UI contracts; cost if wrong: a larger combined integration commit needs review.
Task 3: browser file chooser stalled; ordinary-file proof rejection was established by actual v129 verifier tests, not a completed browser upload. No browser-upload pass claimed.
Task 5: complete (commits 0d8bdb7..0d8bdb7, tests: npm test →    Duration  445ms (transform 314ms, setup 0ms, collect 523ms, tests 205ms, environment 1ms, prepare 508ms))

Task 6: Ruling: browser file chooser stalled; actual v129 tests establish ordinary-file rejection, browser upload remains unverified — do not claim an unobserved browser pass; cost if wrong: an upload-specific defect may remain.
Task 6: offline production restart restored known state; all emitted chunks cached and static Vary regression RED→GREEN. Direct-link Close and outgoing ownership activity regression RED→GREEN. Browser QA details in docs/verification.md.

Final: fixed rational exchange overcharge — large-supply exchange preview/execution tests RED→GREEN, suite 49/49.
Final: fixed accepted-state restore loss — bounded credit/custody and full-journey restore tests RED→GREEN, suite 49/49.
Final: fixed selected chart index across period changes — mounted React pointer/period interaction test RED→GREEN, suite 49/49.
Final: fixed old-client lazy chunks lost on update — two-version worker lifecycle test RED→GREEN, suite 49/49.
Final: Ruling: live backend operations set aside by reviewer stay outside approved frontend release — real services require authority and qualification; cost if wrong: separate backend build.
Final: Ruling: successful live ledger and browser upload remain unverified — concrete failed read/chooser recorded, no inferred pass; cost if wrong: integration-specific defect remains.
Final: Ruling: text enlargement remains documented unverified — no observed zoom pass; cost if wrong: zoom-specific layout defect remains.
Final: Ruling: shared-owner redemption agreement remains backend qualification — full-ownership guard prevents unilateral whole redemption; cost if wrong: fractional redemption terms need implementation.
Final: Ruling: update patched test tooling and compatible Underscore transitive patch while retaining Receiz129 pins — actual audit advisories verified with primary notices; cost if wrong: dependency compatibility requires rechecking.
Final: no deferred minors.
Task 6: complete (commits 0d8bdb7..e3a8e5b, tests: npm test →    Duration  377ms (tests 34%, environment 29%, import 17%, transform 15%, worker 5%))

Final: Ruling: preserve local feat/receiz-bank for review — user approved building here; this new repository has no base branch or remote to integrate into; cost if wrong: later merge/publish remains a separate action.
