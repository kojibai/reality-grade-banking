# Connected DNS provider automation

The user explicitly requested adding the other major DNS providers to the already approved dormant Business tools. Automatic setup is preferred after a secure connection and owner permission; exact native manual steps are the fallback when connection/permission/capability is unavailable. The existing tools-now/chat-after-calendar-and-contacts timing remains in force.

## Agent preflight and authority

- Primitive affected: native custom-domain configuration beneath admitted Receiz identity. This work adds external DNS mechanics only.
- Source of truth: the existing fixed owner binding, native saved hostname/setup records, and the provider’s actual acknowledgements and readback. DNS results cannot replace Receiz identity, proof, ownership or settlement authority.
- Stronger/weaker truth risk: security-risk and identity-risk at provider connection; external-authority-risk if a provider result were allowed to establish native readiness. Preserve the existing native verification and route warnings.
- First-paint risk: none permitted. New server adapters remain unmounted and absent from the app import graph; no UI, account entry, storage, grant or native primitive changes.
- External convention involved: official provider API syntax only. No new auth/session/token issuer, connector secret store or model-selected credentials.
- Tests/checks: failing/passing provider fixtures, read-only and declined/manual paths, conflict/race preservation, complete pagination, exact request shapes, unknown write outcomes, disposal; focused tests/typecheck, final build/full Bank suite and fresh review.
- Exact uncertainty: live provider credentials and customer-domain mutations are not available or exercised in this preparation phase. Actual private connections must be bound at chat activation.

## Implementation choice

Reuse `BusinessDnsConnection` and `BusinessDnsPlan`; leave the already qualified Cloudflare adapter unchanged. Add a shared create-only engine and concrete GoDaddy, Vercel, DigitalOcean, DNSimple, Porkbun, Google Cloud DNS, Azure DNS Route 53 and Namecheap drivers. A private registry dispatches only actual connected-provider metadata supplied by the trusted host. Model args never select owner, zone, API endpoint, credential or grants. HTTP drivers receive a host-authenticated request closure; Route 53 receives exact SDK operation closures, with SDK signing and secrets private to that host. No added dependency.

The shared engine validates the native plan, chooses one connection alternative, prefers an exact existing native alternative, preserves every unrelated record, detects IPv4/IPv6 and CNAME/service conflicts, and rechecks before writes. It creates missing records only. It never changes nameservers, deletes records, purchases/transfers a domain or retries a write. All drivers use isolated creation except Namecheap’s explicitly granted complete observed host-list save, described below. Record-set APIs use create-only semantics (Azure If-None-Match: *, Google create, Route 53 CREATE). An existing TXT set needing augmentation may require manual work when an additive write cannot be guaranteed. Provider success requires exact readback; native DNS propagation/profile delivery is still a separate verification step.

Complete bounded pagination must be established before a write. Redirects, cross-origin/other-zone pagination, repeated cursors, contradictory counts, malformed records and incomplete pages refuse automation. Responses are bounded to consumer capacity, without changing proof validity. Lost or malformed post-write results stay unknown with known accepted references retained. Identity disposal prevents stale private results and additional requests.

## Fallback

Declined access, no secure connection, read-only scope, unsupported provider/account/API capability, unsafe record replacement, or a confirmed pre-write blocker yields actual native manual instructions. A write that may have happened remains unknown, with reconciliation guidance, rather than being presented as an untouched manual task. The user explicitly added Namecheap and requested a single Connect button, then natural conversation without DNS forms. Namecheap’s documented setHosts saves the full host list. The adapter must preserve the complete supported snapshot and existing EmailType, re-read before saving, serialize same-zone operations across adapter instances within a process and verify the whole resulting set. Whole-zone save requires an actual secure host grant covering that Namecheap operation. Namecheap provides no provider-side compare-and-swap: do not claim it prevents concurrent edits made in another dashboard. Unknown/unroundtrippable record attributes, missing email mode, third-party nameservers or unavailable grants prevent that save and return actual native guidance. No automatic retry or rollback can overwrite later changes.

