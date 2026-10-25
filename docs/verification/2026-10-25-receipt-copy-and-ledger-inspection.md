# Receipt copying and Ledger inspection

The Ledger must reuse the selected record and its prepared receipt. Closed disclosures must not format or mount complete proof JSON. Showing an already retained record must not start another source read or financial verification.

## Confirmed redundant work

- Expanding a Ledger row previously encoded its receipt again inside `LedgerInspector`. Both Ledger views now pass the row's prepared link. The receipt page skips encoding an unused nested receipt entirely. A newly inspected original can still supply additional carried history and produce the appropriately enriched link.
- `LedgerProofDetails` previously formatted and mounted its entire report inside a closed `details` element. The existing disclosure now formats only while open and removes the JSON text when closed. Scope, public proof facts, original inspection, and complete downloads remain available.
- Funding-context parsing and trace derivation already retain results by exact source object. They were not replaced or supplemented with requests. Recorded sale returns use recorded integer operands; no trade pricing, execution, or balance rule changed.

## Receipt behavior

Copy directly publishes/reuses the complete immutable receipt and writes its short URL, then shows the existing checkmark. It opens no preparation dialog. On browsers supporting promise-backed `ClipboardItem`, the clipboard operation begins in the original click before publication completes. A failed publication cannot produce a successful copied link. First publication still requires one existing save request; repeated publication is coalesced/cached. Copying an opened short receipt reuses its URL without another save.

The receipt itself contains the small **View in Ledger** link. Funding source and full funding history retain their independent compact disclosures. The separate Share control retains its existing native-share activation flow.

The short receipt parser accepts the same digest in the original path and hosting `s`/`digest` parameters. Conflicting coordinates, duplicate parameters, unknown parameters, and mixed short/legacy packets remain invalid. Read-only production HEAD checks reproduced HTTP 400 at the short public path and HTTP 200 at the corresponding API selector before this patch. The user's exact failing link was not supplied; production behavior after deployment remains to be checked.

## Verification

- Full test suite: **3,073 passed, zero skipped**, 493 files.
- Typecheck and complete production build passed.
- Fresh independent code review: no findings; 17 selected tests rerun independently.
- Isolated installed Chrome, 390 × 844 mobile viewport: actual clipboard copy produced a **93-character** short URL; no copy dialog, no page errors, no external requests. The synthetic receipt preserved all **301 funding nodes** and exposed additional sources through the existing control.
- The synthetic retained proof contained **2,259,070 JSON characters**. Its closed disclosure now mounts **zero** JSON characters; opening reveals the complete report and closing releases its text node.
- Tests enforce no duplicate receipt preparation on account/public row inspection, no unused receipt preparation inside the receipt page, and complete retained proof availability on explicit disclosure.

These are confirmed reductions in work, not a measured physical iPhone frame-rate claim. Playwright-managed WebKit was unavailable; Safari/iPhone painting and native Safari clipboard permission behavior remain device checks. Existing unrelated build warnings were retained.
