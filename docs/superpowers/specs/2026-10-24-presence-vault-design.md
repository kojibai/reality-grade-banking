# Presence-protected Vault

## Scope amendment: deposits, assets, direct sending and independent proof

After approving the initial money-Vault design, the user expanded the required finish:

- Open a Vault and add more money from balance or card.
- Deposit the owned asset itself, preserving its identity, quantity, rights, backing and original history. Do not sell it as a substitute for asset custody.
- Return money or assets to the owner's account, or send them directly to another Receiz ID from the Vault.
- The private original carries the actual authoritative money/asset source objects, their complete required continuity and encrypted private custody/recovery material. It must be recoverable and verifiable with a compatible independent reader. A server-account balance statement alone does not satisfy this.
- A separate **Share proof** export discloses selected ownership/holdings evidence at a sealed moment and is independently verifiable and machine readable. It includes no private custody material, encrypted recovery payload, login capability or spending authorization. Anyone may verify it; possession of that export grants no Vault access.

These requirements supersede the initial whole-value, return-to-owner-only limitation below. The recovery, encryption, truthful state, performance and existing financial-rule requirements continue to apply. The broader scope requires a revised execution plan and qualification of the missing source/custody interfaces; the initial Note-only composition must not be shipped or marketed as the expanded feature.

### Required source-carrying composition

Use a canonical, versioned Vault root carrying exact original child sources and predecessor continuity. Bind its internal custody authority to the admitted owner and its PBI protection. A dedicated child custody key/address can serve the existing native transfer mechanisms, but a child database account alone is not the value source. Its private key belongs only in encrypted Vault recovery custody, never the owner's ordinary Identity Record or ordinary device storage.

Each money deposit must supply an actual admitted, exclusively allocated money source; each asset deposit must supply the actual transferred ownership source. The user's available holdings must no longer include deposited value as separately spendable. Adding, removing and sending produce a retained successor carrying the consumed predecessor and exact native outcomes. Do not create independent mutable copies of an asset or relabel its market value as stored cash.

Incoming card funding uses existing limits, approvals, minimum funding rules and confirmed credit. Preserve the exact checkout reference and subsequent allocation intent. Credit does not become Vault money until its authoritative allocation is admitted and retained. Never start a second checkout or allocation to resolve a lost result.

An outgoing action selects an amount or actual owned asset/quantity and a resolved recipient. Bind fresh PBI authorization to the exact action, destination, source heads, quantities and original request. Retain the exact recoverable request before submission. Admit native outcomes once and append the same result on retries; a replayed prior Vault file is not another source of spendable value. Return-to-balance uses the same flow with the original owner selected.

### Qualified integration findings

- Existing connected money sends support exact recipient binding, card shortfall funding, retained originals and idempotent recovery. Their HTTP observations alone are not portable financial authority; value inside the Vault still needs the native allocated source.
- Existing native **send-ownership** moves funded native asset quantities without changing backing. It is not the public Market positions model.
- Current Bank Connect Market contracts expose quote, trade, lookup, cancel and portfolio, but no transfer of a position itself. The Receiz session-only share-certificate export/import routes are not already a qualified Bank Connect contract. That adapter must be built and tested before Market-share deposits are advertised.
- Arbitrary held proof files and intake requests do not necessarily establish transferable ownership. Qualify the actual source class, rights and current head before offering a deposit.
- Current Bank identity execution stores close over the active identity's global custody. A protected child context must have its own encrypted source/journal ports, compare-and-swap, locks, signer custody and abort lifetime. Never temporarily replace the user's active identity or export a child private key into normal account retention.
- Current cross-origin continuation does not expose a signed parent/child custody-creation contract through Bank Connect. Establish a supported, verified custody relation without silently enrolling a parallel consumer account.

### Two exports, separate authority

**Save Vault** is private. It contains the encrypted original, actual contained source objects, complete recovery journal and required private custody material. Saving a picture without that payload is not a backup. The format has a published schema and an independent offline reader/export path; the frontend is one reader, not its authority.

**Share proof** is public by deliberate consent. It contains a public Vault identifier, disclosed owner identity, selected holding proofs, exact quantities and source heads, sealed Kai coordinate, issuer/verifier versions, and evidence sufficient to verify the disclosed claim. The canonical public schema is closed. Public export is constructed from admitted public source witnesses, not by deleting a few fields from the private backup. Test both structure and recursively carried bytes for private keys, passphrases, tokens, unlock payloads and reusable financial authorization.

