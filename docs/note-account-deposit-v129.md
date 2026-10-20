# Account-destination Notes · v129 implementation contract

Status: application composition under development and local verification.
This document does not certify live funding, devices or a production release.
Read the [continuity laws](note-continuity-standard.md) first.

## Scope and source authority

A qualified sender can consume its current Note into a terminal addressed to a
recipient account. The recipient needs its admitted Identity Seal and encrypted
local source retention, not its own custody authenticator. It can verify and
retain that completed source offline. Receiz confirms the account credit on
connection through the existing native redemption service. The composition
does not issue a new connected custody profile, change SDK cryptography, enable
the prepared-credit flag or allow a receiver to consume a sender's held image.

Sources:

- [Destination signature](../native/receiz/app/lib/wallet/bankNotes/accountReceiving.ts)
- [Sender composition](../native/receiz/app/lib/wallet/bankNotes/accountTransfer.ts)
- [Terminal and credit admission](../native/receiz/app/lib/wallet/bankNotes/accountDeposit.ts)
- [Existing terminal consumption](../native/receiz/app/lib/wallet/bankNotes/redemption.ts)
- [Existing native credit verification](../native/receiz/app/lib/wallet/bankNotes/credit.ts)
- [Encrypted receiving queue](../src/receiz/note-received-deposits.ts)
- [Account execution binding](../src/receiz/native-identity.ts)

## 1. Receiving destination

UTF-8 canonical JSON, schema `receiz.bank.note-account-receiving-request.v1`,
maximum 16,384 bytes. Unknown or missing fields are refused. Exact fields:

| Field | Meaning and validation |
| --- | --- |
| `schema` | Exact application-envelope schema above; not a registered SDK custody profile. |
| `receiverUserId` | The native account UUID, bound as signed destination intent. |
| `receiverKeyId` | 64-character lowercase hex key identifier. |
| `receiverAlgorithm` | `Ed25519` or `P-256`. |
| `receiverPublicKeyRawB64u` | Public key encoded as unpadded base64url. |
| `receiverUsername` | Optional display name as string or null; never recipient authority. |
| `identityPortableStateDigest` | Digest of the carried signed account state; not a replacement for that source. |
| `nonce` | Fresh UUID destination-request identity. |
| `requestDigest` | `digestReceizAuthority('identity', schema, basis)` over the preceding basis fields. |
| `signatureB64Url` | Existing Identity Seal login-proof signature over base64url UTF-8 `schema:requestDigest`. |

The constructor verifies the complete carried signed identity state before
signing. A carried native `receiz.account.state.v3` must match the destination UUID.
A fresh SDK `receiz.device.identity.v1`, or the verified Bank-created empty v3
genesis with its matching local owner/key marker, carries a local device UID.
The already known native account UUID is then signed as routing intent, not
as an assertion of native membership. If this ID has never bound a native
account, its first receiving request reuses existing account access to discover
that destination; known destinations require no call. An empty startup queue
may reopen under that native UID, but foreign financial entries cannot be
rewritten, discarded or silently rebound. The reader verifies the exact shape, digest and
public-key signature. It does not transmit the Identity Seal, private key,
passphrase or recovery material. No network call or authenticator probe occurs.

The signature proves destination intent by that key, **not independent native
account membership**. Receiz verifies the actual recipient account/key binding
when admitting credit. Applications must preserve that distinction. Username
resolution alone must never become credit authority.

## 2. Sender retirement and complete terminal

The sender reopens its complete funded Note under the matching trust policy,
verifies the receiving request, checks bounded carrier capacity, and retains
its exact intent before consumption. It calls the existing
`prepareBankNoteRedemption` with `consumeExactHead`. Existing intent fields bind
`noteId`, `noteArtifactSha256`, `receiverUserId`, `receiverKeyId`,
`amountPhiMicro`, `amountUsdCents`, `acceptedAtKai`, and `nonce`.
Reserve uses `receiz.bank.note-redemption.v1`; Settlement uses
`receiz.bank.note-redemption.v2` with `rail: 'settlement'`.

