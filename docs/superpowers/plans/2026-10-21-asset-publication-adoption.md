# Immediate Asset Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implement here on main as already selected by the user.

**Goal:** Show each newly admitted asset immediately in the owner's profile and Market, then reconcile the same item with accepted public delivery.

**Architecture:** Expose the existing canonical local-admission handoff and adopt its verified projection into Bank's retained public collections. Keep a local admitted addition until the accepted source includes it; a delivery response updates status but does not manufacture membership or replace custody. Reuse the existing public publisher and discovery writer.

**Tech Stack:** Existing v129 Showcase publisher, TypeScript retained stores, React subscriptions, Vite/Node public read proxy, Vitest/Node tests.

**Spec:** `docs/superpowers/specs/2026-10-21-asset-composer-and-publication-design.md`.

## Global Constraints

- Receiz's frontend, composer UI, styling and user flows remain unchanged.
- Local admission is not an invented public acknowledgment.
- A stale read cannot remove the just-admitted object or duplicate it.
- Retry replays the same source and placement, without asking the creator to post again.
- No second listing API, timer-based membership wait, additional page-load request, changed roots or weaker antirollback.
- Use the existing main checkouts; no push, deployment, live publication or unrelated file staging.

## Review Focus

1. A stale catalog returns after admission: keep the exact new object once (Task 2).
2. Timeout after local acceptance: show held original with pending delivery, not false public success (Tasks 1–2).
3. Account switch or rename during delivery: never adopt into another owner's collection (Task 2).
4. Retry finds an already admitted placement: emit the same handoff, never another item (Task 1).
5. A publication-success response precedes an outdated Bank proxy response: bypass the stale transport entry without extra listing writes (Task 2).

## Prerequisite and interfaces

Read `2026-10-21-asset-composer-media.md`; this phase can also be qualified against existing v1 sources. Receiz paths below are relative to its existing main worktree.

Add to Receiz `connectedAssetPublication.client.ts`:

```ts
type ConnectedAssetLocalAdmission = Readonly<{
 username:string;
 original:ProfileOriginal;
 sourceReference:ImportedProofSourceReference;
 firstPaint:ProfileShowcaseBoundedFirstPaint;
}>;
// Optional factory input, preserving all existing callers:
onLocalAdmission?(admission:ConnectedAssetLocalAdmission):Promise<void>|void;
```

The existing publisher supplies the verified `firstPaint`. The callback never accepts a creator-supplied Original as admission. Bank maps it through its existing public catalog parser, using known profile appearance; no private balances or account authorization material enter the public item.

### Task 1: Expose the canonical admission exactly once per stable source

**Files:** Receiz `app/lib/profile/showcase/connectedAssetPublication.client.ts` and `__tests__/connectedAssetPublication.test.ts`; Bank `src/receiz/asset-publication-runtime.ts`.

**Interfaces:** Produce the optional callback above. `publish(file:File)` and its existing receipt union retain their signatures; replaying an already held source also supplies its retained admission.

- [ ] Add tests `local_admission_precedes_delivery_ack`, `existing_placement_replays_same_admission` and `failed_admission_emits_nothing`. Assert one stable original ID/source reference, a canonical firstPaint, and `pending` when delivery is interrupted after admission.
- [ ] Run Receiz's connected publication test file with `TSX_TSCONFIG_PATH=tsconfig.scripts.json node --import tsx --test`; verify RED.
- [ ] Forward the existing `onLocalAdmission` callback argument after custody and causal append acceptance, and reopen the same local head in the already-admitted branch. Preserve `retainImportedProfileOriginalMaterial`; do not alter the existing discovery writer or public success criteria.
- [ ] Rerun the file and existing composer bounded-publication/custody tests; all must pass with optional callback absent as well.
- [ ] Commit the owned Receiz and Bank interface changes: `feat: expose verified local asset publication admission`.

### Task 2: Adopt retained profile and Market additions without waiting for polling

**Files:** Create Bank `src/receiz/asset-publication-adoption.ts` and `tests/asset-publication-adoption.test.ts`; update `public-profile.ts`, `usePublicMarket.ts`, `native-identity.ts`, `asset-publication-runtime.ts`, `server/public-market.ts`, `tests/public-market-{hook,proxy}.test.ts`, and `tests/public-profile.test.ts`. Update the native composition outputs and publication documentation.

**Interfaces:** Produce `retainAssetPublicationAdmission(admission:ConnectedAssetLocalAdmission,owner:{identityDigest:string;accountUid:string}):void`, `mergeAdmittedPublicAssets(catalog:PublicMarketCatalog):PublicMarketCatalog`, and `acknowledgeAssetPublication(sourceDigest:string,receipt:AssetPublicationReceipt):void`. These are display adoption functions beneath the verified callback, not alternate proof/ownership admission.

- [ ] Write tests for the five Review Focus conditions. In an admission→stale read→retry→accepted read sequence, assert the same single item ID and artwork throughout, immediate subscriber notification, unchanged other members, and no extra publish call. Account switch must prevent late owner adoption. A `published` receipt must still correspond to the admitted source; rejection/pending cannot claim anonymous availability.
- [ ] Run the new adoption, hook and proxy tests with `npm test -- <files> --maxWorkers=2`; verify RED.
- [ ] Adopt into the current owner's retained profile and a shared local Market overlay. Merge additions by stable source/object identity on every catalog refresh; retire the overlay only when accepted membership carries the same source. Preserve exact source/material references across navigation. Pass a bounded `afterPublication=<64-hex-digest>` freshness hint on the existing membership read after success; the proxy may bypass its 60-second transport cache for that read, but the hint confers no membership or authority and creates no invalidation endpoint. Ordinary reads remain unchanged.
- [ ] Run `npm run native:check`, `npm run typecheck`, `npm test -- --maxWorkers=2`, and `npm run build`; qualify creation→profile→Market→asset→back with pending and accepted transport fixtures at 390/1440 px. Assert one placement/source, settled artwork, preserved scroll and no added startup requests. Include the existing Receiz accepted-discovery publication tests.
- [ ] Commit verified owned files: `feat: retain newly published assets across profile and Market`.

## Next plan

Use the same admission handoff for backed content in `2026-10-21-backed-content-publication.md`. Do not publish a private financial receipt as its Original.
