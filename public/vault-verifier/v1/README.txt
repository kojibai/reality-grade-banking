Vault original reader — read-only, offline

Open verify.html in a browser. Its canonical artifact verifier, owned-Original
and Note readers and pinned issuer material are included. Reading a complete
private Vault or unprotected recovery Original needs no login or Bankeiz server.
The file carries the exact sources; they are not fetched or reconstructed.
For a verified private container, choose Save Note or Save Original to recover
each exact carried file. Those downloads are private. No account or financial
operation is performed, and already-opened sources are not reopened per click.

For machine-readable CLI output (Node.js with WebCrypto):
  node verify.mjs /path/to/private-vault.private.png
  node verify.mjs /path/to/vault.recovery.private.png
  node verify.mjs /path/to/legacy-shared-proof.public.png

Explicit private-file extraction:
  node verify.mjs /path/to/vault.recovery.private.png --extract /private/recovery
The reader first admits the complete file, then writes exact carried sources
under digest-based filenames with private permissions. It never overwrites an
existing output. Default CLI output remains the safe inspection record only.

Exit 0: carried evidence verified. Exit 1: rejected. Exit 2: usage error or a
protected private original whose contents require its original passkey.

New private Vaults are proof containers, not additional accounts. Their exact
funded Note images carry their own scoped Note authority. Owned Originals keep
their existing ownership and continuity. The reader verifies those sources and
reports recorded Note value; it creates no credit and proves no current
unspentness. It grants no access, signs nothing and makes no network requests.

PRIVATE ORIGINALS MAY CARRY PER-NOTE AUTHORITY. Keep them private. Inspection
output excludes private keys, phrases and source bytes. Existing shared public
proofs remain separate read-only evidence and are not private recovery files.

Passkey-protected files cannot be decrypted by the file alone. Use the original
PRF-compatible passkey at its registered relying-party origin. The Vault's
explicit Save recovery original action creates a separate unprotected private
Original for independent recovery without that origin. Keep it separately and
privately; primary-file encryption is not changed. A protected original is
reported as unopened, not as contents-verified.

The existing account-custody Vault and public-proof readers remain included for
historical originals. Their accepted custody and financial checks are unchanged.

Rebuild: npm ci && node scripts/build-vault-inspector.mjs
The build manifest records exact included inputs and output digests; the source
map contains corresponding preferred sources, with adjacent license notices.
