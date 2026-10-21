# Note image verification implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this bounded correction.

**Goal:** Export Notes as canonical sealed PNGs while preserving their exact native financial sources and existing deposit behavior.

**Architecture:** Bankeiz composes its existing Receiz v129 device sealer after the native Note image exporter. The outer document seal binds the artwork and carried Note envelope; the existing native reader continues to govern funding, handover and credit. Retain completed output in the existing Note checkpoint.

**Tech Stack:** TypeScript, Receiz v129 SDK/native runtime, encrypted local vault, Vitest.

**Spec:** User instructions in this task: do not change Receiz; preserve creation/deposit and antirollback; exported Notes must pass its unchanged offline verifier.

## Global constraints

- No Receiz source, SDK, native generated modules, roots or verifier changes.
- No new financial requests, account authorization prompts, attestation or polling.
- Seal only an explicit creation, handover or legacy export; no first-paint or inventory sealing.
- Persist financial source before image production; retry image failure without another debit or handover.
- Offline file verification does not imply unspent status or authorize credit.

## Review focus

- Image failure after a debit must retain the original exact resumable attempt.
- Export must preserve every byte of the inner signed funding/handover source.
- A corrupted existing seal must fail verification, never be silently replaced.
- Reserve, Settlement and combined Notes must use the same composition.
- Existing saved Notes need a local re-export route without changing their financial identity.

## Tasks

- [x] Reproduce missing outer proof with the native synthetic Note; add a failing application regression.
- [x] Seal connected images before their existing image checkpoint, and add local export support for older/qualified images.
- [x] Run real canonical verification and native reopening against a synthetic signed PNG, negative tampering checks and existing Note recovery/deposit tests.
- [x] Typecheck, production build, review and commit only Bankeiz changes on main. User pushes; qualify production separately.

## Verification

- Real native PNG sources for Reserve, Settlement, composite and addressed handover passed the unmodified SDK canonical verifier after sealing; exact inner sources and existing credit bindings were preserved. Corrupted/untrusted seals refused. Zero network requests in this test.
- Full Bank suite: 313 files, 1,884 tests passed. TypeScript and complete production build passed.
- Independent review: no actionable findings; 56 additional focused checks passed.
- Production deployment and the user’s exact iPhone file remain untested. No Receiz files were changed.
