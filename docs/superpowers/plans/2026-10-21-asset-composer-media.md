# Asset Composer Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user selected implementation here on main.

**Goal:** Create complete, typed public assets in Bankeiz with independent primary media, cover and attachments and recoverable larger-file delivery.

**Architecture:** Add a headless composition of Receiz's existing source preparation, native document sealing, exact-byte custody and complete-source publication. A compact sealed content manifest commits file roles and exact-byte references; raw file bytes remain in canonical custody and transport. Existing v1 originals keep their original reader.

**Tech Stack:** TypeScript, File/Blob, existing v129 canonical verifier/sealers and exact-byte blocks, React/Vite in Bank, Node test runner and Vitest.

**Spec:** `docs/superpowers/specs/2026-10-21-asset-composer-and-publication-design.md` (approved 21 October 2026).

## Global Constraints

- Receiz's frontend, composer UI, styling and user flows remain unchanged. New form controls and presentation belong to Bankeiz only.
- Do not base64-expand every attachment into the authored JSON.
- Use existing complete-source block transport, stored-block reuse and final closure: 1 MiB blocks in batches of at most 16.
- Existing v1 moments remain readable with their exact historical contract.
- Show the narrowest qualified effective limit before processing; configured 200 attachments / 10 GiB aggregate, 12 MiB cover and 100,000 text characters are ceilings, not qualified capacities. The current media sealer's 500 MiB cap and complete-source execution budgets still apply.
- Keep SDK/MCP/skill package pins at 129.0.0, financial roots and antirollback unchanged. Regenerate native application compositions from included source; never hand-edit generated modules.
- Work on the existing main checkouts, explicitly stage owned files, preserve unrelated changes, and do not push, deploy or publish live assets.

## Review Focus

1. A cover selected before the primary must never become the song/book payload (Task 1).
2. A removed/reordered file, duplicate ID or byte change after preparation must not reuse the wrong commitment (Task 1).
3. Interrupted delivery must resume the same committed bytes and skip stored blocks (Task 2).
4. A 200-file configured allowance must not hide a smaller source execution limit or cause an unbounded allocation (Task 2).
5. Legacy moments and separately authored long form must still open correctly beside EPUB/PDF/media (Tasks 3–4).

## File and interface map

Paths prefixed **Receiz** are relative to `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bankeiz-assets-main`; other paths are relative to this Bank checkout.

- Create Receiz `app/lib/profile/composerPreparation.ts`: non-UI draft, manifest and capacity types/validation.
- Create Receiz `app/lib/profile/composerPreparation.client.ts`: compose existing mint/anchor, document/media seal and source custody helpers. Do not edit or import the runtime of `app/u/[username]/*.tsx`.
- Extend Receiz `app/lib/profile/showcase/{bankAssetContent,importedSource,importedSourceProjection,importedSourceResource.server,completeSourceTransport,connectedAssetPublication.client}.ts`: verified manifest extraction, complete resources and typed delivery.
- Extend Bank `src/receiz/asset-publication{,-runtime}.ts` and `native-identity.ts`: prepared source custody and recovery, preserving existing APIs for v1 callers.
- Create Bank `src/receiz/asset-composer.ts`, `src/features/assets/AssetComposer.tsx` and `asset-composer.css`; update `CreateAsset.tsx`. Keep `asset-moment.ts` and old `MomentComposer.tsx` for compatibility fixtures/readers.

New headless types in `composerPreparation.ts`:

```ts
type ComposerMediaKind = 'moment'|'image'|'audio'|'video'|'epub'|'pdf'|'file';
type ComposerFileDraft = Readonly<{id:string;file:File;role:'primary'|'cover'|'attachment';attachmentRole?:'source'|'appendix'|'dataset'|'contract'|'receipt'|'research'|'other';description?:string}>;
type ComposerAssetDraft = Readonly<{title:string;description:string;kind:ComposerMediaKind;longForm:string;files:readonly ComposerFileDraft[];music?:ProfileOriginalAudioDistribution;book?:ProfileOriginalEpubMetadata}>;
type ComposerCapacity = Readonly<{maxAttachments:number;maxTotalBytes:number;maxPrimaryBytes:Readonly<Partial<Record<ComposerMediaKind,number>>>;maxCoverBytes:number;maxTextCharacters:100000}>;
```

