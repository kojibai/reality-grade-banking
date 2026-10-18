# Bankeiz origin activation

The Bank's public origin is `https://bankeiz.com`. New QR and NFC payment requests use that origin. Existing requests at `https://bank.receiz.com` remain readable. Canonical, social, sitemap and public guide URLs use Bankeiz. Financial sources, client IDs, signed object coordinates and custody namespaces are preserved.

## Committed host change

Receiz main commit `67d446183` adds Bankeiz to the existing checkout-only framing policy and binds Bankeiz note ceremonies to the `bankeiz.com` WebAuthn RP. The original `bank.receiz.com` / `receiz.com` realm and existing localhost realms remain supported. Ordinary Receiz routes keep their framing restrictions.

The note service still requires the existing active public client, a registered callback at the exact origin, the account's scoped grant and native custody verification. The origin change grants no financial authority. A credential held under `receiz.com` cannot silently become a Bankeiz credential.

The included native browser source matches that committed change. Its application patch and complete output/input hashes are in `native/manifest.json` and `public/native/offline-notes.v129.manifest.json`. The read-only receiver verifier, published SDK outputs and all package versions remain unchanged at v129.

Host checks: 50 scoped Bank tests, 37 frozen account-entry tests, proxy-header checks and all three governance checks passed. The focused 23-test origin/recovery suite passed again after tightening exact map lookup. Production code and the other changed tests pass lint. The existing `bankBrowserRecovery.test.ts` fixture has six pre-existing `no-explicit-any` lint errors, reproduced against its committed predecessor. No full Receiz build or production deployment is claimed by these scoped checks.

## Registration and live activation

On October 17 the owner created public Bankeiz client `rc_2d1wcGkAYfmCi5kGT3J89gkl`, with token authentication `none` and the exact callback `https://bankeiz.com/auth/receiz/callback`. The signed-in Connect register was inspected in Chrome. The registration's allowed scopes and the app's narrower requested scopes are recorded in `native-bank-registration.json`. The old `bank.receiz.com` client remains intact. The earlier in-place callback proposal is superseded.

Bankeiz uses the new public ID for fresh grants and operations. It needs no client secret or MCP bearer token in browser code, build settings or the repository. Public-client PKCE remains enforced by Receiz. Native proof-authority grants still require the original identity proof and exact signed consent; client registration alone authorizes no value movement.

Receiz's note realm check now admits the new client only at `https://bankeiz.com`, and still requires its active registration and a callback at that origin. Legacy client realm behavior is preserved. The existing durable device namespace is retained so encrypted notes, pending payment tickets, original execution checkpoints, history and archived proofs remain readable. Historical recovery uses its original audience; new execution cannot reuse a prior-client plan. The native host selects the previous client runtime only for exact payment recovery, previously consented public proof reads, sharing-status inspection and signed live-update revocation. It refuses fresh previous-client payments, private proof production and new publication. The existing public-sharing controls report either registration’s live disclosure and turn off both with their separate exact signed commands. A pending prior-client authority-session request stays held and cannot be resubmitted under the new client.

Push and deploy both main commits for the code change to become live. If native payments/account-proof startup is configured, update the existing Receiz host setting `RECEIZ_BANK_APPLICATION_ID` to `rc_2d1wcGkAYfmCi5kGT3J89gkl`; this is a public coordinate, not a secret. The existing native source directory and signing configuration are separate service requirements. This registration update creates no source funds, hardware qualification, or production financial result. Test actual customer-approved note funding and redemption only after deployment.

## Independent implementations

The public conformance suite and original-note verifier run without a Receiz host code change. They do not grant access to hosted financial services. This Bank-specific host integration admits the dedicated Bankeiz and legacy Bank clients at explicit registered origins. A new operator needs its own authorized receiving integration; changing branding or cloning the repository does not enroll it. A future self-service host integration must derive its exact origin/client binding from authorized registration while preserving proof, scope, custody, atomicity and recovery requirements. This domain patch does not implement that wider policy.

## Entrance status

The existing shield stays 19 pixels. Its first render uses the last result on the device for the pinned v129 verifier, or the matching recorded browser report on a first visit. Background checks preserve that displayed result until a complete new result is available. Failures and unavailable checks replace the prior result and persist across visits. Stored status is presentation only and never authorizes access, ownership, custody or credit. The status panel opens only on a click and links to the full Conformance Console.

## Registration migration verification

The registration switch was tested with isolated browser storage and temporary native source fixtures, without live account or financial actions. Browser checks retain original encrypted notes, pending payment tickets, source bytes, private history, execution checkpoints and the identity-removal guard. The payment migration fixture commits a simulated old-client payment, cold-opens the new-client host and recovers the identical original receipt without changing the shared ledger head. The public-proof fixture publishes under the prior client, cold-opens the new-client host, verifies original/latest reads, denies new old-client publication, and proves that signed revocation still stops live updates while preserving the snapshot. Public continuation also requires exact application equality.

No client secret, MCP access token, package upgrade or SQL migration is part of this change. The source/archive and production build checks cover the unchanged v129 distribution and the updated app sources. These isolated results do not claim deployed note funding, physical-device custody qualification or live financial execution.