## Completion

Prepare and commit only owned files; do not mount chat tools or alter the other developer’s calendar/contacts work. No production DNS, profile, charge, outbound message, push or deployment. Document exact provider support and future connection binding; do not call prepared adapters live customer integrations.

## Connection button contract

The one-time setup surface is one Connect provider action, supplied by the actual secure connection host. The provider/broker handles authentication and any required approval; credentials never go into conversation. Reuse an existing valid same-owner connection immediately and resume the same native hostname/operation after the callback. Return a real host-issued authorization action, never a fabricated OAuth endpoint or preselected credential. Receiz’s existing public-proof OAuth verifies supported external identity claims; it is not a DNS write grant and is not reused as one. No such grant is invented by tool descriptors or model text. The prepared `createBusinessDnsSetupFlow` returns Connect before any manual instructions when automation is requested, resumes after the actual connection, performs provider setup and native verification, and retains its operation result before fresh connection discovery across repeated callback delivery. A retained receipt remains bound to its original target; no cached result grants a new target permission. It rejects a changed saved hostname before a previous Connect action can authorize another target. The actual button rendering and live connection host remain part of the previously deferred chat integration. For Namecheap, API-key/IP prerequisites require secure host provisioning or a supported provider-side connection; do not mislabel a key form as one-click OAuth. The connector availability result must stay truthful. The live secure host must also serialize Namecheap operations across deployment instances; the prepared module queue cannot coordinate independent processes or provider-dashboard edits.

## Verified external mechanics references

These are API syntax references only, not Receiz product authority:
- GoDaddy v3: https://developer.godaddy.com/en/docs/api-users/domains/manage/dns ; https://developer.godaddy.com/en/docs/references/rest/domains/v3/list-dns-records
- Vercel: https://openapi.vercel.sh ; https://vercel.com/docs/rest-api/dns/list-existing-dns-records ; https://vercel.com/docs/rest-api/dns/create-a-dns-record
- DigitalOcean: https://docs.digitalocean.com/products/networking/dns/reference/api/domain-records/
- DNSimple: https://developer.dnsimple.com/v2/zones/records/ ; https://developer.dnsimple.com/v2/
- Porkbun: https://porkbun.com/api/json/v3/spec
- Google: https://dns.googleapis.com/$discovery/rest?version=v1 ; https://docs.cloud.google.com/dns/docs/reference/rest/v1/resourceRecordSets/create
- Azure: https://learn.microsoft.com/en-us/rest/api/dns/record-sets/create-or-update?view=rest-dns-2018-05-01
- AWS: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ListResourceRecordSets.html ; https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- Namecheap: https://www.namecheap.com/support/api/methods/domains-dns/get-hosts/ ; https://www.namecheap.com/support/api/methods/domains-dns/set-hosts/ ; https://github.com/namecheap/go-namecheap-sdk/blob/master/namecheap/domains_dns_records.go

## Private connection integration

Use `createDnsConnectionSetup` with the admitted owner and saved hostname; `lookup` returns only a real private connected-provider configuration, and `authorize` returns the real host-issued action bound to that same owner/provider/hostname. No endpoint is fabricated. Authorization origins are configured privately, HTTPS only, with credentials forbidden in URLs. An existing read-only grant needs actual write authorization. The callback invokes the same retained `createBusinessDnsSetupFlow.resume()`; user decline returns the exact native manual records, pending consent remains awaiting-connection, and accepted access continues directly into provider work and native verification. No provider fields or credentials become chat forms.

HTTP request closures must supply the actual scoped provider authorization and no automatic retries. Porkbun supports private header auth; Route 53 SDK closures map to the two exact AWS SDK v3 commands. Namecheap closures map checked XML/SDK results to the documented getHosts/setHosts DTOs and must retain actual email mode, not guess it. Actual secure connection provisioning and native message UI qualification remain activation prerequisites.