Use existing metadata types from `app/lib/profile/types.ts`. `PreparedComposerSource` contains `artifact:File`, `reference:ImportedProofSourceReference` and `content:ComposerAssetContent`; the manifest's file descriptors contain the draft ID/role/description plus filename, MIME, size, SHA-256 and `bytes:ExactByteBlockReference`. Exact bytes live in existing imported-source custody. The manifest schema is `receiz.bank.asset-content.v2`, interpreted only after canonical enclosing-source verification. It is not a new admission authority.

### Task 1: Prepare explicit media roles beneath canonical source sealing

**Files:** Create the two Receiz preparation modules and `app/lib/profile/__tests__/composerPreparation.test.ts`; extend `showcase/bankAssetContent.ts` without changing its v1 branch.

**Interfaces:** Produce `validateComposerAssetDraft(draft:ComposerAssetDraft,capacity:ComposerCapacity):ComposerAssetDraft`, `readComposerCapacity():ComposerCapacity`, and `prepareConnectedComposerSource(input:{draft:ComposerAssetDraft;ownerReceizId:string;sealDocument:typeof receizeDocumentBytesClient;assertCurrent():void}):Promise<PreparedComposerSource>`.

- [ ] Write tests `cover_before_song_keeps_audio_primary`, `edited_bytes_require_new_commitment`, `duplicate_file_ids_reject`, and `book_and_long_form_are_independent`. Assert roles `['cover','primary','attachment']`, unchanged source SHA-256, and separate EPUB and long-form text. Use canonical sealing fixtures rather than a stub verifier.
- [ ] Run from Receiz: `TSX_TSCONFIG_PATH=tsconfig.scripts.json node --import tsx --test app/lib/profile/__tests__/composerPreparation.test.ts`; confirm failures name the missing behavior.
- [ ] Implement the interfaces by composing existing local mint/anchor, native record sealing and incremental File/Blob hashing helpers. Validate roles before hashing; retain draft IDs/order and exact original bytes. Cover editing produces a separately selected cover, never a replacement primary. No Receiz component changes.
- [ ] Rerun the tests and the existing `showcase/__tests__/importedSource.test.ts`; both must pass, including v1 extraction.
- [ ] Commit the owned Receiz types, source implementation and tests: `feat: prepare typed composer sources without UI dependencies`.

### Task 2: Deliver complete resources with bounded, authenticated custody

**Files:** Extend Receiz `showcase/{importedSource,importedSourceCustody.client,completeSourceTransport,connectedAssetPublication.client,connectedPublicationHttp.server}.ts`; extend Bank `asset-publication-runtime.ts`. Add Receiz `showcase/__tests__/composerResourceClosure.test.ts` and Bank `tests/asset-composer-transport.test.ts`.

**Interfaces:** Add `prepare(draft:ComposerAssetDraft):Promise<PreparedComposerSource>` to the existing connected publication runtime. Its `publish(file:File)` remains compatible and resolves manifest resources from canonical custody. Reopening a prepared source accepts the existing `resolveSourceBlock` option; it must close all manifest resources before success.

- [ ] Write tests `retry_reuses_stored_blocks`, `foreign_upload_target_rejects`, `manifest_missing_resource_is_pending`, and `effective_capacity_bounds_every_read`. Assert exact 1,048,576-byte maximum block bodies, at most 16 references per plan, and identical source digest/placement on response loss. A File whose whole-file `arrayBuffer()` throws must still complete the supported streaming path; missing resources cannot report `published`.
- [ ] Run the new files with the native Node test command above and `npm test -- tests/asset-composer-transport.test.ts --maxWorkers=2`; verify RED.
- [ ] Extend existing block initialization/commit/finalization through Connect, preserving current account/scope checks and issued signed targets. Walk the manifest's committed resources as dependencies of the existing complete source, not as caller-authorized locators. Bound hashing, read concurrency, nested-source traversal and retained memory. Advertise only capacities proven by cold reopen/playback/download; do not increase a global verifier budget to make a fixture pass.
- [ ] Run the new tests plus Bank's existing publication transport/upload-plan suites. Qualify the selected effective boundary and boundary+1 for each supported media path, interrupted upload, cold custody reopening and download byte equality; record actual file sizes and peak memory. At least one complete creation fixture must exceed the former 6 MiB limit.
- [ ] Commit owned transport/custody changes in each repo: `feat: deliver typed composer resources through canonical custody`.

