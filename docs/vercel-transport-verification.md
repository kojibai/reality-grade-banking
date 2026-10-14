# Vercel transport and proof-object wording — October 14, 2026

## Observed failure

The user deployed bank commit `3313e813a3b964f432fee0d93aa3c37e35678264` as Vercel production deployment `dpl_ChEMtiQzD2fSQF77zznppufNFpfh` and supplied the entrance error `offline_seal_enrollment_failed:404`. The project is framework Vite, Node24, with Vercel aliases including bank-mauve-mu.vercel.app. That commit had Vite-only middleware and no production API entry. The selected bank.receiz.com custom domain is not yet listed on this project.

## Fix

- One Web-standard Node entry, `api/index.ts`, routes through the same native account, public Market and public Ledger middleware as the local preview. It preserves request bytes, existing route/method/origin restrictions, fixed Receiz destinations, private no-store responses and public/private cookie isolation. No private account value, signing material or session is added to caches or logs.
- `vercel.json` uses the unnamed `/api/bank/(.*)` rewrite to `/api/index`. A named `:path*` initially reproduced unwanted query injection in the actual generated output (`/api?path=$1`); the corrected output reaches `/api/index` without changing query coordinates. The callback path goes to the frontend. Unknown API routes return errors, not an HTML success page.
- The compiled Node import initially reproduced `ERR_MODULE_NOT_FOUND`; explicit `.js` specifiers on the server-reached TypeScript imports fix that independently of Vite's loader.
- Completed response bytes are emitted in 64 KiB backpressured chunks. The real public graph response is larger than Vercel's buffered response cap. A 5 MiB fixture regression verifies bounded streaming and exact complete bytes. Existing upstream read bounds remain in place.
- Consent now says “open my account using my Receiz proof objects and read my Reserve and Settlement balances.” SDK scope identifiers and access effects are unchanged. Account-loading copy also uses account/proof wording. The existing entrance layout and actions are preserved.

## Environment

**No required application environment variables.** The dedicated public application ID remains in source, SDK/MCP/AI Skills stay129.0.0, and no client secret is used. Receiz's existing signer configuration remains on Receiz; its private root or bearer must not be copied into this bank frontend. `RECEIZ_BANK_QUALIFICATION_DIAGNOSTICS` is an existing optional operator diagnostic, not required for startup or this fix.

The local Vercel build used only the existing bank project's public IDs/settings and an empty local app environment. `.vercel/` is ignored. No remote project setting, identity, credential, account balance or financial state was changed; the task does not push or deploy.

## Verification

- Actual local production build with official Vercel CLI64.0.2 emits `api/index.func` for Node24 and the corrected routes.
- `npm run vercel:check` loads the emitted JavaScript without Vite and verifies rewrites, exact enrollment request bytes, upstream error propagation, no-store/cookie isolation and unknown-route refusal. Its upstreams are explicitly dummy fixtures; it enrolls no device.
- Real GET-only smoke requests through the compiled function returned scopes401 without credentials, public graph200 (7,579,429 bytes), and public membership200 (1,468,558 bytes). No identity or token was sent. These are transport/public-source observations, not proof authority or live account qualification.
- Focused API tests cover exact UTF-8 request bytes, original binary proof bytes, query coordinates, public graph, cross-origin/arbitrary-route/method refusal and the streamed 5 MiB case.
- A fresh read-only review identified the named-rewrite defect. The targeted fix pass verified the generated routes, compiled import and stream behavior and found no remaining Critical/Important issues in this transport patch.
- An isolated browser origin5199 rendered the corrected entrance copy, both existing buttons and no framework overlay. Browser warning/error log was empty. No Enter/import/enrollment action was performed. Screenshot: bank-proof-object-entrance.png in the task visualization directory.

Final verification: **217/217 tests across61files**, typecheck, the actual local Vercel production build, `vercel:check` and diff whitespace checks passed. The isolated browser copy check had no warning/error entries.

## Remaining limits

The new handler must still be pushed and deployed by the user, then actual identity enrollment/import must be checked there. User-operated live account/financial actions have not been qualified. The existing SUBJECT_OWNER_CONFLICT, custody issuer/source, atomic funded bank operations, wire instructions and full financial review remain as recorded in launch-status.md.

Vercel incoming requests remain capped at4.5MB even though the local middleware supports larger sources; larger remote proof uploads need a qualified Receiz-native transport. Streaming handles large responses without inventing another provider or storing them externally. The intended bank.receiz.com domain must be connected for the configured cross-device QR/NFC origin.

Official references: [Node functions](https://vercel.com/docs/functions/runtimes/node-js), [rewrite parameters](https://vercel.com/docs/project-configuration/vercel-json#route-parameters), [body size and streaming](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).
