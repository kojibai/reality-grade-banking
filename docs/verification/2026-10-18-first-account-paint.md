# Account first paint and chart continuity

Later historical-valuation implementation:
[accepted holdings and deterministic pricing](../historical-account-valuation-v129.md).
The historical-rate limitation below describes this earlier checkpoint.

The account screen now receives its retained balance, observation time and
chart history together, both before and after canonical identity admission.
Previously the early screen omitted history even when the encrypted local
observation already contained it. The hook now owns that history so a pending
network refresh cannot leave it disconnected from the visible balance.

Opening a cached account no longer waits for the optional full account source
to reopen. That source still verifies before adoption and cannot rewind a newer
wallet or a locally accepted Note successor. With no retained observation, the
verified original remains the local recovery path. Display-cache encryption and
persistence no longer delay delivery of an already received wallet observation.
The durable financial and Note writers are unchanged.

All chart periods continue to use actual observations in their selected range.
A range containing one observation now draws a full-width current-value
reference line. It does not invent an earlier timestamp, growth or percentage;
the existing insufficient-history note remains visible. Multiple observations
retain the existing fitted time axis, values, labels and inspection controls.

The earlier `00c401a` fix already fitted multiple-point periods to their real
available time range and used the Day label. The source-closure commit
`c1aaff5` did not change account entry or chart rendering. This checkpoint fixes
the remaining display-data handoff and optional-work delays.

First meaningful account paint uses the last identity-bound state held on that
device. Newer accepted observations append in the background. An unseen account
without a carried/retained balance still requires its first valid source read.
Historical nonzero Settlement dollar values still need their historical
valuation sources; the current checkpoint rate does not reprice earlier funds.

Regression checks cover delayed canonical opening, delayed original-source
verification, delayed encrypted cache persistence, late stale source delivery,
history retention through refresh/removal, and sparse selected periods. Chrome
QA exercises 144 combinations across four synthetic histories, three rails,
six periods and mobile/desktop viewports. No real identity, funds or payment
is used. SDK, MCP and AI Skills remain v129; no Receiz branch or SQL changes.
