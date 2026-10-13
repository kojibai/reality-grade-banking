# Receiz Bank Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. The proposed execution method is native implementation in this chat with a final independent review.

**Goal:** Build a polished, installable mobile banking console with cash-now deposits, one displayed balance, Settlement growth, investing and exchange, currency backing, and an inspectable social ledger.

**Architecture:** React and Vite provide one persistent responsive console. Focused feature panels consume an exact-money state model and separate Receiz v129 adapters. The local reviewable experience identifies demonstration data explicitly; real proof verification and public ledger reads use canonical SDK methods, while live financial actions remain dependent on registered application authority, custody, and qualified backend routes.

**Tech Stack:** React, TypeScript, Vite, Lucide icons, native SVG charts, Vitest, PWA manifest and service worker, `@receiz/sdk@129.0.0`, `@receiz/mcp-server@129.0.0`, `@receiz/ai-skills@129.0.0`.

**Spec:** `docs/superpowers/specs/2026-10-12-receiz-bank-design.md`

## Global Constraints

- One persistent console; bottom navigation is Account, Market, Deposit, Assets, Ledger.
- Physical deposits mean the bank's cash offer and verified acquisition. Market is investing and trading; no customer item listing flow in this release.
- Reserve and Settlement are distinct proof-native rails underneath one displayed balance.
- Settlement growth remains Settlement. Destination proof and continuity support determines external receiving availability.
- Customer copy uses deposit, balance, growth, exchange, create a currency, and transfer out; no crypto terminology.
- Exact coordinated Receiz dependencies are 129.0.0. MCP and AI skills stay out of the browser bundle.
- Real artifact verification never credits money by itself. Asking prices, pending items, and investment holdings cannot inflate the liquid balance.
- Draft/demo state cannot claim real proof authority, ownership, financial execution, custody, publication, or institutional integration.
- Known verified source truth outranks projections. Public names require explicit consent.
- User funds and external services are not mutated during implementation or verification.

## Review Focus

