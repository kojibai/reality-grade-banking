# Native wallet execution qualification

SDK, MCP and AI skill packages remain **129.0.0**. The Bank screens, note artwork,
preview, review and save flows are unchanged. Bankeiz's new local-credit and
general operation gates remain closed pending their complete qualification.

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
no unsupported account activity, and a separately selected, complete global
lawful-value source. A new account does not imply an empty global inventory;
this profile requires an explicitly installed native empty inventory. Other accounts require their complete
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
- Qualify nonzero Settlement funding against its complete admitted value
  source, and qualify the supported physical custody devices. Native Note
  allocation and redemption now use the shared writer; the isolated Reserve
  tests also cover deposit, offline respend and final descendant redemption.
- Compose complete profile/artifact and lawful-action financial sources for
  existing accounts, including their full history and accepted head.
- Qualify trusted startup selection, real supported custody devices and the
  deployed application journey before enabling the existing financial gates.

The tests use actual v129 cryptography and exact durable source replay with
ephemeral roots, explicitly simulated paid ingress and synthetic custody.
They establish those tested boundaries, not live funding or physical-device
qualification. No live transaction or production credential is created.

## Native Note API and storage

The existing funding and redemption endpoints now compose the shared native
writer, exact source retention and current account/key history. Their financial
store requires no database, SQL schema or migrations. It does require durable
storage and the existing signing and custody configuration. Authentication and
application registration remain separate host services; this statement does
not qualify their runtime or a deployment merely from its SDK version.

Set `RECEIZ_FUNDED_WALLET_SOURCE_DIRECTORY` to the same absolute directory as
`RECEIZ_ACCOUNT_SOURCE_DIRECTORY` (or `RECEIZ_SOURCE_DIRECTORY`). These are
trusted host settings, never request parameters. Missing or conflicting roots
refuse service; they do not create an installation, adopt a balance or select a
database fallback. The worker retains its verified native prefix between calls.

Reserve allocation removes the original fixed-dollar claim and proportional
original Phi backing from online spending. Unissued interrupted allocation can
be cancelled once. A retained funding proof cannot be refunded. Deposit consumes
the final qualified Note and credits the exact admitted rail. A locally credited
terminal cannot also acquire online credit: its protected cash must first be
spent into a subsequent Note. Redemption traces that complete descendant source
to the original exclusive pool and accounts for all redeemed leaves under the
same global writer lock.

Prepared Reserve notes divide the actual remaining backing, and the final
denomination consumes its exact remainder. Two $1 funding events at different
rates must still produce two $1 notes without losing or inventing a micro-Phi.
The chosen amount is retained before custody; older staged attempts keep their
original exact amount. Unsupported precision refuses before a new note intent
or irreversible operation.

The native public statement includes the accepted Note wallet movements and
refuses an unresolved sender allocation rather than silently omitting its
offline cash. Complete private offline history and nonempty artifact or lawful
value sources still require their admitted source composition.
