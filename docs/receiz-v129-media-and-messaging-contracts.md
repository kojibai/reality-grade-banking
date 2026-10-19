# Receiz v129 media and messaging connection contracts

Inspected 19 October 2026 at Bank `be15f6f` and Receiz worktree `da5f920d8`.
This is a source-contract investigation, not a completed implementation or live
qualification. No private conversations, calls or financial operations were read
or executed. SDK, MCP and AI Skills remain `129.0.0`.

## Funded authored assets

Bank already seals complete authored moments, media, long-form text and embedded
linked originals. The sealed definition correctly declares
`createsSpendableValue:false` and `backingCommitted:false`. Ordinary funded
issuance uses Receiz's separate native asset writer; it does not currently carry
that authored source.

The current Receiz domain explicitly requires `linkedProofDigest:null` in its
fund request, immutable definition, holdings and public account components.
Removing Bank's matching guard would silently discard the user's media. A
content original also cannot stand in for a physical custodian's receipt.

The required extension belongs in the existing Receiz asset domain:

1. Introduce a closed authored-source coordinate bound to the exact original,
   separate from physical backing and all cash arithmetic. Preserve old plain
   definition sources through an explicit schema branch/version.
2. Transport and retain the exact sealed original outside the signed financial
   request/plan. Current asset request bodies are 128 KiB, Crystal requests
   144 KiB, encrypted tickets 65,536 characters and decoded consent input
   20,000 characters. Do not copy base64 media into the review challenge.
3. Canonically verify the complete enclosing original, actor ownership, Bank
   authored-definition schema, its nonfinancial flags, matching definition and
   supply, and every file's byte count/base64/hash. Verify embedded originals as
   their own carried evidence. Preserve exact `JSON.stringify` payload bytes;
   do not require JCS reserialization or resealing.
4. Reopen that semantic admission during planning, statement preparation,
   source verification and historical replay. Adding a raw digest to
   `admissionEvidenceSha256` alone is insufficient.
5. Preserve the immutable content coordinate through send, offers, fills,
   cancellation and redemption. Deliver a complete authenticated exact-source
   closure with the holding, receipt recovery and cold portfolio source. A
   digest alone cannot render or save media offline.
6. Carry the coordinate through strict account components/frontier coverage.
   Keep public disclosure separate from private original retention.
7. In Bank, prepare/seal the selected content before financial review; bind
   review invalidation to the complete draft revision. The present `hasMoment`
   boolean cannot distinguish edits between two nonempty drafts. Reuse the
   existing media reader on the verified holding closure.

Relevant Receiz files under `app/lib/wallet/bankNotes/` are
`nativeAssetRuntime.server.ts`, `nativeAssetEffect.server.ts`,
`nativeAssetSource.server.ts`, `nativeAssetHolding.server.ts`,
`nativeAssetApi.server.ts`, `nativeBankCrystal.server.ts` and
`nativeAccountCoverage.server.ts`. Bank counterparts are
`src/receiz/native-asset*`, `asset-moment.ts`, `proof-media.ts`,
`account-proof-statement.ts` and `src/features/assets/CreateAsset.tsx`.

Qualification must cover source mutation/wrong owner/missing closure refusal,
unchanged conservation and insufficient funds, stale review refusal, issuance →
send → partial fill → cancellation → redemption, cold replay with missing source,
and lost response/retry with one issuance and byte-identical content.

Existing v129 sealing, canonical verification, exact artifact transport/storage,
identity proofs and native writer supply the mechanics. No missing SDK primitive
requiring v130 was established. The domain extension itself is still work.

## Existing conversations, Twin and calls

Bank already continues the same Identity Seal to Receiz, obtains the actual
legacy account UID, signs the existing proof-authority challenge and checks the
returned scoped bearer grant. No second Bank identity/session is necessary.

Most existing chat routes read only Receiz's `receiz_session` cookie. Bank's
transport deliberately omits cookies. Wallet's existing bearer exception permits
user search and constrained single-peer DM creation under
`receiz:wallet.transfer`; that grant must not silently acquire inbox, groups,
Twin or calls access.

Expose the existing chat functions route by route through the existing OIDC
principal validator. Preserve issuer, token type, audience, expiry, revocation,
application registration and exact scoped consent. The account ID must come
from `principal.userId`, never a client selector. Reuse existing membership,
participant, invitation, moderation and target-signal checks. A route helper may
reuse the server's account-session payload lookup without issuing a new cookie;
do not change global `getSession()` or copy cookies through Bank.

