# Reserve Note artwork

The existing `banknote-engraving.webp` paper is unchanged (SHA-256 `52a7eceb2979e482956bac5844d43a4ba7bea2bda5d83f6d87a0c5fc136ad03a`). Note images are presentation. Funded custody and the complete verified proof source remain the v129 runtime's authority.

`src/receiz/note-design.ts` supplies one layout for the in-app SVG preview and the Canvas export. Main amount glyphs come from `denomination-engraving.png`; corner amounts and small print use self-hosted Cinzel. No denomination is baked into the template. Whole amounts omit `.00`; fractional cents are never rounded. The preview has an external NOT ISSUED caption and no serial authority. Actual serial text is derived from the note ID; the complete ID remains in the proof.

Full images retain the same 5:3 proportions at 3240 × 1944 pixels, with a 600-DPI PNG physical-resolution chunk. A bounded 192-color ink palette reduces only presentation color data before standard lossless PNG compression, leaving room under the existing 8 MiB image limit for the original proof wire. Compact proof artwork stays 360 × 216. Assets and encoding load on note use, with on-demand PWA caching; the account and Market do not fetch the artwork. Native sharing receives the exact original PNG bytes. A separate original-file download remains available because Photos and messaging applications can discard PNG proof metadata.

The optional Settlement masthead is presentation support only. The existing native financial API remains Reserve-only. See `docs/settlement-note-contract.md` before connecting Settlement issuance or redemption.

## Source assets and generation prompts

Generated with the built-in image tool; no API key or external runtime dependency. Original generated files remain in the Codex image library. The approved complete-note reference is `exec-375f694e-f7de-4831-8b54-2404b6c129d8.png` in that library. It is a visual reference, never a funded note.

- `denomination-engraving.png`: source `exec-12204f22-2951-49af-bd26-824e916afb8c.png`. Prompt: transparent intaglio glyph atlas matching the approved navy/pine banknote, ivory double inline, guilloche crosshatching and small star details; 5 columns × 3 rows, equal cells, row one `0 1 2 3 4`, row two `5 6 7 8 9`, row three `$ . ,` and two empty cells; consistent cap heights, natural glyph widths, ample gutters, no labels or grid lines. Alpha bounds are recorded explicitly in `note-design.ts`.
- `reserve-note-masthead.png`: source `exec-c859a35e-8265-4808-8e76-7a9dfbe5b03b.png` (subtitle refinement of `exec-704d04ac-07a8-4ab6-98ee-b3ce769335ca.png`). Prompt: isolate a transparent two-line engraved masthead in the exact style of the approved reference; single-line monumental serif capitals `RESERVE NOTE`, below a fine engraved divider with central diamond, then smaller widely tracked serif capitals `PROOF-BACKED VALUE`; navy/pine intaglio hatching, ivory double inline, flat crisp ink, no paper, frame, denomination, branding, shadows or other copy.
- `settlement-note-masthead.png`: source `exec-2e3c125c-ed43-441a-aedc-746ba8b4de99.png` (subtitle refinement of `exec-27fa9068-55b6-4017-a79b-cc86616ef343.png`). Prompt: change only the main masthead wording to `SETTLEMENT NOTE`; preserve identical engraved letterform style, cap height, ivory double inline, navy/pine hatching, divider, central diamond and change only the subtitle to `PROOF-NATIVE VALUE`; one horizontal line, transparent alpha, no other changes.

Cinzel is downloaded from the [official Google Fonts source](https://github.com/google/fonts/tree/main/ofl/cinzel). The original font is in `fonts/Cinzel.ttf`, with its SIL Open Font License in `fonts/OFL.txt`.
