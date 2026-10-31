# Calendar and Appointments Guide Implementation Plan

> For agentic workers: execute this plan directly, using the existing public page pipeline and frozen account entry.

**Goal:** Add the complete /book/ public calendar and appointment guide while preserving personalized bookings.
**Architecture:** Static public page composed with the existing guide header/footer and real source-rendered booking/Calendar components. A small, page-only local walkthrough script; no new runtime service or dependency.
**Tech Stack:** Existing Vite, React build-only rendering, static HTML/CSS/JS and public metadata tooling.
**Spec:** ../specs/2026-10-30-book-guide-design.md

## Global constraints
- Preserve /book/:username behavior, query parameters, crawler sharing and payment boundaries.
- Preserve frozen account creation and all other agents' working changes.
- Source-bound inert examples; no API request, identity creation, payment or calendar write from the guide.
- Existing Bankeiz design and familiar authoritative language; optional Twin access remains explicit.

## Review focus
- Generic /book/ must never consume a personal booking URL or crawler image.
- Narrow mobile walkthrough content scrolls inside its frame; no clipping or page overflow.
- Timers stop offscreen/hidden/disconnected, reduced motion stays manual, user exploration pauses autoplay.
- Free and paid offers and per-guest pricing stay distinct; invitations, funds and confirmed appointment have their real boundaries.
- Static metadata, page navigation, archive and source-bound build must include the new route without private app startup.

## Tasks
- [x] Add failing route, public content and inert-preview contracts.
- [x] Split the internal booking HTML target, preserving personalized URLs and metadata.
- [x] Compose source-rendered booking/host walkthroughs and build-time CSS.
- [x] Write the full guide, scoped styling and page-only local walkthrough interactions.
- [x] Integrate metadata, sitemap/navigation/footer, social image and archive inventory.
- [x] Run focused contracts, typecheck, production build and relevant browser checks; inspect phone/tablet/desktop screenshots.
- [x] Verify every protected dirty file, stage only owned paths and commit on current main.
