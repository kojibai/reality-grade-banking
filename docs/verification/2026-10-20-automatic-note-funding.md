# Automatic Note funding and account presentation

This checkpoint is an implementation candidate for deployed qualification. No production migration, identity operation, monetary issuance, transfer, claim, refund or deployment was performed.

## Changed

- One Note amount, with automatic Reserve-first funding and Settlement for the remainder. No source selector. Only combined funding shows two contributions.
- Reserve Note and Settlement Note remain distinct originals. Settlement Reserve Note uses the matching engraving and **Proof-backed Native value** caption. Settlement and combined USD print values identify value at creation; exact accepted Phi is preserved.
- Signed composite parts survive issue, funding source, recipient-bound handover, original PNG, private opening, refund, credit, local receipt and proof inspection. Source bytes, roots, signatures and exact operation remain authoritative.
- Existing Wallet compatibility now has its explicit connected Note writer in Receiz commit `78e49df11`. Selected native custody failure cannot enter this writer. Both paths enforce Reserve-first; qualified offline requirements are unchanged.
- Review reads one quote without creating a Note key or checkpoint. Confirmation uses that exact amount and quote. Input edits during review and expiry across asynchronous prerequisites cannot alter the reviewed intent. Unknown outcomes recover the same retained request.
- The balance popover presents one available balance, familiar local time and a collapsed Balance details disclosure containing Settlement, Reserve, source timing and proof-continuity information. It adds no request, polling or balance source.
- Learn, public presentation, Note save/share titles, conformance inspection, offline assets and repository contracts reflect all three designs. Complete corresponding source and generated verifier composition remain reproducible from included v129 inputs.

## Checks

| Check | Result |
| --- | --- |
| Bank tests | 290 files, 1,790 tests passed |
| Bank TypeScript and full production build | Passed |
| Native corresponding-source and pinned resources | Passed; 1,899 source/package files |
| Exact native module reproduction | Passed |
| Current browser reference checks | 7/7 passed; exact report retained in `2026-10-20-composite-browser-resources.json` |
| Receiz composite source suite | 4/4 passed, including resealed split tampering, exact refunds and zero-refund cancellation |
| Receiz compatibility suite | 2/2 passed with real isolated PostgreSQL, actual migrations and canonical Note proofs |
| Receiz compatibility permissions | RPCs execute as non-superuser service_role; actual anon/authenticated calls refused |
| Existing native financial regressions | 18/18 passed; connected writer 5/5 passed |
| Selected-source wiring and failure isolation | 4/4 passed |
| Governance controls, evidence and artifact signature | Passed |
| API security, account-entry freeze, primitive binding and release lock | Passed |
| Scoped Receiz ESLint and diff checks | Passed |

Independent review identified and verified closure of three issues: native pure Settlement bypassing Reserve-first, mutable amount during asynchronous review, and expiry during awaited prerequisites. The initial native author TypeScript check passed. A later nonincremental whole-Receiz recheck exceeded Node's 4 GiB heap; that terminated check is not represented as a pass.

## Rendered verification

Browser plugin was unavailable; local Playwright with installed Chrome was used. At 390 × 844, Note review showed $100 total, $60 Reserve and $40 Settlement, no selector and no horizontal overflow. The balance popover began collapsed, expanded its technical breakdown and also rendered at 1280 × 900. No application page errors or framework overlay appeared. The incidental fixture favicon 404 carries no application data. Complete Note artwork rendered at 3240 × 1944; the unissued public specimen is 1620 × 972. Screenshots and temporary browser scripts remain outside the repository under `/private/tmp/`.

These were interface fixtures with no connected account, custody or money. They establish rendered behavior, not financial admission or real iPhone qualification.

## Deployment and qualification boundary

The inspected compatibility database did not contain the base Bank Note schema. Install, in order, Receiz migrations `20261015012532_bank_offline_notes_native.sql` and `20261020204430_bank_connected_note_compatibility_wallet.sql`, then deploy the selected host and Bank commits. Missing schema produces the bounded `BANK_NOTE_COMPATIBILITY_SCHEMA_REQUIRED` diagnostic. No request installs schema or chooses an alternate writer after failure.

Compatibility backing follows the existing Wallet quote conversion capped by actual owned Phi; native custody preserves its original Reserve backing. Positive native Settlement ingress is not presently admitted by native genesis; native positive Settlement/composite proof tests explicitly use mechanical predecessors. They do not establish a production funded source.

`https://memory.receiz.com` is the designated Crystal endpoint. On October 20 its HTTPS hostname resolved but the observed service response was 502. Crystal was still being completed by the user. The compatibility Note writer does not depend on that endpoint and no service configuration was changed.

Before v1.0.0, qualify the deployed authenticated quote, Reserve-only, Settlement-only and combined create/save/recipient handover/deposit cycle; verify exact ledger effects, repeated deposit refusal, lost-response recovery, original proof reopening and PWA reopening. Continuous disconnected spend additionally requires the unchanged protected-custody qualification. Verified offline receipt remains separate from confirmed available account credit.

No stronger truth was replaced by a display value, SQL observation or browser checkpoint.
