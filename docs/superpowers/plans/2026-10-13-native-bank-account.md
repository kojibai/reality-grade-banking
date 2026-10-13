# Native bank account integration

Implement inline using superpowers:executing-plans under the user's approved live-bank direction.

The dedicated public client is rc_QlCRCxBk8zyT4ajGLrIRPIQd, created in Receiz Connect on 2026-10-13 with explicit action-time approval. Allowed scopes: openid, profile, receiz:wallet.read, receiz:settlement.read, receiz:reserve.read. Callbacks are http://127.0.0.1:4173/auth/receiz/callback and http://127.0.0.1:5173/auth/receiz/callback. No client secret exists. Production domain remains unspecified.

- [x] Device-held genuine Identity Seal create/import/restore, exact canonical SDK admission, non-exportable device wrapping key, explicit read-consent grant, fixed native transport.
- [x] Replace routed demo with the approved live console. Read client.connect.wallet(), the same loadWalletSummaryForUser source as Receiz. Preserve exact Reserve, Settlement and total; do not create a shadow balance or synthetic chart. Private history comes only from the SDK-verified owned portable state. Public Market/Ledger keep their independent source reads.
- [x] Test owner/app/scope mismatches, invalid source rejection, restore/isolation and no demo route. Typecheck/build, real browser entrance and one fresh final integration review. Report actual private-user qualification and financial execution separately; do not manufacture custody, funding, charts, history or offers.

No external services or libraries. SDK/MCP/AI Skills stay 129.0.0. Kai/KKS and exact enclosing proof remain causal authority; local timestamps are presentation only. User signatures and grant bearers stay in trusted app/device custody and never enter model output or public caches.
