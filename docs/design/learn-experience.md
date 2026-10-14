# Receiz Bank Learn — October 14, 2026

The public Learn experience uses cool white (#fbfcfe), ink navy (#14283f), cobalt (#244cdb), a system sans-serif stack, fine rules, open editorial rows and restrained motion. It is generated as static HTML; the account console is not part of this redesign.

## Selected visual references

Built-in ImageGen created the section concepts and two production assets. No API key or additional package was used.

- Hero: `/Users/bjklock/.codex/generated_images/01a1333c-52b2-7582-8fd1-aaaabe6476f9/exec-3b4a5eb9-55c6-4932-a11a-4f0858156b04.png`
- Value / rails: `/Users/bjklock/.codex/generated_images/01a1333c-52b2-7582-8fd1-aaaabe6476f9/exec-eedf9919-c9bc-4656-8d9e-2c7d8b381270.png`
- Identity / guides / finale: `/Users/bjklock/.codex/generated_images/01a1333c-52b2-7582-8fd1-aaaabe6476f9/exec-0c6ca798-7a0a-4ddf-bb88-df159048fc48.png`

The brief requested a coordinated institutional-quality Learn page with a quiet header, “Your value. More possibilities.”, a transparent three-plate optical glass sculpture, a code-native proof flow, a dark two-rail band, a device-held identity explanation, three open guide rows and a cobalt finale. No invented account figures, crypto imagery, certification, insurance or liquidity guarantees. Motion starts automatically, with no playback control.

The production glass asset was generated separately from the concept and optimized to WebP, 130,154 bytes. The dedicated social image uses the same glass sculpture and exact “Proof-native banking” / “Your value. More possibilities.” copy, with no website controls. It is a 1730 × 909 JPEG, 276,331 bytes. The app homepage retains its existing share image; all four public guide pages use the new Learn image.

## Fidelity and verification

Browser/IAB checks use native concept size 1536 × 1024 and mobile 390 × 844. The latest browser captures are compared with the relevant section concepts through `view_image` before handoff.

| Comparison | Implementation / correction |
| --- | --- |
| Opening copy and hierarchy | Brand, three navigation anchors, both CTA labels, headline, supporting sentence and footnote match the selected hero copy. No added hero eyebrow. |
| Desktop composition | Expanded the page gutter and headline scale; moved and enlarged the glass render to match the selected concept’s visual balance. |
| Palette and media | Exact cool white / navy / cobalt system; real transparent generated sculpture, with no color wash over it. |
| Typography and containers | Large close-tracked sans headings, fine rules, open guide rows, one dark rail band and cobalt finale. No repetitive card grid. |
| Icon treatment | Reuses the account’s existing Lucide Fingerprint mark; thin matching directional and explanatory SVGs. The fingerprint is intentionally the existing app glyph rather than an approximate redraw of the generated symbol. |
| Responsive continuation | Hero, value diagram, rails, identity annotations, editorial guide rows and articles become a single-column reading flow. Fixed intrinsic grid overflow; observed scrollWidth equals viewport width. |
| Motion | Automatic glass float, moving proof/rail particles, identity float and scroll reveals. Observer pauses offscreen animation; observed hero paused while identity animates. OS reduced-motion removes movement. Hidden document pauses animation. No private data reads or network requests in motion code. |
| Navigation | Hero anchor, identity and guide anchors, rail guide links, article section links and bank entrance links remain ordinary real links. |

Intentional content additions: a visible capability note preserves the original guide’s distinction between implemented account/card/discovery features and pending custody/native ownership execution. The page does not claim these financial features have shipped. Article navigation adds a table of contents and related guides for the existing three guide documents.

Above-the-fold copy diff: no unplanned copy added or renamed relative to the selected hero. Section wording is adjusted only for accurate current capabilities and the existing app fingerprint symbol.

The public page uses static HTML plus a small local presentation script. No new dependencies, external fonts, remote animation runtime or app hydration. Public metadata, canonical URLs, JSON-LD, sitemap, asset budgets, lazy QR exclusion and unchanged root entrance are checked by `scripts/check-public-pages.mjs`. The existing bank test suite, typecheck, build and Vercel contract checks are also run. These checks do not demonstrate live native financial execution or a newly deployed Learn page.
