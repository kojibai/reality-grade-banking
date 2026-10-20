# Note continuity implementation plan

> Implement inline in the existing main checkout, as explicitly requested. No deployment or public release until the financial acceptance evidence is complete.

**Goal:** One unchanged Note experience with qualified local consumption or connected consumption, and exact public integration requirements.

**Architecture:** Receiz owns proof admission, custody and financial execution. Bankeiz projects retained proof and selects only supported SDK paths. Static guidance adds no page-load API calls, polling or device ceremony.

**Tech stack:** React/TypeScript, pinned Receiz 129.0.0, current native composition, Vite static public pages.

**Spec:** [Note continuity standard](../../note-continuity-standard.md).

## Constraints and review focus

- Preserve all original proof/history bytes and existing failed/pending custody.
- Retained, verified, claimed and spendable are separate states.
- No synthetic qualification, software counter substitute or legacy mint bypass.
- A connected transfer must consume its exact predecessor atomically; no preconnection unlock.
- Custody-path migration cannot leave two active spend authorities.
- Package parity/build success does not establish financial qualification.

## Tasks

- [x] Audit v129's actual Note and global coordination source. Finding: legacy mint/claim do not supply the new path; local identity-bound transitions alone cannot enforce shared exclusivity.
- [x] Write the implementation contract before changing behavior, including explicit release blocker and required Receiz extension.
- [x] Publish a restrained technical standard in Conformance, retain the opt-in device test and make future accessory status unambiguous.
- [x] Add optional Note guidance and source-guide links without a mode picker, new request, timer or credential ceremony.
- [x] Verify rendered mobile/desktop layout, diagnostic access, existing Note behavior, typecheck, test suite and production build.
- [ ] Implement the connected custody profile through the actual supported Receiz SDK/host contract; do not fabricate an adapter or allow a local success fallback.
- [ ] Run real cross-custody issue → receive → send → deposit, duplicate/replay/race/recovery and migration qualification with independent full-proof verification.
- [ ] Commit the reviewed standards/readiness change on main; keep official 1.0.0 publication blocked until all required evidence passes.

## Execution record

Ruling: source availability is not deployment evidence. The upstream checkout has generic coordination routes, while the current Note mint/commit route explicitly refuses connected issuance. The retained Bank extension and the upstream host must be reconciled before any connected Note activation.

Ruling: the requested user experience is approved, but an app-only implementation cannot create a missing Receiz custody profile. Ship truthful technical documentation and preserve strict financial gates while that dependency remains unresolved.

Verification: 274 files / 1,662 tests passed; typecheck, all nine receiver reference checks, v129 local MCP reference/release context, package parity and production build passed. Browser checks covered the built public guide, technical requirements, opt-in diagnostic navigation and existing Note fixture. The connected marketplace MCP separately reports v128 sandbox context; this is distinguished from the passing installed v129 checks.

The connected execution and real-device financial tasks remain open. See `docs/verification/2026-10-20-note-continuity.md` for actual evidence and exclusions.