Public verification reports what the evidence establishes at the recorded head. It cannot claim an offline old proof demonstrates that no later transfer occurred elsewhere. A recipient can request a fresh, challenge-bound proof of the same holdings when freshness matters. The proof's holder signature establishes control of its source-bound custody key; an arbitrary display name or attached asset image does not establish ownership.

### Expanded acceptance gates

1. Balance and card deposits create and retain actual allocated value; native assets and Market shares move in kind through their qualified source contracts.
2. Partial money release preserves exact value and change in the successor, under the same native money rules; unavailable splitting must not be approximated by a local display calculation.
3. Return and third-party Send bind the exact destination and fresh PBI approval; no alternate ordinary account or unprotected key path can spend the same Vault holdings.
4. A clean independent reader restores a private original and its exact contained sources; the Vault frontend and an account summary are not required to establish the source claims.
5. A public export verifies selected holdings and machine-readable evidence, while every import, login and execution path rejects it as access authority.
6. Old copies, interrupted card credit/allocation, split/release retries, stale tabs and cross-device recovery cannot double count, double debit, double credit or drop original source continuity.

The public page stays a private draft until these expanded claims are implemented and qualified. The initial draft's whole-value return language must be replaced before publication.

## Intent

Give people a private place for money they want to protect deliberately. Vault lives inside Identity and opens a dedicated experience. It should feel calm, personal and valuable: plain words, spacious composition, restrained water and glass treatments, and clear actions.

The user approved optional PBI recovery, a separate Vault experience, recovery on a replacement device, and multiple named vaults. Ordinary account entry and the existing payment experience remain unchanged. The public explanation must make the benefit immediately understandable without engineering language or unsupported security claims.

## Approaches and selected direction

1. **Encrypt the file with the Identity Record alone.** Rejected: someone with that Record could also open a copied Vault, contrary to the requested second protection.
2. **Keep a separate service password or server unlock decision.** Rejected: adds another account secret and makes file access depend on service availability.
3. **Encrypt private Vault custody with a user-verifying passkey bound to the existing identity.** Selected direction: retain the original value proof, encrypt its private spending authority, and require fresh authorization to recover it. A copied image and an Identity Record alone do not supply the passkey encryption secret.

Selection of the recoverable direction is authorized. The concrete cryptographic, recovery and financial boundaries below require review before implementation; no production Vault protection has been established by this design.

## Consumer experience

### Identity

Below the existing Identity Record backup, show a quiet **Recovery & protection** section with two rows:

- **Protect your recovery** — “Keep a recovery file that opens with your passkey.” Action: **Set up recovery**.
- **Your vaults** — “A private place for money you want to protect.” Action: **Open Vault**.

Do not enroll a passkey after Enter, during ordinary login, on account first paint, or when reading balance, Ledger or Market. Existing Identity Record backup remains available unchanged.

### Dedicated Vault experience

Identity opens a separate sheet or view with its own heading, **Vault**. Intro: **“Yours to unlock.”** Supporting copy: “Keep money behind an extra layer of protection. Open it with your passkey when you need it.”

Actions: **Create a vault**, **Open a saved vault**, **Back to Identity**. Named vaults appear as restrained glass cards with a lock mark, name and **Locked** status. Locked overview does not expose an amount as a verified balance before opening the actual source.

Create: name → amount → review exactly what moves from available balance into the Vault → device authorization → prepare the exact native funding intent and private Note authority without submitting it → save an encrypted prepared-Vault file → reopen that saved file with its passkey and confirm the exact identity, amount and authority → explicitly approve funding → durable funded result → save the updated funded file. The prepared file includes the exact idempotent issue authorization so a replacement device can recover the eventual funding result. Never present an unfunded object as stored money. No automatic real-money action is authorized by loading the page or setting up recovery.

Open: select local vault or original file → authorize with its passkey → decrypt and admit original identity and value proofs → show the original recorded value and funding history. While connected, reconcile the exact original operation/consumption state before calling that value currently withdrawable. An offline historical file shows **Saved record** and its recorded date; explain “Connect to check changes made on another device.” A locked card describes encrypted access, not proof that its original funds remain unconsumed elsewhere. Copying the image cannot replace authorization.

