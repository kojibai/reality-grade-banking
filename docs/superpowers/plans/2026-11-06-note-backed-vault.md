# Note-backed Vault implementation plan

**Goal:** A Vault holds existing funded Notes and exact Original proofs, optionally protected by PBI. It does not create another account.

**Architecture:** Reuse the existing funded Notes, canonical proof library, private PNG carrier, durable local CAS store and passkey encryption. Keep older admitted Vaults readable; new Vault creation never enters hosted child-account provisioning. The Vault stores proofs; its container metadata establishes no new money or title.

**Constraints:** SDK/MCP/AI remain pinned at 129.0.0. Frozen account entry, existing identities, independent proof admission, exact funding, once-only consumption and foreign work remain intact. Local creation/open/export have no Source calls. Adding money invokes the existing Note operation only for the new funded Note. Existing history is carried by reference in the unlocked lifetime.

1. Add source admission using the existing proof-backup format and exact Note PNGs. Test owner mismatch, modified bytes, duplicate Note identity, real Note inspection and repeated append reuse.
2. Add the local manager. Test empty creation, append genuine funded Note, save/reopen, optional PBI, independent recovery and no calls during open/export. No child account, child signer, funding journal or custody permission.
3. Reuse the existing private PNG export with an explicit Note-Vault routing marker. Keep legacy images readable, reject ambiguous formats and failed canonical seals.
4. Reuse the existing Notes interface for funding, and the held canonical sealer for Vault export. Keep account entry unchanged. Add a minimal UI for storing funded Notes and exact Originals, saving, reopening and recovering individual originals. Vault storage introduces no financial transition.
5. Align Vault explanations with this model; keep older financial Vault reader compatibility explicit in code. Run focused tests, account-entry freeze, typecheck, full tests/build and desktop/mobile browser qualification. Report local, committed and live states separately.

**Review focus:** an interrupted Note request remains with the existing Notes controller, not a second Vault journal; a container cannot turn owned assets into cash or alter title; importing private Account/Identity material is refused; closing or changing identities must cancel the unlocked lifetime. A saved Vault and its carried originals must be extractable through the standalone offline reader. PBI-protected storage has an explicitly approved private recovery-original option.
