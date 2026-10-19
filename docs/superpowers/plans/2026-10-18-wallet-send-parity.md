# Wallet Send parity

The user selected Receiz Wallet's automatic funding: Reserve first, then
Settlement. Use the installed v129 SDK's `connect.transfer`, the same atomic
`chat_wallet_send_message` writer, existing profile resolution and direct-chat
creation. Do not require Crystal for this connected Wallet operation.

Preserve existing native payment and asset recoveries separately. A connected
Wallet observation is not a native financial-root receipt or an SDK edge commit.
Do not convert it into either, replace held proof sources with it, or change
Offline Notes' irreversible custody and antirollback rules.

1. Require SDK/native Wallet parity for the exact funding breakdown; reproduce
   the missing SDK metadata with a failing original-writer regression.
2. Compose existing bearer authentication with Wallet's recipient/DM mechanics,
   restricted to direct human conversations. No bearer-to-cookie fallback.
3. Provide authenticated, bounded preview and original-nonce lookup. Lookup is
   read-only; a missing row is unknown, never proof of zero writes.
4. Retain the exact approved SDK body and nonce in encrypted device storage
   before dispatch. Unknown delivery blocks another attempt. Existing pending
   native operations remain reachable and prevent a new Wallet send.
5. Present automatic funding and quote-at-review semantics truthfully. Retain
   the complete observed outcome, update account and Ledger immediately after
   a recorded result, and expose read-only outcome recovery after restart.
6. Test funding parity, scope/caller isolation, exact recipient resolution,
   read-only recovery, response loss, local retention failure, concurrency,
   stale identity/UI generations, and rendered Send. Run relevant release
   checks and commit on main; the user pushes. No live transfers.

The original SDK funding omission was reproduced before the route fix. A real,
disposable PostgreSQL reproduction also showed the original writer accepting
the same Reserve slice twice. The existing writer now validates that slice
under its account locks and serializes the original nonce before existence
checks; it never rewrites the sealed funding split. Its migration is unapplied.
Read-only quote readiness refuses before Bank retains a new request when the
guard is absent. A capability outage during dispatch remains uncertain.

Wallet and fresh Note creation now share execution → Notes lock ordering.
Reciprocal durable pending checks stop a fresh operation while another family
is unresolved. Existing Note resume/cancellation and original Wallet outcome
lookup remain reachable. Send uses a strict same-identity custody check rather
than the tolerant first-paint cache reader; unreadable saved custody never
means that there is no local Note successor.
