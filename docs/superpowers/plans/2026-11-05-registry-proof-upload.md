# Registry proof upload implementation plan

Superseded by [the native Receiz publication correction](2026-11-06-registry-native-publication.md). Redis was an application implementation choice and is no longer a dependency.

**Goal:** Let anyone submit an institution's public passing Original from its expanded Registry record and publish a scoped PASS automatically after verification.

**Approved interaction:** The user requested a tasteful upload inside each institution dropdown that verifies the proof and updates its record on success. Preserve the existing directory, header, search and mobile layout.

**Architecture:** Reuse the installed SDK-backed sealed conformance opener. The server checks the passing transcript, holder, exact implementation name and build. Because existing credentials contain no institutional domain binding, compare the exact Original against the institution's curated official HTTPS origin at `/.well-known/reality-grade-banking/conformance.png`. Existing Bankeiz owner binding remains pinned to its published holder. This is publication endorsement, not a new conformance test or manual approval. Save the Original and append-only accepted history before returning PASS. A background public projection updates available static rows without gating page opening.

**Alternatives:** A browser-only update would not change the public record. Accepting only a self-chosen implementation name would permit institutional impersonation. The selected approach verifies the existing proof and its official publication, then uses a server-owned durable index. No private identity upload or new account is needed.

**Storage:** No production store is currently configured. Implement a Redis REST adapter with atomic idempotent append, and a development-only file adapter. Production must fail closed when unavailable and must never report a successful local-only update. Document the required server environment connection.

**Constraints:** Money wording; exact assessed scope beside every PASS; no entry/custody changes; no top navigation changes; preserve other agents' dirty work. Canonical Originals remain evidence, and public display supplies no financial authority.

1. Add shared public record types and independent store tests. Implement durable append, history, exact Original retrieval, idempotency, and unavailable-store refusal.
2. Add admission and HTTP tests with a real canonical Original. Reject malformed/oversized/mismatched proofs, origin redirects, absent official endorsement and storage failures. Wire identical handlers to Vite and production.
3. Add the compact upload form, progressive public projection, safe text rendering, counts/filter updates, pending/error states, and preserved history. Test success and refusal without fabricated PASS.
4. Run focused Registry and canonical proof suites, typecheck, production API compilation/resource smoke checks, frozen entry source guard and rendered mobile/desktop checks. Report storage configuration separately from local implementation.

## Implemented and verified

- Inline uploads, real canonical admission, automatic institution association, durable append/history, exact Original downloads and public revision projection are implemented.
- Canonical HTML carries accepted records for non-JavaScript readers. Its header/hero stream before the bounded saved-metadata read. Dedicated public display caching preserves selected revisions and history offline.
- 80 focused Registry tests, 62 account-entry freeze tests, 102 conformance/held-navigation regressions and 17 API/delivery regressions passed. Some suites overlap; these are separate run counts.
- Typecheck, a production client compilation, social-image check, frozen creation source guard and the real Bankeiz Original checker passed. The emitted production function passed cold-root Original verification, exact resource loading, durable local publication, same-proof retry, public HTML/download and unconfigured-production refusal checks.
- The upload placement and expanded record were inspected in the live narrow preview. Browser file-picker automation stalled, so a complete browser upload and final desktop visual pass were not established; the real HTTP/admission flow was verified through the compiled function.
- The full release pipeline was not rerun over unrelated dirty product-preview work. No push or deployment was performed. Production requires the documented durable storage connection; no such service was provisioned or externally written during this work.
