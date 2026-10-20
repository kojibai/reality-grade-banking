# Note continuity standard

**Implementation specification · Receiz 129.0.0 · Ruleset 127.0.0**
**Release status: development candidate. Financial qualification incomplete.**

This specification defines the Bankeiz application contract beneath the pinned
Receiz registry. It does not amend that registry, certify a manufacturer or
establish a public 1.0.0 release. Conformance is demonstrated by inspectable
source, exact implementation scope and reproducible evidence.

## User contract

Create a Note. Share the completed original. Receive it through Deposit note.
The interface selects the supported execution path; users do not choose a
cryptographic protocol or complete a qualification ceremony to receive.

A completed Note addressed to an account can be verified and retained offline
without a recipient custody authenticator. Its value appears as **Received
Notes**, separately from the available account balance. When connected, the
existing Receiz redemption operation confirms the account credit once. That
reconciliation must finish before spending from the account or creating a new
Note from its balance. Connectivity alone never grants spend authority.

Creating new spend authority offline requires conforming protected custody
and already prepared funding/resources. The exact predecessor must be retired
irreversibly. A conforming implementation can continue locally within its
assessed capacity and trust policy, without periodic server acknowledgement.
A device/browser path that does not expose those guarantees is nonconforming
for that capability. Its name, price, operating system and API advertisements
are not evidence either way.

