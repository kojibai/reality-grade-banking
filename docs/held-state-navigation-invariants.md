# Static entry and held-state navigation

Static entry and accepted, already-held display state are sufficient to open the existing interface. Freshness is not a prerequisite for showing that interface. This applies to the native homepage, public runtime navigation, return to the app, and worker handling.

The Source-gated homepage in ffc29835 and duplicate prepared-document navigation introduced unnecessary waits. Do not reintroduce those mechanisms under a different name.

## Required behavior

- `/` uses the existing immutable static Bank entry. Its response and interactivity do not wait for a Source request, a prepared-public-document HEAD, or a large public catalog tail. Preserve the frozen creation path.
- A held complete public family is reused by reference. Opening Feed, Discover or Explorer does not download another HTML/catalog representation, hash it again, parse it again or reopen its source. Keep the selected Bank family authoritative; display timestamps cannot replace that selection.
- Keep mounted public and Bank roots, inputs, images, scroll state and bottom navigation. Return navigation reveals the existing app and preserves its destination.
- A newly accepted publication follows the existing publication/admission pipeline. Update the affected saved projections when state changes. Preserve prior accepted history; do not reconstruct or reverify it to compensate for a missing publication transition.
- Persist the public state actually selected by the reader. A later, thinner response must not discard compatible prices, share history, artwork or proof/card presentation that the reader still holds. A response that was superseded before selection must not overwrite the saved state.
- Restoring saved public state must preserve its response association through the next accepted update and reopening. Reuse the existing public cache when the complete input exceeds localStorage capacity; a failed save must keep the previous durable copy and available interface intact. Cached public display never supplies a Source-currentness verdict or financial authority.
- Profile entrances reuse the held complete profile, or the exact public catalog's owner-bound Originals, carried header and existing deterministic artwork. Publication carries changed header data into the saved public state before a visit. A link, tab return, missing header field or display clock must not trigger a separate manifest lookup for a held collection; preserve known privacy refusals and exact UID bindings.
- A profile's current capitalization uses already-priced compatible share inventory without waiting for local historical-curve preparation. Missing historical evidence remains missing; never infer quantities or invent a curve to fill it. Late profile responses must not replace a newer selected collection, owner or confirmed metadata.
- When distinct data is genuinely absent, use its existing bounded reader and keep available state visible. Do not turn its request into an unrelated page-opening or account-entry requirement.
- Public display is not financial authority. Preserve installed SDK admission, integrity, ownership, identity, custody, consumption, conflict and transaction checks for new input and financial actions. Do not replace these with permissive mocks.

## The public Showcase display law

Accepted public Showcase membership determines which public Originals Bankeiz displays. The installed SDK remains responsible for proof admission and financial authority. These are separate responsibilities: rendering an already-held public Original must not reopen its Source or acquire another server verdict. A displayed Original does not by itself establish available shares, balances or permission to transact.

Use this order:

1. Open the existing static interface with the complete selected public family already carried or retained by the reader. Reuse its object references, owner bindings, header, artwork, compatible inventory and history.
2. Project Profile, Explore, Market, Feed and Ledger from that shared collection. Preserve explicit privacy refusals and exact handle/account UID bindings. Do not introduce an independent per-page eligibility list.
3. Receive genuinely new accepted input through the existing SDK publication/discovery path. Preserve the accepted prefix and apply the supported transition. Publish and retain the selected successor for the shared consumers; a failed persistence attempt must not erase their current view.
4. Fetch only genuinely missing operands through their existing bounded reader, independently of opening the available page. An unseen remote addition still has to reach the device; proof authority does not imply possession of bytes the device never received.

Never make an available public view conditional on any of the following:

