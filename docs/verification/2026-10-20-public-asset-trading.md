# Public asset trading and share artwork verification

Verified locally on 2026-10-20. No live card charge, trade, or provider 3DS flow
was performed or qualified. Financial browser checks used synthetic account APIs
with the existing production React UI.

## Implemented path

- `beginPublicAssetTrade({itemId, side, title})` opens `PublicAssetTradeHost`'s
  existing `Sheet` immediately on the public page. Its URL, head and background
  remain selected.
- The central `ensureBankRuntime` in `public/learn/learn.js` shares one import
  promise and retained bank root with ordinary bank navigation. Read-only public
  loading does not open an account. Explicit purchase/sale intent loads the bank.
- `BankApp` retains its sole `useNativeAccount` owner and portals the existing
  `Entrance`, `LiveDeposit` or `LiveMarketTrade` into the public dialog. There is
  no second identity/session owner. The hidden entrance is replaced by the
  portal while it is in use.
- A funded account enters the existing budget/quantity review. An empty buy
  account uses existing create/import entry and embedded card funding first.
  The user chooses a fractional purchase budget; the asset's displayed market
  value is never used as an automatic charge. Funding-only UI hides unsupported
  Wire selection; the full Deposit chooser retains its existing behavior.
- Only the native saved checkout's bound `credited` result advances funding to
  a prefilled trade form. The user must still request the live quote, review it,
  approve its original consent and explicitly confirm. Sales use the existing
  quantity flow. Sports IDs remain excluded.

## Return and reload recovery

`public-purchase-checkpoint.ts` retains at most eight public UI checkpoints in
per-tab `sessionStorage`: item ID/title, side, budget, session reference and UI
view. It stores no checkout secret, identity, credential, credit authority or
trade approval. The UI view is only a draft/resume preference.

The existing native card return continues to signal an exact checkout check.
Its explicit top-level return link points to the same asset when that session
has a checkpoint, using `#resumeCardSession=...` rather than an unsupported
asset-page query. On return/reload, the asset stays cold and offers an explicit
resume button. A deposit resumes its exact native saved checkout; a review
checkpoint only prefills a fresh manual trade form. Neither a provider return
nor this checkpoint asserts payment success. Native device custody, account
binding, scopes, financial confirmations and unknown-outcome recovery remain
the authority. If optional session storage is unavailable or lost, the existing
native account deposit recovery remains available.

## Sharing renderer

`server/asset-share-art.ts` renders metadata-only 1730 × 909 PNG artwork in the
Bankeiz ivory/navy/cobalt identity. It shows the specific title/category, full
supplied Market Value and truthful owner/copy details. Missing values remain
unavailable; long titles wrap/truncate. No media fetch, invented chart, return,
verification or liquidity claim is added. Generic social SVG helpers remain
byte-identical. Preview rasterization used the retained Inter fonts and Resvg.

## Checks and evidence

The following focused command passed **49 tests in 12 files**, with one worker:

```sh
npm test -- tests/asset-share-art.test.ts tests/asset-preview.test.ts tests/public-purchase-checkpoint.test.tsx tests/public-asset-trade.test.tsx tests/public-asset-trade-navigation.test.ts tests/public-asset-trade-account.test.tsx tests/live-deposit.test.tsx tests/market-trade-ui.test.tsx tests/native-return-route.test.tsx tests/public-navigation.test.ts tests/public-runtime-navigation.test.ts tests/public-navigation-cached-shell.test.ts --maxWorkers=1
```

A final focused rerun of `tests/public-asset-trade.test.tsx` passed 5 tests after
adding the funding-only Wire assertion. The targeted strict TypeScript check of
both art files and `git diff --check` passed. No full production build was run by
this worker; final integration/build verification belongs to the parent task.

Browser fixture: `tests/browser/public-asset-trade.html` and
`tests/browser/public-asset-trade.tsx`, served at
`http://127.0.0.1:5443/tests/browser/public-asset-trade.html` (`?new` for entry and
funding). Browser plugin was unavailable; the installed Playwright CLI wrapper
`/Users/bjklock/.codex/skills/playwright/scripts/playwright_cli.sh` drove the real
UI. The card frame was replaced with synthetic markup, and the asset return
document used the same fixture. The actual `CardDepositReturn` UI was exercised.

Verified desktop review and 390 × 844 mobile entry, chosen $25 card budget,
pending credit, credited-to-form transition, purchase review, quantity sale
review, native return link, and cold reload/resume. The final fixture showed
zero trade submissions, unchanged URL/title through the dialog flow, no
horizontal overflow (390 px viewport/document width), and disabled financial
confirmation before consent. No application exception/framework overlay was
observed. Chrome blocked Vite's development HMR websocket on the mocked asset
return route; this did not prevent the verified UI interactions.

Local screenshots:

- `/private/tmp/bankeiz-public-trade-review.png`
- `/private/tmp/bankeiz-public-trade-entrance-mobile.png`
- `/private/tmp/bankeiz-public-trade-funding-mobile.png`
- `/private/tmp/bankeiz-public-trade-review-mobile.png`
- `/private/tmp/bankeiz-public-trade-sale-mobile.png`
- `/private/tmp/bankeiz-public-trade-card-return.png`
- `/private/tmp/bankeiz-public-trade-return-pending.png`
- `/private/tmp/bankeiz-public-trade-reload-resume.png`
- `/private/tmp/bankeiz-asset-share-{image,sports,long,unavailable}.png`

The temporary renderer preview bundle is
`/private/tmp/bankeiz-asset-art-preview.cjs`. Browser snapshots/logs were emitted
by the CLI under its ignored `.playwright-cli/` directory. No deployment, push,
commit, actual payment or actual trade was performed by this worker.
