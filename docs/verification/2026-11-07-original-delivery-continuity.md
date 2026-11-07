# Original delivery continuity — 7 November 2026

## Observed failure and boundary

The owner-held Original “The Money Is Ready. The Banks Can Catch Up.” was sealed
successfully. Its reported public delivery result was
`PROFILE_SHOWCASE_COMPLETE_TRANSPORT_INVALID`. Its source digest is
`a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc`.

Bankeiz's compact accepted-transition envelope and the Receiz production
application reader did not agree. Bankeiz's fixture receiver already understood
that envelope, so its passing SDK append test did not establish production
reader compatibility. Receiz main's existing accepted-prefix admission is the
receiving path; the companion Receiz correction extends that path's transport
reader. It does not change the installed SDK, proof formats or financial rules.

The result screen also confused local completion with delivery completion. The
first automatic delivery really started, but clearing creation's busy state
exposed Retry while that attempt remained in flight. Public acknowledgment also
unnecessarily gated the existing local PBI ceremony.

The separately reported upstream 503 on `connect/account-proof` is an optional
account-history enrichment read, not the Showcase publication endpoint. This
repair does not infer or alter the cause of that upstream response.

## Changes

- Observe the existing deduplicated delivery promise without starting another
  attempt. Animate actual delivery; offer recovery only after an unconfirmed
  attempt finishes. Confirmed acknowledgment cannot be downgraded.
- Permit the ordinary Original's existing local PBI ceremony while unsigned
  delivery continues. Preserve backed-publication eligibility. Cancellation
  leaves the exact unsigned Original and its delivery intact.
- Admit the signature locally first, then sequence its delivery after the same
  Original's in-flight unsigned delivery. This prevents a fresh signed placement
  overtaking unfinished bootstrap without delaying the ceremony or making a
  duplicate network request.
- Carry the exact accepted predecessor transport coordinate with a compact
  append. Reuse existing immutable blocks instead of serializing prior child,
  media or witness inventories again.
- On a genuinely new device, follow those immutable coordinates and use the
  existing SDK predecessor/successor admission and persistent node custody.
  Historical Original and imported media bodies are not reopened to append.

No account-entry, identity creation, SDK implementation, financial admission,
navigation or settled-page currentness behavior changes. No timer simulates
success and no network acknowledgment is placed before local admission.

## Local evidence

Qualification uses an isolated copy of the exact owned patch, excluding the
other ongoing Ownership, Ledger, Vault and presentation changes.

- First full candidate suite: 982 files passed; 6,221 tests passed, 11 existing
  skips, zero failures. Final race/cold-hint additions were then qualified below.
  The subsequent full run passed 6,222 tests and timed out in one unchanged
  meeting-preview import while the production build ran concurrently. That
  unchanged meeting file passed all five tests in 0.93 seconds alone. A final
  full run with the build finished was still running when this note was staged;
  no timeout, meeting code or assertion was changed.
- TypeScript build check passed (`npm run typecheck`).
- Actual installed SDK append test: fresh and nonempty accounts, retry, a fresh
  module with empty IndexedDB, and two further appends; old child/media body
  reads forbidden.
- Compact transport test: accepted predecessor coordinate retained, no prior
  blocks rewritten, append envelope below 2,048 bytes for the controlled case.
- Actual SDK signing-overlap and real Bank identity-adapter tests: hold first
  delivery both before native publication starts and during finalization. One
  local PBI ceremony completes immediately, exact Original bytes remain unchanged,
  and accepted delivery preserves that receipt. Ordinary first delivery carries
  an already-saved signature when present; waiting signing reuses its confirmed
  result. Lost-ack replay adds no ceremony, source seal or transition. Six tests
  pass; the early race was reproduced red before the correction.
- Composer browser check passed at 320, 390 and 1,280 pixels, including existing
  camera/video cases, active delivery, immediately available Sign, automatic
  confirmation, and reduced motion. Fixtures do not move money or publish.
- Native application composition rebuilt from pinned preferred sources; SDK
  outputs remain unchanged. Exact staged source inventory and public proving
  resource checks pass.
- Final production build passed, including cold Explorer/Ledger/Feed checks.
- Required frozen-entry command passed: seven files, 63 tests.

## Production boundary

Local tests and commits do not establish production deployment or the phone's
exact pending action being replayed. The held source and signed delivery action
must remain intact. Deployment, accepted global projection, public cold HTML,
and the existing phone's retry are separate evidence boundaries; do not claim
them from these local results.
