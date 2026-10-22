# Receiz Bank Offline Notes — v129 release handoff

## Current release and integration gates

Version 1.0.0 is published; the current release preparation is
[2.0.0](releases/2.0.0.md). The
[Note continuity standard](note-continuity-standard.md),
[connected-account contract](connected-notes-v129.md) and
[account-destination contract](note-account-deposit-v129.md) define the present
integration. The recipient can verify and retain a completed addressed original
offline, then reconcile through the supported Receiz credit contract. Connected
creation and qualified continuous-offline creation remain distinct capabilities.

Before advertising a financial/device capability, qualify the actual admitted
funding, receiver-bound original, once-only credit, duplicate refusal and
original-intent recovery on the deployed Bankeiz build. Continuous fully offline
spending additionally needs actual exclusive protected custody and rollback
resistance. Preserve saved custody and pending references during upgrades.

The handoff and tests below are **historical evidence**, not current setup
instructions or a claim that version 1 remains unpublished. Their fully qualified
recipient path does not replace the current addressed-account receiving flow.

## Historical qualified-custody handoff

The following records the earlier fully qualified recipient path and its
then-performed checks; it does not describe the new account receiving request.

The Bank keeps the existing account, navigation and sheet experience. Create note is in Send; Deposit note is in Receive and Deposit. Creation previews the denomination, requires explicit review, allocates actual funded Reserve and issues the note through qualified native device custody. Deposit consumes the current note and redeems its fixed Phi and original funded dollars into online Reserve. It never treats a copied image, generic seal, HTTP status or observed balance as spend authority.

A recipient first creates a receiving request in Deposit note. The holder imports it, transfers the exact held note, then saves/sends the updated image. The receiving device opens that image and approves Deposit. This preserves v129 qualified custody; possession of a copied PNG is not sufficient. Notes require supported attested hardware. No software-key fallback was added.

Large exact sources are held as immutable encrypted byte records under the existing device vault key. Small compare-and-swap checkpoints retain the account, exact financial intent and source references. Each use reopens the full sources with v129. The image and API transports use bounded, lossless byte packing and gzip; no proof bytes are dropped. The downloadable engraving stays full size, with a compact copy inside the native proof payload. Original gzip transports remain readable. Limits are 8 MB for the PNG, 4 MB for an API wire and 32 MB for expanded proof bytes. A deposit receipt carries the native credit, complete terminal/funding sources and private account opening. An unresolved allocation or deposit resumes its original intent, without another debit/credit. An unallocated attempt can be discarded only after the host atomically records a permanent cancellation under the same lock as funding. If allocation already happened or its outcome is unknown, the exact attempt stays resumable. A fresh balance observation or a GET miss cannot abandon it.

## Before enabling live financial use

1. Qualify the host's actual funding and transition storage for exclusive Reserve allocation, atomic once-only redemption and exact-intent recovery. Historical accounting adapter fixture tests below do not establish production readiness.
2. Permit the narrowly scoped `receiz.bank.offline-reserve.v129` context in the existing protected Receiz root signer. Preserve all existing keys, callers, contexts and environment targets. The context signs only the Bank allocation/credit schemas in this host composition; the server sends a distinct preflight probe before allocation. No new issuer or secret belongs in the Bank. This production configuration has **not** been changed in this task.
3. Push/deploy Receiz main and Bank main. The existing dedicated Bank registration and scopes remain unchanged. No pnpm package version, SDK/MCP/AI Skills release, Stripe account or Bank secret is added.
4. On `https://bank.receiz.com`, qualify a real supported device and have the account holder review a small funded creation → save image → receiving request → qualified handoff → deposit into Reserve. Confirm the exact ledger debit/credit, once-only replay and recovery after a lost response. These live hardware/financial checks require user action; synthetic tests do not qualify real hardware or payments.

No hosted changes or real funds were moved during development. A passing build or deployment does not complete financial qualification.

## Local verification

- Real v129 canonical sealing, root-purpose funding signatures, Reserve consumption, qualified note handoff, terminal redemption, protected identity stages, saved PNG round trip and complete credit-receipt reopening.
- Funding preflight failure causes no debit; wrong user/origin is rejected; a fresh resume signature reaffirms the same original allocation ID.
- Browser composition recovery rejects changed amounts and foreign accounts, retaining unknown outcomes. It covers two independent allocation components, interrupted transfer resumption, retired-recipient exact-receipt recovery, and safe funding cancellation. Unsupported custody reaches no funding request.
- Bank tests, TypeScript, production build, account-entry, API-security and coordinated v129 release checks.
- Real browser inspection at 390px verified preview → review → unavailable-service presentation → Back/Deposit note, with no relevant console errors. A separate isolated browser fixture verified encrypted source round trip, atomic concurrent checkpoint writes and foreign-ID rejection, protected ID removal and same-ID wrapping-key continuity. The actual generated native module imports in the browser and renders full-size artwork. A synthetic v129 financial check with the actual Bank engraving passed handoff, PNG reopening and Reserve redemption (1.61 MB image; 0.68 MB terminal wire). No account or money was connected to either UI fixture.

The lazy runtime is reproduced from the included v129 source with `npm run native:rebuild`, then committed under `public/native`. Its manifest records the exact output and source-tree digests, including the documented Bankeiz WebAuthn realm composition. Vercel builds the committed Bank artifact without needing another checkout. It loads only for note actions and does not delay account or Market first paint.

Full application conformance remains a separate outstanding gate: the installed v129 contract matrix validates, while the previously connected MCP integration checker reported a conflicting matrix and integration-inspection findings. This task does not declare that checker or live financial qualification passed.

## Review decisions and verification boundary

A fresh whole-change read-only review found no Critical issues and five Important recovery issues. One fix pass addressed all five: allocation-specific admission prevents a second note from conflicting with the first; retired custody reaches exact-intent receipt recovery; pending transfers retain a visible Resume action; unallocated funding cancellation is durable and serialized with debit; note custody prevents destructive ID removal/replacement, while reimporting the same exact ID preserves its wrapping key. Receiving requests may already be addressed by an incoming note and conservatively retain device custody until resolved. The review raised no Minor issues. The earlier challenge-ticket capacity and localhost hardware-qualification follow-ups remain recorded in the plan; neither authorizes money.

The source verification decisions remain: qualify local hardware and preserve native issuance; allocate real Reserve exclusively; treat the allocation as a component of the complete account; redeem only into online Reserve; retain fixed Phi and original funded USD under the existing projector; keep full cash-account openings private; carry the complete proof graph without recursively duplicating every parent; reaffirm the same intent with fresh resume consent; retain exact encrypted source bytes and atomic checkpoints. Any mismatch fails closed and leaves the original source/attempt available. The generated runtime is a Bank deployment artifact; no package exports, versions or dependency releases changed.

Historical local Bank checks passed 282 tests, TypeScript, production/public-page
build and routing checks. They are scoped implementation evidence, not actual
hardware or payment qualification. Current validation is recorded in the
[2.0.0 qualification record](releases/2.0.0-qualification.md).
