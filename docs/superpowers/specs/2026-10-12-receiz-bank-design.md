# Receiz bank mobile console design

This application gives people one place to deposit what they own and use the value. The customer promise is **Deposit anything. Get liquidity.** The experience feels like a bank: one account, one displayed balance, a prominent Deposit action, and simple navigation at the bottom of an installable mobile browser app.

The physical asset model is a funded purchase. The bank receives the item or verifies the required title and custody, inspects it, makes a transparent purchase offer, and credits Reserve when the accepted purchase completes. Proof objects use Receiz's existing verification, ownership, and Settlement admission primitives. Dollar funding enters Reserve through the actual funding and credit evidence.

The approved design makes cash offers the physical deposit journey. Market is for investing and trading; customer item listings are outside the first release. The bank can sell acquired inventory in Market without adding a decision to the customer's deposit flow.

## Agreed experience

- The first screen is the bank account and its balance.
- The application uses one persistent console with bottom navigation. Actions open within the console as sheets or panels.
- Deposits include physical assets, fiat funding, and Receiz proof objects.
- Reserve and Settlement retain their distinct authority and execution rules beneath the combined account display.
- Physical deposits produce funded liquidity after the bank receives and verifies the asset and completes the accepted purchase.
- People can use their value, invest, trade proof objects and positions, and eventually create currencies with verifiable backing and supply.
- A public social ledger carries inspectable proof and cryptographic actor names. Displaying a Receiz username requires explicit consent.
- SDK, MCP, and AI skills target the coordinated Receiz 129.0.0 distribution.

## Deposit and marketplace roles

Deposit means liquidity. Physical deposits follow the bank's cash offer and verified acquisition path. Market means investing and trading: proof objects, positions, bank inventory, and currencies. The initial deposit screen never asks the person to choose a sales strategy. A declined offer preserves existing ownership and presents the actual return or recovery path.

## Account screen

The screen opens directly into the account. The top contains the Receiz identity entry and a small account control. A large amount labeled **Balance** is the visual anchor. The account carries Reserve and Settlement together; transfer availability is shown for the selected receiving route rather than declaring Settlement permanently unavailable to external institutions.

**Deposit** appears once in the prominent bottom navigation. The central account actions are **Send** and **Receive**. A readable balance chart and recorded Settlement growth provide immediate context. Recent verified account movements appear below them. A small assets summary links to owned proof objects, positions, currencies, and pending physical deposits. Empty accounts show the same settled structure with the invitation **Make your first deposit**.

Tapping the balance opens its explanation: Reserve, admitted Settlement, any locked amounts, and the exact display conversion basis. Pending inspections, unaccepted offers, asking prices, model valuations, and investment positions do not inflate the liquid account balance. Position values belong in Assets and cannot be counted again as spendable liquidity. Every spend or withdrawal preview identifies its actual rail and eligible amount.

The prominent combined balance is a display projection over admitted value, not a new value rail. Use the canonical exact Phi amounts and SDK-issued conversion basis. The v129 proof valuation calculator does not itself create spendable Settlement.

## Settlement growth and receiving institutions

Settlement is proof-native value. Its verified source, admitted value head, and accepted history establish the balance. Its growth remains Settlement and must be derived from actual admitted rules and evidence, not a fabricated APR or elapsed browser time. The account explains recorded growth and makes its proof inspectable.

A receiving institution must verify the source and preserve value, ownership, history, and continuity. A missing integration is a capability gap at the destination, not a judgment that Settlement is unreal or permanently unable to leave the account. Use **This institution doesn't yet support proof-backed Settlement** when that is the actual missing capability. Never use **Settlement cannot be withdrawn** as a universal statement.

External delivery is enabled only for a qualified receiving route. Show its supported rail, currency, custody, continuity, and any actual conversion quote. Fiat credit or another institution's acceptance requires that route's real completion evidence. The proof balance remains intact when the destination cannot receive it. The application must not imply that absent institution support or an unavailable conversion has already been implemented.

## Bottom navigation

| Item | Purpose |
| --- | --- |
| Account | Balance, send, receive, cash out, and recent account movements. |
| Market | Discover and trade proof objects, positions, currencies, and supported asset inventory. |
| Deposit | The central action opens the deposit sheet from any panel. |
| Assets | Owned proof objects, held positions, currency backing, and pending deposits. |
| Ledger | Private account history and the public social ledger, with proof inspection. |

Deposit is visually prominent. All navigation uses labeled icons, generous touch targets, and the phone's bottom safe area. Switching panels preserves account state, scroll positions, entered deposit details, and the settled shell. Browser Back closes a sheet or returns to the previous panel. Direct asset references open the same console with the relevant asset panel.

## Deposit journey

The sheet asks **What are you depositing?** and shows three concrete choices: **An asset**, **Dollars**, and **A proof object**. The customer never selects a settlement rail.

### Physical items

The person supplies photos and the minimum information needed to identify the item and establish ownership. The experience shows the bank's indicative cash offer, the inspection conditions, expected handoff, and any actual fees before the person commits to delivery. Indicative offers are labeled estimates; they are not credited funds.

