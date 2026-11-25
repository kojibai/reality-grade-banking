# Connected Note execution · Receiz v129

**Implementation candidate. Deployed financial qualification precedes v1.0.0.**

Connected creation is a separate consumption profile, `connected-account-v1`.
It does not qualify a synced passkey, export protected custody, or change the
antirollback requirements of qualified continuous offline sending.

## One interface, explicit authority boundaries

1. The account holder enters one amount in Create Note. Reserve is used first; Settlement covers only the remainder. No funding selector is presented. A split appears only when both contribute.
2. One selected-account quote read supplies the exact wallet baseline, deterministic rate
   and Kai pulse. The Identity Seal signs the exact issue intent and a separate
   public Note authority. Its private Note key is retained in the existing encrypted device vault before submission. Only this per-Note authority, never the account key, enters the complete delivery image.
3. The selected existing account writer verifies current account/key membership,
   the signed quote pulse and deterministic rate, expiry and account baseline.
   Under its existing account/global locks, it reserves the exact value once.
4. Bank independently opens the complete canonical funding original and the
   protected financial-root signature, then its private account opening. Both
   remain retained before packaging. The PNG carries the complete public funding source and its scoped per-Note delivery authority under the canonical image seal. It contains no account signing key or private account balance opening.
5. The holder saves and sends the original PNG. On import, the receiving account locally composes its existing signed receiving request and the Note handover from that complete image. No receiving-request file exchange is needed for a new connected Note. The exact terminal is retained before credit submission; reimport reuses it.
   New connected Notes from Bankeiz require a recipient. Their stable account UID is included in the signed issue and financial funding source, so only that account can take the first handover even after a username change. Previously issued open Notes retain their original redemption rules. New open Notes use qualified Note custody.

6. The receiver verifies the complete source and destination offline. **Received
   Notes** holds it separately from available account credit. This is verified
   receipt and retention, not evidence of irreversible consumption on a
   nonconforming sender.
7. On connection, the receiver signs one exact claim, retained before POST.
   The same selected writer globally consumes the funded Note and applies credit
   atomically once. Changed recipients, competing claims and replay cannot mint
   another credit. Only the full verified native credit and private opening can
   mark the local queue confirmed. Reconciliation runs before account spending
   or creating a new Note from that value. Unknown outcomes keep that spending barrier. A known already-deposited copy stays paused without blocking a later valid incoming Note; retries are explicit and reuse the retained claim.

### Passing on a funded Note

The native writer includes the recipient’s admitted keys in the existing funding
quote where available. The signed issue and funded Original bind those keys. The
first holder can pass on that exact funded Note while offline. Each handoff
verifies the predecessor, signs it to the next holder’s Note receiving QR, and
saves the exact successor before the sender shows the outgoing QR. The recipient
can receive it in **Receive nearby** and pass it on the same way. A saved outgoing
QR can be reopened after a restart.

The last holder can add the value to their balance on connection through the
ordinary Note claim. Intermediate holders can stay offline. Account credit
consumes that original funding once and keeps the complete chain with the
receipt. If competing chains reach the writer, only one can receive credit.
Regular balance payments still use their existing Send Nearby path when there
is no matching funded Note. Notes issued without the signed onward policy keep
their original redemption rule.

Qualified local consumption continues to require the existing attested custody
and rollback-resistant exact-head retirement. It may continue offline within its
qualified capacity. Neither a connected claim nor a browser storage flag can
replace that evidence.

### Verification evidence

