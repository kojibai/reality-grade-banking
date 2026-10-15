# Receiver reference and engraved note checkpoint

Verified locally on 2026-10-15. This checkpoint changes Bank presentation, export mechanics and the public receiving reference. It does not change the existing native financial runtime or Receiz host source and moves no funds.

- Full suite: **310 tests across 88 files passed**; TypeScript and production build passed. The suite also emitted existing sandbox-denied localhost:3000 connection warnings; they were not test failures or live service qualification.
- `npm run receiver:check`: **9 local checks passed**, including source/package integrity, canonical registry, forged-input refusal, both installed **v129 MCP** conformance/release reports (**15/15 each**, zero network/database calls and writes), and all **11 canonical KaiSigil temporal vectors**. Exact safe output is retained in [the report](verification/2026-10-15-receiver-reference.json). These are subordinate reference checks, not an institution certificate.
- The exported SDK edge example was exercised with synthetic deterministic plans for both rails. It initially failed because inspection received the edge-plan wrapper; the fix passes the nested canonical operation plan. Both sender/receiver regression tests now pass. No signing, source admission, commit store or transfer ran.
- The externally configured MCP connector reports SDK 128.0.0; it was not treated as v129 evidence. The checks above instantiate the repository's installed `@receiz/mcp-server@129.0.0` and verify its exact coordinated registry/matrix identity.
- Read-only CLI refused the actual unissued artwork with `BANK_COMPLETE_NOTE_IMAGE_REQUIRED`. Real browser imported the verifier and refused forged source handles and unsigned input without console warnings/errors.
- The original paper and existing `public/native/offline-notes.v129.mjs` hashes remain unchanged. The new read-only verifier has a complete source map and per-input hashes; the artifact checker verifies them. Its source names contain no maintainer home path and its embedded sources contain no private-key PEM block. This is an artifact sanity check, not an exhaustive security audit.
- Actual final PNGs decoded at **3240 × 1944**, approximately **600 DPI**, with valid CRCs and no issued-source chunks. Reserve artwork is **4,066,356 bytes**; Settlement artwork is **4,054,287 bytes**. Both fit the existing 8 MiB carrier with the maximum native proof wire budget and framing headroom. Earlier helper round-trip checks preserved nonfinancial iTXt bytes and stripped back to byte-identical artwork; financial issuance was not simulated from artwork.
- Independent review found the SDK example issue and missing specific dependency notices; both implementation findings are addressed. A fresh re-review reported no remaining implementation findings in this scope.

## Explicit remaining gates

The [branding-only license proposal](../LICENSE-PROPOSAL.md) grants no rights yet. Existing MIT/GPL dependencies require specific combined-work distribution and corresponding-source review before public redistribution or reuse claims; copied notices alone do not clear that gate. See [third-party inventory](../THIRD_PARTY_NOTICES.md).

Live Reserve Note qualification still needs the [host service, migration, protected signer context and real supported-device funded round trip](offline-notes-release.md). Settlement Notes need their [signed financial extension](settlement-note-contract.md). Generic Bank digital Send, custody receipts, fractional trading and funded issuance remain separately unfinished; the receiving kit documents the required native paths without manufacturing an implementation or access permission.

The requested new frontend Conformance Console is subsequent work. This checkpoint does not claim it has been implemented or verified. GitHub CI configuration is included, but no hosted GitHub Actions run was triggered by the agent. No push, deployment, account action or financial transaction was performed.
