# Pay landing page implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan inline.

**Goal:** Give `/pay` a complete public page with a clickable, animated demonstration of the existing checkout.

**Architecture:** Follow the existing `/book` public-page framework. Move the unchanged checkout HTML entry to `pay/checkout.html`; only the generic `/pay` routes serve the new guide. Capture the real checkout components at build time using fictional, non-authoritative presentation state. The public walkthrough switches already-rendered HTML locally, with no account, payment, SDK or data calls.

**Scope:** The user confirmed checkout is working perfectly and explicitly narrowed this request to the landing page. Do not modify account entry, live payment components, controllers, custody or settlement. Keep other developers' dirty files untouched.

- [x] Prove generic and personal routing remain separate; preserve card returns and noindex checkout metadata.
- [x] Render real amount/review/completion screens with clearly marked example data; add a simulated card handoff that accepts no real payment information.
- [x] Build a polished mobile page with an animated walkthrough, click-through controls, pause/replay, reduced motion and useful payment explanations.
- [x] Verify local-only interaction, clean navigation teardown, metadata, machine reading, mobile/desktop layout, tests and production build.
- [x] Review the scoped changes and commit on main; leave pushing to the user.
