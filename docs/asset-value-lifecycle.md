# Asset value lifecycle

Deposit admits value to the account. Create seals the Original. Sell exchanges defined ownership for funded proceeds. Transfer moves ownership through the existing source-bound operation. The approved Deposit/Create design remains unchanged.

## Reused implementation

- `LiveDeposit` reuses card credit, Note deposit, proof admission and `startAssetIntake`. Any-asset intake saves the same sealed request with `custody:awaiting-receipt` and `createsSpendableValue:false`. A title or estimate is not a funded receipt.
- `CreateAsset` reuses `createComposedAsset`, canonical publication, retained recovery and optional native backing. Original/cover/attachments/full text keep their exact roles and bytes. The preview grants no ownership or funding.
- A confirmed public creation links to the exact source-matched, already-admitted asset. Pending publication retains its exact Original and recovery path. A missing admitted display coordinate falls back to the owner profile without inventing one or fetching before navigation.
- `LiveMarketTrade` uses the existing Market position writer; native-bound assets route to `LiveOwnership`. The native offer contract requires actual owned units or funded bids. Neither a projection nor listing publication is a buyer.
- Receiz separately implements creator-reserve certificate issue and buyer-funded certificate purchase. Issue locks capacity without a seller credit; purchase debits the buyer and credits the seller. Bank’s generic position purchase must not be described as an automatic direct payment to the Original’s creator. This UI refinement does not add the missing Bank creator-certificate composition.

## Participants and continuity

The source describes what is offered. The seller receives recorded sale proceeds; the buyer receives the exact ownership defined by that sale. The next resale pays its current seller. Creator royalties require explicit supported terms. Physical ownership, custody, delivery and consumption are separate recorded facts. The receiver of spendable proceeds does not acquire title to the assets named in their funding provenance.

Eligible Glyph creation-based Settlement follows its existing entitlement and canonical public-proof projection. This work changes no entitlement flag, valuation equation, issued units, custody acceptance, signed source or accounting. Confirmed funds continue through the existing payment/account/Note paths.

## Exact remaining execution boundaries

Generic physical/other asset intake is a sealed request, not completed liquidation. Immediate proceeds require qualified custody/title and an actual funding source or supported entitlement. Public deterministic valuation and executable bid/ask price remain distinct. No universal buyer, automatic return, crypto custody, or physical fulfillment is introduced by this presentation work. Those execution boundaries must be composed from their actual sources before claiming universal instant liquidation.