| Prohibited pattern | Why it breaks the contract |
| --- | --- |
| Awaiting a prepared HTML GET/HEAD, profile manifest or Source freshness check before sending browser entry | A remote lookup blocks display of data already held. |
| Returning early from membership refresh merely because an older saved family exists | The stale prefix stays selected even though Showcase already contains a successor. |
| Service-worker renewal of a prepared page before opening installed or held bytes | Installed navigation inherits an unnecessary network delay or failure. |
| Reconstructing or reverifying accepted history to display one new Original | It repeats work and can exceed transport/runtime limits; apply the supported append/transition to retained operands. |
| A database table, API success, cache timestamp or rendered page acting as proof authority | It substitutes delivery/projection state for the installed SDK's integrity and custody laws. |
| Deleting the complete held catalog to repair a page's wrong content or seed | The page template and the reader's held proof collection are distinct. Fix the template boundary without discarding accepted data. |
| Replacing a custom portrait/banner with generated defaults to avoid an image request | Deterministic defaults do not reproduce an uploaded image. Carry or reuse its exact supported public bytes. |
| Hiding available content until a timer, animation or unrelated image finishes | It introduces an artificial wait. First-frame styling must be inline and yield immediately to the ready profile. |

The November 2026 regression had a complete Receiz collection with 1,686 Originals, including 613 for bjklock, while Bankeiz carried 1,685 and 612. The missing Original was already public; the display-opening and refresh gates did not advance the held list. Commits `d97b9b81` and `d96e830f` removed those gates, refreshed the existing input through its membership-only operator, and carried exact custom artwork. The transferable lesson is to trace the actual selected collection and delivered entry, not infer success from a preparation helper passing.

## First-frame and media continuity

### First-frame implementation contract

Show everything the held data supports immediately; attach interactivity afterward. Use the existing presentation components for both the first HTML and the interactive view. Prepare reusable public presentation during the existing build or accepted state transition. Keep data-dependent work bounded to the selected object, and keep each existing seed once. A replica, splash, timer, extra catalog, Source request or identity operation must not stand between available data and its real interface.

- Asset entry paints the selected Original's actual layout, owner, artwork and carried values. It does not resolve the whole catalog or reopen the proof to display it.
- Receipt entry renders the exact receipt already carried or resolved by its existing reader. Reuse its schema, evidence distinctions and formatting; do not fetch it again during hydration.
- Receipt → Ledger carries the selected shareable receipt into the existing view immediately. A stale or unhydrated global projection cannot hide that selected record. Keep it separate from public archives, coverage, totals and canonical history; prefer the exact matching canonical row when available. Only a genuinely missing short receipt uses its existing reader. Refuse mismatched record/source links and late selection overwrites.
- Verification entry paints the real reader and file picker. SDK verification begins through its existing reader; HTML never claims a verification result.
- Booking preserves its static normal entry. Paint the real booking frame and any held host data immediately; genuinely missing availability and confirmation use their existing reader and command. Do not add a server lookup to its normal static route.
- A known PBI signature remains visible for the exact Original and owner when a creation result is reopened or an older delivery completes. Preserve the held signature and delivery state without signing again or treating a public projection as transaction authority.
- Opening the held in-app Market must not await a new public document, source refresh or historical preparation. Retain its root and supported data; new input updates the existing view.

Qualification requires compiled HTML with JavaScript unavailable, blocked-API browser startup, hydration without replacing the first-frame DOM, exact source/owner refusals, and signing/delivery race regressions. Preserve account entry and the SDK's verification, custody and action boundaries. Run the production CLI and relevant complete tests before release.

### Proof download and offline-kit contract

A transaction proof download returns the exact enclosing source artifact, including its existing proof bundle, signatures, packages and carried continuity. Reuse already admitted source bytes; do not reseal a projection, reconstruct history or weaken verification. The inspector's display JSON and Wallet hash capsules are not substitutes for that artifact. Copying display details remains a separate explicit operation.

A verification kit must include the selected digest-bound original, the canonical offline verifier, its public verification material and complete corresponding sources, browser and Node entry points, instructions, licenses and a checked file inventory. If the original or a required verifier resource is absent or changed, refuse the complete-kit download. Do not silently deliver an archive without its proof. Test the extracted ZIP's actual verifier with network disabled and altered-source refusal. Its verdict covers the claims and continuity carried by the object; it does not establish current spendability or invent missing predecessors.

The older `wallet-ledger-v1` capsule format contains SHA-256/JCS consistency fields. An event ID, `bundleHash`, `capsuleHash`, generated `kaiSignature` or public URL does not supply a missing enclosing artifact. Trace the exact accepted transaction source before claiming that every historical transaction has an offline-verifiable original. Keep such missing-source gaps explicit until their original source is recovered.

