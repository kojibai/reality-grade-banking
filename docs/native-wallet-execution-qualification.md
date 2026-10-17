# Native wallet execution qualification

SDK, MCP and AI skill packages remain **129.0.0**. The Bank screens, note artwork,
preview, review and save flows are unchanged. No financial production selector
is enabled by this checkpoint.

The Receiz native source implementation uses the existing account/key history,
complete global action ledger and exact source storage. A payment commits both
wallet effects, receipt, activity and calendar through that same writer. Current
keys and both account heads are checked while holding the account and global
locks. Sender, application and nonce define the retry coordinate. Reopening an
accepted source recomputes the effects from its complete predecessors.

Reserve preserves its admitted dollar denomination and original Phi backing.
A display-price increase cannot release that backing as new Settlement. Only
admitted native Settlement movements affect the Settlement component. A split
that would leave a Reserve claim without backing is refused before acceptance.

The public statement producer currently supports the native wallet-only source
profile: native empty genesis, no separate profile/artifact or entitlement value,
and no unsupported account activity. Other accounts require their complete
financial source closures. They are refused; their missing components are never
represented as zero. Source creation, cache reuse, publication and live reads
all enforce that boundary. A previously shared immutable snapshot remains a
snapshot, and disabling live sharing needs no fresh balance proof.

Public statements carry a domain-bound signature from the existing native
financial root beneath their canonical enclosing Record and Seal. An ordinary
user-sealed balance declaration is insufficient. Historical source signatures
remain verifiable inside a retained root's original validity interval after
retirement; retirement never authorizes new signing.

## Remaining release work

- Connect the source-bound payment review and execution adapter to Bankeiz's
  existing SDK preparation/recovery contract, preserving recipient privacy.
- Integrate native Note allocation, original-denomination Reserve redemption,
  exact-Phi Settlement redemption and the exclusive local-cash reconciliation
  frontier with the same writer. A deposited local cash component must never
  remain spendable locally while becoming available online.
- Compose complete profile/artifact and lawful-action financial sources for
  existing accounts, including their full history and accepted head.
- Qualify trusted startup selection, real supported custody devices and the
  deployed application journey before enabling the existing financial gates.

The tests use actual v129 cryptography and exact durable source replay with
ephemeral roots, explicitly simulated paid ingress and synthetic custody.
They establish those tested boundaries, not live funding or physical-device
qualification. No live transaction or production credential is created.
