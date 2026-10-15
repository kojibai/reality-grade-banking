# Bank offline-note integration contract — v129

The user requested Create note in Send, Deposit note in Receive/Deposit, a denomination preview before issuance, and complete native note execution. The original instruction to avoid Receiz host code changes remains in force except for previously approved isolated patches. The Bank's existing app registration does not expose the qualified Offline Cash workflow on the Bank origin.

## Current verified boundary

SDK, MCP and AI Skills remain 129.0.0. The canonical registry is the installed v127 registry. The existing Receiz browser implementation uses qualified single-device WebAuthn custody, independently verified Reserve funding, canonical whole-note subtraction and an atomic account successor. Its helpers are under `app/lib/wallet/kairosOfflineCashBrowserRuntime.ts`, `kairosNoteBrowserPwaCustody.ts`, `kairosNotePortableCarrier.ts` and `kairosOfflineNoteLocalIssuance.ts` in the Receiz host. The current attestation route binds its challenge to the request origin and a same-origin cookie. Bank origin access cannot be achieved by spoofing Origin or weakening its certificate/counter checks.

The SDK's legacy `connect.mintNote` is explicitly limited by `wallet_note_receiving_seal_required`. It must not be used as the current workflow. A generic verified image or uploaded JSON is not spendable note admission. The existing Receiz wallet's portable-note upload verifies evidence but does not activate a new holder or change their value projection. Copying that upload is not end-to-end Deposit note.

## Proposed scoped extension requiring a new host-code exception

Expose the existing qualified Offline Cash implementation to the dedicated Bank registration and exact Bank origin. Preserve the deployed wallet's behavior. Require the existing signed account consent and scoped bearer, plus exact per-operation user confirmation. Bind account UID, origin, receiving custody, challenge expiry and semantic operation identity cryptographically. Return complete canonical source/receipt bytes and bounded status, never a root key or reconstructed authority JSON.

Device qualification must preserve existing trusted attestation chains, parent RP rules, user verification, non-backup eligibility, monotone counters and rollback conformance. Funding must be derived from a reverified Reserve credit proof and the exact same-account current portable head. An observed balance cannot fund a note. Whole-note issuance/acceptance and account successor admission must be atomic, with independently inspectable SDK-issued plans and exact retained recovery. Lost outcomes are resolved using the same operation identity before retry. An upload cannot create value twice.

The Bank adapter must use SDK commands and current artifact verification for issuance, current holder transition and redemption. The artwork is a carrier presentation; the complete issued proof bytes must remain recoverable from the saved image. The preview carries no serial, signature, paid status or claim QR and cannot be deposited as money.

## Verification before enabling issuance

Require independent verifier evidence for funding and both participant roles, current registry/permit binding, local source reopening, concurrent spending rejection, image byte preservation, repeated upload rejection, stale/foreign account rejection, irreversible consumption, lost-response recovery and restart. Use MCP conformance and release-lock checks required by `receiz-value-execution` and `receiz-offline-first`. Real hardware qualification and financial actions are performed by the user, not the agent.

## Artwork

Built-in image generation produced the engraved ivory/navy/pine design at `/Users/bjklock/.codex/generated_images/01a1333c-52b2-7582-8fd1-aaaabe6476f9/exec-7106c311-e878-4b06-b93f-fe9066494c77.png`. Prompt: original premium Receiz banknote, ornate engraved guilloche border, warm ivory paper, deep navy and pine, orbital architecture at right, open left/center for exact code-rendered denomination, no letters/numbers, portraits, government emblems or existing fiat design. `public/notes/banknote-engraving.webp` is the optimized carrier art, loaded only when needed.

This contract is not proof authority and does not claim issuance or Deposit note completion.
