# Native Business setup in conversation

Business setup uses the existing owner Twin and its current native AI configuration. There is no alternate model, parallel identity, credential chatbot, or separate setup account.

## What is connected

- The authenticated owner Twin can request the fifteen prepared setup/profile/DNS operations. Requests are proposals; the private same-ID client executes supported operations under the owner's natural request and native scopes.
- Profile details and pictures use the existing profile editor and upload routes. Confirmed username changes are resolved on the next Twin request without recreating the identity or conversation.
- Private sealing uses the canonical `prepareConnectedComposerSource` producer in a separate, lazy native composition. It does not open a public Showcase runtime. The enclosing Original is verified before projection, retained under native custody, and published only on an explicit publication request.
- A new sealing intent invalidates the active publication candidate without deleting prior held proof. Publication binds the exact newly selected Original or the successful seal of the unchanged selected source. A failed step stops the dependent sequence.
- Native creator runs, agent configuration and domain setup use their existing operation/result contracts. Unknown effects are not automatically retried. Repeated accepted Twin responses reuse the retained action result.
- Native text streams through the existing owner API and bounded account relay. The message interface shows typing immediately and actual upstream deltas. Only the final accepted native result supplies tool proposals. Interrupted requests retain the native operation ID and quote for explicit recovery.
- Completed results remain inline. Subsequent questions include whole native-result excerpts within the remaining context budget. Explicitly selected owner context takes priority and is never silently dropped.

## Provider connection

The production API and Vite use the same fixed routes:

- `POST /api/bank/business/setup`
- `POST /api/bank/business/dns`
- `GET /api/bank/business/dns-return`

Every setup/provider request reuses a fresh Receiz ID continuation, verifies the same admitted account and actual native Business access, and keeps the recovered native cookie server-side. Incoming ambient cookies and Authorization headers are refused. DNS plans are read from the native saved domain; clients cannot supply arbitrary records or provider credentials.

The Vercel Connect broker uses `subject: {type: "user", id: admittedUid, issuer: "https://receiz.com"}`. The deployment binds an actual OAuth connector, provider coordinates and explicit DNS scopes to that owner/hostname. A shared API-key connector is refused. Tokens never enter tool JSON, browser URLs, chat context or public results. Grants are freshly checked before use.

The real broker authorization URL supplies the Connect action. Its return is a delivery hint only: the same open conversation rechecks identity, grant and the retained hostname before continuing. A changed hostname refuses the pending operation. A repeated return reuses completed results; unknown writes remain held.

### Deployment configuration

No customer DNS connectors were configured or authorized during development. Provider OAuth applications and connector attachment are deployment configuration, not something a model response can create.

Set `BANKEIZ_DNS_BINDINGS_JSON` server-side only after configuring the actual user-authorized OAuth connector in the Bank Vercel project. Coordinates must come from that provider account and zone. For example (illustrative identifiers only):

```json
[{
  "accountUid": "11111111-1111-4111-8111-111111111111",
  "hostname": "studio.example.com",
  "provider": "cloudflare",
  "zoneName": "example.com",
  "zoneId": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "connectorId": "scl_actual_attached_connector",
  "service": "actual_connector_service",
  "scopes": ["actual_provider_dns_write_scope"],
  "authorizationOrigins": ["https://vercel.com"]
}]
```

Never reuse illustrative scope values, connect an operator's shared provider key for customers, or mark a connection ready before its actual grant is available. Vercel deployment OIDC is used by the SDK; an existing `VERCEL_TOKEN` is supported for an external/local server. Do not expose it to the client.

The prepared adapter catalog includes Cloudflare, GoDaddy, Vercel, DigitalOcean, DNSimple, Porkbun, AWS Route 53, Google Cloud DNS, Azure DNS and Namecheap. The OAuth-user HTTP broker currently accepts configured Cloudflare, GoDaddy, Vercel, DigitalOcean, DNSimple, Google Cloud DNS and Azure DNS bindings only when those services actually supply the required OAuth API grants. Catalog inclusion is not an assertion that every provider offers OAuth or that a customer's grant is connected.

Porkbun, Route 53 and Namecheap require an appropriate secure credential/signing host rather than pretending their API credentials are OAuth. Until that host exists, they receive the exact native instructions. Namecheap's full-zone `setHosts` adapter additionally requires the explicit full-zone grant, API-enabled account, allowed egress IP and serialization across deployment workers. Its process queue alone is insufficient for live multi-worker activation; this broker does not activate it. Independent dashboard edits cannot be made conditional by an API that has no conditional-save operation.

If access is unavailable, declined, unsupported or not configured, the user receives native records, copy controls and instructions in the same conversation. Unrelated website and email records must be preserved. Provider acknowledgement, DNS propagation and verified live profile delivery remain separate states.

## Release order and verification

Deploy the native owner Twin API/runtime changes before the Bank client. The client checks `businessSetupSupported`; an older native counterpart cannot silently accept a setup request without tools. Both repositories retain their existing account-entry and payment behavior.

The preview at `tests/browser/business-setup.html` runs the production adapter, executor, receipt components and Messages panel against synthetic source responses. `business-setup-mobile.html` provides a 390 × 640 inner viewport. No real model call, private account mutation, provider write, publication, payment or customer grant occurs in this fixture.

Run the full Bank tests/build and native owner/tool/usage contracts, typecheck, lint, account-entry freeze and applicable product-law gates. Production connector authorization and actual live owner-brain/provider execution require verification after the paired deployments and actual provider configuration. A synthetic preview is not evidence of those external states.
