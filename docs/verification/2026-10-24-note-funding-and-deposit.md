# Note funding and deposit continuity

Created and deposited Notes use the funding context delivered in the existing Ledger response. The selected creation debit, Note and deposit credit retain their exact references to the originating funding history. My history, Public and the standalone receipt use the same context reader. Opening a receipt, expanding funding history or switching Ledger categories must not request the graph again.

The receipt regression exercises creation and deposit from both views, serializes the shareable compact link, opens the actual receipt component and inspects the funding section. Every case retains the originating proof-object reference and funding original digest with zero fetches. A shared display receipt is a projection of recorded evidence; it does not grant identity, Note custody or spending authority.

The application can display only references that the accepted originals retained. It must not infer historical proof-object membership from a current profile. Missing ancestors remain an explicit evidence boundary. Note receipts now use a bounded lossless compressed fragment, retaining the complete carried graph without a server lookup or HTTP query-length dependency. Expansion is limited to 512 KiB and the encoded packet to 32,000 characters. Larger unsupported packets retain explicit continuation references rather than claiming omitted ancestry is complete. The in-app receipt also keeps the already held complete record by reference.

## Removing repeated work

- A runtime admits an immutable funding source once per exact source digest for inventory display. A newly opened runtime admits it again. Financial issue, handover and credit keep their native source checks.
- Independent preparation originals are retained together, and both must finish before funding can start. Accepted source and private opening are likewise independently retained before the checkpoint advances.
- Receiving a source reuses its completed admission after verifying the exact durable bytes. It does not repeat the complete graph admission just to construct the received display. Corrupt or substituted retained bytes are refused before the checkpoint is saved.
- Depositing a Note held by this account retains the existing native handover directly. It does not render, seal and reopen a second transfer image merely to feed that handover back into the same account's deposit queue. The native claim and credit are unchanged; retries reopen the exact retained handover.
- Completed self-deposit custody is released only after the complete native credit receipt has been admitted and durably retained against the exact terminal, receiver, Note and amount. A local confirmed marker alone cannot release it. The saved funding image remains an archived original and is never described as a new transferable handover.

The initial local regressions observed four funding inspections across creation and two inventory reads; the repaired runtime performs one. Received-source admission fell from two to one within the same queue lifetime, while reopening the queue still performs a new admission. These are counted operations, not a measured explanation of the reported minute-long production deposit.

Verification is local and synthetic. No real Note was created, deposited or transferred by these checks. Full financial source validation and exact native credit evidence remain required before reporting confirmation.

The checkpoint full suite passed **2,781 tests across 446 files, zero skipped**, including the actual native terminal/credit fixture and receipt rendering checks. An independent review caught and corrected claim-digest versus handover-digest confusion, an unreleased custody marker and misleading archived-image presentation before this checkpoint. A local PNG-versus-raw admission microbenchmark excludes service time and is not a production end-to-end latency measurement.

A subsequent read-only live response check found the earlier 8 KiB context compaction reduced a large Note's 166 carried steps to 11 in a standalone link. The lossless transport regression preserves all 180 synthetic ancestors for creation and deposit, refuses oversized expanded packets before allocating output, and keeps legacy links supported. Actual live creation/deposit links now preserve all 166 carried steps and 19 object references with zero fetches; smaller live Notes preserve their four steps and original object reference. This does not manufacture any ancestor missing from the original response.
