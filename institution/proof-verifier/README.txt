INDEPENDENT OFFLINE INSPECTION — RECEIZ SDK 129.0.0

This archive is evidence, not permission to move value.

1. Unzip and open verify.html in a browser with WebCrypto support (Safari,
   Firefox or Chromium). It works from a local file and refuses network access.
   Choose original.receiz, paste the expected SHA-256 from record.json, and
   select Inspect locally. Compare the digest against an independently held
   original or trusted record. A digest supplied by this same archive cannot
   independently establish which record you intended to inspect.

2. Alternatively, with Node.js 22 or later already installed:
     node verify.mjs original.receiz EXPECTED_SHA256
   No npm install, Receiz login, server, API key or connection is needed.
   Any canonical verification failure or selected-digest mismatch exits 1.

3. If no sealed original was supplied, inspect the exact carried Wallet capsule:
     node verify.mjs record.json
   This checks its SHA-256 hashes over canonical JCS JSON. It does not establish
   authenticity, a Groth16 proof, spendability, or an enclosing sealed original.
   Missing originals are not reconstructed from hashes or newly resealed.

CONTENTS
record.json: selected Ledger/History projection and value operands. The projection
  is context, not signature authority. Private account contents stay in your
  local download and are not added to shared receipt URLs.
original.receiz (when available): exact sealed original bytes, unchanged.
proof-inspection.json (when available): complete canonical verification output,
  carried proof bundle, signatures, certificates, continuity/anchor/package data,
  decoded Groth16 proof and public signals, payload digest and verification keys.
verification-material.json: pinned document-seal and KaiSigil Groth16 verification
  keys and signature trust roots. Keys are suite-specific, not interchangeable.
verifier.js: self-contained read-only canonical verifier and dependencies.
verifier.js.map: complete embedded corresponding sources for auditing/rebuilding.
verify.mjs / verify.html: local entry points. CLI disables fetch; HTML CSP forbids
  network connections. No network lookup is part of verification.
LICENSE.txt / NOTICE.txt / third-party notices: distribution terms and attribution.
hashes.json: SHA-256/size inventory of every other file, for copy integrity only.

The canonical verifier checks enclosing artifact integrity, payload binding,
Groth16, signatures under pinned roots and carried continuity according to its
supported suite. Read its full warnings, continuity assessment and proof fields.
A valid proof does not imply every application claim is true. Missing historical
sources remain missing. It does not prove current ownership, latest global state,
account balances or current spendability, and never authorizes execution.

TRUST AND MATH
The root public keys are explicit trust anchors, not a claim of trustlessness.
Document-seal Groth16 uses BN128, receiz.g16.real.v1. Its canonical g16:base64url
packet carries pi_a, pi_b, pi_c and publicSignals. The first two public signals
must equal the decimal value of zkPoseidonHash. groth16ProofDigest is SHA-256
of the exact serialized g16 string. Other signature/payload/continuity bindings
are checked by the included unchanged v129 canonical implementation.
Zero-knowledge private witnesses and signing keys are not required for verification.

Rebuild instructions and exact input hashes are in build.json. The complete
application source is also published under /source/ in the originating build.
Once downloaded, all required verification runtime and public keys are here.