Release: choose **Return to my balance** → review full amount and destination → fresh device authorization → submit the exact once-only original release → display the verified result. First release supports whole-value return to the same original identity/account. Partial release, direct third-party payment and delegation are outside this first feature.

Errors are specific and calm: cancellation leaves funds locked; unsupported device protection is refused before funding; unknown funding or release retains the original request and offers **Check this vault**, never a second execution.

## Cryptographic and recovery contract

- Use a WebAuthn credential with required user verification and a qualified PRF encryption capability. Validate origin, RP ID, challenge, credential identity, signature and flags. A signature from a previous ceremony is not a later unlock.
- Use authenticated encryption for the private payload, binding the owner identity, vault ID, format, credential descriptor and KDF context. Salt and IV are fresh; PRF output and derived private encryption key are never persisted as ordinary app storage, uploaded or included in the image.
- The private payload carries exact native source bytes, private Note authority, original immutable operation requests, verified results and complete recovery journal. It is not a fabricated balance or reconstructed certificate.
- A normal Identity Record cannot bypass the encrypted Note authority. The underlying value contract must reject any path that spends or cancels funded value without the necessary original authority. Review the existing issued-Note cancellation refusal explicitly.
- Do not retain an unprotected second copy of Vault Note authority in the ordinary Notes store, history, exports, analytics, localStorage or the account Identity Record.
- Lock on close/background and invalidate async callbacks after identity closure. Browser memory is a temporary unlock boundary, not a promise to resist a compromised browser or operating system.
- Recovery requires both the saved encrypted file and access to its authorized passkey. A synced passkey can support a replacement device if its provider makes that same credential and PRF capability available. An Identity Record, face image, account name or newly enrolled passkey cannot regenerate an old Vault key.
- Enrollment must prove encrypt/decrypt round-trip with the actual selected credential before moving money. A missing PRF result or inability to recover the key must fail closed; no password-only downgrade.
- A Bankeiz-domain credential is scoped to that RP. An existing receiz.com PBI credential cannot silently become a bankeiz.com credential. Bind any additional credential to the same admitted Receiz ID; do not create a parallel account. Reusing the canonical Receiz recovery rail requires its explicit bridge rather than an origin exception.
- First implementation uses a Bankeiz-domain PRF-capable passkey for encrypted file recovery. This is an additional protection on the same admitted identity, not automatic enrollment in or replacement of Receiz's canonical PBI recovery service. The encrypted recovery and Vault files include the original Identity Record bytes, original filename and any unlock phrase. Importing one first decrypts it, then runs the existing canonical identity admission on the exact contained original. A new passkey is never used to manufacture authority over an older Vault.
- Face ID, fingerprint or device PIN may provide verification depending on the authenticator. Product copy says **passkey** or **device verification**, not biometric-only identity, immunity to theft, or a guarantee that only one natural person can ever use a shared credential.
- Setup requires a recovery-file save and reopen rehearsal. The original app account remains usable if setup is cancelled. Credential rotation cannot silently replace a key protecting funded vaults; rewrap only after opening the originals with the existing credential and preserving the same source and journal.

## Financial source and execution

Reuse native funded Note contracts for reserve, settlement and composite money, their exact conversion rules, amount limits, source continuity, account locks and idempotency. Every funded Vault must actually remove its allocated value from ordinary spendable balance. A UI lock or locally subtracted display is insufficient.

Candidate composition: a dedicated connected-Note runtime whose entire source store and journal are encrypted under the Vault key. Its Note authority is never routed through the ordinary retained Note store. Issue and return operations reuse the existing original authorization/recovery interfaces and verify complete funding/credit sources. Serial access and durable compare-and-swap protect against stale tabs. Unknown results keep the exact original intent. Duplicate files or retries cannot create another debit, refund or credit.

The current installed connected-Note contract requires connection for allocation and final redemption. Opening already held encrypted contents can be local. This design must not advertise final offline money movement as implemented. Fully offline financial execution remains dependent on the separately authorized exclusive-custody and acceptance work; it must be qualified before activating that capability in Vault.