For a known public profile, the initial response must already contain the real profile HTML rendered from the same carried catalog. Prepare that presentation during the existing build/state preparation, reuse the existing profile components and keep the complete catalog in its one shared carrier. The browser hydrates that page while local decoding and module startup finish; it must not show a seal, splash, loading replica or timed intermediate screen. No Source lookup or runtime profile rendering belongs before those bytes. A genuinely missing profile can use the existing bounded reader without erasing available page chrome.

Generate default portrait/banner artwork locally from the existing deterministic coordinates. Preserve exact custom image bytes when carried; a URL alone is not the image bytes. Prepare the existing bounded Feed neighbors before they enter the viewport, prioritize the current image, and keep the existing mount/memory bounds. Do not download or mount the entire collection to solve a single image flash.

## Verification before changing this behavior

Run the relevant static-entry and held-navigation regressions, including `tests/public-delivery-output.test.ts`, `tests/pwa-prepared-documents.test.ts`, `tests/discover-held-navigation.test.ts`, the held Feed/Discover/Explorer runtime tests and `tests/public-navigation-retained-bank-entry.test.ts`. Entry or shared identity/storage changes also require `npm run test:account-entry-freeze`. Never rewrite assertions to authorize a new Source wait or a remounted wallet.

Test actual compiled HTML entry modules as well as source components: Vite can remove exports used only by the external navigation loader. `tests/public-runtime-build-exports.test.ts` verifies the real HTML facade contract. Browser verification must cover first category entry, stalled/unavailable Source, no duplicate document/data reads when held, and return to the exact retained Bank root and bottom navigation.

Before claiming end-to-end completion, verify both the held view and its next transition:

- Test actual compiled browser Profile, Explore, Market and Ledger with API responses stalled. Confirm the expected full count, newest asset ID/digest and compatible inventory; do not substitute an owner-only local view for anonymous public rendering.
- Test a later accepted Showcase addition, shared-surface adoption, persistence, and cold reopen against an older shipped seed. Include empty withdrawals, privacy/UID changes, thinner inputs, failed storage and superseded responses.
- Test worker first navigation without a previously visited page and runtime return to the exact retained Bank root. Keep zero-read, no-remount and history-prefix assertions intact.
- Verify custom image bytes and offscreen Feed preparation in the actual browser. A source-level `loading` attribute alone does not prove the image is decoded before it is seen.
- Run the relevant regressions: `profile-prepared-family`, `profile-held-market`, `public-held-reuse-alignment`, `public-membership-persistence`, `public-market-seed-history-continuity`, `public-delivery-output`, `pwa-prepared-documents`, `pwa-held-public-navigation`, and the held navigation suites. Qualify the exact committed production build separately from other agents' uncommitted code.

Keep local, committed, deployed and live-verified results separate. A source test or local commit is not evidence that production has updated.

## Profile header continuity

The accepted anonymous Market transport carries each public profile header once per immutable owner, alongside that owner's Originals. Keep its banner, portrait, profile PBI receipt and other public header fields through the existing cache and saved-document serialization. Header-only transitions participate in display selection even when membership is unchanged. A header's statistics never replace the currently selected complete membership count.

An owner-bound held collection must not trigger a separate profile manifest lookup. Missing header metadata is unknown, not an unsigned profile or an invitation to sign again. A thinner refresh cannot erase an available header for the same still-public owner. Actual privacy, handle and UID changes retain their existing refusal boundaries.

The active owner's already-admitted compact public header may fill missing display fields only within that owner's mounted lifetime. Never copy the owner-only portable export, stats or Original history into anonymous public caches. Entry, custody, profile signing and Original signing retain their separate existing authority checks.

## Preserve Bankeiz application adaptations

Receiz application files and the Bankeiz native composition can have different working baselines. Apply an upstream change against its exact recorded preimage, carrying forward Bankeiz's existing application patches. Replacing a Bankeiz file with an upstream after-image is insufficient when those baselines differ. Preserve PBI ceremony order, local admission, durable signed delivery, recovery, HTTP error mapping and account entry.

A successful native build establishes compilation and source consistency. Qualify the actual signing, cancellation, retry and interrupted-delivery behavior separately. Reopening a publisher in the same bundled module does not establish cold recovery: durable accepted SDK state must survive a fresh module and browser restart, using the existing SDK custody and verification contracts. A module memo is not durable custody.
