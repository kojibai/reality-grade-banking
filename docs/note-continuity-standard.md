# Note continuity standard

Status: implementation contract for the Bankeiz 1.0.0 release candidate.
Receiz SDK, MCP and AI Skills: **129.0.0**. Ruleset: **127.0.0**.
This document specifies required behavior; it does not certify a deployment,
device, adapter or financial operation.

## One Note, two consumption paths

A Note retains its identity, exact value, funding source, ownership history and
original sealed bytes. Users create, receive, send and deposit Notes through
the existing interface. They do not select a custody protocol.

Every outgoing transfer must consume its exact predecessor once. Qualified
custody performs that operation locally. Other custody requires a connected
Receiz operation for the exact transfer. Brief connectivity is sufficient only
if that operation actually completes and its resulting proof verifies; there
is no fixed one-second promise or connection-only unlock.

Receiving and retaining an original offline is separate from making another
spend. An offline receiver can verify a completed incoming transfer when its
complete source includes independently verifiable exclusive-consumption
evidence and binds that receiver. A pending candidate, an unverified image or
a signature without that evidence does not become a confirmed claim. The
next transfer from nonqualified custody requires connected consumption.

## Required laws

These identifiers are this application's integration requirements. They are
not additions to the pinned Receiz registry and cannot supply SDK authority.

| ID | Requirement |
| --- | --- |
| NOTE-01 | Verify the exact enclosing original with the pinned verifier before admitting its payload, history, identity, funding or custody. Preserve all unknown namespaces and original source bytes. |
| NOTE-02 | Hold distinct states for retained bytes, verified recipient-bound receipt, confirmed ownership and permission to send. UI labels and cached JSON cannot advance those states. |
| NOTE-03 | A completed incoming claim binds the actual receiver, Note identity, exact predecessor, whole value, funding closure and consumption evidence. Missing or conflicting evidence remains pending or is refused. |
| NOTE-04 | Each send consumes one exact current predecessor and admits at most one successor. Repeating the identical accepted operation resolves the same result; changing recipient, value or successor cannot reuse it. |
| NOTE-05 | Continuous offline sends require an independently qualified local custody implementation that prevents restored, cloned or competing state from authorizing another successor. A platform name or API advertisement does not qualify it. |
| NOTE-06 | Nonqualified custody must use a connected, atomic Receiz consumption operation for each exact outgoing transfer. A prior successful connection cannot authorize arbitrary later offline sends. |
| NOTE-07 | Funding allocation, Note issuance, transfer, redemption and account credit must conserve the signed rail and exact amount, with no simultaneous spendable membership in Note and account. Reserve denomination and Settlement Phi remain distinct. |
| NOTE-08 | KaiSigil-bound Kai micro-pulse and verified predecessor history govern causal order. Chronos, server arrival order and timestamps cannot replace them. Ordering competing candidates does not by itself prove exclusive consumption or reveal a withheld branch. |
| NOTE-09 | Switching custody paths requires a proof-bound transition that retires the former spend authority. Connected and local custody must never be active spend authorities for the same Note head. Installing hardware or passing a diagnostic cannot migrate a held Note. |
| NOTE-10 | Persist the original intent, candidate, operation identity and recovery material before entering a consequential operation. A lost response is unknown, not failed. Resolve that same operation before retrying; never restore a consumed predecessor. |
| NOTE-11 | Deposit consumes the Note and credits the exact receiving account once, atomically. Re-imports, another device, changed filenames and stale copies cannot create a second credit. |
| NOTE-12 | Qualification applies to an exact implementation, build, trust policy, device/API path, realm and recovery behavior. Reference tests, synthetic providers and browser diagnostics do not award production qualification. |
| NOTE-13 | First paint uses retained verified local truth. No capability polling, page-load device ceremony or network round trip is introduced merely to display a held Note. Only the requested action enters its required execution path. |
| NOTE-14 | Report success only after independently reopening the complete accepted successor and its required evidence. A report-only receipt, HTTP success, server row, artifact digest or agent assertion cannot substitute for that source. |

## States and language