The app provides the appropriate handoff: shipping, drop-off, or title and custody verification for assets that cannot be shipped. Pending deposits remain visible in Assets with plain states: **Awaiting delivery**, **Received**, **Verifying**, **Offer ready**, and **Paid**.

After receipt and verification, the final purchase offer states the net amount, the ownership transfer, and the attached proof. Accepting that offer authorizes the exact purchase. Reserve is credited only when the funded purchase completes. The successful screen says **Added to your balance** and opens the verified receipt. The instant-cash promise refers to the completed, verified deposit; shipping and inspection do not masquerade as completed liquidity.

The bank's operational surface handles intake, condition, authentication, custody, quotes, funding, and inventory resale. These operations are a separate subsystem beneath the customer's single deposit journey. Physical authenticity and fair market purchase prices require actual inspection and quote evidence; an AI description or sealed photograph alone does not establish them.

### Dollars

The person chooses an amount and completes the configured funding provider's flow. A return URL or successful checkout launch does not establish wallet credit. The app reads the actual completed session, verifies the credited account and amount, and projects the resulting Reserve state before reporting success. Retries preserve the existing operation identity and resolve an unknown outcome before resubmission.

### Proof objects

The person imports the original artifact. Canonical verification opens the enclosing proof before any embedded data is projected. The app shows its verified identity, ownership, admitted history, and available actions.

If the actual SDK admission and value rules establish eligible Settlement, the app reflects that accepted value. Otherwise, it shows the proof object and its precise state without converting a read-only intrinsic value or asking price into money. Import, verification, ownership claim, Settlement admission, and a funded sale retain their distinct outcomes beneath the simple flow.

## Market and assets

Market opens with a small set of clear categories and search. Asset detail shows the original proof object, owner or custody, the actual price or offer, and an inspectable history. Buy and sell review remains inside a bottom sheet. The sheet makes the payment amount, Reserve and Settlement split, fees, ownership or share rights, and resulting delivery explicit.

Existing Receiz positions and certificates are composed directly. Buying position shares is separate from transferring the original proof object or acquiring additional intellectual property rights. A completed purchase requires actual payment and accepted delivery evidence for the same asset and intent.

Bank inventory can appear in Market after the bank's funded acquisition and ownership transfer. Later customer listings use the same source and ownership continuity. Social discovery never creates a completed sale or a funded balance by itself.

Assets exposes what the person owns and what is pending. Each asset retains a verification affordance and its source. The customer can inspect proof, transfer eligible ownership, trade a position, or open supported issuance actions without leaving the console.

## Currency creation and backing

Currency creation is an advanced action inside Assets or Market, not part of first deposit or account entry. It asks for a name, symbol, supply policy, backing, and explicit transfer and redemption terms. A review shows exactly what value will be committed and what rights a holder receives.

Supply, ownership, backing, issuance, redemption, and trading must bind to enclosing Receiz proof objects and accepted history. Existing SDK domain and ownership primitives should carry these contracts. No invented token or database balance becomes an authority layer. A dedicated turnkey currency or liquidity-pool operation has not been established by the inspected capabilities; its exact composition and backing conservation must be qualified before enabling live issuance.

Eligible Reserve or Settlement may back a currency through its explicitly named, qualified rail and proof contract. Committing value as backing reduces its availability for other use; it cannot simultaneously count as free account liquidity and committed backing. Issuing currency supply does not independently create additional Reserve or Settlement. Liquidity funding, exchange, and bridge operations preserve supply, exact amounts, custody, and backing across accepted heads. A bridge cannot duplicate spendable value on its two sides. Enable a bridge only when the destination can verify the exact currency proof and preserve continuity.

Use banking language throughout: **Create a currency**, **Back your currency**, **Exchange**, and **Transfer out**. Crypto interfaces are functional references only; do not use token, gas, mining, farming, blockchain, or wallet-connection terminology in the customer experience.

Programmable value appears as **Rules** within account or asset detail. People can review how an eligible allocation or reinvestment rule would use their value in one concise action. Saving a draft or a demonstration rule does not activate real delegated money movement. Live activation requires the actual admitted mandate, exact scope and user consent, and a qualified execution route.

## Public social ledger and identity

Ledger offers **My history** and **Public** inside the same panel. Public events use Receiz's existing cryptographic actor projection. Each accepted public movement links to its source, value semantics, and verification. Listings, transfers, purchases, share issuance, and backing events enter this view only through their actual supported public witness contracts.

Public social presentation can add readable summaries and discovery beneath verified history. It does not turn pending attempts, likes, estimates, or index rows into accepted transactions. Private identity keys, addresses, shipping data, contact information, and complete account state remain outside public event projections.

A person may explicitly bind and display their Receiz username. That consent adds a public identity presentation; it does not rewrite historical actor identity or expose private custody. Stable pseudonyms support continuity, not a promise of complete anonymity.

## Visual design and PWA behavior

Use a calm banking appearance: warm white surfaces, deep navy text, a restrained blue primary action, readable numbers, and clear spacing. Consumer text says Deposit, Balance, Send, Receive, and Assets. Proof, ownership, Reserve, and Settlement are named directly where the person inspects them or reviews their effect.

