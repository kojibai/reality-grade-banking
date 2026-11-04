# Original publication and continuity verification — November 4, 2026

Target: `imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4`, “THE MONEY DOESN’T NEED TO COME BACK.”

## Starting production state

Vercel inspection confirmed Bankeiz `898054f3c7ba7ec3fcbc388ad4c36f33d0e2dc16` (`dpl_3MJCSEsm2iJXsvxU8eX7ZQdAUBZY`) and Receiz `c9776e9e12b47d7f2c5fc69807dcf480152bc7b5` (`dpl_2gkYcHpvUGXmJLWdTRCxGKYLCARC`) as production releases. This does not establish which build the phone PWA is executing.

The user’s phone PWA holds the Original’s PBI display. That device is unavailable to this desktop session. No new signing ceremony, identity reset, or substitute proof was performed.

## Observed live responses before this repair

- Receiz complete collection: HTTP 200 after 40.43 seconds, 612 Originals; target appears once, `hasPbiSignature:false`, `pbiReceiptHash:null`, no carried PBI append heads.
- Bankeiz profile API: HTTP 200 after 8.629 seconds; 612 items, target first, owner portrait present. Browser retry showed the same complete profile and target artwork.
- Raw Receiz profile HTML: HTTP 200; gzip-decoded HTML contains the target. Accepted visible count 612, operation count 45, public collection revision `aa42612105ebf4bf4f75ba3d076d6932e684a2c0045a6dec3157a3f2a3908be4`. Compressed-byte searching initially gave a false absence; decoded HTML and collection agree on the unsigned public state.
- Bankeiz membership proxy: HTTP 503. Receiz production logs repeatedly report `/api/market/public-membership` exceeding its 60-second runtime. Quote request also exceeded 55 seconds.
- Target’s live Bankeiz detail carries its complete `rpb2` receipt query, caption, artwork and existing purchase controls. Share details show dashes for available quantity, held quantity and capitalization.
- Exact public artwork: 2,480,892 bytes; SHA-256 `1983ba0ed4c6b99f7bc40229d0a1fa34757763b63917d256c8838785f1b58d8d`, matching the carried media SHA.
- Exact public Original: 36,896 bytes; SHA-256 `ea1ac75145e828fdf2873ce40790d566579b32a967093ff457c6aa4c21a8621f`, matching the carried artifact SHA.
- Complete capsule `/v` response: HTTP 200, 147,150 bytes; native proof trust, verified register authority, target, full longform, content/media hashes and ownership provenance present; PBI absent. Exact duration was not recorded. A separate cold request timed out at 55 seconds.
- Public capitalization operands retain a June 23 source timestamp while their evaluation pulse advances. That older timestamp alone does not establish invalid operands; the reproduced bug is its interaction with a newly partial local catalog.

Public claim SHA: `33da91a0486a0ef1402787cdfc8128aef6f0b5048fcf50a2c1a29c7254bedad0`.

## Bankeiz corrections and exercised boundaries

1. A PBI display overlay retains existing share observations only for the matching Original, asset, owner and compatible inventory scope. Changed source/asset/scope/UID regressions prevent cross-object reuse.
2. Shipped Market and Sports preparation belongs to the document. Reopening and concurrent consumers reuse the same preparation and JSON decoding. Failed preparation remains retryable.
3. Ledger Proofs observes confirmed publication/catalog transitions and bypasses its pre-publication membership cache. Pending local previews do not become public proof membership. Late replies/failures cannot erase a newer accepted public display.
4. A partial catalog refreshes supported existing capitalization models without removing absent source rows or inventing missing share supply. An unsigned public Original remains visible; earnings admission is unchanged.
5. Profile pricing preserves newer compatible canonical share inventory rather than overwriting it with an older retained profile observation.

Exact-data chart reproduction used shipped Market, Sports and share history, the captured live capitalization operands, and this target without shares. Baseline returned `null`, retaining the old chart. The corrected model advanced to pulse `14989047`, endpoint `$6,710,086,999.54`, with 3,646 of 4,262 assets covered and `complete:false`. The target still has no invented shares and total outstanding shares remain unchanged. This is controlled local reproduction, not a live phone result.

Cold/warm target coverage exercises one coalesced complete collection read/parse, initial artwork, owner portrait, unsigned visibility, carried seed parsing, retained tabs/navigation, actual local price charts and exact receipt-query preservation without warm fetching. It does not verify the phone’s PBI.

## Validation and release status

- Final isolated Bankeiz suite: 823 files, 5,013 tests passed. Later Feed/Discover additions passed 48 focused tests in the shared tree and 30 targeted tests in the isolated candidate. The final production build passed with all reviewed sources.
- Frozen real-SDK account-entry gate passed: 7 files, 61 tests.
- Shared-workspace full suite: 5,017 passed, 8 failed. Six failures belong to the pre-existing uncommitted PWA navigation tests; two localhost cooperative-preview tests failed with sandbox `listen EPERM`, producing two unhandled socket errors. Those changes were preserved.
- Isolated candidate excludes other agents’ uncommitted Ownership/PWA work and installs the exact lockfile dependencies; the shared installation has React/React DOM 19.3.1 while the lockfile requires 19.3.0.
- Final production build passed, including entry, TypeScript, server imports, source archive, offline shell, conformance, licensing and public page checks. Earlier packaging attempts hit temporary disk exhaustion and the shared dependency-version mismatch; the exact-lock isolated build passed.
- The target's same-reference public primary image now paints and zooms independently while canonical artifact reading remains unchanged. Cross-reference, changed-digest and non-primary selectors are rejected by tests.
- Mounted Feed and Discover now adopt same-source accepted display changes without adding reads or resetting ordering, filter or scroll. Discover ignores pending, undated and older catalog notifications.
- Receiz commit `b13371c2bd2e469b15356d32ede41755aeed6d79` preserves the same canonical accepted Source across independent openings and starts the existing three independent Market decorators together. Its eight-file patch passed 208 production regressions, 57 frozen entry tests, 31 source-authority tests, full production and strict test TypeScript, lint and doctrine gates. Unrelated native share work was hash-checked and preserved.
- At the interrupted-turn recovery checkpoint, Receiz's `b13371c2b` production deployment was building (`dpl_9MB972iBRznXVpcUWgBiTAxYT7jJ`). Bankeiz's reviewed corrections were still uncommitted. Corrected deployed/public/phone readback remains pending; local passes do not establish it.

## Remaining acceptance boundaries

The existing signature must reach the accepted public Original and then agree across collection, showcase, prepared HTML and the content-bearing `/v` receipt. The public membership and quote routes must return current target data successfully. The phone PWA must receive the corrected build and demonstrate advancing capitalization and carried shares. Local tests alone do not close these boundaries.
