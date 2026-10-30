# Bankeiz account entry is frozen

Normal Enter creates and opens the local account and its self-contained Identity Record without asking for a passphrase. Existing-account entry, restore, recovery and custody remain intact. Presentation work must not change this path.

The exact working fresh-creation baseline is preserved in `tests/fixtures/account-entry-frozen.ts.txt`, copied from commit `90e73f1a1378113f01c5399d761cc9dbdfc401cb` immediately before regression `4a036ba8bfccbd96c1351533064989930b9e290e`.

That naming commit added `createdAt` and `displayName` to the SDK onboarding call. The installed v129 `createReceizOfflineSealer().createIdentity` accepts **only** `{passphrase}`. Its internal guard rejected the extra fields with `offline_identity_private_passphrase_required` even though the internal secret was present. This was a Bankeiz call-contract regression, not a user passphrase requirement or a Receiz SDK failure.

The secret used by the existing encrypted bootstrap remains internal. The user-held Identity Record remains in its supported no-phrase form, re-admitted with the same identity and held durably before entry completes. Do not weaken that protection, change entry to ask for a passphrase, erase an existing identity, or change the SDK to accept unrelated display fields.

Display names belong to the existing shared projection over original account coordinates. They must not change the sealer's input or recapture account creation time.

## Required release gates

- Every `npm run build` first runs `scripts/check-account-entry.mjs`, comparing the actual fresh-creation function to the working frozen baseline. Unexpected inputs, waits or changes to the phrase-free output stop the build immediately.
- `npm run test:account-entry-freeze` exercises the real installed SDK input validator through the complete Bankeiz creation choreography, concurrent entry, saved identity reuse, recovery/custody preservation and the signed empty account genesis.
- The ordinary complete test suite includes those same tests.

The creation fixture and tests must not be changed to ratify a regression. A future intentional entry change requires an explicit user request, preservation of the complete identity primitive and passing real SDK plus visible end-to-end evidence. Unrelated name, media, profile, Feed, Discover or presentation work does not authorize it.
