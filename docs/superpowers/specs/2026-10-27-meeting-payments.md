# Money in the meeting conversation

## Product law and baseline
User authorizes a small composer icon to switch Message to Money, choose an amount and send using existing funds plus secure shortfall checkout. Keep video and the same conversation alive. Show this payoff on /meet/. Baseline Bank main 8c9edbb.

Primitive: Settlement and transfer through the existing connected Wallet, exact approval, durable nonce/checkpoint and retained original. Source: src/receiz/wallet-send.ts createWalletSend; existing native-identity walletSend composition and recordConnectedWalletResponse. HTTP wallet observations remain observations, not native financial-root receipts. Backend app/api/connect/transfers/route.ts already validates sender/recipient membership in a group. Missing boundary: an approved transfer can target the current meeting conversation instead of creating a DM.

No new rail, issuer, identity, storage schema or backend migration. Default Send and old checkpoints remain compatible. Optional conversationId is bound to review digest and saved body. Pending context is derived from that checkpoint, never from UI guesses.

## Interaction
Message remains the default. Money loads on deliberate icon click, without remounting the meeting controller. One human peer is preselected; multiple peers require selection. Only admitted human conversation members are recipients. Amount is exact USD cents through bankOperationDollars. The Send button is an explicit instruction for the displayed recipient and amount. Preparation must preserve that intent before execution. Duplicate clicks share a lock. Failures retain exact saved state; an unknown submission is looked up, never resubmitted. Unrelated pending payments never execute from this room. Existing secure checkout funds shortfalls; its mounted state survives toggling back to messages. Accepted payment messages use PaymentMessage, not invented chat prose or wallet snapshots. Full private wallet records never enter shared meeting history.

## Presentation
/meet/ says Agree it. Pay it. Keep the proof. Its new Pay step uses actual Money presentation and accepted-payment components with labelled fictional source data. Local example Send moves to the receipt screen; no financial SDK, iframe, network or Identity action occurs. Explain balance-first and shortfall checkout plainly. Refresh custom meeting share artwork without subscription pricing or unsupported novelty claims.

## Acceptance
Covered payment, group recipient choice, wrong account/context, duplicate clicks, cancelled checkout, same-nonce funding recovery, interrupted acknowledgement, unrelated pending state and active media continuity are covered by contracts/UI/browser evidence. Existing Send tests, full Bank suite and production build pass. Only owned changes committed on main; other agents remain intact. Live provider/card settlement and physical iPhone are exact untested boundaries.
