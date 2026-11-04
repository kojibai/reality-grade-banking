# Original publication and continuity verification — November 4, 2026

Target: `imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4`, “THE MONEY DOESN’T NEED TO COME BACK.”

## Starting production state

Vercel inspection confirmed Bankeiz `898054f3c7ba7ec3fcbc388ad4c36f33d0e2dc16` (`dpl_3MJCSEsm2iJXsvxU8eX7ZQdAUBZY`) and Receiz `c9776e9e12b47d7f2c5fc69807dcf480152bc7b5` (`dpl_2gkYcHpvUGXmJLWdTRCxGKYLCARC`) as production releases. This does not establish which build the phone PWA is executing.

The user’s phone PWA holds the Original’s PBI display. That device is unavailable to this desktop session. Existing public source evidence also carries its signed successor: operation 46, artifact digest `cb3672ef7f1c57618cd6a3ad5c025a0f8cbcce915d3a5f0ed96f745740e32ab1`, PBI receipt `8bc2c5c5ea1a72d47317aded45d0645f75b2bdf0489313004c82400464fcbcd5`. This signature is not phone-only evidence. No new signing ceremony, identity reset, or substitute proof was performed.

## Deployed readback after the first repair — still failing

Both first repairs reached production: Bankeiz `fa722241536d699c6cd1902d2ac90705a678d1b2` (`dpl_6m5bdacFv3pQmGBB6Vovbpqwg2JF`) and Receiz `b13371c2bd2e469b15356d32ede41755aeed6d79` (`dpl_9MB972iBRznXVpcUWgBiTAxYT7jJ`). They did not complete this request.

| Exact response / state | Head / target / PBI | Measured result |
| --- | --- | --- |
| Receiz collection-v2 | operation 45; 612 unique Originals; target once, unsigned | HTTP 200, 52.461 s |
| Receiz dynamic raw HTML request | operation 45; target unsigned | HTTP 200, 54.239 s full body; headers 0.396 s |
| Receiz complete content-bearing `/v` | full content, source, hashes and provenance; PBI absent | HTTP 200, 53.819 s |
| Receiz prepared profile edge rule | still operation 45; renewed runtime ID matches b133 deployment | Read-only Vercel rule inspection |
| Bankeiz profile API / HTML | API unavailable; HTML fallback has no target | HTTP 503 in 25.159 s / HTTP 200 in 25.651 s |
| Bankeiz Ledger Proofs | unavailable | HTTP 503 in 33.620 s |
| Bankeiz membership / quote proxies | unavailable | HTTP 503 in 60.284 s / 62.623 s |

Source selection diagnosis uses actual configured production transport, not an inferred native/Crystal installation. Read-only Vercel project metadata has no Crystal, Account Source or Profile selector variables and no linked shared variables. The existing code therefore selects Supabase for these public objects.

The actual default-provider trace selects public operation 46 and then finds no exact private acceptance header for that digest. Accepted-policy capture returns null in 0.455–1.273 s; prepared-only collection reads refuse in 0.683–0.999 s, with no gzip, Source-body or Account-history reads. Ordinary reads then restore the older protected operation 45. The cold restored branch returns without scheduling the existing successor discovery; the already-held branch alone schedules an unretained timer. This is the demonstrated acceptance/delivery handoff gap. The target's subsecond prepared miss does not by itself explain the global Market route's complete 60-second runtime, which remains a separate measured failure.

The genuine 612-Original SDK comparison records identical transport counts for c977 and b133 and no Source-body/history reads on prepared cold delivery (33 ms and 29 ms respectively). It does not establish live performance or repair the missing operation-46 checkpoint. Existing source evidence remains retained, and operation 46 must complete its existing handoff; an unsigned representation cannot overrule that signed source.

## Exact accepted operation-46 handoff — live checkpoint completed

The guarded, single-owner recovery reused the real SDK-qualified protected operation-45 predecessor and verified only the existing operation-46 successor. It retained the missing immutable acceptance checkpoint. No signing ceremony, reseal, replacement Original, source-manifest overwrite, or global SQL projection mutation occurred.

