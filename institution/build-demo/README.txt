SYNTHETIC RECEIVING DEMONSTRATION — RECEIZ SDK 129.0.0

These two existing synthetic PNG fixtures use an ephemeral test issuer root.
No account private keys, actual funds or production credit are supplied.

The demo build alone aliases its SDK artifact verifier to the actual canonical
verifier with this fixed test root. Existing production roots, SDK behavior and
financial application helpers are unchanged. Exact fixture SHA-256s restrict
the sole exported inspection function; runtime callers cannot select roots.

The unchanged openConnectedNoteDelivery checks the enclosing canonical PNG,
complete native funding Source and its exact carried delivery authority. The
authentic fixture passes. The wrong-authority fixture has the same valid funding
Source but fails BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH.

This is synthetic Source integrity and delivery-authority inspection only.
It does not establish current custody/head, live spendability, exclusive
allocation, receiving qualification, a committed transfer or account credit.
No receiver identity, signature, custody transition or financial write runs.

The page loads verify.mjs only for an explicit Verify intent. Its worker fetches
only the two fixed adjacent local fixtures and returns public inspection fields.
No Note identity/private key or execution handle is returned to the page.

Rebuild: npm ci && node scripts/build-build-demo.mjs
Preferred entry and fixture policy: institution/build-demo/
Complete corresponding sources: verifier.mjs.map and verifier.mjs.map.bin
Exact input/output inventory: build.json
Licenses and notices are adjacent; the source archive includes this source and
the existing native/SDK implementations used by the builder.
