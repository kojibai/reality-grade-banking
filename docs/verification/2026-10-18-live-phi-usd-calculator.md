# Live Phi to USD calculation

The existing calculation page now includes the exact generic wallet-rate profile
from pinned v129 source, evaluated at the current local Kai pulse or an explicitly
entered coordinate. It exposes every multiplier, original quote context, policy,
eight-decimal rate and integer cent-rounding step. JSON download captures those
same inputs and results. The latest calculated Φ feeds this conversion automatically; manual entry keeps a separate amount available. This is a display calculation; proof-specific valuation
still uses its own bound inputs and this page creates no spending authority.

The arithmetic is shared with `historicalWalletUsdRate` and the installed SDK's
integer USD conversion. Phi stays in integer micro-units, including amounts beyond
Number precision. Live updates preserve the open policy inspector and keyboard
focus. Invalid inputs remove the prior result and disable calculation download.

Verification: 1,043 tests in 199 files pass, including 33 calculator/page tests.
The full production build, source archive, licensing, conformance and offline
shell checks pass. Isolated Chromium checks at 402 × 874 and 1440 × 960 show no
horizontal overflow or page errors; the explicit fixture coordinate reproduces
1.234567 Phi as $112.09. These checks do not qualify an iPhone custody credential
or execute any financial operation. SDK, MCP and AI Skills remain 129.0.0.