The existing terminal schema and cryptographic requirements are unchanged.
Consumption binds the current qualified custody commitment, predecessor,
whole value, destination digest and successor basis. The terminal carries the
full funded source, attestation/consumption evidence, sealed history and
funding graph. Raw sealed terminal bytes are saved through `onSealedSource`
before subsequent packaging can fail. Resume restores those exact bytes or
resolves the original intent; it never repeats a different consumption.

New application PNG transport:

```json
{"schema":"receiz.bank.note-account-deposit-image.v1","terminalWire":"<existing lossless packed complete terminal>"}
```

It occupies exactly one `receiz.bank.offline-note.v1` PNG text chunk. Artwork
is presentation, not proof. The original qualified held-Note image transport
remains supported separately. The new account envelope does not alter its
payload or pretend to be a held qualified successor.

## 3. Offline admission and local deposit

`readBankNoteAccountDeposit` reopens the complete terminal with the existing
v129 verifier and funding closure. `openBankNoteAccountDeposit` additionally
requires exact receiver account UUID and key ID. A local-credit terminal is
refused by this path; it has its own qualified reconciliation requirements.
A screenshot, missing carrier chunk, unsealed JSON, wrong recipient, unknown
root or substituted funding source does not enter the received balance.

The accepted result exposes rail, Note identity, exact amounts, recipient,
redemption digest, terminal artifact digest and complete terminal source bytes.
It does not contain a confirmed wallet balance. A bounded in-memory admission
cache keys exact source SHA-256 **and** canonical sorted root policy; changed
bytes or roots cannot reuse an admission. Failed verification is evicted.
This avoids repeating the full funding/Groth16 graph for the same inspection
and retention operation. A fresh session reopens source; cached JSON is not
authority.

Encrypted state family: `received-note-deposits`, using the existing
identity-bound AES-GCM vault and compare-and-swap checkpoint. State:
`bank.received-note-deposits.v1`, `uid`, `keyId`, `entries`. Each Note entry holds
`sourceRef`, `redemptionDigest`, `terminalArtifactSha256`, status
`received|confirmed`, and a `creditRef` only after confirmation. Source blobs
are immutable exact bytes addressed by SHA-256. Corrupt, foreign or unreadable
state fails closed. No empty fallback clears a financial queue.

The current queue admits at most 64 Note entries and refuses additional entries
without discarding existing originals. Reimport of the same proof is
idempotent. A different terminal for the same Note is refused. Local receipt
survives application close/reopen when the encrypted vault remains intact;
browser storage deletion is not lossless custody recovery. Export and preserve
the original complete proof. Pending entries block ID removal/replacement under
the existing atomic guard; reimporting the same exact identity preserves the
wrapping key. Whole proof backups include received terminals and full confirmed
credit receipts, in addition to their individual exports.

## 4. Connected reconciliation before spending

Under the existing account execution lock and Notes lock:

1. Reopen the retained terminal and verify exact current identity binding.
2. For a fresh received original, durably record entry into submission and
   POST once through the existing delegated account transport to
   `/api/connect/offline-notes/redemption?origin=<origin>`. There is no preliminary
   status request. Its body contains `terminalArtifactBytes`: a lossless v2
   transport retaining every original signed artifact and funding source. The
   exact incoming container remains in the encrypted archive.
3. An interrupted, unknown or legacy attempt first GETs the same path with
   `&noteId=<id>`. Only a definite `found: false` permits resubmitting the same
   terminal. A lost or ambiguous response never authorizes a replacement intent.
4. Reopen returned `artifactBytes` and `privateCashSnapshot` with
   `verifyBankReserveCreditArtifact`, against the original terminal. Verify
   receiver account/key, redemption digest, rail and exact amounts.
5. Retain the full exported credit receipt and its private opening before
   marking the local entry confirmed. Publish durable partial progress even if
   a later deposit fails, so credited amounts leave Received Notes. Refresh/adopt the account through the
   existing observation path. Never add credit from a success flag alone.

