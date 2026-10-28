# Meeting Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Pay within the meeting chat using the existing connected Wallet, then demonstrate it on /meet/.
**Architecture:** Bind the current conversation into existing Wallet approval and durable checkpoint. A scoped controller composes Wallet methods and a compact, lazy meeting UI; actual payment messages stay native. Build-only source renders supply inert public walkthroughs.
**Tech Stack:** React, TypeScript, existing Receiz SDK Wallet, Vitest, Playwright, Vite public generators.
**Spec:** docs/superpowers/specs/2026-10-27-meeting-payments.md

## Global Constraints
- No new financial authority, schema, migration, API rail or account-entry changes.
- Preserve default Send, existing approvals, exact integer amounts and durable nonce recovery.
- No waiting on money code/data for room first paint; never remount RTC for payment.
- No fake payment receipt from UI input; only retained original and actual native messages.
- Commit only owned changes on main.

## Review Focus
- Double Send while quotation is pending: one exact attempt.
- Existing pending payment from another room/account: never resume or cancel here.
- Funding acknowledgement lost: same stored nonce and checkout; no second charge/payment.
- Group membership changes: never retarget a prepared payment silently.
- Message/overlay switching during checkout: retain frame/state and media; no effect cleanup closes RTC.

### Task 1: Conversation-bound Wallet approval
Files: src/receiz/wallet-send.ts; tests/wallet-send-conversation.test.ts.
Interface: prepare options.conversationId?:string; status optional context from validated checkpoint.
- [x] Write failing contracts for exact group body, no DM, tampered checkpoint, legacy default and same-context funding restoration.
- [x] Run targeted Vitest and observe missing conversation binding.
- [x] Bind valid supplied conversationId into review/digest/body; derive status context.
- [x] Run all existing wallet-send contracts.

### Task 2: Scoped meeting money composer
Files: src/receiz/meeting-payments.ts; src/features/meeting/MeetingMoney.tsx; MeetingMoneyView.tsx; MeetingRoom.tsx; meeting.css; tests/meeting-payments.test.ts; tests/meeting-money-ui.test.tsx.
Interface: scope current viewer/conversation; explicit send/check/cancel methods and subscription; pure presentation for build source.
- [x] Write and observe failing controller tests for exact intent, duplicate lock, unrelated pending, unknown lookup and wrong-account/recipient refusal.
- [x] Compose existing Wallet; retain actual result and refresh actual native messages after acceptance.
- [x] Write and observe UI tests for group selection, toggle persistence, checkout and receipt presentation.
- [x] Implement lazy Money UI, exact amount parser, secure checkout reuse and scoped styles; preserve chat and RTC.
- [x] Run financial/UI/meeting regression tests and controlled browser media/payment flows at mobile/desktop widths.

### Task 3: Public payment payoff
Files: meeting content/template/preview generator/source; public learn meet runtime/CSS; meeting share screen/art/manifest; public tests.
- [x] Pin Pay step, inert money-to-receipt transition and absence of active checkout/network in source tests.
- [x] Implement concise payoff/FAQ with actual source components and local example actions.
- [x] Regenerate source and meeting-only share art, audit generated changes against main.
- [x] Run public browser checks, full Bank test suite and production build in owned snapshot.
- [x] One fresh read-only final reviewer; resolve findings with test evidence.
- [x] Commit owned verified changes on main; verify other agents and parent commits remain intact.

## Execution ledger
- Wallet conversation binding: 3 RED contracts →80 existing/new Wallet contracts GREEN.
- Meeting controller/composer:10 scoped contracts and4 UI contracts GREEN; two-browser RTC, Send, shortfall and hidden checkout persistence passed.
- Final review: two Important recovery findings; lifecycle replay and silent refusal regraded Important because disabled Money or missing financial feedback fails the requested seamless interaction. All four have RED regression evidence. No deferred minor findings.
- Ruling: use nonce validation inside the existing Wallet lock for recovery, preserving its authority; no new lock/source. Cost if wrong: a replacement payment could be operated from the wrong room.
- Ruling: effect setup may reopen its same scoped view-controller after replay; true unmount still closes it before pending quote dispatch. Cost if wrong: a replayed composer would remain disabled.
- Initial full suite:4054/4055; offline-proof-launcher failed with ENOSPC. Removed only owned completed temp snapshots, reran with independent cache. Initial build detected outdated share alt text; aligned the generator. Final suite4063/4063 and full production build passed.

- Final: fixed replacement-checkpoint recovery — Wallet nonce checked inside its existing lock, RED→GREEN for funding and unknown recovery.
- Final: fixed temporary Wallet failure — explicit in-place retry and account recovery link, RED→GREEN.
- Final: fixed effect replay and silent terminal refusal — StrictMode and retained-refusal UI tests RED→GREEN.
- Final: full suite4063/4063 (660 files); production build, static pages, share images, source archive, offline shell and licensing checks passed.
- Visual evidence: public Pay→receipt at1280/390/320; actual two-browser RTC, covered payment, synthetic shortfall checkout, hidden-frame persistence and two-sided receipts passed. No browser errors; screenshots confirm the new presentation. No live money/provider action or physical iPhone test.
- No downgrade: existing Wallet approval, source records and durable nonce remain authoritative. No sealed artifact, ownership, Settlement or Identity source was replaced by UI state.
