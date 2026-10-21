# Audience guides

Eight public audience entries extend the existing guide design. Each begins with a familiar situation and a useful supported action, with method and integration depth below it. They add no account, finance or media capability.

| Path | Reader and concrete starting point | Vector explanation stages |
| --- | --- | --- |
| `/for/people/` | People and families settling a shared expense | A shared expense → Review your share → Keep the receipt |
| `/for/businesses/` | A merchant collecting an agreed payment and retaining it for the books | An amount agreed → A confirmed payment → A record for the books |
| `/for/independent-work/` | A freelancer or consultant finishing a job | The work is done → A clear request → The job and its receipt |
| `/for/creators/` | An owner publishing a particular music, art or writing original | The version you made → The original you publish → A work people can inspect |
| `/for/communities/` | A coordinator collecting for a room and paying the agreed recipient | A shared plan → Individual payment records → An expense you can explain |
| `/for/institutions/` | A finance or custody team resolving an unmatched event | An unmatched event → A source comparison → A review others can repeat |
| `/for/public-finance/` | A reviewer connecting an expenditure to its actual payment | An authorized expense → The actual payment → Evidence for review |
| `/for/platforms/` | A platform integrating a supported account operation and its recovery | An order in your product → An exact authorized action → One recoverable result |

The plain institution entry is titled “For finance and custody teams.” The existing `/institutions/` remains the technical integration guide. Institution and public-finance pages link the actual Standards, institution and developer materials.

## Composition

`src/content/audience-pages.mjs` holds public `LearningPage` records, composed into the existing `learningPages` catalog. The `For you` directory group uses the normalized `guides-for-you` fragment. The Learn home retains its four foundation links and existing main content.

`scripts/audience-scenes.mjs` provides eight different vector drawings and three local explanation stages for each audience. The existing `learningScene` frame supplies its transparent SVG, glass/ink/cobalt palette, geometry helpers and CSS motion classes. No scene includes a raster background, image download, JavaScript animation loop, financial operation or account read.

The existing guide controls select the explanation panel and matching visual stage. Existing scene CSS pauses motion outside the observed region and while the document is hidden, and removes animation/transitions for reduced motion.

The shared footer groups eight audience links under “For you.” It retains the existing technical guides and a single Reality-Grade Banking link. Responsive grids use zero-minimum fractional tracks; narrow layouts place the audience links in a full-width, two-column group and allow identity content and policy links to wrap.

Metadata is registered through `scripts/public-page-metadata.mjs`, with a unique title, description, headline, caption and motif for each new page. The existing social generator produces their actual hashed cards. The existing public-page build includes the records in prerendered HTML, the same-document navigation catalog and the sitemap. No new page runtime or private transport is introduced.

## Claim boundaries

- Receiving links prepare a payment; the payer still reviews and approves the supported action. The confirmed financial result is distinct from the request, redirect, image or local preview.
- Notes retain original evidence. Recipient-bound originals can be retained offline; connected account credit is confirmed before reuse. New offline spend authority has its separate protected-custody requirements.
- One account retains Reserve backing and exact Settlement Phi. These pages do not advertise a new display-currency selector, external-chain transfer, FX quote or ownership of an external asset merely because a unit could be displayed.
- FIFO is calculated attribution from the held basis and spend order, not a historical object allocation newly asserted as part of the original pooled transfer.
- Shared family accounts, business role administration, community treasuries, payroll/tax calculations, invoice automation and universal merchant checkout are not asserted. References to books, approvals, job records and working papers describe the reader’s existing process.
- Public publication, asset ownership, media access, valuation and executed sale remain distinct. Persistent playback and email sending are not advertised as shipped.
- Public Ledger scope is not described as every private event or a complete public expenditure register. Individual receipt retention does not imply a complete private batch export.
- Integration and conformance are scoped to the actual version, operation and evidence. No institution-wide certification, insurance, legal recognition, guaranteed revenue, elimination of fraud or measured speed gain is claimed.

## Verification boundary

Focused source and interaction checks are recorded in `docs/verification/2026-10-20-audience-guides.md`. Social generation, final build and browser checks are coordinated after all source owners freeze. The explanatory scenes and copy do not qualify a production financial deployment or a physical custody device.
