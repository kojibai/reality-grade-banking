# Bankeiz origin activation

The Bank's public origin is `https://bankeiz.com`. New QR and NFC payment requests use that origin. Existing requests at `https://bank.receiz.com` remain readable. Canonical, social, sitemap and public guide URLs use Bankeiz. Financial sources, client IDs, signed object coordinates and custody namespaces are preserved.

## Committed host change

Receiz main commit `67d446183` adds Bankeiz to the existing checkout-only framing policy and binds Bankeiz note ceremonies to the `bankeiz.com` WebAuthn RP. The original `bank.receiz.com` / `receiz.com` realm and existing localhost realms remain supported. Ordinary Receiz routes keep their framing restrictions.

The note service still requires the existing active public client, a registered callback at the exact origin, the account's scoped grant and native custody verification. The origin change grants no financial authority. A credential held under `receiz.com` cannot silently become a Bankeiz credential.

The included native browser source matches that committed change. Its application patch and complete output/input hashes are in `native/manifest.json` and `public/native/offline-notes.v129.manifest.json`. The read-only receiver verifier, published SDK outputs and all package versions remain unchanged at v129.

Host checks: 50 scoped Bank tests, 37 frozen account-entry tests, proxy-header checks and all three governance checks passed. The focused 23-test origin/recovery suite passed again after tightening exact map lookup. Production code and the other changed tests pass lint. The existing `bankBrowserRecovery.test.ts` fixture has six pre-existing `no-explicit-any` lint errors, reproduced against its committed predecessor. No full Receiz build or production deployment is claimed by these scoped checks.

## Registration and live activation

The existing public client is `rc_uV6aT6wZJCQDspB0_SJ1DcEm`. The proposed callback addition is recorded in `bankeiz-registration-proposal.json`; that proposal is not a registration receipt. Preserve the current callbacks and scopes. The localhost callback additions support the already-defined local note realms.

At this checkpoint the signed-in developer dashboard did not successfully load the client register. The existing registration has not been replaced, rotated or edited. Once the register is available, apply the exact callback update through the owner-authorized registration flow and retain its returned public configuration. Push/deploy the host and Bank commits, then exercise actual account entry, checkout rendering and supported-device note qualification on Bankeiz. Financial qualification uses customer-reviewed funded operations and their independently verified receipts.

## Independent implementations

The public conformance suite and original-note verifier run without a Receiz host code change. They do not grant access to hosted financial services. This Bank-specific host integration currently admits one dedicated client and explicit origins. A new operator needs its own authorized receiving integration; changing branding or cloning the repository does not enroll it. A future self-service host integration must derive its exact origin/client binding from authorized registration while preserving proof, scope, custody, atomicity and recovery requirements. This domain patch does not implement that wider policy.

## Entrance status

The existing shield stays 19 pixels. Its first render uses the last result on the device for the pinned v129 verifier, or the matching recorded browser report on a first visit. Background checks preserve that displayed result until a complete new result is available. Failures and unavailable checks replace the prior result and persist across visits. Stored status is presentation only and never authorizes access, ownership, custody or credit. The status panel opens only on a click and links to the full Conformance Console.
