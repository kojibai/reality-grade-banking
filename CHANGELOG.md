# Changelog

Reality-Grade Banking repository releases include the Bankeiz reference
application. Its product versions are independent of Receiz protocol/package versions.
Full release records and qualification evidence live in [docs/releases](docs/releases/README.md).

## Unreleased

- Shared music and video asset URLs advertise a lightweight embed over existing Receiz streams,
  supported public streams and JSON oEmbed discovery. Normal clicks still open
  the standalone asset page; receiving platforms choose inline playback.
- Source-bound authored titles correct older cached captions synchronously and
  appear on asset sharing images and the initial standalone HTML. Explore omits
  its redundant top menu link.
- Receive generates shareable payment buttons and existing Receiz checkout code
  without loading a widget or creating a session. A new Get paid guide and typed
  developer example cover setup, trusted order confirmation and recovery.
- Payment-link funding reuses the native Note deposit for Reserve, Settlement
  and combined Notes, preserving the destination and amount before payment review.
  Public asset Buy goes directly from amount to card checkout; confirmed credit
  continues its approved purchase once, with separate original-attempt recovery.
- Standalone artwork is discovered in the first HTML response and prioritized
  independently of playback. Other artwork stays lazy; proof checks are unchanged.
- Market, Explore, asset pages and asset Ledger entries prefer the existing
  authored song, book, essay or object title, with caption fallback. Evidence
  panel CSS stays with the retained public surface across navigation.
- Asset navigation starts at the top after the destination view commits.
  Returning to Explore restores its retained category, search and scroll position.
- Standalone Buy opens a new buyer's device-held account in place after existing
  account restoration, retains the entered amount and continues through the
  existing card checkout. The buyer approves the asset and dollar budget
  before card payment; matching confirmed credit continues that purchase once.
  Old checkout hints cannot supply fresh purchase approval.
- Consistent source-link controls across public asset evidence and market-cap
  explanations, including mobile touch targets.
- Public asset URLs handle Vercel rewrite captures consistently with the public
  page endpoint, including the matching sharing-image route.
- Note PNG exports use the existing Receiz v129 document seal around their
  complete native financial source. Canonical offline image verification and
  native deposit remain separate checks; issuance, consumption and credit rules
  are unchanged. Interrupted image production resumes the same funded Note.

## 1.0.0 — October 20, 2026

The first major repository release includes the Bankeiz reference application,
version 1.0.0. The [published release](https://github.com/kojibai/reality-grade-banking/releases/tag/v1.0.0)
and tag identify commit `2231301`. See the [full 1.0.0 notes](docs/releases/1.0.0.md) and
[qualification record](docs/releases/1.0.0-qualification.md).

### Product

- One account with device-held Receiz ID, Send and Receive, automatic funding,
  embedded card deposits and exact-operation recovery.
- Reserve, Settlement and combined Settlement Reserve Notes, connected
  creation without offline-custody enrollment, addressed offline receipt and
  once-only connected account deposit.
- Public assets with dedicated pages, media, original-source inspection,
  ownership history, supported purchase/sale actions and individual sharing art.
- Sent/Received activity views, plain transaction names, exact event values,
  retained receipts and calculated FIFO source attribution.
- Existing Receiz messages, contacts, groups, assistance, typing and calls;
  minimized call controls preserve the active in-app session during navigation.
- Public Market, Global Market Cap, Ledger, proof inspection and local Ledger
  Memory Crystal export from already-held data.

### Continuity and presentation

- Retained public navigation, encrypted local conversation/history retention,
  same-source proof flips and refined native audio controls.
- Note history from confirmed native receipts across all three funding rails;
  explicit already-deposited errors and host Ledger projections.
- Audience-specific explanations, motion, public metadata and discoverable
  guides within the existing responsive design.

### Open implementation

- Receiving standard, independent inspection kit, original schemas,
  conformance workspace, matching native sources and reproducible distribution.
- Coordinated Receiz SDK, MCP and AI Skills 129.0.0 pins, GPL-3.0-only application
  licensing, preserved third-party notices and versioned release records.

### Scope

Live financial/device qualification and exact deployed-build evidence remain
separate from these implementation notes. Future display currencies, email
payments, universal merchant checkout, Note QR and persistent asset media are
not introduced by this release.
