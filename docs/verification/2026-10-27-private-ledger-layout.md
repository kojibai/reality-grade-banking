# Private Ledger mobile rows

The My history row placed its title/description, amount, realized return,
expand chevron and three receipt actions on one flex line. With full trade
facts, the fixed amount and action widths squeezed the text into a thin strip.
This was reproduced with the actual Ledger and synthetic sale records at 320px.

A presentation class on the existing personal rows scopes a mobile grid to
My history at 600px or less. Record text and recorded values use their own rows;
receipt actions sit below. Long custom titles retain normal wrapping. Individual
numbers remain intact. Public rows and wider layouts keep their existing rules.
No handler, financial value, source read, pricing, receipt or history logic changes.

Qualification: 25 affected trade/payment/receipt tests passed, generated product
previews checked and the complete production build passed. Browser inspection
confirmed title, shares, amount, realized return and all receipt actions remain;
expanding the row still displays the complete trade/cost-basis details. Fresh
read-only review found no remaining important issues. An initial review caught
an unnecessary nowrap rule on custom titles; it was removed before qualification.

Saved local UI evidence (synthetic records, no financial action):
/private/tmp/bankeiz-private-ledger-before.png
/private/tmp/bankeiz-private-ledger-after.png

Logs: /private/tmp/ledger-row-focused.log and /private/tmp/ledger-row-build.log.
Unrelated active meeting-page changes were excluded from the qualification set.
