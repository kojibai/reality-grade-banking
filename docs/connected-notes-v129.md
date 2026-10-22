# Connected Note execution · Receiz v129

**Implementation candidate. Deployed financial qualification precedes v1.0.0.**

Connected creation is a separate consumption profile, `connected-account-v1`.
It does not qualify a synced passkey, export protected custody, or change the
antirollback requirements of qualified continuous offline sending.

## One interface, explicit authority boundaries

1. The account holder enters one amount in Create Note. Reserve is used first; Settlement covers only the remainder. No funding selector is presented. A split appears only when both contribute.
2. One selected-account quote read supplies the exact wallet baseline, deterministic rate
   and Kai pulse. The Identity Seal signs the exact issue intent and a separate
   public Note authority. Its private Note key is retained only in the existing
   encrypted device vault, before submission.
3. The selected existing account writer verifies current account/key membership,
   the signed quote pulse and deterministic rate, expiry and account baseline.
   Under its existing account/global locks, it reserves the exact value once.
4. Bank independently opens the complete canonical funding original and the
   protected financial-root signature, then its private account opening. Both
   remain retained before packaging. The PNG carries the complete public source;
   it contains no private signing key or private account balance opening.
5. The holder opens the receiver's existing signed receiving request. The Note
   authority signs the whole funding original and that exact recipient. This
   handover is retained before packaging and can be delivered offline.
6. The receiver verifies the complete source and destination offline. **Received
   Notes** holds it separately from available account credit. This is verified
   receipt and retention, not evidence of irreversible consumption on a
   nonconforming sender.
7. On connection, the receiver signs one exact claim, retained before POST.
   The same selected writer globally consumes the funded Note and applies credit
   atomically once. Changed recipients, competing claims and replay cannot mint
   another credit. Only the full verified native credit and private opening can
   mark the local queue confirmed. Reconciliation runs before account spending
   or creating a new Note from that value.

Qualified local consumption continues to require the existing attested custody
and rollback-resistant exact-head retirement. It may continue offline within its
qualified capacity. Neither a connected claim nor a browser storage flag can
replace that evidence.

## Exact contracts

`/api/connect/offline-notes/connected?origin=<registered origin>` uses existing
Receiz account access and rail scopes. Bank proxies only this bounded route.

| Action | Contract |
| --- | --- |
| Quote | GET with `intent=quote`. Returns the selected account baseline, `quotePulse`, deterministic rate, `issuedAtMs` and five-minute `expiresAtMs`. No debit. |
| Issue | POST `{action:"issue", authorization}`. The closed signed `receiz.bank.connected-note.issue.v1` basis includes profile, account UUID, issuer public key, Note authority public key, Note UUID, client nonce, rail, USD denomination, exact Settlement Phi or mandatory composite funding parts where applicable, rate, quote pulse, expected balances and expiry. Its authority digest is the immutable operation ID. |
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
Labels never authorize money. The same pending amount, rail and authority must
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
