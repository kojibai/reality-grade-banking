# Business setup tools for the existing conversation

The user approved preparing native tools now and integrating the chat after the other developer finishes calendar/contacts. The eventual experience is one natural, tasteful mobile conversation. This checkpoint prepares the tools only: no message/popover/UI, native identity, transport allowlist, consent scope or route registration changes. Existing dirty Vault reader and output files remain outside scope.

## Chosen approach

Compose existing owner operations behind a small typed tool executor. Keep credentials and admitted account binding in the trusted host. A new account/session, generic remote-operation proxy, form wizard, synthetic contact store or parallel calendar are rejected because implemented native primitives already carry those boundaries. The user explicitly chose tools now, integration afterward. Implementation choices are ours: native setup, profile, Original and provider-adaptive DNS tools, strict bounded arguments, a private unmounted relay and no dependency.

## Existing boundaries

- Account: the existing Receiz ID continuation, as composed by `server/twin-upgrade.ts`; `/api/auth/receiz-id/continue` verifies the proof and returns the actual same account. Reuse that proof admission, not a local token or asserted owner ID. A fresh host cookie is transient and never returned or logged.
- Entitlement: existing `ownerTwinAccountAccess` / native effective-plan logic; upstream operations retain their actual plan, grants, providers and usage rules.
- Agent: `app/api/world/agent/route.ts`, native `updateWorldAgentForOwner` and starter-benefit operation ID/expiry. Apply only selected fields through the native `configurationPatch` path. Native owner/agent filters and an atomic complete-policy JSONB condition prevent a stale edit from restoring a revoked permission. Preserve policy, capabilities, identity and unrelated configuration. Commercial offer and five native routing flags are scoped configuration; no autonomous-commerce or high-risk-policy change tool.
- Domain: `app/api/account/custom-domain/route.ts` and its native provider/DNS state. Saved, pending DNS and live are distinct. Check the currently configured domain, rather than inventing exact-host verification the host does not implement. Empty hostname removal is not offered.
- Creation: existing `/api/creator/workspace` and `/api/developers/creator/run`; retain the caller's native request ID/expiry and actual accepted output/usage. A text run does not establish completed image/video rendering. No metered work at startup or merely because access was confirmed.
- Contacts/calendar: entirely owned by the separate work; later integration must use its exact native identities, accepted results and retained histories.

## Public interface and private relay

`src/receiz/business-setup.ts` defines strict tool descriptions, bounded argument parsing and `createBusinessSetupTools({accountUid, invoke, assertOpen})`. Tool arguments never include credentials, owner/session selectors, arbitrary URLs, operation IDs, quote expiry or financial authority. Native operation ID/expiry are supplied separately by the trusted caller.

Tools: inspect agent, configure agent, inspect domain, connect domain, check current domain, inspect creation, create work. Configuration writes declare owner approval required; creation is explicitly metered. These descriptors grant nothing: chat integration must enforce the existing actual consent/confirmation before invoking a tool.

`server/business-setup.ts` exports an unmounted relay. It admits the existing continuation, verifies returned same-account identity and current Business entitlement, then calls only fixed native paths. No shared HTTP routing/allowlist is expanded. Native cookies remain request-local. Project only supported setup/result fields; preserve native output proof manifests where returned. Refuse wrong ownership and invalid arguments before writes. Do not manufacture a successful state after malformed or lost responses.

## Recovery and experience contract

Results distinguish accepted, refused and unknown. Accepted means the native operation returned its actual accepted result, not that DNS, rendering, money movement or deployment is complete. Preserve the operation reference. Never retry a write automatically. A timeout or 5xx after a possible write remains unknown; exact native held/released status governs recovery. Read tools are explicit, not background discovery.

The existing payment/first-task, core banking/free access, sealed originals and deterministic first paint remain unchanged. All new files are dormant until a later reviewed integration. The chat shell can then use native results for small inline receipts while keeping normal free conversation and existing drafts.

## Acceptance

