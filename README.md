# Reality-Grade Banking

[![Verify reference](https://github.com/kojibai/reality-grade-banking/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/kojibai/reality-grade-banking/actions/workflows/verify.yml) [![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](LICENSE) [![Receiz v129](https://img.shields.io/badge/Receiz-129.0.0-2349d8.svg)](package.json) [![Matching native source](https://img.shields.io/badge/Native%20source-reproducible-16836b.svg)](native/README.md)

**Your value should carry its proof.**

The Bankeiz reference application and receiving integration kit: a mobile banking console built on proof objects, with device-held identity, independently inspectable sources and explicit continuity requirements.

**Settlement · Proof-native value.** Value derived and transacted through the native proof system.

**Reserve · Proof-backed funds.** Funded value represented through verified sources and connected payment rails.

One account view brings the rails together. The app keeps Send and Receive central, with Account, Market, Deposit, Assets and Ledger in persistent bottom navigation. The verified proof object is the source of authority for ownership, exact value and carried history. A listing, image, account projection or service response cannot create financial authority.

[Public Ledger](https://bankeiz.com/ledger/) · [Conformance Console](https://bankeiz.com/conformance/) · [Receiving kit](institution/README.md) · [Receiving standard](institution/receiving-standard.md) · [Run locally](#run-locally) · [Release process](docs/release-process.md) · [Licensing](#licensing)

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

Open `/conformance/` locally for the browser workspace: seven real reference checks, original Reserve Note inspection, the receiving requirements and downloadable evidence. It loads independently from the Bank, reads selected PNGs on the device and performs no financial actions. Local reference results and recorded MCP evidence remain separate from institution assessment.

See the [current function boundaries](docs/current-function-boundaries.md) and [native financial adapter contract](docs/bank-prepared-operation-contract.md) for the exact remaining production work. Generic proof-history verification alone does not establish financial effects.

## Current capability boundaries

| Surface | Current state |
| --- | --- |
| Account entrance | Native Identity Seal creation/import, device-held restoration, immediate retained account view |
| Shared account | Existing Receiz Reserve/Settlement balance read; no parallel invented balance |
| Public Market and Ledger | Public sealed proof sources, collectibles, browsing, charts, discovery and exact-source inspection |
| Account assets/history | Retained verified sources plus public showcase discovery; private additions depend on host service/admission |
| Card deposits | Receiz SDK checkout/status composition, embedded inside Bank; a live payment requires customer operation and credit confirmation |
| Physical assets | Sealed intake and carried delivery instructions; actual custodian acceptance, transferable ownership and fractional sales remain unfinished |
| Digital Send / native asset exchange | Exact signed reviews, native paired effects and original recovery; real signed liquidity and qualified production custody required |
| Asset creation | Definition sealing plus native backing lock, conserved supply, verified position delivery and whole-supply redemption; production custody qualification required |
| Reserve Notes | Funded native creation, receiving request, qualified handoff and Reserve redemption integration; production native-writer/signer/service/hardware qualification remains |
| Settlement Notes | Matching native signed rail, exact-Phi local valuation and credit primitives implemented; production selector and real-device financial qualification remain |
| Institution receiving | Public verification, integration contracts and local checks; each institution needs its own authorized native integration and live assessment |

See [native asset and full account-source qualification](docs/native-assets-and-account-proofs-v129.md) for implemented effects, tested source closures and remaining activation requirements.

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

Open `http://127.0.0.1:4173`. Install through the browser's Install / Add to Home Screen action. A completed background installation retains one complete build: the Bank interface, public guides, native verifier and note runtime, proving resources, note artwork and lazy QR decoder. Resource hashes are checked before caching; offline readiness requires the complete inventory. A first installation requires connectivity. Offline interface availability is separate from qualified financial custody, and financial APIs are never cached or replayed.

An open Bank tab continues using its own build while an update waits. Close all Bank tabs and reopen to activate it normally. Updates preserve encrypted identity custody, original proofs, receipts, pending operations and unknown account namespaces; they do not reset account storage or force a reload. Run `node tests/browser/offline-continuity-server.mjs` for the isolated, nonfinancial offline/update browser fixture; its terminal accepts `A`, `B`, `offline` and `online`.

## Matching native source

The public [account-proof reader](https://bankeiz.com/verify/) inspects original proof images/files without login. Its share interface preserves the exact source snapshot and requires explicit consent for public and future-history disclosure. The native v2 statement producer and existing-root signature reader are implemented; production wallet coverage, public disclosure and deployed financial qualification remain separate gates. The [Crystal handoff](docs/crystal-public-account-proof-contract.md) specifies the exact source, public distribution and revocation contract; private Identity Seal and recovery backups are never public proof exports.

The included [native source package](native/README.md) lets developers rebuild the actual note/verifier modules, inspect the public circuits and reproduce the published SDK JavaScript. A normal build links its exact source download from `/legal/`; `/source/index.json` records its SHA-256 and inventory. The source extraction excludes the broader Receiz backend, operator secrets and customer data. See the [public disclosure boundary](native/DISCLOSURE.md). These are source/reproduction checks, not an institution certification.

```sh
npm run native:check
npm run native:rebuild -- --sdk
npm run build
npm run source:verify -- --rebuild
```

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
| Public Conformance Console | `conformance/`, `src/conformance/` |
| Public Learn pages and instant navigation | `scripts/learn-template.mjs`, `scripts/build-public-pages.mjs`, `public/learn/` |
| Fixed-origin native transport | `server/`, `api/index.ts`, `vercel.json` |
| Display-only brand profile | `branding/identity.json`, `branding/README.md` |

Private keys, phrases, grant bearers and device custody never belong in public configuration, logs, model context or Vercel frontend variables. Reopening on another origin requires the original Identity Seal and its phrase only if it has one; device-bound note custody has separate native recovery limits.

Native financial source verification remains stronger than databases, APIs, caches and reports. Exact participant heads, explicit rails, verified KaiSigil/KKS coordinates, canonical admission, qualified custody and independently verified committed receipts govern financial actions. Ambiguous outcomes retain the original intent and resolve before retry. Global synchronization remains subordinate to proof-carried state.

## Deployment and operations

The designated official reference and public application origin is `https://bankeiz.com`. Payment requests and public metadata use that origin. The separate [host and registration activation checkpoint](docs/bankeiz-origin-activation.md) records which domain permissions are committed and which still require owner-authorized activation. Deploy this repository as Vite: install `npm ci`, build `npm run build`, output `dist`. `vercel.json` binds `/api/bank/*` to the fixed Node transport in `api/index.ts`. No Bank client secret or Receiz root key is required in this frontend.

A different operator must use its own registered application, identity, consent and explicitly authorized native receiving composition. Cloning this repo does not grant the Bank's production service permissions. The Bank's existing protected origin/client checks remain intact.

Follow the [release process](docs/release-process.md). Qualify the actual funding and transition storage, protected signer context and real-device funded note operations separately. [Earlier launch records](docs/launch-status.md) and [verification records](docs/verification.md) retain historical checkpoints; their dates and reported limitations matter.

## Licensing

Copyright (C) 2026 **Brian Joseph Klock (BJ Klock)**. Original software and accompanying documentation are licensed under **[GNU GPL version 3 only](LICENSE)**, with modification, rebranding, deployment and redistribution rights. [LICENSING.md](LICENSING.md) explains the grant and separate terms; [NOTICE](NOTICE) identifies ownership. The former branding-only proposal is superseded.

**[Bankeiz.com](https://bankeiz.com/) is the official reference implementation.** Independent implementations may use their own branding and demonstrate the same published receiving requirements. [Trademark rights](TRADEMARKS.md) and [conformance claims](CONFORMANCE.md) are separate from GPL software permissions; a fork is not automatically an official or qualified receiver.

Existing package, vendored-code and font licenses remain in force. Preserve [third-party notices](THIRD_PARTY_NOTICES.md) and supply applicable complete Corresponding Source for covered binary distributions. [SOURCE.md](SOURCE.md) describes the included matching native/SDK source, preferred cryptographic dependency source and content-addressed source archive published with every build. `npm run source:verify -- --rebuild` verifies that a clean archive extraction reproduces the native modules and published SDK JavaScript without a private checkout. The license change does not alter the native financial runtime or qualify unfinished capabilities.

[Contribution process](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Security reporting](SECURITY.md)

## Public Ledger and release package

The [Public Ledger](https://bankeiz.com/ledger/) presents public activity, original proof inspection, a high-resolution source-carrying Memory Crystal, local retention and consent-bound publication. The [Ledger release guide](docs/public-ledger-release.md) documents exact source scope, native disclosure authorization, API paths, limits and checks. An upload never admits funds or changes ownership. The [Reality-Grade Banking guide](https://bankeiz.com/learn/reality-grade-banking/) explains verification and continuity without changing the Bank interface.

Use [current function boundaries](docs/current-function-boundaries.md) for the implemented and production-qualified capability distinction. Generated source downloads include the application, receiver kit, native preferred source, licenses and matching build instructions; no private checkout, deployment credential or signing key is included.
