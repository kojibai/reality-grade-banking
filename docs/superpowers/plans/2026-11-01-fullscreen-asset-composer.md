# Full-screen Asset Composer Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for the UI and the independent camera task already delegated under dispatching-parallel-agents. Track checks below.

**Goal:** Implement the user-selected immersive Create an asset design with local photo/video capture and the existing complete creation workflow.

**Architecture:** Keep one retained composer draft and all existing validation, sealing, funding and recovery operations. The canvas and review are two views over that draft. Capture yields a File through the existing selector; it adds no account reads, storage or uploads.

**Tech Stack:** Existing React, TypeScript, Lucide icons and Bankeiz tokens; browser MediaDevices/MediaRecorder.

**Spec:** User-selected second render (Immersive Canvas), revised capture render, and explicit approval to implement. Reference images are in the current chat; camera output is the author’s own media, not a shipped demonstration photo.

## Global Constraints

- Full-screen applies only to Create an asset, with existing Sheet focus/close behavior.
- Tap shutter for a photo; hold for video; release stops. Keep gallery and native camera fallback.
- No new packages or external services; no camera work before an explicit camera action.
- Keep original/attachments/full text independent and all music/book/video metadata available. Images are their own artwork; music/books use optional covers and videos use optional posters. Selection switches the local editor without a service call.
- Add → An asset opens this composer directly; explicit existing-proof import uses the current verified admission view and returns to the retained draft without reading unrelated checkouts.
- Preserve existing publication, optional PBI signing, funding, custody and pending-result recovery.
- Account entry is frozen under docs/account-entry-frozen-invariants.md. No identity or financial implementation edits.
- Preserve unrelated dirty ownership/meeting work; commit only this feature’s finished files on main. User pushes.

## Review Focus

- Late camera permission after close must stop its returned tracks and never emit a file.
- File-picker cancellation must keep the composer and draft open.
- Switching canvas/review must preserve exact File references, full text, metadata and funding inputs.
- Unsupported or denied embedded camera must retain native file capture/upload access.
- Narrow phones, safe-area insets and the keyboard must leave close, next and capture reachable.

### Task 1: Local camera input

Files: src/features/assets/AssetCamera.tsx; tests/asset-camera.test.tsx.
Interface: AssetCamera({onCapture, onClose, maxBytes}) -> File callback; no uploads.
- [x] Write failing tap/hold, cancellation, fallback, late permission and cleanup tests.
- [x] Implement MediaDevices still/video capture, supported MIME negotiation and bounded recording.
- [x] Run focused camera tests without using real hardware.

### Task 2: Immersive canvas and retained review

Files: AssetComposer.tsx, CreateAsset.tsx, new asset-creation-studio.css, LiveActions.tsx; focused tests and existing browser fixture.
Interface: AssetComposer keeps its current form default; optional studio mode exposes canvas/review with onReview/onEdit callbacks. The parent retains draft/settings/backing and existing execution functions.
- [x] Write failing canvas/review tests proving no reads/sealing on navigation, File preservation and rejected oversized media.
- [x] Implement the selected full-screen canvas, compact existing content controls and review using existing fields.
- [x] Scope Sheet full-screen style to Create an asset; retain current result/recovery UI.
- [x] Run composer, publication, funding and completion tests.

### Task 3: Release verification

- [x] Inspect the reference and actual narrow-phone rendered capture, selected-media and review states.
- [x] Exercise photo/video using synthetic camera media and the complete existing fixture creation/retry path; no live transaction.
- [x] Update generated product previews; run production build and applicable full tests in a clean candidate excluding older unfinished work.
- [x] Independent scoped review; fix material findings; commit only finished files on main.

Execution ruling: the user explicitly selected the design and instructed implementation in this chat, so proceed without another approval or execution-method prompt.