Tests must fail on cross-owner binding, untrusted origins/ambient credentials, arbitrary route or unknown argument forwarding, accidental policy reset, hidden auto work, auto retry, stale identity completion, wrong operation correlation, pending DNS described as live, unsupported native/metered refusal swallowed, or new modules entering shared UI/routing before integration. No production account, configuration, charge, domain attachment, creator run, contact or appointment is changed during qualification.

## User-approved expansion: whole profile, proof objects and provider-adaptive domains

The user subsequently requested full profile setup, images, privacy, exact work sealed as proof objects, optional profile publication and custom-domain setup through the same natural conversation. They explicitly chose automatic DNS where supported and authorized, with instructions for every other provider or whenever they decline access. This expands prepared tools, not the agreed chat/calendar/contacts activation timing.

`business-profile-tools.ts` composes the existing owner `ProfileEditor` and image pipeline. `ProfilePatch` adds only already-native boolean fields `isPrivate` and `showSchedulerButton`. Core profile/proof work acquires no Business paywall. Metered creation/configuration retains native plan rules; $149 Business does not grant Pro-only advanced automation.

Private sealing uses existing `prepareConnectedComposerSource` with device-held sealing and native exact-byte custody, without opening the connected publication runtime. SDK enclosing Original verification must succeed for the fixed Receiz ID before `readComposerAssetContent` projects payload. Selected intent, metadata and file byte digests are compared beneath that proof; a payload digest never supplies admission authority. The trusted host retains immutable Files privately; only compact result views reach the model. Native `createConnectedAssetPublicationRuntime` is opened only for explicit publication. Source Original digest and Showcase parent digest remain separate, and pending/rejected publication stays exact. There is no new mint/funding/settlement tool.

`business-dns-tools.ts` consumes the existing native saved hostname and setup results. It keeps connection options (CNAME versus A) distinct from all required ownership-verification records. Manual instructions use actual records for any DNS provider. Automatic work needs an actual same-owner writable `BusinessDnsConnection` from the trusted host; no connection, declined access, unsupported provider or read-only grant yields manual steps. Provider credentials never enter chat or tool JSON. Existing MX/TXT/websites must not be deleted or overwritten silently. A provider acknowledgement does not establish native domain readiness; verified DNS with a route warning stays attention-needed. Lost/partial writes remain unknown without retry.

`server/business-dns-cloudflare.ts` is the initial concrete adapter. It receives the actual scoped authenticated request closure, owner, zone and write grant from the trusted host, and uses official fixed Cloudflare record endpoints. It reads complete relevant names, chooses one actual native connection alternative, creates missing A/AAAA/CNAME/TXT records only and preserves existing conflicting services for an owner decision. A root hostname prefers the supplied A alternative. It preserves actual provider record references, bounds responses, refuses incomplete lists and does not retry writes. Other providers use the same connection contract when a tested adapter exists; they already have the universal manual route. No provider OAuth/secret store or connector screen is invented in this preparation stage.

## Native prerequisite and review corrections

The existing native `/api/world/agent` route accepts an optional strictly parsed partial configuration patch. Whole-body legacy callers retain their existing behavior. The writer changes named SQL columns only, binds the current owner/agent, and conditionally updates complete raw JSONB policy. Named edits and required native plan restrictions preserve unrelated nested source fields. No schema/migration/new verifier/issuer/session is introduced.

A configuration write whose database reply is lost remains held under the existing native operation, including the legacy path. The route cannot release a starter claim after an attempted write merely because the acknowledgement was lost. Native action IDs/quote expiry, owned Twin entitlement and starter ledger remain in force. Later integration must retain and reconcile held operations before another write.

## Activation handoff

All tools remain dormant and relay routes unmounted. Later chat integration must compose actual owner consent, operation retention, securely connected DNS grants and private selected Files; tool descriptions themselves grant nothing. Use the existing real Twin brain and conversation. Do not recreate identity/session, discard ordinary/custom drafts, add forms, reset continuity or meter at startup. Coordinate profile renaming with the existing owner Twin coordinate instead of remounting messaging. Calendar/contacts remain owned by the separate developer. Qualification must check deployed native partial support before exposing the tool, actual provider consent, permission decline/manual paths, streaming and accepted records in the final chat.
