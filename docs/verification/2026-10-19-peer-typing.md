# Receiz v129 peer typing

Bankeiz composes Receiz's existing account grant, `receiz:chat.read` and
`receiz:chat.write`, conversation membership, and native HTTP relay. SDK, MCP
and AI Skills remain 129.0.0. There is no separate Bankeiz service, database
client, new account approval, scope, credential, migration, or saved draft.

Receiz adds POST `/api/chat/conversations/:id/typing` and GET
`/api/chat/conversations/:id/typing/stream` within its existing chat host.
Its existing private Realtime provider carries ephemeral activity. The sender
and current audience come from the authenticated Receiz account and current
conversation membership. A caller cannot supply either, or send draft text.
Only the Receiz server holds provider credentials. Bankeiz receives the bounded
stream through its existing relay. This transient activity never becomes a
message, receipt, proof, payment source, or identity authority.

The controller publishes on real input, at most one active renewal per three
seconds of continued input. It publishes inactive after 1.8 seconds idle and
on blur, send, conversation close, visibility loss or page hide. A six-second
lease covers lost stop events and disconnection. Device-specific sequences
reject reordered starts/stops; independent devices do not cancel one another.
Expiry uses one local timer, without a status query. Streams rotate inside the
existing relay deadline; failed reconnects are bounded. Unsupported or denied
routes do not trigger repeated probes. Provider failure does not gate the
composer, inbox, send, or locally retained conversations.

## Evidence

- Red-to-green controller, UI and route tests cover real activity, expiry,
  out-of-order events, independent devices, no draft fields, unsupported/denied
  hosts, throttling, bounded reconnect, and cleanup.
- Relay tests show incremental GET delivery, exact cancellation, no cookies,
  bounded coordinates and method/query rejection.
- Receiz route/provider tests cover member and scope denial, server-derived
  sender/audience, private broadcasts, exact release and two-user POST-to-SSE.
- The browser fixture `tests/browser/messages-typing.html` uses two synthetic
  accounts and the real production controllers/components. Only its provider is
  replaced by a test BroadcastChannel. Both directions and clear-on-send were
  observed at mobile width. No real account message was sent.
- A one-time read-only configuration check found RLS enabled on the existing
  provider's `realtime.messages`, with no browser access policies. No policy,
  table, grant, deployment or database setting was changed.

## Deployment boundary

Both the Receiz chat-host extension and Bankeiz client must be deployed. Local
route/browser evidence is not a live production two-account delivery claim.
The ordinary Receiz web chat has no peer-typing UI added by this change; this
connection is for participants using Bankeiz's shared Receiz conversations.
Offline Notes, antirollback and account entry are unchanged.
