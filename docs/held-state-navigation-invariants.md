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

## Verification before changing this behavior

Run the relevant static-entry and held-navigation regressions, including `tests/public-delivery-output.test.ts`, `tests/pwa-prepared-documents.test.ts`, `tests/discover-held-navigation.test.ts`, the held Feed/Discover/Explorer runtime tests and `tests/public-navigation-retained-bank-entry.test.ts`. Entry or shared identity/storage changes also require `npm run test:account-entry-freeze`. Never rewrite assertions to authorize a new Source wait or a remounted wallet.

Test actual compiled HTML entry modules as well as source components: Vite can remove exports used only by the external navigation loader. `tests/public-runtime-build-exports.test.ts` verifies the real HTML facade contract. Browser verification must cover first category entry, stalled/unavailable Source, no duplicate document/data reads when held, and return to the exact retained Bank root and bottom navigation.

Keep local, committed, deployed and live-verified results separate. A source test or local commit is not evidence that production has updated.

## Profile header continuity

The accepted anonymous Market transport carries each public profile header once per immutable owner, alongside that owner's Originals. Keep its banner, portrait, profile PBI receipt and other public header fields through the existing cache and saved-document serialization. Header-only transitions participate in display selection even when membership is unchanged. A header's statistics never replace the currently selected complete membership count.

An owner-bound held collection must not trigger a separate profile manifest lookup. Missing header metadata is unknown, not an unsigned profile or an invitation to sign again. A thinner refresh cannot erase an available header for the same still-public owner. Actual privacy, handle and UID changes retain their existing refusal boundaries.

The active owner's already-admitted compact public header may fill missing display fields only within that owner's mounted lifetime. Never copy the owner-only portable export, stats or Original history into anonymous public caches. Entry, custody, profile signing and Original signing retain their separate existing authority checks.
