Vault original reader — read-only, offline

Open verify.html in a browser. Its canonical artifact verifier, native custody,
money, ownership and Market source readers and pinned issuer material are
included in the file. No login, server or installation is required for reading.

For machine-readable CLI output (Node.js with WebCrypto):
  node verify.mjs /path/to/shared-proof.public.png
  node verify.mjs /path/to/shared-proof.json
  node verify.mjs /path/to/private-vault.private.png

Exit 0: carried evidence verified. Exit 1: rejected. Exit 2: usage error or a
protected private original whose contents require its original passkey.

A verified prepared original does not establish a funded native account.
Recorded originals do not prove present unspentness. Writing/receiving value
still requires the existing native source, custody, consent and once-only rules.
This reader grants no access, signs nothing and makes no network requests.

PRIVATE ORIGINALS MAY CONTAIN VAULT ACCESS AUTHORITY. Keep them private. The
inspection output excludes their private keys, phrases and carrier bytes. Shared
public evidence contains only selected native public witnesses, not authority.

Protected private files cannot be decrypted by the file alone. Use the original
PRF-compatible passkey at its registered relying-party origin, then admit the
decrypted source with the same source reader. Recovery depends on that passkey
provider and retaining the complete original; an Identity Record cannot replace
either. Browser and real-device recovery support must be checked on the device.

Rebuild: npm ci && node scripts/build-vault-inspector.mjs
The build manifest records exact included inputs and output digests; the source
archive includes the corresponding preferred sources and their license notices.
