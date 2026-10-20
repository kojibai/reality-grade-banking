# Public assets, explanatory scenes and everyday language

## Scope

Standalone public asset pages reuse the existing public Market, original media reader, deterministic valuation model and carried Ledger evidence. Selected assets have an `/asset/<encoded public id>/` address, copy confirmation, native share action, asset-specific HTML metadata and an Open Graph/Twitter image. No account identity or financial action is opened by this route.

A warm popup-to-page transition retains the selected public row. The mounted Market, query, category, pagination and range selection survive return navigation. One existing discovery reader and capitalization reader remain connected across that transition; hidden chart work pauses. Original media is retained in a bounded, digest-bound, public-only in-memory cache. Private held media never enters it.

Cold sharing previews use the existing bundled public catalog. A miss uses only the existing curated Receiz public discovery reader, coalesced and cached by source for 60 seconds. It opens neither private accounts nor original-media downloads nor quote graphs. An unavailable public source remains unavailable; the preview does not manufacture an owner or source. HEAD probes do not parse catalogs, fetch upstream, load fonts or render PNGs.

Sports group evidence provides an on-demand selector for individual sealed copies. Each selected history is bound to its collectible ID and claim hash. The existing endpoint's 200-record cap cannot establish a complete latest history at the cap; that refusal remains in place. Public discovery and original proof verification remain distinct.

## Learning and language

The Learn home retains its original introduction and four foundation links. `/learn/guides/` carries the full five-group directory, linked from the footer and article navigation. The Banking explained link and linked Reality-Grade Banking footer tagline remain intact.

Thirty subjects each have a custom transparent vector scene. Subject geometry, labels and motion illustrate the subject rather than reusing a background image. Three local controls expose the explanation and emphasize the relevant stage. No animation frame loop, financial action or network request is involved. Offscreen and hidden-document motion pauses; reduced motion removes animation. Scene styles travel with their public page and are scoped to preserve mobile width and full SVG height during retained navigation.

Your assistant is the visible menu, conversation and composer label. Copy explains understanding a payment, bringing chosen memories into context and preparing a next move. Receiz Twin remains the underlying product/API, with unchanged access and billing behavior. Replies remain identified as generated interpretations; proposed payments still require review and approval. Free and paid accounts retain the same conversation view and their existing tab ordering.

Deposit and economy explanations lead with practical use and proof of source, ownership and history. Backing, valuation, liquidity and completed execution retain their separate technical meanings. A published seal does not automatically create collateral or a completed sale.

## Verification

- `npm test -- --maxWorkers=2`: 295 files, 1,807 tests passed. The last guide wording refinement also passed its three focused visual/content checks.
- `npm run build`: production output, 52 unique social images, typecheck, offline shell, Conformance separation, licensing, source inventory and public-page metadata checks passed.
- Browser measurements are retained in `2026-10-20-assets-guides-browser.json`.
- Focused regression checks cover cold previews, missing live public IDs, zero-work HEAD, retained navigation, exact source fields, public media, per-copy parsing and capitalization reader continuity.
- Browser checks cover 320, 390, 430 and 1280 CSS-pixel asset layouts; direct HTML/PNG; copy; same-document asset and guide transitions; retained search; no new inventory/capitalization requests on the asset round trip; all five directory groups; local stage changes; live motion and reduced motion.
- Browser original-media reads use deliberate unavailable-source fixtures. These checks do not claim a production media download or a live financial qualification.

## Production Note boundary

Read-only inspection on 2026-10-20 found Receiz production serving commit `c15d8073e`, which includes connected Note compatibility writer `78e49df11`. The production Wallet database has `wallet_accounts` and `wallet_ledger_entries`, but no public `bank_*` custody tables or connected Note functions. No production database was changed.

The existing Receiz rollout document requires the two reviewed migrations `20261015012532_bank_offline_notes_native.sql` and `20261020204430_bank_connected_note_compatibility_wallet.sql`. They add the subordinate custody schema and service-only connected Wallet operations. Production schema installation and authenticated issue/receive/deposit qualification remain required. Device antirollback rules are unchanged; v1.0.0 is not declared released.

### Subsequent production installation

After the user explicitly approved the production migrations, both Note migrations were installed and their RLS, service-only grants, uniqueness constraints and rejection guards were verified. The earlier missing-schema inspection above is historical. See [production installation and wider migration audit](2026-10-20-production-note-migrations.md) for the recorded versions, exact scope and remaining live browser qualification.
