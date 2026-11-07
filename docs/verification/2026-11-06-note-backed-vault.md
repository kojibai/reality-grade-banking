# Note-backed Vault verification

## Implemented scope

New Vaults are private portable containers for exact completed funded Notes and already-owned Originals. They reuse the installed v129 Note delivery, canonical proof library, private PNG seal, encrypted local store and WebAuthn PRF protection. A new Vault creates no child account, funding journal or new financial transition. Existing saved Vaults retain their original reader and guards through the explicit compatibility entry.

The UI reuses the existing Notes creation/recovery interface. A failed container save preserves the already-completed Note in Notes; retrying its retention does not issue another Note. Saved Note selection uses the existing complete export, including its scoped per-Note authority. Account signing keys and account Identity Records are excluded from the container.

## Recovery and authority

A private image carries exact sources, not lookup references or thumbnails. The current image must be saved after additions. Individual Notes and Originals can be exported unchanged from the app or the independent offline reader. The browser reader is a single self-contained HTML file; the CLI kit also provides explicit `--extract` with private output files and no overwriting. Inspection output omits private keys and source bytes.

The primary file can be encrypted with the existing PRF passkey. Its registered origin and compatible credential remain necessary for that protected file. An explicitly approved unprotected recovery original carries the same sources and opens independently without Bankeiz, a login or that passkey origin. It does not remove protection from the primary. A different saved recovery copy never overwrites the current protected local carrier.

Source amounts remain recorded Note evidence, not a new live unspent balance. Recovery preserves existing funding, authority, consumption, conflict and ownership rules. No installed SDK guard or frozen account-entry fixture was changed. SDK, MCP and AI package versions remain unchanged.

## Executed checks

- Real SDK/native fixture tests exercise complete funded Note delivery, canonical owned Originals, outer Vault sealing, independent reopening and exact-byte extraction with network access forbidden. Tampering, foreign owner bindings and substituted Note authority are rejected.
- Manager tests cover unchanged admission reuse, duplicate append refusal, atomic save conflicts, pending export versus a later append, pagehide/reopening, late operations after closure and distinct recovery copies.
- The integrated Main account-entry freeze passed all 63 checks. Focused Main Vault, Notes and identity verification passed 73 checks.
- `node scripts/check-note-vault-ui-browser.mjs` exercises the actual production components, manager and storage at 390 × 844 and 1440 × 1000. Its Note/sealer display ports are explicitly synthetic. It performs no funding and is not proof of production financial execution. The protected case uses an actual virtual WebAuthn PRF authenticator and AES-GCM, and both cases save, lock and reopen the file with no overflow, page errors or external requests.
- `npm run test:vault-browser` separately qualifies real PRF/encryption, local durable storage, owner isolation and stale-write rejection, with zero financial actions.

Release commands: `npm test`, `npm run build`, `npm run test:account-entry-freeze`. The full build also verifies the offline reader, source archive, public pages and held static entry. Existing conditional skips are not altered by this change.

## Preservation and deployment boundary

The owned patch is qualified separately from concurrent Ownership/PWA work. Only the owned Vault additions are staged in shared identity composition and generated examples; other working changes are preserved. No Receiz SDK or server repository changes, production provisioning, real funds movement or production Vault execution were performed for this patch. A local check or commit does not establish deployment or live verification.
