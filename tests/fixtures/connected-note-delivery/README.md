# Synthetic direct-delivery Note originals

Generated from Receiz commit `5358975b99fcee8a3ca511e5d30c438fdb085f61`
with the existing `bankNativeWalletFixture`, native connected Note writer,
`settlementNotes/note-delivery.ts` and canonical document sealer. Network was
disabled, backing was simulated, and the temporary native ledger was removed.

The complete sealed PNG carries its existing scoped Note private authority.
It contains no account Identity Seal, account private key or private account
opening. `note-authority.json.gz` is that same synthetic per-Note authority,
included to exercise packaging and mismatch rejection. Metadata records the
ephemeral public roots and exact uncompressed file hashes. Tests generate
separate SDK receiver identities in memory; no receiver private key is saved.

These originals qualify direct PNG import, native receiver/handover/claim
signatures and exact recovery. They do not qualify production funding or
protected physical custody. Once-only accepted credit is independently
exercised by Receiz `walletNoteDelivery.test.ts` against the actual writer.