| Internal distinction | User-facing language | What it permits |
| --- | --- | --- |
| Original retained but not admitted | Checking Note / Could not verify | Keep the original; no ownership or credit claim |
| Incoming candidate lacks final consumption evidence | Pending | Retain and resolve; no confirmed credit or onward spend |
| Complete incoming transfer admitted to this receiver | Received | Hold and inspect the exact original offline |
| Received, connected consumption required for next action | Connect to send | Connect and confirm the exact next send; no offline spend unlock |
| Received, qualified local custody admitted | Ready to send | Execute through the qualified local adapter |
| Execution entered, outcome unresolved | Confirming | Resolve the original intent; no replacement spend |
| Accepted successor independently verified | Sent | Retain the completed source and history |

The main interface remains create → receive → send → deposit. Explain a
connection requirement only when it affects the selected action. Keep device
and protocol detail under technical information. Do not count an incoming
pending Note as an available account balance. Do not silently redeem a held
Note just to make its next send work.

## Who integrates what

| Integrator | Required contribution |
| --- | --- |
| Device or secure-component manufacturer | Non-exportable custody key, irreversible state retirement, exact head/receiver/value binding and independently verifiable consumption evidence; crash and restoration behavior must be specified. |
| Operating-system or managed-runtime vendor | A protected operation exposing those guarantees to the application, trustworthy attestation, isolation and recovery that cannot reactivate retired authority. |
| Browser vendor | A web-accessible bridge preserving the same guarantees, exact origin/RP bindings and user authorization. Writable storage, PRF output and cooperative locks alone do not provide this contract. |
| Receiz protocol and host maintainers | Admit the exact custody profile, verifier and trust roots; implement atomic connected Note consumption, immutable source continuity, once-only redemption and exact-intent recovery. |
| Application integrator | Use the supported SDK operations and exact proof admission; keep the local original, present accurate state and request connectivity only for an action that needs it. |
| Independent assessor / institution | Exercise the actual implementation and both participant roles, publish the assessed scope and verify replay, concurrency, migration and recovery evidence. |

These are possible integration surfaces, not a list of qualified products.
No company, browser, iPhone model or accessory is certified by this table.
An engineer can implement an adapter at a surface that actually exposes the
required primitive; software cannot synthesize a missing protected primitive.

Qualified transfers do not require periodic server acknowledgement merely
because time passed. Operation remains subject to the implementation's actual
prepared capacity, supported trust policy and intact custody. If an adapter
has finite issuance or receiving resources, disclose them and preserve the
held source on exhaustion. Do not advertise unlimited capacity, perpetual
power, lossless recovery or an untested lifetime guarantee.

## Device test and platform integration requests

