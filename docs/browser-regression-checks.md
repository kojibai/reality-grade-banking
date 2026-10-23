# Browser regression checks

`npm run test:browser` checks the built application at 390px and 1440px widths. Run `npm run build` first; install the pinned test browser with `npx playwright install chromium`. An installed Chromium executable can instead be selected with `BANK_BROWSER_EXECUTABLE`.

The checks run in isolated browser contexts with synthetic public display specimens. External services are blocked. They create no account, hold no private identity, submit no payment and grant no financial authority.

The gate fails when:

- A cold asset downloads images beyond its carried cover and owner portrait, fetches either image twice, or mounts an unvisited collection.
- Profile preparation starts before document loading finishes, is omitted or duplicated, or preloads an unused banner or cover after its deferred JSON adoption.
- Artwork or the owner portrait fails to render or loses its eager loading; the artwork must keep its high fetch priority.
- Copy feedback changes the link, shifts the button or fails to reset.
- Returning from an asset replaces the retained collection, search or scroll position.
- Returning to the retained public workspace replays its entrance fade or causes a replacement document load.
- The page has a runtime error, attempts a live service call or overflows horizontally.
- The installed production shell fails to reopen with browser networking disabled.

Screenshots and a machine-readable result are written to `test-results/browser-regressions/`, excluded from version control and retained by CI for 14 days. CI runs this gate after the complete unit suite, type checks and production build. Existing source-reproduction checks still run afterward.

Authenticated account restoration, delayed Settlement-history reads, stale-response protection, financial originals, funding continuity and duplicate execution remain covered by their integration tests in the full unit suite. Browser shell availability does not establish offline financial execution or hardware custody qualification.

To check that this gate catches a historical regression, set `BANK_REGRESSION_DIST` to a preserved older build. A passing current build must not be inferred from an older build's result.