- Reload during an accepted demo operation must not duplicate credit, backing, or holdings; Task 2 tests semantic operation identity.
- Huge, negative, malformed, and overprecise amounts must fail before changing balances; Task 2 tests exact decimal parsing.
- Settlement sent to an institution without proof continuity support must retain its value and explain the destination capability gap; Task 5 tests capability selection.
- Interrupted file verification and missing original bytes must not imply a verified or deposited proof; Task 3 tests the actual verification result union.
- Narrow screens, expanded text, keyboard focus, and browser Back must preserve access to the primary action; Task 6 verifies these in the browser.

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/App.tsx`, `src/main.tsx` | App composition and entry. |
| `src/components/ConsoleShell.tsx`, `BottomNav.tsx`, `Sheet.tsx` | Persistent frame, accessible navigation and action sheets. |
| `src/components/ValueChart.tsx`, `AmountInput.tsx`, `AssetMark.tsx` | Reusable chart, exact amount entry, and asset identity presentation. |
| `src/core/types.ts`, `money.ts`, `account.ts`, `storage.ts`, `demo.ts` | Rail amounts, projections, deterministic demo transitions and persistence. |
| `src/receiz/client.ts`, `verification.ts`, `ledger.ts`, `capabilities.ts` | Actual v129 reads and precise financial capability boundaries. |
| `src/features/account/Account.tsx`, `TransferSheet.tsx`, `RulesSheet.tsx` | Balance, growth, sending, receiving and programmable-value drafts. |
| `src/features/deposit/DepositSheet.tsx`, `deposit.ts` | Item, dollars and original proof deposits with explicit progress. |
| `src/features/market/Market.tsx`, `AssetDetail.tsx`, `TradeSheet.tsx`, `CurrencySheet.tsx`, `exchange.ts` | Investing, charts, exchange, currency backing and bridge inspection. |
| `src/features/assets/Assets.tsx` | Owned holdings and pending deposits. |
| `src/features/ledger/Ledger.tsx` | Private/public history, actor identity and proof inspection. |
| `src/styles/tokens.css`, `app.css` | Shared banking visual system and responsive behavior. |
| `public/manifest.webmanifest`, `sw.js`, icons | Installation and offline app-shell retention. |
| `tests/*.test.ts` | Meaningful money, deposit, exchange, continuity and SDK-boundary contracts. |
| `docs/design/*`, `docs/verification.md`, `README.md` | Visual references, verification evidence, local launch and live integration boundary. |

### Task 1: Design system and persistent console

**Files:** Create app/tooling files, `src/components/*`, `src/styles/*`, `docs/design/*`.

**Interfaces:** Produces `Panel = 'account' | 'market' | 'assets' | 'ledger'`, `ConsoleShell`, `BottomNav`, `Sheet`, and `ValueChart`. Opening Deposit is an action rather than a panel replacement.

- [ ] Generate the complete mobile Account visual concept and a coordinated Deposit/Market state reference using the built-in image tool. Preserve the approved copy, navigation and banking hierarchy.
- [ ] Extract palette, typography, spacing, chart treatment, icon inventory and allowed initial-viewport copy into `docs/design/system.md`.
- [ ] Initialize the local project on a feature branch; install exact Receiz dependencies and current compatible frontend tools. No remote repository operations.
- [ ] Implement the responsive shell, labels and accessible sheet focus/close behavior. Keep App as composition glue.
- [ ] Run `npm run typecheck` and `npm run build`; both must exit zero. Open the shell at 390 by 844 and inspect navigation and primary content.

### Task 2: Exact account state and preserved transitions

**Files:** Create `src/core/*`, `tests/account.test.ts`, `tests/money.test.ts`.

**Interfaces:** Produces `BankState`, `Rail = 'reserve' | 'settlement'`, `parseAmount(value: string): string`, `projectBalance(state: BankState): BalanceView`, and `applyOperation(state: BankState, operation: BankOperation): BankState`. Money remains canonical decimal micro-unit strings; arithmetic uses BigInt. USD display composes `quoteReceizDisplayUsdV122(amountPhiMicro, usdPerPhiMicrocents)`.

- [ ] Write failing contracts: Reserve plus Settlement forms the displayed total; pending deposits/holdings do not add liquidity; backing removes free value once; duplicate semantic operation IDs return unchanged amounts; malformed/negative/overprecise values reject without writes.
- [ ] Run `npm run test -- tests/account.test.ts tests/money.test.ts` and observe failure before implementation.
- [ ] Implement exact money, separate demo snapshots, transition conservation, schema-checked local persistence, and Account's balance/growth/recent movements.
- [ ] Persist only explicit demonstration state or qualified projected data with provenance. Keep real SDK runtime verification custody outside JSON persistence.
- [ ] Run the same contracts and typecheck; require all to pass. Verify reload preserves demo operations without duplicate value.

### Task 3: Deposits and canonical proof inspection

**Files:** Create `src/features/deposit/*`, `src/receiz/client.ts`, `verification.ts`, `tests/deposit.test.ts`, `tests/verification.test.ts`.

**Interfaces:** Consumes Task 2 state/operations. Produces item intake state and `verifyOriginalArtifact(file: File): Promise<ReceizArtifactVerificationResult>` through the real v129 `verifyReceizArtifact` export.

- [ ] Write failing contracts: an intake creates a pending asset without credit; rejected/unverified/unsupported proof creates no money; only a completed accepted funded purchase adds Reserve once; verification cannot substitute for Settlement admission.
- [ ] Observe these contracts fail, then implement them.
- [ ] Build the deposit sheet with **An item**, **Dollars**, **A proof object**. Item intake collects the minimum details and shows delivery, verification and accepted-offer stages. Any demo completion identifies its demonstration status.
- [ ] Implement original-file selection and canonical result handling. Retain the exact source in runtime and display actual verified/invalid/denied/unsupported outcomes.
- [ ] Dollar and proof funding reviews expose the actual live-route prerequisites. Local demo funds never imply a provider payment or admitted real Settlement.
- [ ] Run the focused contracts, typecheck and build. Verify the complete demo item deposit and rejection of an ordinary unsealed file in the browser.

### Task 4: Market, currency backing and exchange

**Files:** Create `src/features/market/*`, `src/features/assets/Assets.tsx`, `tests/exchange.test.ts`, `tests/currency.test.ts`.

**Interfaces:** Consumes exact state and operations. Produces `quoteExchange(input: ExchangeInput): ExchangeQuote`, demo buy/sell operations, currency creation/backing state, and asset detail with period-selected charts. Quote amounts, fees and backing remain explicit.

- [ ] Write failing contracts: trading cannot overspend a rail; buying updates the holding and payment once; selling cannot exceed owned units; creating/backing a demo currency preserves total committed value; an invalid exchange leaves both sides unchanged.
- [ ] Observe failures, then implement exact arithmetic and atomic demo transitions.
- [ ] Build searchable Market categories and Assets with proof objects, held positions, bank inventory and currencies. Asset detail includes chart periods, price, holdings, proof and a clear action.
- [ ] Implement buy/sell/exchange review sheets and a simple **Create a currency** flow. Advanced backing and bridge information appears only on request.
- [ ] Currency supply, liquidity and bridge controls identify demo contracts until actual sealed issuance and receiver-continuity contracts qualify. Do not produce fabricated verification or bridge-completion claims.
- [ ] Run focused tests, typecheck and build. Browser-test buying, selling, currency backing and an insufficient-funds case.

### Task 5: Receiving capability, programmable rules and social ledger

**Files:** Create `src/features/account/TransferSheet.tsx`, `RulesSheet.tsx`, `src/features/ledger/Ledger.tsx`, `src/receiz/ledger.ts`, `capabilities.ts`, `tests/continuity.test.ts`, `tests/ledger.test.ts`.

**Interfaces:** Produces `assessDestination(destination: DestinationCapability, rail: Rail): DestinationAssessment` and `readPublicLedger(cursor?: string): Promise<WalletLedgerFeed>` using v129 `client.wallet.publicLedger`.

- [ ] Write failing contracts: lack of Settlement continuity support returns a destination capability gap without changing balance; supported routes retain the explicit rail; pseudonyms remain default; username presentation requires consent; duplicate public event IDs append once.
- [ ] Observe failures, then implement capability and ledger projection rules.
- [ ] Build Send, Receive and Transfer out sheets. Use **This institution doesn't yet support proof-backed Settlement** for that exact capability gap. Never represent an unqualified provider as available.
- [ ] Build a simple Rules draft sheet with eligible-value allocation/reinvestment controls; saving a rule does not activate live delegated execution.
- [ ] Build My history/Public ledger, actor identity preferences and proof inspection. Live public reads use real SDK results and append beneath retained stronger truth; network failure remains visible without erasing existing history.
- [ ] Run focused tests, typecheck and build. Verify both rail choices, unsupported destinations and opt-in name presentation.

### Task 6: PWA, full browser verification and handoff

**Files:** Create manifest, service worker, icons, `README.md`, `docs/verification.md`; refine component/styles files only for found defects.

**Interfaces:** The installable app restores the console shell and local review state without claiming that offline or pending financial actions completed.

- [ ] Add standalone manifest, app icons, safe-area layout and service-worker shell caching. Financial mutations are never replayed automatically from a cache.
- [ ] Run the complete test suite, typecheck and production build; require zero failures.
- [ ] Run the local server and use Browser/IAB to test 320, 390 and 430 pixel mobile widths and a desktop viewport. Check overflow, expanded text, keyboard navigation, sheet focus, Back, chart periods and reload.
- [ ] Verify Account → Deposit → pending asset → demo completion; Market → asset → buy/sell; currency backing; Send/Receive; institution capability; Rules draft; private/public Ledger; and original proof rejection.
- [ ] Verify offline shell restart, service-worker update and the manifest/icon references. Preserve actual source authority throughout.
- [ ] Inspect the generated concept and current screenshots with `view_image`. Record copy, layout, typography, palette, chart and navigation comparisons; fix material mismatches.
- [ ] Obtain an independent whole-change review under the execution skill, address material findings and rerun affected checks.
- [ ] Document working preview, exact v129 dependencies, verification evidence, demo/live distinction and the remaining registered-host/physical-backend/issuance qualification requirements. Show the running app to the user.

## Execution Boundary

This plan ships the full reviewable frontend and actual v129 proof/public-ledger integration. It does not certify a production physical-acquisition backend, live fiat payout, external institution acceptance, currency issuance or bridge merely because its frontend controls exist. Those require actual authority, custody, source contracts, configured receiving routes and completed evidence. No user money moves during this build.