| Verified path | Scope |
| --- | --- |
| Funded Note from A through B, C, D, E, F and G | The native writer fixture starts with a signed funding allocation, prohibits fetch during all six handoffs and verifies that G receives the exact credit once. The original amount and funding source survive all six handoffs. An earlier holder cannot claim a second credit after the final deposit. |
| Exact recovery on an iPhone | Safari on an iPhone 17 Pro Max runs the synthetic fixture with WebAuthn and network fetches disabled during recovery. It reopens the exact signed handoff from a second test wallet’s proof after a simulated restore and refuses an alternative recipient if the proof is missing. |
| Nearby regular-balance payment | In the isolated Mac-to-iPhone fixture, the receiver confirmed $100 in test funds without the sender reconnecting. This uses the nearby Wallet payment signature and connected confirmation. |
| New Note from regular balance on an unqualified device | The exercised connected profile requires a native funding allocation for a new Note. The current local-issuance contract requires a device-bound account proof. The current default while offline is **Send nearby** or passing on a Note whose funding was already admitted. |

The physical fixture tests recovery. The six-handoff sequence and final credit
run against an isolated native writer. Deployed financial qualification needs
a separate run through the actual deployed Wallet.

### Recovering a handoff

Bankeiz keeps a compact witness in browser storage separate from the encrypted
Note journal. The witness links the exact predecessor and saved successor
digests. If an older Note journal is restored while this witness survives,
Bankeiz reopens the signed successor before it can expose another handoff or
submit the old Note for deposit. When the proof is missing from local storage,
the recipient can show the received proof QR or share the saved proof. The
existing native reader verifies the exact successor before restoring the
handoff, without requiring a connection.

| What the wallet holds | What the user can do |
| --- | --- |
| A verified funded Note | Send or receive it nearby, including repeated offline handoffs. |
| The newer witness and the matching signed successor | Reopen the same outgoing QR without connecting. |
| The newer witness and an older Note record | Recover the exact successor from the receiving device’s QR or a saved proof. Another handoff or deposit from the old record stays paused. |
| The newer witness with no available proof | Retrieve a saved copy when connected or ask the recipient for their proof. Connecting alone does not recreate a handoff that was never shared. |

The witness records digests only. The complete signed successor remains in
the existing Note custody. A restore of both browser stores can remove the
witness, so it cannot detect every device rollback.

Send and Receive remain the normal entrances. Opening them does not start
device enrollment. Offline Cash setup is offered when the wallet already
holds verified custody evidence for this installation. Previously held
Offline Cash and its recovery stay visible. Regular-balance nearby payments
can be saved offline and become spendable on confirmation. Funded Notes
can be passed on offline, with the final holder connecting to deposit.
Creating a new connected Note or adding a new Offline Cash allocation from
the regular balance currently requires a connection.


## Exact contracts

`/api/connect/offline-notes/connected?origin=<registered origin>` uses existing
Receiz account access and rail scopes. Bank proxies only this bounded route.

| Action | Contract |
| --- | --- |
| Quote | GET with `intent=quote`. Returns the selected account baseline, `quotePulse`, deterministic rate, `issuedAtMs` and five-minute `expiresAtMs`. No debit. |
| Issue | POST `{action:"issue", authorization}`. The closed signed `receiz.bank.connected-note.issue.v1` basis includes profile, account UUID, optional immutable recipient account UUID, issuer public key, Note authority public key, Note UUID, client nonce, rail, USD denomination, exact Settlement Phi or mandatory composite funding parts where applicable, rate, quote pulse, expected balances and expiry. Its authority digest is the immutable operation ID. |
| Recover issue | GET with only `allocationId=<operationId>` in addition to origin. Returns that exact complete funding or cancellation source and private opening, or definite absence. |
| Cancel | POST `{action:"cancel", authorization:<signed cancellation>}`. The native writer atomically records a permanent tombstone. A lost response, GET miss or local flag cannot abandon an issue. Published funding cannot be cancelled by this path. The returned cancellation is financially signed, sealed and independently verified. |
| Claim | POST `{action:"claim", claim, source}`. The claim binds the exact full source SHA-256, handover digest, Note and receiver key/account. It is retained before entering submission. |
| Recover claim | GET with only `noteId=<UUID>` in addition to origin. Recover the same accepted claim; definite absence permits resubmitting only its original retained request. |

