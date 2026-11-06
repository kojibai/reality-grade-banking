# Registry native publication verification — 2026-11-06

The owner approved publishing Bankeiz’s existing public conformance Original to Receiz’s public rails and required the existing `bjklock.receiz.id` governance identity. The local governance loader verified the designated key and portable identity proof. The installed SDK independently admitted the Identity Record and confirmed the public owner and matching key before any publication. Private signing material stayed in the local process; no identity was created, imported into the browser, enrolled, or changed.

## Accepted public record

- Publisher and credential holder: `bjklock.receiz.id`.
- Public key ID: `fa88b59e8aff5213f06712e81583578adfd10c807db8544bd2f44a558e802060`.
- Scope: **Public integration contract**, **33 / 33 cases passed**.
- Accepted at: `2026-11-06T06:27:40.806Z`.
- Registry revision: **1**, with one distinct Original.
- Native public record ID: `5d90c928-4f77-4a9a-af2b-56bde3b6a3d6`.
- [Public native record](https://receiz.com/api/public-proof/5d90c928-4f77-4a9a-af2b-56bde3b6a3d6).
- Namespace: `bankeiz.registry.conformance.v2`.
- Original bytes: **232,905**, carried unchanged in **2** native parts.
- Original SHA-256: `42639bee60e2650d4f58901ab9e66456ed2421a88330621c88d26e4e1889d75f`.
- Evidence SHA-256: `379297e32c719aa0ba71131d0541f72efa1ea72cf2f80ed0a712de2289897b56`.
- Assessed build SHA-256: `bb2b3a95c6f8737c207142474e74a1e9118efb84226ecff44edd9885bf700c89`.

Both exact public signed part requests were accepted and recovered before the index was published. The index was then recovered individually and through the public namespace before the API returned the accepted entry. The connected Receiz MCP independently recovered the same record by transport ID, native record ID and namespace, including the publisher, holder, scope, case count and Original hash.

## Independent reader and rendered evidence

A fresh unsigned Node process used the compiled production Registry handler with no publishing identity or cookies. It recovered one native record, reconstructed the exact Original, ran canonical seal/transcript/holder/artwork verification, and downloaded 232,905 bytes with the matching SHA-256. Canonical HTML carried revision 1 and preserved the separate 12 / 12 reference-check evidence.

The local Vite API independently recovered the same native record after a fresh process start. The browser’s expanded Bankeiz record displayed **Registry publication**, the accepted timestamp, **revision 1**, and the link to inspect the published Original. The public Registry did not require opening the publishing identity.

## Corrections established by live verification

The first native request was refused with HTTP 400 `invalid_schema`. It had not created a public part or index. Native app-state projection schemas require the `receiz.app.…v1` contract. Corrected part/index schemas now satisfy that contract; new publication intents use v3 and retain the earlier refused intent unchanged.

Dev-server configuration reload also exposed a real renderer error: a new local renderer module attempted to initialize the same external resvg WASM twice. A real-Original regression reproduced the error before correction. Initialization now persists per actual engine function and pinned WASM hash across module reloads. Resource hashes, canonical artifact verification and exact artwork comparison remain enforced. Two successive real Vite configurations prepared the unchanged Original successfully.

Cold lookup additionally requires complete native part reconstruction before accepting a matching official-site Original. Missing or corrupt native parts cannot establish a Registry PASS.

## Validation and delivery boundary

Focused Registry and conformance verification: **138 tests passed** across 13 files. Frozen account entry: **62 tests passed** across 7 files. TypeScript checking, compiled Registry runtime checks, client production compilation and scoped whitespace checks passed. The standalone certificate checker verified the complete public Original, evidence, artwork and `bjklock.receiz.id` holder.

This records a completed live Receiz publication and independent public recovery. The revised website source is local until its commit is deployed; this verification did not push or deploy the website.