The first attempt stopped on local disk exhaustion before any remote writes; the second refused the pre-existing public derivative descriptor conflict, also with zero remote writes. Both outcomes were inspected before continuing. The tested retention correction persists the canonical servant projection by its existing content-addressed blocks, beneath the same verified Source, without republishing the immutable public descriptor. Public Source publication still refuses conflicting immutable bytes.

Successful independent readback: operation 46, digest `cb3672ef7f1c57618cd6a3ad5c025a0f8cbcce915d3a5f0ed96f745740e32ab1`, 612 unique Originals, target once, PBI receipt `8bc2c5c5ea1a72d47317aded45d0645f75b2bdf0489313004c82400464fcbcd5`. Original source SHA `ea1ac75145e828fdf2873ce40790d566579b32a967093ff457c6aa4c21a8621f` remains unchanged. The older public descriptor remains byte-for-byte intact.

| Deployed reader after checkpoint | Exact result | Timing |
| --- | --- | --- |
| Collection-v2 first read | 612 Originals; target signed with exact accepted PBI | HTTP 200, 74.927 s; one-time canonical recovery/preparation |
| Collection-v2 return read | Same target and PBI; complete reader metadata | HTTP 200, 3.340 s |
| Initial public profile HTML | Operation 46; target and PBI present before hydration | HTTP 200, 0.994 s; headers 0.413 s |
| Complete carried `/v` | Same PBI, provenance and content/media/source hashes | HTTP 200, 4.648 s |

The receipt contains the exact 22,483-character / 3,247-word essay in its carried Flight record, SHA-256 `321fe0ccf9225ed73a3f1e7ffe75c1fbf55c4aaff06343b3dca0e6172b0a78e9`. CUA opened **Read long-form post** and confirmed the complete reader and matching hash. The receipt wire transfer was 28,113 gzip bytes; the decoded HTML is 155,009 bytes. The closed reader's 211 visible words are not the full carried work and were not used to infer missing content.

Software deployment remains Bankeiz `fa72224` / Receiz `b13371c2` at this checkpoint. Market/Explore/Ledger, current share operands, and the phone PWA remain separate acceptance boundaries until the pending software corrections and scoped discovery transition are deployed and verified.

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

## First-release validation (historical)

- Final isolated Bankeiz suite: 823 files, 5,013 tests passed. Later Feed/Discover additions passed 48 focused tests in the shared tree and 30 targeted tests in the isolated candidate. The final production build passed with all reviewed sources.
- Frozen real-SDK account-entry gate passed: 7 files, 61 tests.
- Shared-workspace full suite: 5,017 passed, 8 failed. Six failures belong to the pre-existing uncommitted PWA navigation tests; two localhost cooperative-preview tests failed with sandbox `listen EPERM`, producing two unhandled socket errors. Those changes were preserved.
- Isolated candidate excludes other agents’ uncommitted Ownership/PWA work and installs the exact lockfile dependencies; the shared installation has React/React DOM 19.3.1 while the lockfile requires 19.3.0.
- Final production build passed, including entry, TypeScript, server imports, source archive, offline shell, conformance, licensing and public page checks. Earlier packaging attempts hit temporary disk exhaustion and the shared dependency-version mismatch; the exact-lock isolated build passed.
- The target's same-reference public primary image now paints and zooms independently while canonical artifact reading remains unchanged. Cross-reference, changed-digest and non-primary selectors are rejected by tests.
- Mounted Feed and Discover now adopt same-source accepted display changes without adding reads or resetting ordering, filter or scroll. Discover ignores pending, undated and older catalog notifications.
- Receiz commit `b13371c2bd2e469b15356d32ede41755aeed6d79` preserves the same canonical accepted Source across independent openings and starts the existing three independent Market decorators together. Its eight-file patch passed 208 production regressions, 57 frozen entry tests, 31 source-authority tests, full production and strict test TypeScript, lint and doctrine gates. Unrelated native share work was hash-checked and preserved.
- At the interrupted-turn recovery checkpoint, Receiz's `b13371c2b` production deployment was building (`dpl_9MB972iBRznXVpcUWgBiTAxYT7jJ`). Bankeiz's reviewed corrections were still uncommitted. Corrected deployed/public/phone readback remains pending; local passes do not establish it.

