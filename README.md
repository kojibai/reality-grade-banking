# Reality-Grade Banking

**Your value should carry its proof.**

The Receiz Bank reference application and receiving integration kit: a mobile banking console built on Receiz proof objects, with device-held identity, independently inspectable sources and explicit continuity requirements.

**Settlement · Proof-native value.** Value derived and transacted through the native proof system.

**Reserve · Proof-backed funds.** Funded value represented through verified sources and connected payment rails.

One account view brings the rails together. The app keeps Send and Receive central, with Account, Market, Deposit, Assets and Ledger in persistent bottom navigation. Ownership, exact value and admitted history remain grounded in the proof object. A listing, image, account projection or service response cannot create financial authority.

[Receiving kit](institution/README.md) · [Receiving standard](institution/receiving-standard.md) · [Run locally](#run-locally) · [Release process](docs/release-process.md) · [Licensing status](#licensing-status)

## Build a receiver

Start in **[institution/](institution/README.md)** to accept, inspect, hold, transfer and redeem value while preserving verification, ownership and history. It includes:

- A versioned, machine-readable receiving profile and normative evidence requirements.
- A read-only Reserve Note verifier, complete auditable sources, input hashes and CLI.
- Canonical KaiSigil temporal tests and refusal vectors for forged note inputs.
- Native qualified note custody, handoff, original-image transport and redemption guides.
- A type-checked SDK edge-payment adapter example and exact MCP/AI Skills entry points.
- Receiver-specific qualification, atomic execution, once-only recovery and operational release checklists.

```sh
npm ci
npm run receiver:check
npm run receiver:inspect -- /absolute/path/to/original-note.png
```

Inspection verifies carried evidence. It does not acquire custody, prove current spendability, authorize a credit or certify an institution. A receiver must demonstrate the exact capability with admitted sources and qualified execution. Unknown conformance is **not demonstrated**; a verified failed assessment is **nonconforming for its assessed capability** until corrected and reassessed.

## Current capability boundaries

| Surface | Current state |
| --- | --- |
| Account entrance | Native Identity Seal creation/import, device-held restoration, immediate retained account view |
| Shared account | Existing Receiz Reserve/Settlement balance read; no parallel invented balance |
| Public Market and Ledger | Public sealed proof sources, collectibles, browsing, charts, discovery and exact-source inspection |
| Account assets/history | Retained verified sources plus public showcase discovery; private additions depend on host service/admission |
| Card deposits | Receiz SDK checkout/status composition, embedded inside Bank; a live payment requires customer operation and credit confirmation |
| Physical assets | Sealed intake and carried delivery instructions; actual custodian acceptance, transferable ownership and fractional sales remain unfinished |
| Digital Send / exchange | Review/request UI and native SDK primitives; full Bank execution adapter remains unfinished |
| Asset creation | Sealed definition/authorship; funded issuance, markets and buybacks remain unfinished |
| Reserve Notes | Funded native creation, receiving request, qualified handoff and Reserve redemption integration; production migration/signer/service/hardware qualification remains |
| Settlement Notes | Matching artwork; separate signed funding/custody/credit extension remains unfinished |
| Institution receiving | Public verification, integration contracts and local checks; each institution needs its own authorized native integration and live assessment |

These boundaries are intentional release disclosures. A build, downloaded image or deployment is not a financial qualification. The note artwork samples are **unissued**. See [native note release gates](docs/offline-notes-release.md), [Settlement Note contract](docs/settlement-note-contract.md) and [receiver qualification](institution/qualification.md) before enabling financial capabilities.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm. CI uses Node 24.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. For the production PWA:

```sh
npm test
npm run typecheck
npm run receiver:check
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173`. Install through the browser's Install / Add to Home Screen action. The service worker retains public shell/verifier/art assets on their defined cache paths and never replays financial APIs. First-use artwork requires its assets to have loaded; offline UI availability is separate from qualified financial custody. Close all Bank tabs and reopen to activate a waiting service-worker build.

## Architecture and trust

The SDK, MCP server and AI Skills are coordinated at **129.0.0**. The active registry ruleset is **127.0.0**. Exact registry and operation-matrix digests are pinned in [receiver-profile.json](institution/receiver-profile.json). Retained SDK names with earlier version suffixes are part of the v129 contract.

| Area | Source |
| --- | --- |
| Single-page console and navigation | `src/App.tsx`, `src/components/` |
| Identity, source admission and protected account reads | `src/receiz/native-identity.ts`, `src/receiz/bank-native-source.ts` |
| Public Market, Ledger and deterministic projections | `src/receiz/public-*`, `src/receiz/*series*` |
| Native note lifecycle and exact recovery | `src/receiz/offline-notes.ts`, `src/features/notes/` |
| Exact native generated runtime and provenance | `public/native/`, `scripts/build-offline-note-runtime.mjs` |
| Institution receiver and independent inspection | `institution/`, `scripts/build-receiver-verifier.mjs` |
| Public Learn pages and instant navigation | `scripts/learn-template.mjs`, `scripts/build-public-pages.mjs`, `public/learn/` |
| Fixed-origin native transport | `server/`, `api/index.ts`, `vercel.json` |
| Display-only brand profile | `branding/identity.json`, `branding/README.md` |

Private keys, phrases, grant bearers and device custody never belong in public configuration, logs, model context or Vercel frontend variables. Reopening on another origin requires the original Identity Seal and its phrase only if it has one; device-bound note custody has separate native recovery limits.

Native financial source verification remains stronger than databases, APIs, caches and reports. Exact participant heads, explicit rails, verified KaiSigil/KKS coordinates, canonical admission, qualified custody and independently verified committed receipts govern financial actions. Ambiguous outcomes retain the original intent and resolve before retry. Global synchronization remains subordinate to proof-carried state.

## Deployment and operations

The reference public origin is `https://bank.receiz.com`. Deploy this repository as Vite: install `npm ci`, build `npm run build`, output `dist`. `vercel.json` binds `/api/bank/*` to the fixed Node transport in `api/index.ts`. No Bank client secret or Receiz root key is required in this frontend.

A different operator must use its own registered application, identity, consent and explicitly authorized native receiving composition. Cloning this repo does not grant the Bank's production service permissions. The Bank's existing protected origin/client checks remain intact.

Follow the [release process](docs/release-process.md). Existing service restoration, host migrations, protected signer context and real-device funded note exercises must be completed separately. [Earlier launch records](docs/launch-status.md) and [verification records](docs/verification.md) retain historical checkpoints; their dates and reported limitations matter.

## Licensing status

The owner selected a source-available reference model: free implementation and deployment of covered unchanged code with narrowly permitted branding customization. **[LICENSE-PROPOSAL.md](LICENSE-PROPOSAL.md) is a draft, not an effective license grant.** Definitive ownership, covered-file, integration, patent and redistribution terms require legal review and owner approval. Public visibility alone does not grant reuse rights.

Published Receiz packages currently declare MIT licensing; those existing permissions and all third-party licenses remain separate. The native verifier and existing dependency tree also include GPL-3.0 components. [Third-party inventory](THIRD_PARTY_NOTICES.md) records them; combined-work distribution compatibility and corresponding-source obligations require review before public redistribution. The proposed reference restriction cannot remove them. See [note asset/font provenance](public/notes/README.md) and the bundled font/vendor notices. Do not describe this repository as OSI open source under the proposed no-code-change model.

[Contribution process](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Security reporting](SECURITY.md)
