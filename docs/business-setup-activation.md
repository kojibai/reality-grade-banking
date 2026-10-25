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

The Vercel Connect broker uses `subject: {type: "user", id: admittedUid, issuer: "https://receiz.com"}`. The subject comes from native proof admission. Project connector UIDs come from the fixed server catalog; cloud account and zone coordinates come from the customer's actual connected account. Neither the model nor browser supplies credentials, account selectors or arbitrary DNS targets.

### One-time customer connection

The Connect action opens the real broker's secure approval screen. Namecheap and Porkbun use their official OAuth sign-in. Providers that require an API credential receive it once on the broker's secure screen, outside chat. Only `api-key` connectors with `subjectType: user` are accepted; app/shared keys are refused. Secrets never enter model context, browser results, public errors or this repository.

| Provider | One-time connection | Private domain discovery |
| --- | --- | --- |
| Namecheap | Provider OAuth sign-in, DNS read/write | Official MCP domains and incremental DNS tools; BasicDNS required |
| Porkbun | Provider OAuth sign-in, non-purchase MCP | Actual grant scopes and exact owned domain; DNS scope required |
| Cloudflare | Scoped user API token | Longest matching active zone and its actual ID |
| GoDaddy | User personal access token with domain read and DNS update permission | v3 exact owned domain; idempotent DNS creates |
| Vercel | User access token | Personal and actual team domains; team coordinates retained privately |
| DigitalOcean | User token with domain read/create permission | Complete owned domain inventory |
| DNSimple | Account or user token | Accessible accounts and paginated active primary zones |
| AWS Route 53 | User's scoped access key JSON; optional session token | Public hosted-zone inventory; official AWS request signing |
| Google Cloud DNS | User's scoped service-account JSON | Public managed zones in its actual project; fixed Google token exchange |
| Azure DNS | User's scoped service-principal JSON | Accessible subscriptions and public DNS zones; fixed Entra token exchange |

The broker retains each customer's grant for later requests. The deployment retrieves and checks that same admitted user's actual grant before using it. A revoked, expired or read-only permission never becomes a successful DNS receipt.

After approval the same conversation resumes its retained operation, re-admits the owner and rechecks the saved hostname. A changed hostname stops the pending action. Duplicate callbacks reuse completed results; uncertain writes are never automatically repeated. Once writes and readback are confirmed, native propagation/profile checks continue without reapplying DNS. They continue while the owner uses other parts of the account; chatting stays available and the existing profile address keeps working. Page backgrounding pauses checks and visibility resumes them without blocking first paint. “Domain is live” requires the actual native live, attached, verified and correctly configured result. A provider acknowledgement alone cannot produce it.

Typing feedback appears before the first upstream token, then the actual reply streams. During setup, the chat names the operation the executor has started. Provider consent, DNS writes and native delivery checks are distinct. Indicators clear on completion, failure and cancelled/finished checks; a bounded check that stops leaves the saved receipt and tells the owner readiness is not confirmed.

### Project provisioning and deployment

On 2026-10-25 all ten project-owned connectors were created and independently read back as attached to the Bank project's development, preview and production environments. Eight are per-user key connectors; Namecheap and Porkbun are public-client OAuth connectors with PKCE, fixed provider resources and refresh tokens. No customer grant, DNS write, payment or deployment was performed during that configuration.

`npm run dns:provision -- --project <project-id> --team <team-id>` idempotently configures the fixed catalog. It needs an operator Vercel token in its process environment, creates no customer grants, never stores initial user keys and refuses a conflicting shared connector. It supports `--provider <id>` and `--output <path>` for bounded setup/metadata evidence. Do not put an operator token in the browser or model context.

On Vercel the runtime uses project deployment OIDC. A dashboard `VERCEL_TOKEN` cannot override it. Per-user runtime calls require that same project’s workload/OIDC identity, including local integration. A personal dashboard token is for operator provisioning and cannot impersonate arbitrary native user subjects; a local preview without project OIDC is not evidence that customer grants work. The existing legacy server-token option remains scoped to its supported broker configurations. New customers need no `BANKEIZ_DNS_BINDINGS_JSON` rows. Existing explicit legacy owner bindings remain supported without becoming a default or outranking native owner proof.

The Namecheap path uses incremental `dns_records_save` followed by complete readback. It never activates the older XML full-zone `setHosts` adapter, changes nameservers, deletes records or sets `force`. Porkbun exposes only its connection/scopes check and exact domain/DNS operations through the provider's non-purchase endpoint. Purchases, contacts and unrelated tools are unavailable.

Existing website, email, delegation, ambiguous accounts and conflicting record sets are preserved. These need an owner decision in conversation, such as choosing an unused subdomain; the agent does not overwrite them silently. Declined permission, unsupported providers and unavailable operations return exact native records and copyable instructions in the same chat. Provider acknowledgement, DNS propagation and live profile delivery remain separate states.

## Release order and verification

Deploy the native owner Twin API/runtime changes before the Bank client. The client checks `businessSetupSupported`; an older native counterpart cannot silently accept a setup request without tools. Both repositories retain their existing account-entry and payment behavior.

The preview at `tests/browser/business-setup.html` runs the production adapter, executor, receipt components and Messages panel against synthetic source responses. `business-setup-mobile.html` provides a 390 × 640 inner viewport. No real model call, private account mutation, provider write, publication, payment or customer grant occurs in this fixture.

Run the full Bank tests/build and native owner/tool/usage contracts, typecheck, lint, account-entry freeze and applicable product-law gates. A customer’s first provider approval and actual live owner-brain/DNS execution still require verification after the paired deployments. Project connector attachment has been verified separately; attachment is not a customer grant. A synthetic preview is not evidence of those external states.