The public [device evidence check](https://bankeiz.com/conformance/#device-evidence)
is opt-in and nonfinancial. It creates a named test passkey and runs the
unchanged v129 counter check only against that test credential. The result
reports observed API behavior, not complete financial qualification. It must
not run alongside issued Notes where test assertions could disturb custody.

The reported iPhone test returned attestation `none`, backup flags Yes / Yes
and counter `0 → 0`; PRF output did not establish irreversible consumption.
See [the evidence record](iphone-offline-note-registration-v129.md).

Conformance directs users to the team that can expose the missing capability:
Apple's Safari/WebKit and platform security teams for Safari on iPhone/iPad;
the browser vendor and Chromium Web Authentication maintainers for
Chromium-based browsers; or Mozilla's Firefox/Gecko team for Firefox. The
browser team must involve OS or secure-component vendors where necessary.
Users can include the public standard and their reviewed diagnostic export.
The application does not send a report or private account evidence for them.

Reporting channels: [WebKit](https://webkit.org/reporting-bugs/),
[Chromium](https://www.chromium.org/for-testers/bug-reporting-guidelines/), and
[Mozilla](https://bugzilla.mozilla.org/). These are integration requests,
not a claim that the vendor endorses Receiz or already supports the primitive.
The Conformance surface contains the exact request and no product teaser.
Future device products are a separate project. Any later hardware integration
still needs an admitted adapter, independent qualification and safe Note
migration; installation alone never changes spend authority.

## Current implementation boundary

The pinned qualified local primitives remain strict. The prepared-credit
activation flag remains off. The existing device diagnostic remains available.
The connected path described above is **not implemented by the current
Bankeiz Note adapter** and is a v1.0.0 release blocker.

The v129 HTTP inventory explicitly marks `connect.mintNote` as a disabled
legacy mint and `connect.claimNote` as a legacy token claim. Neither is the
new path. The retained `kairosNoteLocalTransition.ts` identity-bound branch
has a local in-memory head check; it is not shared exclusive consumption.
Generic SDK append/reconciliation operations provide useful machinery, but
do not establish an implemented, qualified Note funding/consumption domain.

Required Receiz addition: a current, verifier-admitted connected Note custody
profile and executable SDK/host operations covering issue, exact-head consume,
receive, deposit, resolve and custody-path migration. Return complete accepted
proof objects with the evidence needed by an offline recipient. Use durable
atomic expected-head acceptance and the existing exact-byte verification,
actor capability, source conservation and recovery machinery. Keep the
existing qualified local profile unchanged. Whether this is an additive v129
host capability or a coordinated package update must be established by the
actual accepted schema/API; Bankeiz must not invent one or change a version
field to imply compatibility.

No new financial mode is enabled by publishing these requirements. Release
evidence must demonstrate both paths before announcing universal Note use.

### Connected capability acceptance contract

The following names describe required operations, not callable v129 methods.
The actual Receiz schema, package and host must supply and admit them before
Bankeiz binds a client adapter.

| Operation | Required boundary |
| --- | --- |
| Prepare issuance | Verify the exact funded account source, amount, rail, actor, expected account head and initial holder. Preparation creates no spendable Note or debit. |
| Commit issuance | Exclusively allocate the funding membership and admit the complete initial Note and account successor atomically. Return and reverify the complete sources; do not leave both spendable. |
| Admit incoming original | Verify the complete carrier, source closure, recipient and consumed predecessor. Retain a completed incoming claim offline; retain an incomplete candidate as pending. This read must not consume, credit or redeem it. |
| Prepare send | Bind the sender, exact current Note head, whole value, destination receiving proof, verified causal coordinate, domain and operation identity. Planning grants no spend authority. |
| Consume and send | Reopen staged exact bytes, verify current capability and custody profile, and atomically consume the expected predecessor with one accepted successor. Conflicting candidates cannot receive accepted completion. Return the complete proof needed for offline receipt, not merely a JSON success or a report-only receipt. |
| Deposit | Consume the exact admitted Note and credit the exact receiving account once in the same conserved operation. Verify both successor sources before projecting credit. |
| Resolve | Recover the exact operation by its original identity and candidate binding. Return accepted complete sources, definite refusal or an explicitly unknown result. A timeout, absent index row or stale cache cannot authorize a new attempt. |
| Migrate custody | Bind old and new custody, source head and all relevant domains; retire the old spend authority before activating the new one. Preserve safe exact-intent recovery across partial failure. |

The server coordinates exclusive acceptance beneath the proof contract; its
database row or arrival timestamp cannot become an alternative value source.
The admitted connected-consumption profile must specify exactly what an
offline recipient verifies, its issuer/trust binding and domain guarantees.
An application-created signature or a generic append receipt cannot invent
that profile. An offline-created conflicting candidate cannot later rewrite a
completed consumption simply because it claims an earlier time.

Once these operations exist, runtime selection is per verified current head,
not user-agent detection. An admitted qualified local head uses local
consumption; an admitted connected head uses the connected operation. Unknown
or unsupported custody fails closed while retaining the original. Do not
silently convert an existing qualified Note after a failed device probe.

## Acceptance evidence

Require complete-original round trips and receiver binding; invalid proof,
wrong recipient/value/head/rail and missing consumption refusal; concurrent
competing sends and duplicate deposits; restored sender state; cancellation
before consumption; crash after consumption; lost response and same-intent
resolution; account/Note conservation; both directions of custody migration;
qualified → connected and connected → qualified counterparties; fresh and
retained users; offline incoming inspection without network; and mobile
first-paint/interaction checks with no new polling or preload ceremony.

Tests of synthetic hardware must be labelled synthetic. Publish real-device
and actual-host financial evidence separately, with exact build and source
hashes, trust policy, namespace preservation, SDK/registry parity and all
remaining exclusions. See [release readiness](releases/1.0.0.md).
