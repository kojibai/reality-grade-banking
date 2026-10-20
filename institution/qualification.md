# Receiver qualification and release evidence

Run `npm run receiver:check`, `npm test`, `npm run typecheck`, and `npm run build`. The first command provides local package/provenance, temporal and negative-input evidence. These checks do not assess an institution or perform a payment.

For every proposed live capability, record the receiver identity/application, exact build and source hashes, pinned roots/registry, rail, supported environment and assessor. Retain private evidence in protected custody; publish only safe digests and scope summaries with consent.

| Exercise | Required evidence |
| --- | --- |
| Valid incoming proof | Full admitted positive source under canonical production trust, opened independently by sender and receiver |
| Unqualified input | Refusal of artwork, unsigned JSON, missing parents, changed amount/rail, invalid root, unsupported schema and exceeded limits |
| Recipient binding | Exact receiver/audience/current-head match; refusal for another account, origin or device |
| Holding | Restart and canonical source reopening with preserved ownership/history; protected key and hardware custody evidence |
| Transfer | Real qualified sender/receiver inspection and atomic committed source transitions; independent onward receipt |
| Reserve Note funding | Actual funded backing allocated once and excluded from other spend paths |
| Note handoff | Real supported device receiving request, holder approval, updated original PNG and receiving custody match |
| Redemption | Exact note terminal consumption and original dollar denomination credited once to the right Reserve account |
| Replays and concurrency | Duplicate and competing requests produce one canonical outcome; stale heads and copied images cannot credit |
| Lost responses | Exact-intent recovery at every irreversible boundary; no replacement operation or duplicate allocation/credit |
| Preservation | Original PNG/proof survives export/import; unknown namespaces and exact source bytes survive sync |
| Public status | Assessment scope and requirement failures visible; unknown capability is not labeled conforming |

Synthetic custom-root sources may test diagnostic mechanics, but must be visibly isolated and must never qualify production funds. Do not create a fictitious positive “sealed note” from an unsigned fixture merely to get a green test. The checked-in unissued artwork samples are deliberately rejected as financial authority.

The Bank host's financial and hardware release gates are in [offline-notes-release.md](../docs/offline-notes-release.md). Qualified actual funding and transition storage, the protected signer context and a user-operated real-device funded round trip remain separate operational prerequisites. A passing build or a code deployment does not complete them.

Settlement Note financial support additionally requires the [native signed-rail extension](../docs/settlement-note-contract.md). Do not generalize Reserve qualification to Settlement. Generic digital transfer integration must supply a qualified actual transition store and source/signing workflow before claiming the SDK example is a production receiver.

## Note continuity implementation assessment

The [Note continuity standard](../docs/note-continuity-standard.md) and
[account-destination implementation contract](../docs/note-account-deposit-v129.md)
define the application-specific boundaries in addition to this receiving
profile. Use the [assessment record template](note-qualification-report.template.json)
to name the exact source/build/resources, trust policy, device/API path,
capacity and evidence for each applicable requirement.

The template is an unassessed report, not an SDK schema or certificate. Its
status fields grant no authority. Replace nulls with inspected evidence;
identify synthetic tests, non-applicable requirements with justification,
failed cases and unassessed production operations explicitly. Do not attach
private keys, tokens, private account openings or unredacted customer proofs
to a public report. Retain those original sources under appropriate custody
for authorized independent assessment.