### Task 3: Preserve typed media and artwork through public opening

**Files:** Receiz `showcase/{bankAssetContent,importedSource,importedSourceProjection,importedSourceResource.server}.ts` and their existing tests; Bank `src/receiz/{public-market,public-asset-embed,public-document,public-asset-manifest}.ts`, corresponding tests, and `proof-media.ts` where its resource classifier requires the same coordinate.

**Interfaces:** Extend `readBankAssetContent` with the verified v2 manifest case; preserve the exact v1 contract. `projectImportedSourceOriginal` maps the explicit primary and cover to existing `ProfileOriginal.media`, music/book metadata, attachments and long form. Resource delivery uses a closed manifest file ID, never an arbitrary URL or filesystem path; legacy `assetFile=0..7` remains valid.

- [ ] Write round-trip tests for image collections, song+artwork, EPUB+cover+essay, PDF, video+poster, text and mixed attachments. Assert exact title, metadata and roles, primary/cover digest equality, attachments beyond index 7, range responses and byte-identical downloads. Reject unknown/duplicate file selectors and mutated resource bytes beneath the enclosing source.
- [ ] Run the affected imported-source tests and Bank public media/document/manifest tests; confirm RED.
- [ ] Implement the projections and narrowly scoped URL parsers. Reuse existing readers/players and supplied artwork immediately; do not change Receiz JSX/CSS or launch a second metadata fetch.
- [ ] Rerun these tests plus legacy imported download fixtures; all media families must cold-open with their correct existing Bank reader.
- [ ] Commit: `feat: preserve composer media roles in public asset projections` in each affected repo.

### Task 4: Ship the adaptive Bankeiz form through the existing creation flow

**Files:** New Bank adapter/form/CSS above; `CreateAsset.tsx`, `native-identity.ts`, `asset-publication.ts`; tests `asset-composer.test.ts`, `asset-composer-ui.test.tsx`, `asset-publication.test.ts`; browser fixture `tests/browser/asset-composer.{html,tsx}`; `docs/public-asset-publication-v129.md`, native source/manifests/generated outputs.

**Interfaces:** Produce Bank `AssetComposerDraft` as the headless draft type and `AssetComposer({value,onChange,capacity})`. Preserve `createAsset(definition,moment?)` for legacy callers; add `createComposedAsset(definition:AssetDefinition,draft:AssetComposerDraft):Promise<HeldDeposit>`. The source, intent and resource custody survive retry under the existing identity lifetime lock.

- [ ] Write form tests for independent cover/primary/removal/order, adaptive fields and exact capacity errors before hashing; creation/recovery tests assert one seal and the same source on retry. Existing plain backed creation must still use automatic Reserve-first funding until the backed-content plan is complete.
- [ ] Run those suites and confirm RED before integrating the new adapter.
- [ ] Build Bank-only controls in the existing sheet style: Create an asset, Title, Description, appropriate primary media, optional cover/attachments and separate long form. Put supply/code/proof details beneath a disclosure. Keep a draft on correctable failures and show delivery separately from sealed custody. Load the runtime only on explicit creation, with no new work on ordinary page load.
- [ ] Regenerate changed included Receiz source and manifests using `scripts/rebuild-native.mjs --refresh-composition --output <temporary-output-directory>` and copy its generated outputs through the documented native source inventory workflow. Run `npm run native:check`, `npm run typecheck`, `npm test -- --maxWorkers=2`, `npm run build`, and browser checks at 390/1440 px. Record supported capacities and any unqualified paths; do not claim live hosted publication from fixtures.
- [ ] Commit verified owned Bank changes: `feat: add complete adaptive asset creation`.

## Next plans

Continue with `2026-10-21-asset-publication-adoption.md`, then `2026-10-21-backed-content-publication.md`. These plans use the preparation types and canonical source custody above; neither creates another uploader or asset listing service.
