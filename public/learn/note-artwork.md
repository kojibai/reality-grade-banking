# Learn note specimens

`reserve-note.webp` and `settlement-note.webp` are web-sized copies of the exact app renderer's unissued $100 artwork. They contain no issued note source, funded custody or redeemable value. They are illustrations, never deposit inputs. Public captions identify them as unissued specimens.

The source renderer is `src/receiz/note-artwork.ts` (SHA-256 `209116c7d0c7401fff2c0973266a2a95777a2d3bbde1123eede3418c75ba8374`), with layout `src/receiz/note-design.ts` (`5b6acfad678130b9aae761023a53e033a5e84d2f5b95d324718d05eb4ae98f34`). Its engraved inputs and Cinzel font, licensing and generation provenance remain in `public/notes/`.

To reproduce, call `bankNoteArtwork('10000', '00000000-0000-4000-8000-000000000000', false, rail)` in the local browser for each rail (`reserve`, `settlement`). Save the resulting **unissued** 3240 × 1944 PNG. No account, funding or native issuance call is involved. Convert that presentation-only PNG using `cwebp -q 90 -m 6 -resize 1620 972 input.png -o output.webp`. `cwebp` is an optional artwork-maintenance tool, not an application or normal build dependency.

The checked-in web images retain the 5:3 proportions and original composition. Each is below 700 kB, has declared dimensions and loads lazily below the fold. The financial note export remains the original high-resolution PNG; these WebP illustrations do not replace it. A change to the renderer's composition should regenerate these specimens and undergo visual comparison.

- Reserve WebP SHA-256: `35632557b05720cc20501a035df5926d469962795605d1bba3ab380446ca9378`.
- Settlement WebP SHA-256: `b752ddead683b08337845cd1f36c3255b900e857a1b83edf2b457c88dc95e262`.
