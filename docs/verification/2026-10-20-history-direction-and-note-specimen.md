# Account history direction and combined Note specimen

## Behavior

- My history retains incoming and outgoing activity from the existing private Wallet page and admitted Identity Seal history. It does not substitute a public profile lookup for private history.
- Native debit/credit fields and exact account participant IDs establish the display perspective. Display names, usernames, amounts and local clocks do not establish direction. Conflicting participant/actor evidence remains unclassified.
- Money Sent and Money Received use signed amounts and directional icons. Incoming amounts use the existing subdued green. All, Sent and Received filter already grouped rows, retaining the nested execution record and the existing pagination path.
- Native activity subtypes receive plain, consistently capitalized names: Asset Purchase, Asset Sale, Pack Purchase, Prediction Placed/Payout/Refund, Collectible Created/Received/Sent, Money Added and Note Created/Deposited/Refunded. The exact native kind and subtype remain inspectable beneath the presentation.
- Older encrypted display history derives direction and subtype labels from its already retained complete source pages during their existing validation. Thin repeated projections cannot erase known direction or subtype. Explicit direction conflicts remain distinct from absent data.
- Public history remains neutral about the viewing account. This change does not change balances, transaction order, FIFO attribution, source evidence, authorization, execution or financial authority.
- Reality-Grade Banking now shows one Settlement Reserve Note specimen in its Notes section. Funding-specific illustrations remain in the detailed guide. The combined illustration is unissued and has no spendable value.

## Verification

New regression cases were observed failing before implementation, then passed after the changes. Focused checks cover bound private and portable reads, foreign actors, contradictory direction, thin source copies, public neutrality, plain native activity labels, grouping and receipt controls.

The isolated browser fixture uses synthetic records and no authenticated account. At 320, 390 and 430 CSS pixels, rows remain within the page width. All/Sent/Received switches issue zero requests; the delegated execution remains inside its one payment. Real browser encrypted-storage checks pass, including older-source direction restoration, concurrent retention, corruption refusal and identity separation.

The combined Note illustration loads as one image, retains its proportions, keeps its caption clear and has no horizontal overflow at 320, 390, 430 and 1280 CSS pixels. Reduced-motion mode disables its motion.

This is UI, retained-display and source-projection verification. No payment or Note was created, sent, redeemed or credited. Live iPhone Note qualification remains separate and awaits the user's device check.

## Public Ledger release title pass

The public page, logged-in Ledger, expanded inspector and connected-record
links share the same display naming function. Recorded action kinds now show
plain titles such as Asset Purchase, Asset Sale, Signed In and Collectible
Transfer. Unknown machine-generated action names use Recorded Activity;
authored asset names and specific human summaries remain intact.

Reserve, Settlement and composite Note rows all display Note Created, Note
Deposited or Note Refunded, including the existing native allocation,
redemption and cancellation subtypes. This is a title change, not a new
financial projection. It adds no request, polling, source rewrite, amount
change or account-relative public direction.

`tests/ledger-payment-records.test.ts`,
`tests/public-ledger-value-ui.test.tsx`,
`tests/account-history-direction-ui.test.tsx` and
`tests/account-history-direction.test.ts` passed: **4 files / 16 tests**.
The rendered public-page check opens the combined Note's existing detail,
checks all three compositions, preserves the complete input records and
observes zero fetch calls. Original kinds and summaries stay in the exact
record and receipt evidence.
