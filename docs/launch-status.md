# Bank launch checkpoint — October 14, 2026

The user will push, merge and deploy this checkpoint. The task creates local commits only. The mobile console remains the same; the full banking product is unfinished. All Receiz packages remain pinned to 129.0.0.

## Available now

- Genuine Identity Seal creation/import, encrypted device restoration and shared Receiz wallet reads on the local Node-backed preview.
- Actual public Market and Ledger sources, infinite scroll, original-proof verification and separate personal carried history.
- In-bank Deposit intake/proof holding, Receiz embedded card checkout/status composition, Send/Receive review, payment QR/scan and user-operated NFC request tags. Final native financial execution remains disabled.
- Private account-source admission/publication/session request composition, exact encrypted pending recovery and identity-bound compare-and-swap. The current live admission is refused; local fixture tests do not prove a live session.
- Deployed Receiz host qualification fix: SDK-admitted HTTP 200 with source-publication available. No new SDK/MCP/AI Skills package release is required for that host correction.

## Remaining for the complete product

1. **Production bank API routes.** Vite dev/preview currently serve the fixed native/public middleware. A plain static Vercel build does not provide these handlers. Expose the same allowlisted handlers as Node functions for `/api/bank/native/*`, `/api/bank/public-market/*` and `/api/bank/public-network`, preserving original request bytes, private no-store responses, fixed upstream destinations and public/private isolation. Verify the deployed API routes and proof payload sizes before claiming live access. This checkpoint contains no Vercel API adapter.
2. **Account/source owner binding.** Actual subject admission returns HTTP 409 / `SUBJECT_OWNER_CONFLICT`. The server's session profile username differs from the signed identity username, and subject authorization resolves the owner from that profile. Resolve the binding without substituting a weaker profile for proof ownership, renaming an existing account silently, discarding retained proofs or inventing a new identity. Current subject publication/session opening has not completed.
3. **Trusted custody issuance.** The selected Receiz operator and Kojib delivery address are present as shipping metadata. Add the actual admitted custodian policy, issuer signing custody, inspection/receipt evidence, redemption terms and operator receipt workflow. A customer deposit request does not establish receipt of a physical asset or create cash.
4. **Funded native bank execution.** Complete the source-bound adapter and atomic ownership/funding/backing commits for transfers, bank/user fractional sales, buybacks, currency creation/transfer and redemption. Admit the actual eligible funds, recipients and current source heads; no display balance, public listing or declared currency supply supplies liquidity.
5. **Financial screen callbacks and live evidence.** Connect the existing review screens to that qualified execution and verify concurrency, refusal/zero writes, lost-response recovery and reload with actual enclosing sources. Users operate exact live financial actions. No real card payment, custody receipt, transfer, sale or currency issuance has been executed by the agent. Incoming wire receiving instructions also remain absent. A full native-bank review/release gate remains pending. Session attempts already submitted with an unknown outcome stay retained even after expiry; SDK 129 currently rejects an expired retry locally, so canonical outcome resolution for that case is still unfinished. The bank never drops that request or substitutes a fresh nonce.

## Vercel configuration for the current frontend

Use the bank repository and the branch/commit selected by the user, framework **Vite**, install **npm ci**, build **npm run build**, output **dist**. Connect **bank.receiz.com** after selecting the intended project. The registered public client and origin are in the bank config; a client secret is neither needed nor included. Do not copy Receiz root keys, signer bearers, private Identity Seals or recovery phrases into this frontend project.

A successful frontend build/deployment confirms the shell can be served. It does not resolve the API routing or financial authority boundaries above. No production deployment was performed by this task.

Browser device custody is origin-specific: use the backed-up existing Identity Seal in the app's **Use existing ID** flow on the public origin to reopen that same identity. Localhost IndexedDB does not move automatically to the new domain.

See [native domain verification](native-bank-domain-verification.md) and [live status](live-bank-status.md) for request/deployment evidence and test scope.

## Commit checkpoint review

A fresh read-only review of the current native patch identified two session-lifecycle defects: refreshing a known expired active session, and creating a session challenge before source publication succeeds. Both are fixed with regression checks. Known successful expired sessions now use a new open; publication-pending requests create their challenge only after accepted publication. An already possibly submitted request preserves its exact challenge and source, including older retained intents without a phase field. Review and fixture tests do not qualify the unfinished live banking flows.

Final local checks: **211/211 tests across 60 files**, TypeScript/production build and whitespace checks passed. The checkpoint reviewer verified the lifecycle fixes and reported no remaining Critical/Important defects in the reviewed patch. The full live-bank completion and deployed validation remain separate.