The host's actual native writer checks account/key membership and once-only
credit; GET recovery is not a new credit authority. Concurrent identical
submissions resolve one native credit. The queue does not replace host
serialization. Failed reconciliation leaves the original pending and blocks
account execution rather than allowing a spend on guessed value.

There is no added polling. Retained incoming state opens after the admitted
account frame. An empty pending queue performs no proof-module load or credit request; already
confirmed entries do not reopen their proof graphs merely to render an account
or check a new payment. Their originals are reopened when explicitly inspected
or exported.
Pending deposits reconcile on connectivity or an explicit account execution;
concurrent work is coalesced. Full cryptographic admission and storage still
require computation: this is reduced redundant work, not a zero-time guarantee.

## 5. Bounds and independent inspection

Transport layers have distinct bounds: 8 MiB original PNG, 6 MiB native packed
wire, 4 MiB JSON request body at the current host, and 32 MiB expanded source
or complete archival credit receipt. Exporter and receipt reader share the
32 MiB bound. A locally inspectable source is not automatically small enough
for the current host request; oversized submission is refused while retaining
the complete original. Assess committable capacity before live issuance. Packing is lossless; namespace/funding/history bytes
must not be trimmed to fit. Refuse capacity before irreversible consumption
where feasible; retain completed source if later packaging fails.

`npm run receiver:inspect -- /path/to/original-note.png` inspects a complete
held Note or account-destination terminal with the pinned read-only verifier.
`inspectAccountNoteDeposit` and `inspectNoteDepositReceipt` expose the two
archival stages. They neither sign nor consume, submit credit, query current
custody, certify an account, or assert that a pending deposit has been applied.
The full source map and input manifest accompany the public receiver module.

## Qualification matrix

| Boundary | Required result | Current local evidence / outstanding scope |
| --- | --- | --- |
| Destination signature | Valid carried account state, bound signature; mutation refused; no private export | `tests/note-account-receiving.test.ts` uses actual v129 identity signatures. |
| Full incoming source | Correct terminal/receiver admitted offline; wrong key, missing roots, mutation refused | `tests/note-account-deposit.test.ts` uses complete synthetic funded terminal and actual compiled verifier. |
| Credit evidence | Complete correct native credit admitted; missing/substituted opening or JSON-only success refused | Same test file; no production roots or funds. |
| Local restart / duplicate | Exact original survives reopen, imports once, no account credit claim | `tests/note-received-deposits.test.ts`; memory CAS isolates storage choreography. Existing vault tests cover encrypted persistence. |
| Interrupted reconciliation | Original remains pending; same-source retry; wrong amount cannot confirm | Same queue tests. Actual deployed lost-response recovery remains to qualify. |
| Actual native writer | Sender-qualified terminal credits receiver without receiver custody; concurrent identical submission credits once | Isolated native writer fixture generator below. Synthetic accounts, roots and authenticators only. |
| Account presentation | Received amount visible separately; confirmed entry not counted twice | `tests/account-received-notes.test.tsx`; account entry and execution regressions also required. |
| Physical custody | Rollback, clone, backup, origin, interruption, exact-head and recovery tests on assessed hardware | **Outstanding.** The user-reported iPhone diagnostic refused; synthetic providers do not fill this gate. |
| Deployed operation | Actual funded account → Note → recipient receipt → verified credit, duplicate/recovery and conservation | **Outstanding.** No live funds moved during this work. |
| Nonconforming creation | Admitted connected issuance and complete consumption evidence, conserved account debit and exact recovery | **Missing SDK/host integration**, not supplied by the receiver composition. |
| Public asset issuance | Sealed asset appears on owner's public Showcase and discovery projection with original source | **Separate outstanding connection.** A private local seal is not public publication. |

The synthetic full-source fixtures are in
[`tests/fixtures/note-account-deposit/`](../tests/fixtures/note-account-deposit/README.md).
The generator uses the actual Receiz native writer at recorded source revision;
its public synthetic roots are deliberately separate from production roots.
Keep real-device/host evidence separately, redact private account openings and
retain source/build hashes. Public conformance results must name unassessed
rows rather than displaying a universal pass.
