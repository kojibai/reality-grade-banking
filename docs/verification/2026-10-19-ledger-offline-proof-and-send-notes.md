# Ledger offline evidence, Receive ID and public Send notes

The shared Ledger/History/receipt inspector keeps cryptographic depth collapsed.
Opening the public original verifies the exact SHA-256-bound bytes through the
unchanged v129 canonical read-only verifier and pinned roots. It displays the full
carried proof bundle, Groth16 proof and public signals, Poseidon commitment,
proof digest, signature/certificate, anchors and continuity assessment. No
projection JSON or transported verdict is used as verification authority.

A public original was independently downloaded and verified: SHA-256
`7396aafeddf8b9d6e54eb40400245a8403ac915b318f1481a7eb2aadf42cb4f8`.
The result carried Groth16 `receiz.g16.real.v1`, two public signals, valid artifact
integrity and verified carried continuity with no warnings. The actual browser
inspector verified and locally retained it, then downloaded a complete ZIP.
The ZIP's own Node CLI reverified its exact original while fetch was disabled.
The standalone browser verifier also verified that original under its restrictive
CSP with network connections forbidden. Browser file-URL navigation was unavailable
in the testing environment; the same self-contained HTML was tested via the local
app's public resource URL. The downloaded Node check used only local files.

The ZIP contains the exact original, full inspection output, selected record,
document-seal and KaiSigil public verification keys, signature trust roots,
self-contained verifier, complete embedded corresponding source, local HTML and
Node entry points, license/notices and SHA-256 file inventory. Originals are
retained in a separate bounded public-only IndexedDB cache and reverified on
reopen. A storage failure is shown and does not discard the download path.

Wallet v1 rows carry a JCS/SHA-256 capsule rather than a complete signed Groth16
original. All capsule fields, including hashed hints and verifier coordinates,
survive selected projection/cache/receipt transport. Offline inspection labels
capsule hash consistency separately from authenticity and records missing original
material in the evidence ZIP. No proof is invented, resealed or upgraded from a
hash reference. Private signing material is neither needed nor exported.

Receive prefers the current username, then the original public username, and
shows `username.receiz.id` instead of the Wallet UUID. Copy/share and no-amount QR
carry that ID. The scanner accepts bare usernames and Receiz IDs; old bank URL
requests remain compatible. Amount requests and NFC use the bank payment URL.
Safari's manual NFC help exposes that URL separately and handles incomplete
amount entry without throwing. The real Wallet resolves the selected username
before any transfer.

Optional Send notes use Wallet's existing 280-character normalized note. Approval,
saved request and recovered transfer/message/original must agree on the note and
its explicit public marker. The field tells the sender it appears in the public
Ledger. Receiz publishes only explicitly marked notes; historical private notes
stay private. One funding source displays alone. Only a composite payment shows
both component amounts, never two available account balances.

The Receiz update adds a public-note capability to quotes and a distinct guarded
public-note POST route that delegates to the same atomic Wallet writer. Bank
refuses preparation without capability support. If deployment changes afterward,
an old service returns 404/405 before submission; the saved result is not-sent.
It never falls back to the older private-note endpoint or retries a transfer.
Both Bank and Receiz commits must be pushed for public notes. No new production
migration or real transfer was performed for these changes.

Verification includes full Bank tests, typechecking, production/offline/source
checks, actual browser Receive/invalid-amount behavior, actual proof ZIP download,
positive original verification, wrong-digest refusal, forged JSON refusal and
capsule-tamper refusal. Receiz synthetic tests exercise the guarded endpoint's
receipt/original metadata, public/private note policy, Wallet quote/recovery and
transaction source lanes. Antirollback, saved Note custody and native modules
are unchanged.
