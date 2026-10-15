# Design QA — note renderer and value framing

Date: 2026-10-15. Scope: the approved engraved note design, matching Reserve/Settlement presentation, unchanged paper, subtle Account/Learn wording and default branding. The newly requested Conformance Console is a separate subsequent scope and is not covered by this result.

**final result: passed**

## Evidence

- Approved reference: Codex generated image `exec-375f694e-f7de-4831-8b54-2404b6c129d8.png`.
- Actual production-renderer PNGs: `note-artwork/reserve-note-10000-UNISSUED.png` and `note-artwork/settlement-note-10000-UNISSUED.png` in the task visualization directory. Both were opened with `view_image`, fully decoded and visually inspected.
- Browser reference/current board and focused typography: `note-artwork/reference-versus-final-renderer.png`; original comparison `reference-versus-renderer.png`. Browser rasterization of the final board was soft at its capture scale; the actual exported PNGs were separately inspected at high resolution.
- Mobile Learn receiving-standard screenshot: `note-artwork/learn-receiving-standard-mobile.png`; browser verified 390-pixel viewport and no horizontal overflow. Public guide navigation and exact destination anchors were exercised.
- Real browser imported the native v129 runtime and read-only verifier; forged handles/unsigned inputs were refused. No identity, account, custody or financial operation was created by these fixtures.

The visualization root is `/Users/bjklock/.codex/visualizations/2026/10/13/01a1333c-52b2-7582-8fd1-aaaabe6476f9`.

## Fidelity ledger

| Point | Final treatment |
| --- | --- |
| Paper and security engraving | Exact original paper asset retained; SHA-256 `52a7eceb2979e482956bac5844d43a4ba7bea2bda5d83f6d87a0c5fc136ad03a` unchanged |
| Title and hierarchy | User-requested RESERVE NOTE / SETTLEMENT NOTE replaces reference branding, with matching engraved serif mastheads |
| Value distinction | User-requested PROOF-BACKED VALUE / PROOF-NATIVE VALUE respectively; removed the earlier carried-value wording |
| Denomination | Engraved central numeric value, exact words and all four corner values share canonical presentation cents; long amounts remain bounded |
| Small print and serial | Rail-specific redemption line and RN/SN presentation prefix; full native identity/source remains in the proof, never replaced by printed text |
| Geometry and export | Same 5:3 proportions; 3240 × 1944 pixels, 600-DPI pHYs; compact native preview remains 360 × 216 |
| Mobile usability | Responsive shared preview, original PNG native share/download with exact bytes preserved; cancellation does not trigger another download |
| Account/Learn framing | Native Settlement / backed Reserve; receiving standard and continuity tradeoff accurately scoped; existing layout, navigation and financial callbacks preserved |

Intentional deviations from the original generated reference are exactly the requested titles/subtitles, dynamic amounts, typed rail, readable outlined corner values and source-derived serial presentation. The original reference did not define a real issued source. Every saved sample here is unissued artwork and is refused by the financial verifier.

No live Settlement Note financial support or institution qualification is claimed by visual QA. Those separate native integration and real-device release gates remain in the linked contracts.