The catalog currently has no chat scopes. `receiz:chat.read`,
`receiz:chat.write` and `receiz:chat.calls` are proposed scope boundaries, not
implemented/registered capabilities. Host catalog, route policy, application
registration and consent must agree before a Bank UI can use them.

Reuse these existing HTTP contracts:

| Function | Existing route |
| --- | --- |
| Inbox / DM / group creation | `/api/chat/conversations` GET / POST |
| History / human message | `/api/chat/conversations/:id/messages` GET / POST |
| Twin / AI response | `.../:id/messages/stream` POST, SSE |
| Agents / thread selection | `/api/chat/ai` GET; `.../:id/ai` GET / PATCH |
| Calls | `.../:id/calls` GET / POST; `.../:id/calls/:call` GET / PATCH |
| Membership / connection state | `.../:id/calls/:call/participants` POST / DELETE |
| WebRTC signaling | `.../:id/calls/:call/signals` GET / POST |
| ICE / SFU | `/api/chat/calls/ice` GET; `.../:id/calls/:call/sfu/session` GET |

Conversation and message types already live in `app/lib/chat/types.ts`. DM
creation reuses the existing `dm_key`. Inbox history's first page marks a thread
read, so it is not a side-effect-free diagnostic. A streaming send inserts the
human message before emitting deltas: disconnect/abort cannot mean zero writes,
and must reconcile the actual thread instead of automatically resending.

Current SSE events are `user_message`, `ai_start`, `ai_delta`, `ai_done`,
`ai_error`, `done` and `error`, encoded as `data: <JSON>\n\n`.
Both Bank proxy layers currently buffer complete responses. True streaming must
be incremental through `server/native-account.ts` and `server/bank-api.ts`,
preserve content type, propagate disconnect abort, and forward bounded PATCH
bodies as well as POST. Keep exact UUID/query allowlists and no-cookie transport.

Existing calls expose REST polling plus mesh WebRTC/SFU. The Receiz call
component's optional direct Supabase realtime must not be copied into Bank.
Compose the existing HTTP fallback instead. Camera/microphone require explicit
Start/Join and browser permission. SFU requires the existing configured provider
and a server-issued token after authorized join. STUN fallback does not prove
connectivity. No contact-presence API was found; joined participant counts must
not be presented as contact availability.

Current message source admission is `held-pending-edge-authorship`,
`settled:false`, or null for a legacy unbound identity; current routes return no
settled source originals. Preserve those exact semantics. Do not turn a delivery
record into a claimed source-settled proof.

The v129 SDK's `subjectCoordination.planMessage/applyMessage` currently admits
only the `close` effect with `message:null`; it does not send ordinary messages.
`subjects.twin.message/stream` is a historical V120/local-host interface, not the
production legacy chat adapter. Neither replaces the existing inbox/call routes.

Required gates include delegated audience/scope/revocation rejection, no cookie
fallback, same-account DM reuse, membership rejection, real pagination,
incremental SSE through both proxies, ambiguous-send recovery, groups/AI,
join/leave/targeted signals, provider/permission failures and no Supabase runtime.
Use Receiz's existing chat summary/call quality/topology/source/identity tests.
No SDK-version gap has been established; scoped host exposure is the next step.

## Implementation update — approved messaging connection

The original investigation above is retained as the audit snapshot. Local implementation now carries existing chat endpoints through one bounded streaming native relay, adds host-only scoped bearer authorization to those same Receiz routes, and composes existing mesh/SFU calls and the owner Twin JSON route. The SDK/MCP/AI Skills versions and frozen SDK scope catalog remain129.0.0.

The personal owner Twin route is `/api/developers/twin/:username/message`, not the generic conversation-agent stream. It enforces existing Business entitlement, usage credits, owner binding and request-id idempotency. Its bounded prior API-lane memory is returned after an ask. It does not read all private Mind/Wallet data. Optional explicitly selected Bank excerpts use the existing engine as owner-supplied context and are not promoted to canonical proof evidence. Questions and generated replies can remain under the existing Twin memory policy.

After the Receiz host commit is deployed, Bank's application owner must preserve the registration's current `allowedScopes` and add `receiz:chat.read`, `receiz:chat.write`, `receiz:chat.calls`, and the existing `receiz:twin.execute` capability if absent. Use the owner-authenticated existing GET/PATCH `/api/oidc/clients/rc_2d1wcGkAYfmCi5kGT3J89gkl`. Registration does not grant any user's account: each device still signs the exact messaging consent through the existing v129 proof-authority exchange. No deployment, registration mutation, real message, call, provider request or live entitlement qualification follows from local fixture tests.
