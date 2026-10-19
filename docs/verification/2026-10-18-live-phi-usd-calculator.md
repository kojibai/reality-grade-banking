# Live Market Φ to USD calculation

The converter immediately below the Φ calculator uses the public Market's
`quotePhiForUsd` implementation, original object metadata, current whole Kai
pulse, and fixed issuance context. The shared `marketProofUsdQuote` function
supplies both Market and this converter. The displayed rate retains the quote's
q9 precision; cents use Market's exact `Math.round(phi * usdPerPhi * 100)`
operation. It does not substitute the generic wallet rate or the SDK replay's
eight-decimal integer USD display rule.

The latest Φ calculation automatically supplies the amount and object inputs.
A separate manual Φ amount remains available. The live Kai coordinate and USD
rate are read-only. The earlier editable educational exchange-rate section was
removed. The inspector and downloaded JSON include the same object metadata,
quote context, policies, multipliers, full rate, and arithmetic used on screen.
Invalid or out-of-range input clears the previous result and disables download.
Live updates preserve keyboard focus and an opened policy inspector.

The calculator reproduces display valuation only. It creates no financial
authority, account credit, signed offer or executed payment. Existing proof
replay verification and its bound USD basis remain unchanged.

Direct execution against Receiz main `718468537`'s own valuation and issuance
modules matched eight quote/cents cases across four pulses. Those independent
host results are retained as golden assertions. Focused verification compares
the converter's quote and cents with actual
`publicSigilQuoteAtPulse` results at four pulses, covers quote inputs, precision,
amount independence and live page integration, and retains the independent
v129 Market projection goldens. The full 1,098-test suite and production build
pass. An isolated browser verifies automatic amount linkage, independent manual
Φ entry, read-only live rate/coordinate, and correctly rendered arithmetic.
SDK, MCP and AI Skills remain 129.0.0.