## Second-release local validation and scope

The isolated candidate is based on deployed Bankeiz `fa72224` and excludes the other agents' Ownership/PWA work. Public and authenticated Ledger now retain the same bounded Original presentation and open the existing detail/reader/trade components. Signature delivery is bound to the exact native PBI receipt; an older unsigned acknowledgement cannot complete it. A later exact public observation completes display without another delivery or ceremony and never manufactures a Showcase head.

The public chart hook now imports the identical existing SDK Kai clock from its pure canonical module. This avoids pulling the wallet runtime into the public Ledger's static graph; the guard itself is unchanged. The signed product example explicitly supplies its published market-delivery result.

Local evidence: 5,020 tests passed in the full isolated run; the two sandbox-blocked localhost tests passed in a separately permitted rerun. Final changed-code coverage passed 86 tests, followed by 30 focused tests on the final combination; the final display join passed 22 focused tests and fresh typechecking. All 61 real-SDK frozen-entry tests passed. The final complete production build passed, including the unchanged public/private import boundary, entry, types, source archive and offline packaging checks.

Receiz's second-release candidate reuses accepted Source state and completes the existing default-provider publication tail. Global public reads use the existing write-qualified clean snapshots rather than scanning every owner. Exact Source/currentness guards prevent an older callback from replacing newer discovery facts. The real 611-to-612 projection budget is 608 unchanged Originals, three Source-carried Groth16 display-label corrections, and this missing target. No replacement proofs, Original identifiers, historical transactions or share issuance are involved.

Receiz's exact second-release tree is committed and published as `40de422e3a65b4852de0307649c36591318b8028`. Production deployment `dpl_DQ3kPeJGdWYvnKmdhJSJVPvc24He` is Ready and aliased to receiz.com. Its 19-file tree is `8b9d756fc20096f001d7d540a0edd816cc1d80e3`; six unrelated share-work files were hash-checked before and after local adoption and remain unchanged.

Independent final-source readback: collection 3.630 s, complete carried receipt 4.750 s, unchanged media and Original byte hashes. Browser-style saved profile HTML returned in 0.630 s and 0.468 s, carrying operation 46, 612 unique Originals, target once and exact PBI before hydration. The dynamic raw HTML path still took 58.751 s. The existing scoped showcase-proof handoff returned 204 after 52.658 s, then logged `PROFILE_SHOWCASE_DISCOVERY_APPEND_PENDING`; the database projection remains 611, target absent. Global public membership now returns 200 in 36.696 s, 1,684 profile Originals, but also lacks this target. These are demonstrated remaining failures, not completed acceptance boundaries.

Bankeiz's final Ledger quote correction uses the existing public quote request and validated retained observation. Market and both Ledger roots share one in-flight decode, cancellation is consumer-bound, real trade freshness bypasses ordinary reads, and older replies/coordinate loss cannot replace newer observations. Only the exact Source/asset/digest/pulse/receipt-bound public presentation receives current quote/share display; historical record operands and evidence remain unchanged. Proof rendering does not wait for quotes. Independent review approved all product bytes. Seventy-six focused tests passed, followed by 94 tests in the exact-lock isolated candidate. A self-referential test mock initializer was corrected without changing assertions; its eight tests passed and the final complete production build passed with TypeScript, frozen entry, public/private import boundaries, licensing, exact 6,017-file source archive and offline shell checks. Bankeiz release publication and live readback are next.

## Remaining acceptance boundaries

Deploy the second-release software and complete the existing scoped discovery transition from accepted operation 46. Verify current target membership, quote/share operands and full rendering in Market, Explore, bjklock's Bankeiz profile and public Ledger Proofs. Preserve the already-live PBI agreement in Receiz collection, saved HTML and complete receipt. The phone PWA must receive the corrected build and demonstrate advancing capitalization and available share values; this desktop session cannot establish the phone's execution state. Local tests alone do not close these boundaries.
