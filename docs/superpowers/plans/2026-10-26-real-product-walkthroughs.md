# Real Product Walkthroughs Implementation Plan

**Goal:** Show the actual Bankeiz banking and messaging experience in context, with one-word sharing URLs.
**Architecture:** Build source-bound, static real-component previews with scoped CSS and inert example data. Compose a small page-only story controller and the unchanged real public Twin. Reuse existing metadata, alias, hosting, retained navigation, offline and footer paths.
**Spec:** `docs/superpowers/specs/2026-10-26-real-product-walkthroughs-design.md`.

## Review focus

Examples must not become account/financial authority. Inert example controls must not send or copy real payment coordinates. CSS, IDs and dialogs must remain scoped to preview containers. Simulated typing must never touch the working Twin or real account. Existing URLs, checkout, global first paint and the 15 KB shared presentation budget remain protected.

## Tasks

- [x] Establish actual-component rendering contracts and failing one-word-route/page/example-isolation tests.
- [x] Render source-bound product screens and styles using current production components, with clearly labeled example data. Add the private message/typing example without changing production behavior.
- [x] Build `/banking/`; refine `/action/` from the existing Business walkthrough and preserve `/in-action/`. Add relevant product previews to existing pages without replacing their approved stories.
- [x] Verify controller isolation, keyboard/repeated navigation, no cold requests or writes, scoped IDs/styles and responsive screenshots. Run typecheck, full tests/build, sharing and offline/source gates.
- [x] Independent final review; fix important findings; commit only owned files on Bankeiz main. No push/deploy or live financial/model/booking operations during QA.
