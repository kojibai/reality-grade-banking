# Twin Sales Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish two connected sales pages demonstrating both sides of a Twin conversation and the existing Business purchase flow.

**Architecture:** Static page content and custom inline SVG art compose existing public navigation, native Twin and Business checkout helpers. Page-only styles and custom social images extend the public build; existing account, contacts, calendar and billing remain authoritative.

**Tech Stack:** Existing ESM templates, SVG/CSS, Vite, Vitest and native Receiz conversation.

**Spec:** docs/superpowers/specs/2026-10-24-twin-sales-pages.md

## Global Constraints

- Keep all existing pages, account entry and billing functions intact.
- Get Business uses /#account/messages/business.
- No prices in images; shared CSS/JS gzip remains below 15,000 bytes.
- Live Twin is identified as AI, consented and confirmed only by native events.
- Custom visuals paint inline; animation cannot gate first paint or navigation.

## Review Focus

- Cold page: no identity import, Twin request or booking before interaction.
- Supplied details: owner illustration never exposes private contacts or claims anonymous visitors are verified.
- Repeat anchor: return to the existing conversation with the draft intact.
- Purchase: every Get Business button uses the same existing reviewed payment destination.
- Mobile and sharing: full illustrations, readable connected story and unique canonical preview without prices.

## Task 1 — Pages, illustration and purchase composition

- [x] Add failing route/content contracts for both pages and existing checkout destination.
- [x] Create src/content/twin-pages.mjs, scripts/twin-page.mjs and scripts/twin-art.mjs with declarations, plus public/learn/twin-pages.css.
- [x] Reuse cooperativeConversation('together'), existing consent/booking and businessCheckout/businessMobileAction.
- [x] Register public metadata, build output, page-only CSS, social image rendering and discovery links.
- [x] Extend native conversation tests to the two routes and correct descriptive inquiry context.
- [x] Run focused public, Twin, Business entry and upgrade tests; inspect rendered desktop/mobile and repeated anchor.

## Task 2 — Release evidence

- [x] Generate and inspect two unique custom sharing images; verify metadata and no price in image art.
- [x] Build an isolated checkout containing only owned changes and pass public/offline/source/performance gates.
- [x] Refresh the shared local preview; retain other agents' source changes.
- [x] Review the final patch, commit only owned files, and provide routes and visual evidence.

## Verification evidence

The focused suite passed 76 tests before final presentation polish; final targeted tests and complete packaging gates are rerun before commit. Browser evidence in /private/tmp/bankeiz-twin-sales-qa covers both routes at 320, 390, 768, 900 and 1200px with no overflow, exact Get Business destinations, header-safe conversation landings, retained drafts across route changes, repeat anchor clicks, active CSS motion and the matching confirmed-calendar visual state. The independent review found one slashless inquiry-context defect; four failing alias tests were added and passed after canonical admission and optional-slash booking context were fixed. No other important findings remain. No real account, message, appointment or payment was created during QA.

Only owned files are committed. Existing account, Contacts, calendar, payment and proof authorities remain unchanged.
