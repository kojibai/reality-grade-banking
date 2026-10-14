# Native signer repair — root and contexts applied

On 2026-10-13 at 22:14 local, after explicit protected-root approval and the user's instruction to apply without changing Receiz code, the exact repair process staged the existing matching root and four signing contexts. It preserved other keyring entries and the existing environment targets. The unchanged signer commit `0912baa6383ba9bb013dab185a50a44901c3d188` was redeployed as `dpl_Fq27sHjpJR4f6sGMH9MA87LY3tuA`; Vercel reported READY and assigned `sign.receiz.com`. The public endpoint now exposes one active Ed25519 root, independently matching the unchanged SDK 129 public root. No Receiz or signer source files changed.

The actual bank UI refreshed the same previously approved native access and still received HTTP 503. A protected configuration comparison found that Receiz has `RECEIZ_SIGNING_V4_REMOTE_SIGN_BEARER_TOKEN`, while the exact deployed signer parser recognizes **zero usable tokens**. A nonfinancial zero-digest transport health request using that existing credential also received HTTP 503. No token or private root value was logged or saved. This narrows another real blocker; it does not prove that no other service dependency is missing.

The additional accepted-token repair was prepared separately in `native-signer-bearer-plan.json` and subsequently approved and applied as recorded below. It reuses the existing credential, preserves entries and targets, and redeploys the same unchanged signer source. It does not rotate credentials or change the keyring, contexts or financial state. The root/context repair must not be rerun as an authentication repair.

## Authentication repair applied

The user subsequently approved the existing-bearer repair. At 22:31 local the protected process updated the existing encrypted accepted-token list, preserving its production/preview/development targets and previous entries/representation. The exact same signer commit was redeployed as `dpl_EePsS2jYzHLksZgH7gWxNch11zD1` and reached READY. Protected comparison now finds one usable accepted token matching Receiz's existing bearer. A nonfinancial zero-digest health request received HTTP 200 and its exact bytes were independently verified against the unchanged v129 root. The earlier pending-approval statement describes the preceding stage.

The real bank's aggregate qualification still returns 503. Optional local read-only family diagnostics isolated `source-publication` returning 503 while the other six families returned HTTP 200. These HTTP observations are not operational-capability admissions and cannot activate bank transactions. The local diagnostic flag is now disabled.

The inspected CLI deployment's native source was retrieved through the provider's exact file UID and independently hashed. Its SHA-256 `695efa41dc83b872d169036f1a11da66581717389cc792af57a94fa88fb1197c` matches the inspected v129 source. That source builds ready publication and replay dependency heads in an order rejected by its exact head validator. Actual producer/consumer regression tests reproduced both failures. The separately approved one-line fix reuses its existing `sortedHeads` function in isolated branch `fix/native-qualification-head-order`, based on `ad836e9c7f97057a1dd8bc72b2c9c6824fbe185c`. That parent is the separately deployed current production Git commit. The fix is in unmerged draft PR #238 and a current-base review preview; it has not been deployed to production. See [native-qualification-host-fix-review.md](native-qualification-host-fix-review.md) for exact commits, preview and incomplete release evidence. No SDK/MCP/AI Skills version, registry, root, account entry, financial rule or source verification rule changed.

The bank's approved native grant succeeds. The real qualification call still returns HTTP 503 / SERVICE_CAPACITY_UNAVAILABLE. Latest public correlation: `iad1::iad1::l96tq-1791941048745-e6ef93c2cb23`; targeted provider logs returned no records.

Read-only production configuration confirms that Receiz uses `https://sign.receiz.com/api/signer/v1/receiz/sign`, with mode `auto` and root ID `receiz.v4.prod.2026-03-02`. The signer has a configured keyring variable, but its documented public endpoint returned **keyCount 0 / keys []** at 2026-10-14T01:33:52.165Z. Its allowed-context variable is absent. The deployed handler at commit `0912baa6383ba9bb013dab185a50a44901c3d188` defaults to governance-only context and cannot sign a native transport binding under that default.

This is a concrete remote-signing blocker. The exact reason the existing main-app local fallback did not rescue the request remains unobserved; no private key has been read to infer it. The repair must stop if the existing source key does not match the unchanged SDK root.

## Exact proposed action

- Read the existing canonical root from the Receiz production variable `RECEIZ_SIGNING_V3_PRIVATE_KEY_PKCS8_B64U` into one protected, short-lived local process using the already-authenticated provider connection.
- Derive its public key and require the exact SDK 129/server pin. Generate no key and change no pin, registry, grant, identity or financial state.
- Restore that same root in the existing encrypted `RECEIZ_SIGNER_SERVICE_KEYS_JSON`. Preserve other entries and preserve an unusable old representation in that same encrypted setting. Refuse conflicting or retired roots. The existing variable is shared by production, preview and development; its target scope is preserved.
- Add the four exact SDK contexts in production: V4 bundle, V4 device certificate, native transport binding and native authority-session recovery custody. Preserve the existing governance/default context and any configured contexts.
- Redeploy the existing signer source at the exact existing commit. Do not deploy the dirty local signer checkout. Then independently verify its public root and the bank's genuine SDK qualification response.

The private value would travel from the Receiz project through the short-lived protected process back into the signer project's encrypted configuration within the same Vercel account. It would never enter chat, logs, command arguments or local files. This gives the existing signer app access to the canonical root and therefore requires explicit root-custody approval, separate from bank-ID consent.

Reviewable public coordinates: [native-signer-repair-plan.json](native-signer-repair-plan.json). Read-only plan command: `node scripts/native-signer-repair.mjs`. Exact public confirmation digest: `142740254c8ae78799f9542437b3e9c3f8beadc9d5d8b7b6f2100bd6eef18849`.

## Checks and remaining scope

Controlled configuration tests cover matching-key reuse, foreign-key refusal, retirement/conflict/duplicate refusal, malformed intended entries, legacy encoding and preservation of other entries/contexts. An exact copy of the deployed handler reproduces default native-context refusal and independently verifies signatures with a generated test-only key after preparation. These are configuration mechanics tests, not live root/financial evidence.

The root/context repair was applied through the approved protected process. Source and target private values existed only in that short-lived process and encrypted provider configuration. No financial operation or custody issuance occurred. Even successful qualification will not supply the bank's custodian policy, asset sources, funded offers or missing native bank adapter; those still require their own full source/atomic execution implementation and verification.