Explain a connection or conformance requirement when the requested action
needs it. Do not gate receiving, add a page-load passkey test, or put a device
qualification decision ahead of the account. An institution can inspect the
complete technical material here and at
[/conformance/#note-continuity](https://bankeiz.com/conformance/#note-continuity).

## Implemented composition and remaining boundary

| Capability | Implementation and evidence |
| --- | --- |
| Signed account receiving destination | Bank application composition using the existing Identity Seal signature. No receiver custody enrollment. Once the native account destination is known, construction uses no server call. First native binding reuses existing account access. |
| Sender retirement into that destination | Existing v129 `prepareBankNoteRedemption` and `consumeExactHead`; complete terminal source retained before packaging. Sender still needs qualified custody. |
| Offline receipt and local deposit retention | Complete v129 terminal/funding verification, exact recipient binding and encrypted local originals. No recipient authenticator or credit request. |
| Connected credit and recovery | Existing `/api/connect/offline-notes/redemption` GET/POST and full native credit verification. Exact original is recovered/submitted; no replacement intent. |
| Qualified offline creation / local account continuity | Existing strict primitives; prepared-credit activation remains disabled pending physical-device and host qualification. |
| Online creation on nonconforming custody | Implemented as the distinct `connected-account-v1` profile through the selected existing Receiz account writer. Reserve contributes first and Settlement supplies any remainder. A mixed Note carries both signed funding components through every transition. No attestation ceremony. Signed recipient-bound handover can be retained offline; exclusive consumption and credit occur atomically when connected. Deployed qualification remains required. |
| Universal device support / public 1.0.0 | **Not qualified or released.** See [release gates](releases/1.0.0.md). |

The account receiving/deposit additions and connected issuance are documented
v129 host/application composition, not new published package methods. The
connected profile is explicitly distinct from qualified custody; it cannot
claim irreversible offline consumption or weaken existing v129 checks.
They introduce no Bank database, alternative issuer, polling service or roots.
A copied held-Note image cannot be converted into a completed account receipt
by the receiver: the current holder must first produce the recipient-bound
terminal through its qualified consumption path.

The connected profile atomically allocates account value and returns a complete,
protected-financial-root-signed funding source. A separate Note signing key stays
inside encrypted device custody. Its signed handover binds the funding original,
whole amount and exact recipient request. A nonconforming sender can retain or
hand over that file offline; its signature does not prove irreversible local
consumption. The receiver retains the complete handover in Received Notes. The
native writer confirms one consumption and one account credit on connection,
before that value can be spent or used to create another Note.

[Connected Note contract](connected-notes-v129.md) specifies the issue, quote,
handover, claim, cancellation and complete receipt boundaries. Disabled legacy
`connect.mintNote`, token claims, generic append receipts and browser locks are
not financial substitutes. Qualified custody remains a separate unchanged path.

## Required laws

MUST and MUST NOT express application requirements. They do not grant financial
authority, and passing a subset does not certify an institution.

| ID | Requirement |
| --- | --- |
| NOTE-01 | Verify the exact enclosing original, complete funding graph and required history before admitting value, ownership or consumption. Preserve original bytes and unknown namespaces. |
| NOTE-02 | Distinguish retained bytes, verified recipient-bound receipt, confirmed account credit and permission to spend. Cached labels cannot advance authority. |
| NOTE-03 | A completed receipt MUST bind the receiver account and key, Note, exact predecessor, whole amount, rail, funding closure and exclusive-consumption evidence. Refuse absent or conflicting evidence. |
| NOTE-04 | Consume one exact predecessor into at most one accepted successor. Identical accepted intent resolves the same result; changed recipient, value or source cannot reuse it. |
| NOTE-05 | Offline creation and onward local consumption MUST use assessed protected custody. Restored, cloned and competing state MUST NOT authorize another successor. |
| NOTE-06 | A locally received account deposit MUST reconcile its exact terminal through connected Receiz redemption before account spending or new Note creation. A prior connection is not a future offline authorization. |
| NOTE-07 | Funding, issuance, transfer, redemption and credit MUST conserve the signed rail and exact amounts. Value cannot remain spendable in both account and Note. Reserve USD denomination and Settlement Phi are distinct units. |
| NOTE-08 | KaiSigil-bound Kai micro-pulse and verified predecessor history govern causal order. Chronos and server arrival timestamps cannot replace them. Sorting candidates does not reveal a withheld branch or establish consumption. |
| NOTE-09 | Changing custody MUST retire former spend authority through an admitted transition. A diagnostic, installation or browser upgrade cannot migrate a held Note by itself. |
| NOTE-10 | Retain intent, candidate and recovery coordinates before consequential execution. An interrupted response is unknown. Resolve that same operation; never restore a consumed predecessor. |
| NOTE-11 | Account redemption MUST apply the exact recipient credit once atomically. Re-import, changed filename, concurrent submission and another device cannot create another credit. |
| NOTE-12 | Qualification MUST name the build, adapter, trust roots/policy, device/API path, realm and recovery behavior. Synthetic authenticators and browser diagnostics do not certify financial custody. |
| NOTE-13 | First paint MUST use retained local truth. Do not introduce capability polling, automatic credential ceremonies or a network round trip to display a held Note. Reuse admission only for identical bytes under the same policy. |
| NOTE-14 | Report completion only after independently reopening the complete accepted source and evidence. HTTP success, a database row, digest or report-only receipt cannot replace it. |

## State and authority

| State | Display | Authority and next operation |
| --- | --- | --- |
| Bytes retained, not verified | Checking Note / Could not verify | No ownership, account credit or spending claim. Preserve original. |
| Incomplete incoming candidate | Pending | Retention only. It cannot enter the completed-receipt queue. |
| Complete recipient-bound source admitted | Received | Funding and destination verified offline. A qualified terminal carries local consumption; a connected handover awaits exclusive consumption. Retain locally; account credit remains unconfirmed. |
| Received source retained in encrypted vault | Received Notes · Reconciles before spending | Locally visible holding, excluded from available wallet credit. May reconcile on connectivity or before an account execution. |
| Host outcome unknown | Confirming | Recover the exact original; do not issue a replacement or presume zero writes. |
| Complete native credit independently verified | Deposited | Retain full credit receipt and observe the resulting account source. The queue cannot mint credit. |
| Qualified held Note with intact current head | Ready to transfer | Existing qualified local consume may create a recipient terminal or qualified successor. |
| Exact predecessor consumed | Transferred / terminal | Never reactivate that predecessor. Resume saved completion if packaging was interrupted. |

The terminal's receipt establishes its bound destination; it is not a reusable
bearer token or the recipient's authority to mint another Note offline. A
holder may deliver the completed file through any offline byte transport.
Forwarding that same file does not change its recipient. Re-addressing requires
a new lawful transition by the actual current spend authority.

## Exact formats, operations and storage

[The implementation contract](note-account-deposit-v129.md) specifies the
receiving request, transport, terminal admission, encrypted queue, exact credit
recovery, bounds and refusal behavior. The complete preferred sources and
hash manifests are distributed in [native/](../native/README.md). Public SDK
schemas and their reference closure are available at
[/schemas/](https://bankeiz.com/schemas/); application-only envelopes are named
separately and are not represented as registered SDK schemas.

Use the [read-only receiver](../institution/receiver-verifier.entry.mjs) to
inspect source evidence. An inspection neither consumes custody nor proves
current spendability or host credit. Independent verification requires the
matching verifier, cryptographic resources and trust policy; no contact with
Bankeiz is required to open a complete supported original.

## Device capability and responsibility

| Integrator | Required contribution and evidence |
| --- | --- |
| Secure-component manufacturer | Non-exportable custody; irreversible retirement of the exact state/head; receipt bound to receiver, whole amount and successor; cloning/restoration/crash tests. |
| Operating-system or managed-runtime vendor | Protected operation, attestation, isolation, durable recovery and no restoration of retired authority. Document backup and reset behavior. |
| Browser vendor | Web-accessible bridge preserving the guarantees, exact origin/RP binding and user authorization. PRF, writable storage and cooperative locks alone are insufficient. |
| Receiz maintainers / host operators | Admit the custody profile and actual roots, preserve full source closure, enforce atomic account allocation and once-only redemption, and recover exact intents across interruption. Supply the missing connected-creation contract without changing qualified local law. |
| Application integrator | Use supported verifier and execution primitives; retain complete originals before state changes; keep received and available value distinct; reconcile before spend; never turn a diagnostic into authority. |
| Independent assessor / institution | Exercise actual sender and receiver roles and every applicable rejection/recovery case. Publish exact scope, inputs, build/resource hashes, evidence and exclusions. |

There is no model-name allowlist or qualified-product endorsement in this
specification. An implementation may integrate at the device, OS or browser
boundary if it actually supplies the primitive and passes assessment.

The existing WebAuthn path requires verified platform attestation, single-device
non-backed-up credential semantics and the unchanged strict rollback check.
Its test sequence advances registration `n` to `n+1` and `n+2`, with the
required signed assertion, origin/RP, challenge and state bindings. A counter
increment by itself is not complete qualification. A software number, Kai
pulse, PRF-derived key, IndexedDB record or synchronized passkey cannot replace
irreversible retirement.

The opt-in [device check](https://bankeiz.com/conformance/#device-evidence)
creates a named nonfinancial test credential. Do not run it alongside issued
Notes where an authenticator's shared counter could disturb custody. It does
not send derived secrets or account data to a server and never resets Notes.
The user-reported Safari Private test observed `none`, backup Yes / Yes and
`0 → 0`; its rollback check refused. This is a scoped observation, not a
verdict on every iPhone or a financial certificate. See
[the evidence record](iphone-offline-note-registration-v129.md).

## Request platform conformance

After an offline creation refusal, direct the user to the responsible browser
and platform security teams. Safari on iPhone/iPad: Apple Safari/WebKit and
platform security; Chromium browsers: that browser vendor and Chromium Web
Authentication; Firefox: Mozilla Firefox/Gecko. The browser team must involve
OS or secure-component vendors where needed. Reporting channels:
[WebKit](https://webkit.org/reporting-bugs/),
[Chromium](https://www.chromium.org/for-testers/bug-reporting-guidelines/),
[Mozilla](https://bugzilla.mozilla.org/).

> Please expose a conforming protected custody operation for Receiz offline
> Note creation and consumption. It must retire the exact predecessor
> irreversibly, bind recipient, whole value and successor, and return
> independently verifiable attestation and consumption evidence. Restored state
> must not authorize a second successor. Preserve origin/RP binding, user
> authorization and exact-intent recovery after interruption. Specification and
> opt-in diagnostic: https://bankeiz.com/conformance/#note-continuity .

Users review and send their own report. No account evidence is automatically
published or reported, and no vendor endorsement or product teaser is implied.

## Qualification and release

The [test and evidence matrix](note-account-deposit-v129.md#qualification-matrix)
describes the implementation checks and outstanding physical/production gates.
Maintain the exact source archive, native and resource hashes, package parity,
root policy, full result and assessed realm with each report. Invalid proofs
and refused operations are evidence too; do not hide failures in a pass count.

Run `npm test`, `npm run typecheck`, `npm run native:check`,
`npm run native:rebuild`, `npm run receiver:check` and `npm run build` from the
recorded revision. Follow [release procedure](release-process.md) and
[1.0.0 readiness](releases/1.0.0.md). These commands are necessary engineering
checks, not substitutes for physical custody and deployed financial assessment.
No documentation page, successful synthetic transfer or package version can
waive those gates.