The account takes priority over social discovery. Balance and asset charts make value and growth legible; chart periods, selected points, and asset detail feel responsive and consequential. Confirmed actions receive restrained, satisfying completion motion. Rail explanations, calculation traces, advanced currency actions, Rules, and technical evidence open on demand. Avoid promotional tickers, busy dashboards, crypto styling, and competing calls to action in the initial viewport. Do not fabricate volume, growth, completed sales, or yield to make a live view look active.

The responsive console supports narrow phone screens, one-handed interaction, accessible labels, text scaling, keyboard use, reduced motion, and safe-area padding. The installed PWA opens in standalone mode with the same account shell. Desktop retains the same navigation model with more room for the active panel.

Known verified local truth paints immediately. Service-worker and durable local storage preserve the app shell and admitted projections; background synchronization appends verified additions beneath them. Financial actions require their actual custody, participant, provider, and connectivity conditions. Offline availability never implies that an unexecuted transfer or deposit completed.

## Receiz integration

Use coordinated exact dependencies: `@receiz/sdk@129.0.0`, `@receiz/mcp-server@129.0.0`, and `@receiz/ai-skills@129.0.0`. The browser composes the SDK's supported runtime and React bindings. MCP provides agent access in a configured trusted host; AI skills govern operation selection and proof handling. AI may help explain an offer or collect intake details, but it cannot establish ownership, authentication, funding, or settlement by assertion.

Reuse existing canonical primitives:

- `verifyReceizArtifact` and artifact admission for enclosing proof verification and permitted state.
- Receiz ID and device-held identity proof for continuity and explicit consent.
- `client.value.edge.planSettlement` and `planReserve` with their complete verification, atomic participant commit, and recovery lifecycle.
- `wallet.publicLedger` for public wallet movements and proof bundles.
- Existing Market position, certificate, ownership, and purchase routes where qualified.
- Existing public store and app-state projections beneath sealed sources and authenticated heads.
- `@receiz/sdk/valuation` for read-only reproducible value explanation, kept separate from value admission.

Registered application coordinates retain exact bytes and case. Application registration, private custody, genuine consent, actual granted scopes, complete source publication, and runtime qualification remain integration prerequisites. Private keys and client secrets stay out of browser bundles, model messages, and public proof links.

The inspected local template has all three 129.0.0 packages installed, and the public SDK registry lists 129.0.0. The connected MCP capability descriptor currently reports compatibility `>=128.0.0 <129.0.0`; its live readiness cannot be treated as v129 readiness. The restricted ChatGPT marketplace profile excludes financial execution. Resolve the matching app and trusted-host runtime without expanding or bypassing that restricted profile.

## Implementation scope and checks

The first implementation is the complete mobile console and its reviewable deposit, account, asset, market, and ledger journeys. Keep data adapters separate from visual components so verified runtime results and clearly identified demo scenarios can use the same interface. Demonstration state never claims a real deposit, trade, proof verification, or payout.

Physical intake and acquisition operations, live app registration and custody, currency contracts, and customer listing operations each require separate backend qualification. The frontend must expose accurate progress and unavailable states while those services are being connected. A visual prototype is not evidence of a production banking operation.

Acceptance checks cover:

1. A new person can find Deposit and understand the expected credit without learning rails or trading terminology.
2. Navigation and sheets work at 320, 390, and 430 pixel widths without hidden actions or horizontal scrolling.
3. A pending item or valuation cannot increase available Reserve or admitted Settlement.
4. Accepted purchases produce one credit and one corresponding ownership outcome, including reload and unknown-response recovery.
5. Combined balance, locked backing, and held positions do not double-count value.
6. An actual SDK result governs proof, ownership, and transaction status; rejected enclosing proof cannot produce admitted state.
7. Public username display requires consent, and public events retain their cryptographic identity and proof semantics.
8. PWA restart restores the known verified account surface; synchronization cannot replace stronger held truth.
9. A market purchase requires both payment and accepted delivery before it appears completed.
10. Currency issuance remains unavailable until its exact backing, supply, ownership, and redemption contracts pass qualification.

## Source references

- [Receiz SDK 129.0.0](https://www.npmjs.com/package/%40receiz/sdk)
- [Receiz wallet](https://receiz.com/wallet)
- [Receiz value and market overview](https://receiz.com/what-can-you-do-with-a-receiz)
- [Receiz developers](https://receiz.com/developers)
- [Local v129 integration guide](/Users/bjklock/Kai-Turah/receiz_offline_verifier/docs/releases/v129.0.0-integration.md)
- [Installed v129 capability execution coverage](/Users/bjklock/Kai-Turah/Receiz-app-template/node_modules/@receiz/sdk/docs/capability-execution-coverage.md)
- [Installed v129 proof valuation guide](/Users/bjklock/Kai-Turah/Receiz-app-template/node_modules/@receiz/sdk/docs/offline-proof-valuation.md)
- [Receiz value rail skill](/Users/bjklock/Kai-Turah/Receiz-app-template/ai-skills/receiz-value-rails/SKILL.md)
