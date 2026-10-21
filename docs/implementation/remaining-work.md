# Remaining product work

Updated October 20, 2026, after Bankeiz commit `d8a9723` and Receiz
host commit `35891d794`.
This is an implementation queue, not a live capability or release claim.

The agreed v1 preparation scope is calling continuity, the modern Note Ledger
correction, the complete README/release record and the audience-specific public
pages with their supporting repository documentation. The feature expansions
below are retained for subsequent updates rather than silently added to v1.

## Prepared for qualification

1. Calling now keeps one existing Receiz session and its media alive when
   Messages is minimized or the user navigates within the application. Compact,
   draggable controls provide return, microphone, camera and ending the call.
   Browser or operating-system suspension remains outside application control;
   do not promise calls survive closing the browser or terminating the PWA.
2. Modern Reserve, Settlement and composite Note creation, deposit and refund
   projection is committed on Receiz main as `35891d794`. It preserves native
   refusal, exact values, original times and once-only financial effects. Bank's
   local receipt-backed Note history is already committed. Actual host delivery
   follows operator deployment and qualification.
3. Eight audience guides, distinct interactive vector scenes and sharing
   images, grouped footer destinations, the open-architecture README and the
   versioned release documentation are included in this preparation. Local
   source and browser checks are recorded in the qualification record; actual
   deployment and financial/device qualification remain separate.

## Follow-up releases

- **Note QR:** integrate a scannable claim/status locator into the engraving at
  creation. Reuse admitted Note sources and receiver-bound claims. Never expose
  signing keys, private account openings or a transferable bearer secret in a
  public status URL. A scan opens the appropriate action; it does not itself
  establish ownership or credit. Public claimant disclosure requires an
  explicit supported public identity boundary.
- **Get paid:** a restrained section in Receive for payment links, a website
  button, no-code integration and developer examples. Reuse Receiz payments,
  account money and supported Notes. The source audit and missing host
  boundaries are recorded in [the integration audit](2026-10-20-get-paid-integration.md).
  Do not advertise arbitrary-site embedded card checkout or modern merchant
  Note claims before those exact paths are implemented and qualified.
- **Send to email:** send to an email address, deliver a claim link and credit
  the properly established existing or new Receiz ID. Reuse the supported
  Receiz email/identity/transfer primitives; audit their existing contracts
  first. Merely typing an email address or landing on a URL is not account
  authority. Retain the original payment intent and once-only claim/recovery.
- **Persistent media:** keep the same music/video playback session across
  in-app navigation. A compact, dismissible player opens artwork, controls,
  queue and music discovery/search. Start playback through a user action;
  preserve native media and avoid duplicate players or new polling. The
  committed premium audio controls currently persist through an asset's
  proof flip/full view, not after leaving that asset.
- **Display currency:** one unobtrusive selector in the balance popover for
  supported fiat currencies and major crypto equivalent units. Apply the
  preference consistently to projected top-level amounts. Preserve the
  underlying Phi amounts, exact Reserve backing and original receipt/Note
  denominations. Showing a BTC equivalent does not create BTC custody or
  exchange a balance. Use timestamped, sourced rates with appropriate currency
  precision, shared retention and background refresh; never fetch per value,
  delay the known balance or silently invent missing/stale rates. Conversion
  arithmetic is deterministic for a given rate snapshot; exchange-rate
  discovery is an external input. The inspected v129 SDK exposes no general
  fiat/crypto display-rate operation, so audit the Receiz host's reusable rate
  source before selecting an integration. Historical performance must not be
  relabeled as historical foreign-currency returns without the corresponding
  historical rates. Currency preference is presentation, not a new financial
  writer, foreign-currency account or executable exchange quote.
  Update the relevant international-payment, business-payment, account and
  developer explanations with the implemented benefit: familiar units over
  shared settlement, receiving money and paying people from the existing
  account, and continuous source/receipt history. Show the practical path from
  a customer payment to a subsequent supplier or employee payment. Keep the
  main screens concise. Publish capability-specific copy with the actual
  supported implementation; do not imply external crypto transfers, local-bank
  payouts, payroll administration or a measured speed improvement from a
  display preference alone.

The sequence after the current fixes can change with user priorities. These
items have not been implemented merely by being recorded here.

## Qualification and release

Qualify the exact deployed build's Note funding/credit/recovery on all supported
rails, actual assessed device custody, canonical Showcase/Market publication
and new public purchase/card-return paths. Preserve synthetic versus real
financial evidence. Complete the existing [v1.0.0 release gates](../releases/1.0.0.md)
before publishing that release.

After product work, inspect only stale workspaces inactive for more than three
days and the task's own stale processes for the requested Mac cleanup. Preserve
private custody, ignored recovery material, other developers' active work and
recoverable changes. Removing disk files alone does not free running-process
memory; do not describe it that way.
