# Bankeiz agent rules

Account entry is frozen to the exact working creation path preserved in `tests/fixtures/account-entry-frozen.ts.txt` under [docs/account-entry-frozen-invariants.md](docs/account-entry-frozen-invariants.md). Read that document before changing identity, account creation, shared storage or entry.

- Unrelated naming, profile, media, Feed, Discover, presentation or performance work must not change account entry.
- Normal creation never asks the user for a passphrase. Preserve internal bootstrap protection and the admitted, self-contained, phrase-free Identity Record.
- Respect the exact installed SDK input contract. Display names belong in the shared projection; do not pass display fields or a new creation coordinate into the onboarding sealer.
- Run `npm run test:account-entry-freeze` for any shared identity/storage change and before releasing an entry repair. Every production build also enforces the frozen creation function.
- Never replace the real SDK guard with a permissive mock or update the frozen fixture/tests to ratify a regression. An intentional entry change requires an explicit user request and passing real SDK and end-to-end evidence.
- Preserve existing identities and other agents' changes. Do not reset the branch, erase device custody or weaken artifact verification to make entry pass.

Public rendering and navigation must follow [docs/held-state-navigation-invariants.md](docs/held-state-navigation-invariants.md). Read it before changing public delivery, saved HTML, worker navigation or runtime handoff. Static entry and already-held public views must not wait for Source freshness or duplicate document/catalog reads. Repair accepted publication and its saved projections at the state transition; never compensate by blocking page opening.

Bankeiz integration and its documentation use the installed SDK, MCP and AI skill contracts. Receiz backend storage operations and operational records belong only in the Receiz repository.

Read the coordinated installed `@receiz/sdk`, `@receiz/mcp-server` and `@receiz/ai-skills` contracts before changing public state flow. Apply their performance, offline-first, causal-sync and cross-app-state rules. Do not invent a second authority, history engine or database gate for data the reader already holds.

Public Showcase rendering has one mandatory flow: **held accepted data → immediate display → existing SDK transition for genuinely new input → shared successor and retention**. Before changing it, read the public Showcase display law and prohibited-pattern table in [docs/held-state-navigation-invariants.md](docs/held-state-navigation-invariants.md).

- Never add a prepared-page, freshness, manifest, SQL/database or extra API prerequisite to opening a complete held public collection. Delivery/projection state is not proof authority.
- Profile, Explore, Market, Feed and Ledger reuse the same selected Showcase collection. Preserve exact owner bindings, known privacy refusals, compatible inventory, custom artwork and accepted history; do not rebuild/reverify history or discard the catalog to repair a page.
- Inline first-frame styling and bounded image preparation must not add timers, minimum splash durations, hidden ready content or new page-opening waits.
- Serve the actual existing view from data already held, then attach interactivity. Apply this to asset, receipt, verification and booking entrances as well as profiles. A restored creation result must retain its exact Original's known PBI signature; a late unsigned delivery response cannot undo it. Read the first-frame implementation contract in the navigation invariants before changing these paths.
- Receipt → Ledger must keep its selected carried transaction visible without waiting for the global projection. Proof downloads and verification kits must carry the exact enclosing original and its continuity; display JSON and hash capsules cannot substitute for it. Refuse incomplete kits and qualify the extracted offline verifier under the download contract in the navigation invariants.
- Prove the actual compiled anonymous entry with APIs stalled and the next accepted addition with retention/cold reopen. Report local tests, committed build, GitHub CI and live deployment as separate evidence. Never claim all future updates from a one-time initial-count check.
