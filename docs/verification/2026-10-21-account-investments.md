# Account investments and total chart

The Account card below Send / Receive shows owned-investment value using the
same portfolio and public quotes as Assets, the invested cost basis, and
unrealized dollar and percentage return. It opens Assets at Investments. It
subscribes to no new source and makes no network request. Missing values remain
explicit; a partial portfolio is labeled as confirmed holdings updating its total.

The main balance chart shows Total only. Time periods remain, the rail tabs are
removed, and the chart moves up into the freed space. Reserve and Settlement
amounts remain in the existing Balance details disclosure. Balance calculation,
execution, custody and account-history inputs are unchanged.

The investment-card test failed before implementation, then passed for gains,
losses, updated portfolio inputs and navigation with fetch asserted unused. The
chart test failed with the rail controls present, then passed with total values
and time controls retained. Typecheck and the focused portfolio/account/chart
suites passed. Chromium checks at 390px and 1440px showed no runtime errors or
horizontal overflow; the Investments click action passed. Visual evidence uses
isolated fixture data, with production styles, and performs no money operation.