Recovery of a copied or earlier Vault backup must not recreate spendable value. First release returns only to the original account and original receiving key, verifies the existing native consumption result and treats earlier locally held state as historical after its source has been consumed. No second local balance credit is allowed before a once-only native credit is admitted.

An older backup may not carry the completed handover or claim digest. Its dedicated recovery reader may adopt an existing native credit only after verifying the complete credit and embedded terminal source, matching its exact original funding, note ID, authority key, rail, amount, original account and original receiving key. This is read-only recognition of an already completed result. It must not weaken the ordinary Note claim helper's strict exact-request check, create another claim, or turn a newly bound account key into the original key. A consumed source returned to an unexpected destination is a specific conflict, never available value.

## Presentation and performance

Use existing typography, logo-only header, button and sheet patterns. Pearl background, ink text, soft blue/green light, thin rules and an abstract water-like seal. No padlock theater, faux government seal, countdowns, giant warnings, technical hashes in the primary flow or status claims based on a spinner.

Vault code, WebAuthn, encrypted database and proof modules load only on explicit Vault/recovery interaction. No new work on ordinary login, cold PWA opening, balance, Ledger, Market or public asset first paint. Reuse existing held source and results; do not verify every vault on a timer or start background status polling.

The saved file must look intentional and private, with no plaintext private keys or recovery phrase. Artwork is a carrier, not additional financial authority. Public proof exports must never include private recovery material.

## Public page and copy

Prepare a dedicated public page, linked from Vault and Identity, with a strong simple explanation, three-step flow, practical protection examples, recovery instructions and concise boundaries. Lead with control and peace of mind. Never use internal implementation history as marketing copy.

Claim only tested protections: a copied encrypted file alone does not unlock its private contents; a separate credential is required; passkey origin binding reduces phishing exposure; complete admitted originals preserve evidence; native once-only consumption prevents duplicate credit from replaying the same consumed source. Do not claim all fraud, scams, coercion, malware, account takeover or cybercrime is prevented. Source proof establishes specified integrity/history, not the honesty or real-world worth of every asserted asset.

Launch money-Vault copy only with passing end-to-end funding, recovery and return tests. Do not imply a beta, placeholder or unavailable route is a live protected savings product. Draft copy can be reviewed privately before the capability ships.

## Required verification

1. Stolen/copy-only encrypted image, wrong identity, wrong credential, wrong RP, wrong origin, missing verification, bad challenge, signature tampering and ciphertext/AAD tampering cannot unlock.
2. Genuine saved file + authorized passkey restores the exact same admitted identity and funded source on a fresh supported browser; setup cannot declare recovery ready from provider flags alone.
3. All three funding rails debit once; release credits once; insufficient balance and unsupported custody move nothing; funding remains tied to its complete original source.
4. Lost reply, crash at each retention/submit boundary, duplicate image, replayed old image, simultaneous tabs and stale identity callbacks cannot lose or duplicate money or overwrite stronger journal state.
5. No ordinary Identity Record, private history, Note listing or public export reveals unencrypted Vault spending authority.
6. Ordinary entry and cold account view issue no Vault/PBI request, database open, proof scan or prompt. Vault does not change existing payment rules.
7. Mobile/desktop layout, keyboard/focus behavior, reduced motion, screen-reader labels and background locking are exercised in the browser. Device-native PBI and replacement-device PRF recovery require real supported-device qualification in addition to synthetic CI.

## Builder review resolutions

- Prepared encrypted recovery is saved and successfully reopened before a funding request can be submitted. The funded export follows, but loss between funding and that second export remains recoverable through the original prepared file and exact operation ID.
- Recovery files contain the exact original Identity Record and unlock phrase encrypted under the Bankeiz-domain passkey. Existing canonical identity admission remains the authority after decryption.
- Previously completed releases are recognized through a dedicated full-source reader with original funding, account and key checks; the normal exact-claim contract remains strict.
- Offline copies report their recorded source state, not a claim to know consumption performed on a disconnected second device.

## Builder decisions

Use the existing React/Vite application, lazy-loaded feature code and existing money controls. Implement on Bank main within the user's established workflow and leave pushing to the user. No production payments, passkey enrollment, account rebindings, database migrations or live deployment are part of an automated test run. Start with money Vaults; arbitrary document storage is a separate scope, and public copy must reflect that.
