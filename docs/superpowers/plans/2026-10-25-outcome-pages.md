# Outcome Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build five useful short outcome pages with clear actions, custom motion and preserved native authority.
**Architecture:** Static public templates and content registry, page-only CSS/SVG, existing metadata/navigation/offline pipeline; native conversation is reused for /agent only.
**Tech Stack:** ESM templates, CSS, SVG, existing Vitest/Vite/public build.
**Spec:** docs/superpowers/specs/2026-10-25-outcome-pages-design.md

## Global Constraints
- No account-entry, identity, payment or proof behavior changes.
- Existing Get Business destination /#account/messages/business; no price on art.
- Global learn CSS+JS <=15,000 gzip bytes; no new package or cold chat request.
- Existing pages/aliases preserved; core proof remains free.

## Review Focus
- New page context cannot substitute guest/owner authority.
- Original/proof/recipient/amount cannot be substituted by illustrative display.
- Recovery copy distinguishes admitted original, private history and protected offline custody.
- Five diagrams fit320px and desktop without clipping or scroll traps.
- Current-page footer omission and native public navigation preserve the canonical route.

### Task1: Static outcomes and visuals
- [x] Add failing tests for five canonical entries, distinct SVGs, scoped narrative and native CTAs.
- [x] Create src/content/outcome-pages.mjs, scripts/outcome-page.mjs, scripts/outcome-art.mjs and page-only public/learn/outcome-pages.css, with declarations.
- [x] Reuse cooperativeConversation for /agent, removing no native contract; label examples.
- [x] Run rendered page contracts.

### Task2: Public discovery and sharing
- [x] Wire public metadata, template/render catalog, preview and Vercel rewrites, sitemap/offline route inventory.
- [x] Add five custom SVG social compositions and generate content-addressed PNGs.
- [x] Add targeted footer/related-guide links, plus agent discovery from existing Business and Twin pages.
- [x] Admit /agent page context in existing native relay; test owner/guest binding and old routes.

### Task3: Qualification and delivery
- [x] Run targeted contracts, full Bank suite with maxWorkers2 and isolated production build sequentially.
- [x] Verify desktop/mobile, motion and reduced motion, native navigation, related links and share images through CUA.
- [x] Request independent scoped review; fix actionable findings.
- [x] Commit only owned source, artwork, docs and tests, leaving other agents' Vault outputs untouched.

## Final evidence
- Final full suite: 3,113 tests in 498 files passed. Final affected contracts: 33/33. Refined artwork contracts: 9/9.
- Final isolated production build passed: 120 canonical share cards, all 115 prior image hashes preserved, plus metadata, sitemap, source, licensing and offline gates.
- Shared presentation CSS and JavaScript remain 14,993 gzip bytes.
- CUA verified desktop at 1280px and phone at 390px, plus Proof at 320px: no horizontal overflow. Public navigation, FAQ and repeated Talk to BJ anchors work.
- BJ's real native Twin returned an upstream reply on /agent with remembered context. Immediate typing appeared. The smoke requested no contact saving, appointment or payment.
- Independent review found no blocking issues. Offscreen motion now uses the existing visibility classes. Reduced motion is an explicit page-only CSS rule; no OS preference changed.
- Ruling: reuse the shared repository and isolate qualification in a fresh archived checkout; the user requested only our commits while other agents work concurrently.
- Ruling: distinct visualLabels prevents the generic guide visual flag from adding redundant scene CSS.
- Final staging is restricted to the owned manifest; generated Vault and output work are excluded.

- Ruling: reserve the four new letter-only landing names in the existing profile route projector. An observed hidden preloaded Explorer interpreted /agent as a profile. The new path contract rejects those bare routes while retaining the same usernames under /u/. No identity, ownership or profile payload changes.
