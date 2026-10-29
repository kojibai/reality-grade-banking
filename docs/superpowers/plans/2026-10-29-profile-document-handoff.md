# Carried profile document handoff implementation plan

> Use superpowers:executing-plans.

**Goal:** Make the existing profile interactive as soon as its complete carried profile is parsed, without waiting for unrelated trailing navigation payload.
**Architecture:** Preserve the same complete public-profile seed, SSR markup, module graph, navigation payload and React components. Run the existing profile entry asynchronously, gating only until the existing profile seed and following navigation element establish that the seed is complete. Never parse an incomplete seed or create a placeholder profile. Ordinary runtime routes retain their current entry behavior.
**Spec:** User request in this chat: remove the Instagram white-frame/handoff hitch using already-carried profile truth; preserve Safari, artwork and all functions.

## Preflight
- Primitive affected: public proof/profile first paint and interactive continuity.
- Source of truth: exact canonical public profile already carried by this document; no new lookup.
- Risk: first-paint/hydration risk if asynchronous entry runs before the full seed.
- Baseline: live main9bd3f5b profile code; no profile changes in later main commits.
- External convention: HTML/module scheduling mechanics only; no product authority.
- Required contract: complete profile starts before the trailing navigation body finishes; incomplete/absent seeds do not start early; entry mounts once; no new source reads; all611items/media/provenance preserved.
- Uncertainty: native Instagram WebKit is not available. Controlled mobile CPU-throttled browser proof is separate from that engine.

## Tasks
- [x] Capture failing production handoff timing and exact document readiness tests.
- [x] Apply scoped entry scheduling change.
- [x] Compare identical carried source before/after: interaction readiness, resource counts, profile identity and images, retained navigation/booking.
- [x] Focused gates, types/build, independent review and scoped main commit preparation. Integration target: the current Bankeiz main head, preserving every unrelated dirty file.

## Review correction
The independent final reviewer identified that late navigation initialization could overwrite the carried profile head and reset focus/scroll after early interaction. Added a regression executing the actual router after an early metadata event and focused/edited profile. It failed with generic @username metadata. The router now adopts the exact current canonical profile head and mounted surface, without treating initialization as navigation. Later explicit navigation still uses the same retained router and profile DOM. No new metadata/source request or authority is introduced.

Ruling: use the document’s existing canonical as the router’s initial rendered path, including existing public runtimes. A missing Learn root does not mean the current runtime document needs another navigation. Offline documents with a different canonical still take the existing render path. Publish initial profile metadata to the existing router at DOM readiness from the same held profile, dropping superseded/forgotten sources. This avoids reconstructing or retaining a second head and stays inside the unchanged shared-public-runtime size budget.

The interactive document stage before deferred navigation is installed is covered separately: metadata waits for the existing DOM readiness event while the navigation payload remains unconsumed. After that existing router has consumed its payload, later metadata publishes immediately. This regression failed before the scoped correction and passed afterward.

## Verification evidence
- Controlled mobile browser, CPU throttled 4×, exact 611-object public profile and a 1,600 ms unrelated navigation tail: baseline complete seed at 178 ms and profile runtime at 2,174 ms. The first corrected run reached the runtime at 531 ms after seed completion at 181 ms (1,996 ms → 350 ms handoff). These are controlled handoff measurements, not native Instagram cold-load measurements.
- 177 profile, public navigation, public runtime and related tests passed across 43 files, including the reviewer’s head/focus/scroll/return regression and superseded-source metadata coverage.
- Fresh whole-patch review raised the late-router continuity issue above; the fix pass uses RED→GREEN regressions. No finding was dismissed by weakening the visible profile or changing a size limit.
- Final production-bundle browser check: complete profile seed at 280 ms, runtime at 623 ms, actual view-switch interaction at 1,024 ms, unrelated document completion at 1,777 ms. The 343 ms handoff saves 1,653 ms against the 1,996 ms controlled baseline. Source identity, original artwork URLs and all 611 carried objects are preserved; there are zero additional profile requests and zero browser errors. Search input, focus, scroll and exact profile head survive late router initialization. Screenshot confirms the actual profile and original artwork, with no contradictory visible evidence.
- Production build passed, including source/archive, offline, conformance, public-page and unchanged public-runtime-size checks. Native iOS Instagram remains the exact untested engine boundary; no native cold-load saving is claimed.