The signed quote pulse must equal the canonical pulse at its signed issue time;
the native writer derives the deterministic rate for that pulse. A later live
rate cannot invalidate that bounded quote. Exact Settlement Phi is authorized;
Reserve retains the historical backing Phi of the original fixed-dollar claim.
Repricing cannot create Phi or duplicate Reserve.

Funding, credit and cancellation payloads are closed schemas under
`receiz.bank.connected-note.*.v1`. Each financial statement requires the existing
protected Bank financial signing context and a complete canonical enclosing
Receiz proof. Ordinary user seals cannot declare account funding. Private
account openings are bound by hash and checked for exact before/after deltas.
Credit and cancellation archives use `receiz.bank.connected-note.receipt.v1`,
carrying both the complete source and its opening for independent verification.

## Retention, recovery and limits

The existing encrypted vault retains content-addressed blobs and compare-and-swap
checkpoints. `bank.connected-notes.v1` holds exact issue authorization, private
Note key, verified funding/opening, original image and bound handover references.
Labels never authorize money. Older qualified device-held Notes retain their original handover controls under the folded compatibility details; resealing their image does not turn them into bearer Notes. The same pending amount, rail, optional recipient and authority must
resume after an interruption. Failed image packaging reuses the verified source;
it cannot allocate again or silently select another recipient.

The received queue retains each full original and exact signed claim before a
consequential request. Confirmed receipts survive reopen. Unknown or held
custody prevents destructive identity removal. The integration retains the existing financial service and custody contract;
no capability polling or background attestation is introduced.

The image is bounded at 8 MiB; expanded connected funding/handover sources at
16 MiB, openings at 16 KiB and host JSON at 4 MiB. Oversized transport is refused
without trimming proofs or abandoning the exact attempt. A device retains up to
128 connected Note records and the receiving queue up to 64 entries. Existing
qualified formats and limits remain unchanged.

## Qualification and integration

Inspect `/conformance/#note-continuity`, the included preferred sources and the
read-only receiver verifier. A browser/device diagnostic does not authorize
funding. A platform seeking continuous offline creation must expose attested,
non-exportable custody with independently verifiable irreversible consumption of
the exact predecessor, recipient, whole value and successor, including crash,
clone and restored-state tests. The public standard identifies browser, OS and
secure-component responsibilities and contact routes.

Before public release, qualify the exact deployed Receiz writer, signer context,
registered origins/scopes, current account membership, simultaneous claims,
Reserve/Settlement conservation, lost replies, cancellation races and physical
PWA offline receipt/reopen/reconnect. No live funds or public assets are created
by the synthetic checks. Implementation and deployment are not qualification.

## Automatic funding and continuous proof

A Reserve-only allocation remains a Reserve Note with fixed original USD denomination. A Settlement-only allocation remains a Settlement Note with exact Phi; its printed dollars record value at creation. A composite allocation is a **Settlement Reserve Note**, captioned **Proof-backed Native value**. Its closed signed `fundingParts` contains Reserve USD/Phi and Settlement USD/Phi. Both components are positive and their totals must equal the admitted nominal cents and total Phi. A combined Note does not promise that its variable Settlement component retains a fixed dollar payout.

The split is bound in the issue authorization, financial funding signature, original source, recipient-bound handover, private debit opening, once-only credit and private credit opening. Refunds preserve the original parts. A cancellation before allocation records a zero-refund tombstone, never an invented credit. Display labels confer no monetary authority.

Fresh review reads one quote, without Note-key generation or a retained issue. Confirmation reuses that exact quote; expiration refuses before a new Note key is generated. The consequential issuance request is retained first. Reopening an unknown result uses its original operation and source rather than reselecting or requoting. Receiving and importing retain the original full proof; imported credit metadata must match both funding parts.

## Connected-account capability

Bankeiz uses the selected Receiz connected-account contract. A selected native
source remains authoritative; its refusal cannot silently switch to another
source. Unsupported or unavailable connected capability is reported explicitly.
Each admitted funding path preserves its own exact accepted amounts through
cancellation and credit. The SDK's original source and receipt determine the
result, rather than the image's displayed amount or a local status flag.
