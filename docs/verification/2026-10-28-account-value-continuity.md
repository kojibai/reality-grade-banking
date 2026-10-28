# Account value continuity

The authenticated Wallet response already carries the selected current balance,
its Original valuation operands and recorded movement history. Bankeiz reuses
these inputs for the header, details and chart. Opening details or advancing Kai
adds no request and grants no financial authority.

## Prior money plus Original earning

For a newly earning account, the existing Wallet response carries the fixed
opening cash adjustment alongside the movement totals and own signed-Original cohort. Bankeiz
uses that adjustment once. A later current response and a complete chart describe
the same composition; their adjustments are never added together. Existing
legacy compositions continue to use their original formula.

The transition belongs to the earning update, not to the first historical glyph
signature. Previously signed eligible Originals qualify without resetting the
account to their signing date or to zero.

Only an accepted opening basis is immutable. An unaccepted display candidate
can disappear if the last eligible Original is hidden before acceptance. An
accepted basis remains present even when the current earning cohort is empty.
Unsigned Originals do not contribute earning.

## Completed results and late reads

- A completed financial result publishes its exact endpoint immediately.
- A late ordinary read cannot erase or change an accepted cash basis.
- If a completed result omits updated calculation operands, older operands are
  retained as `historicalContextOnly`. They cannot calculate current value,
  including when the new result happens to equal the old captured amount.
- A later matching current Source can resume deterministic display growth.
- Full chart updates preserve recorded amounts and coordinates. Optional known
  postbalance evidence survives omission by another display composition; a
  supplied contradictory postbalance is rejected.
- On a known composition upgrade, the first existing history request asks for
  the complete required prefix, avoiding a suffix request followed by a retry.

Historical actions keep their original proofs, inputs, Kai coordinates and
arithmetic. A current projection does not rewrite those actions or manufacture
missing past Phi balances. Exact source units are never inferred by converting
the displayed dollar total backwards.

## Regression evidence

`wallet-cash-composition.test.ts` covers cash continuity, recorded Reserve caps,
Original spending, immutable accepted bases and candidate removal.
`current-wallet-valuation.test.ts` covers current/chart composition continuity
and network-free live valuation. `wallet-send-adoption-race.test.ts` exercises
the production adoption helper with paused chart work and completed results.
Its same-amount completed-result regression reproduced an erroneous revaluation
before the context-only correction.

The public Market curation also preserves an Original's supplied frequency in
the existing response. It performs no lookup, recomputation or historical edit.

These are account composition and presentation corrections. They do not qualify
the separate unfinished offline Send/Buy/Sell execution flow.

Final qualification: all 4,085 tests in 662 files passed, with zero failures or
skips, using the exact locked dependencies. The complete production build passed,
including offline-shell and source-archive verification.
