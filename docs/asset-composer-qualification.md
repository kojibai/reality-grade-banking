# Asset composer qualification · 2026-10-21

Bankeiz supports complete public Originals and optional native backing through
Receiz v129 headless contracts. Receiz's frontend, profile composer and normal
posting flows remain unchanged. No SDK/MCP/AI skill version, verification root or
antirollback rule changes.

## Verified scope

- Bank suite: 373 files, 2,209 tests passed after the final review fixes.
- Bank typecheck, included native-source check and exact rebuild passed.
- Receiz native closure suite: 42 tests passed; final authored/public/routing
  qualification: 3 tests passed; account-entry freeze: 45 tests passed. Changed-file
  lint passed. Genuine source, native execution, public certificate and package tests
  cover owner/source/definition mismatch, mutation, recovery, public privacy,
  funded-offer selection and the same financial asset identity.
- Phone (390px) and desktop (1440px) isolated browser checks cover music, EPUB,
  full text, backing approval, pending delivery retry, immediate successful
  publication, profile/Market retention and native Buy/Take cash review. They
  block external requests and cannot execute a live financial operation.
- The fresh independent review found five Important integration defects. All
  entered one regression-test fix pass: canceled pre-submission signing, current
  native trade heads, quote-cloned membership retention, completed publication
  presentation and editing a source-held draft. No minor findings were deferred.

## Qualification boundary

The Receiz full-application TypeScript run exhausted the Node heap. It is not a
passing full-app typecheck; changed-file lint, genuine execution tests and Bank's
included-source typecheck provide the scoped evidence. Hosted admitted Settlement
funding, production publication and physical-device custody were not exercised.
Deploy the compatible Receiz contracts before the Bank caller. This work applies
no SQL migration, deployment, push, version change or release tag.

The effective composer limits are 64 MiB combined, 200 attachments, 64 MiB for
music/video/PDF originals, 16 MiB for other originals and each attachment, 12 MiB
for cover artwork and 100,000 text characters. Native ownership trades require
genuine available offers; a valuation cannot create liquidity. A public asset
certificate describes native asset state and cannot authorize a payment.

## Decisions and tradeoffs

These are the complete implementation rulings, in plan/task order. They record
why each scoped composition was chosen and its qualification cost.

1. expose the existing exact-byte custody writer as an additive non-UI seam and allow an injected writer on headless preparation — the plan requires canonical File/Blob custody but its input omitted that transport dependency — cost if wrong: preparation/recovery could retain resources in a different custody instance; Task 2 cold-reopen tests pin the shared store.
2. the headless sealer consumes the existing native document preparation/sealer's coordinates rather than minting a second independent profile coordinate — two independently generated anchors can disagree; the enclosing canonical source remains authoritative — cost if wrong: profile source projection could need an explicit coordinate adapter, covered by canonical opening tests.
3. the sealer dependency accepts the exact subset of the existing sealer result that preparation uses; genuine canonical fixture sealing supplies those fields — no verifier or root trust bypass — cost if wrong: a missing required production field is caught by scoped types and generated composition rebuild.
4. effective initial authoring capacities remain bounded by the existing 64 MiB per-artifact and 512 MiB aggregate complete-source consumer, below configured 10 GiB ceilings; expose maxAttachmentBytes as well — upload settings do not establish cold-read capacity — cost if wrong: overly conservative authoring limit until Task 2 qualification supports a larger selected path.
5. advertise 64 MiB aggregate, 64 MiB opaque audio/video/PDF primary, 16 MiB image/EPUB/generic primary and attachments, 12 MiB cover — structured privacy parsers materialize up to 16 MiB; 512 MiB transport budget also needs room for existing Showcase ancestry — cost if wrong: conservative upload limits; no privacy bypass or verifier-budget increase.
6. retain existing Connect upload-grant implementation and cover it with existing upload-plan suite rather than duplicate guards — it already enforces 16-reference batches and issued targets — cost if wrong: qualified by transport tests, new resource closure must export through this same publisher.
7. extract unchanged metadata and source-reference types into pure modules; Bank reuses the same manifest validator from included source — importing the original source-reader type pulled its entire canonical runtime into Bank typechecking, with unresolved Receiz-only aliases — cost if wrong: import compatibility, covered by legacy/public source suites and composition rebuild. No Receiz page/component import added.
8. open only the primary content and separate essay in the existing media viewer; other committed attachments remain individually downloadable through closed selectors — eagerly decoding 200 attachments would add unnecessary memory and network work — cost if wrong: attachment viewing is explicit through existing attachment links rather than all files being eagerly decoded.
9. composer-specific primary readers use their effective media limit; legacy source limits stay unchanged — the compact manifest transports media outside the old 16 MiB JSON reader — cost if wrong: explicit large-media opening consumes up to the qualified bounded resource size, covered by capacity qualification; no global verifier limit increase.
10. split headless preparation into retained content construction and canonical sealing, keeping existing prepare(draft) as their composition — exact content descriptors permit the existing publication intent controller to detect retries without sealing twice or hashing media twice; both phases use the same custody writer. Cost if wrong: extra non-UI contract surface, pinned by canonical preparation/retry tests.
11. carry the existing closed AssetDefinition as optional metadata in the v2 content — supply/code cannot disappear when moving from the old inline JSON form. Bank new composer defaults its linkedProofDigest to null; legacy held-proof linking remains available through unchanged createAsset callers. Backed authored linkage belongs to the approved later native-source admission task.
12. public display overlays retain curated metadata and selected artwork, while exact bytes remain in the existing vault — avoids storing a second public proof authority or materializing all attachments — cost if wrong: fallback may require reopening retained custody after reload.
13. no speculative profile-header fetch on creation — existing profile request/retention supplies its header and verified admission supplies the new item — cost if wrong: an uncached header still waits for its ordinary read.
14. retain the exact canonical authored-source block closure in existing financial exact-byte storage before planning; record source reference and owner in the accepted command, validate alias against admitted account, and re-open that retained closure under existing writer locks — supports cold recovery without relying on public discovery — cost if wrong: additional storage proportional to new authored content.
15. stage authored blocks using the existing authenticated initialize/PUT/commit transport without Showcase finalization — funding must admit the complete source before a public listing exists — cost if wrong: block storage can remain for canceled drafts.
16. compose the canonical authored source with the same native asset's closed public certificate using headless source contracts only; no Receiz composer UI or normal post flow changes — optional backing is Bank-only UI — cost if wrong: larger source closure for backed objects.
17. keep the native asset current-source commitment public even when its bytes also identify an accepted financial transition; exclude private account head fields and account/key/authorization identifiers — the existing native asset identity requires this public coordinate — cost if wrong: a public observer can correlate that asset's own public transition hashes.
18. commit Tasks 1–3 together in Receiz because their protocol/runtime/source projection changes share exact files, then sync and commit Bank — keeps caller and native contract coherent — cost if wrong: less granular revert boundaries.
19. distinguish local never-submitted choreography from a signed financial zero-write — write-before-submit checkpoint absence is checked under the native execution lock, while any retained checkpoint requires original nonce recovery — cost if wrong: a lost/corrupted custody store must refuse rather than infer a financial result.
20. add a closed stable assetId selector only for native Buy/Take cash; the existing preparation read binds its exact current head and funded offer into signed review/plan — old exact-source requests continue refusing stale heads — cost if wrong: caller and backend must be deployed together before native public trading.
