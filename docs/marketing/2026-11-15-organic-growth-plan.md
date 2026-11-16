# Bankeiz organic growth plan

Prepared November 15, 2026. Launch window: November 16–December 15, 2026. Six-month review: May 15, 2027. Dates assume the client-work release is qualified and published at launch; shift the execution calendar if release moves.

## The business goal

Make Bankeiz discoverable when a person is trying to move client work forward: understand an inquiry, prepare a proposal, issue an invoice, review an agreement, obtain a signature, arrange an appointment, request payment, deliver the work or continue the relationship. The product promise is **Run your client relationships from one conversation.**

Build broad coverage across relevant professions while keeping one recognizable product story. Each entrance meets a specific need; the complete relationship workspace gives the user a reason to stay. The initial research map contains 128 niches across 16 families and 512 keyword candidates. It is an expandable market map, not a claim that every profession or search has been researched. See [the niche map](2026-11-15-niche-keyword-map.md).

The primary outcome is new organic users who complete useful client work and return. Report search clicks, site users, activated accounts, paid customers and retained relationships separately. A public article view and a newly paying Business subscriber are different outcomes.

The [60-item publication backlog](2026-11-15-organic-launch-backlog.md) turns this strategy into individual briefs. The [technical readiness record](../verification/2026-11-15-public-seo-readiness.md) distinguishes the local repair, current live blockers and release/indexing evidence still needed.

The ambitions are tens of thousands of organic visits in the first 30 days and eventually millions. These are stretch goals to test, not guaranteed results. Search engines decide crawling, indexing and ranking, and effects can take weeks or months. [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Starting evidence and unknowns

| Area | Observation on November 15 | Execution consequence |
| --- | --- | --- |
| Source inventory | The working metadata registry contains 169 public page records, including deliberately excluded templates and legal material. | Audit and improve existing coverage before adding overlapping pages. |
| Four client-work entrances | `/proposals/`, `/ai-documents/`, `/sign-agreements/` and `/client-communication/` exist in the working source but returned HTTP 404 in a direct live HTTP check. The owner is preparing the branch commit. | Qualify and release those pages, then verify production responses and sitemap membership. Do not treat source presence as deployment evidence. |
| Main live sitemap | 4,430 distinct URLs; 4,269 are `/asset/` URLs. | Most listed URLs are public Originals, not marketing landing pages. Their count does not establish keyword coverage. |
| Reading sitemap | 1,276 distinct `/read/` URLs; 5,706 distinct URLs across both live sitemaps. | Review alternate-reading canonicals and sitemap consistency. Preserve public reading access and privacy boundaries. |
| Existing public metadata | Sampled homepage, Business and Pay responses carry index/follow and a canonical. Robots lists both sitemaps and excludes API/auth paths. | Preserve working controls; check templates individually rather than assuming every page passes. |
| Broader live head audit | 166 intended-public URLs checked: 148 pass the audit's status/title/description/canonical/robots tests; four new entrances return 404 and 14 collection/profile paths carry `X-Robots-Tag: none`. | Prioritize live delivery reconciliation. Current source routing/header handling differs from the observed deployment; a source-only repair cannot establish the production header fixed. See [raw audit](../verification/2026-11-15-public-seo-live.json). |
| Document weight | Sampled normal HTML responses contain approximately 11–12 million decoded characters, including carried presentation/navigation material. | Inspect composition, transfer size, static main text, parse cost and field performance. Do not delete the held catalog or add lazy page-opening gates to obtain a smaller document. |
| Search performance | No authenticated Search Console/Bing Webmaster export, baseline organic user count, conversion cohort, backlink inventory or measured keyword volume was supplied. | Day 1 establishes the baseline. No keyword in the map is labeled proven high-volume or low-difficulty. A search-tool `site:` result is not an indexing inventory. |

The HTTP checks above are delivery observations, not evidence of Google indexing or end-to-end financial behavior. Product capability descriptions use the owner’s positioning and the working implementation; newly added features need separate release qualification. Preserve actual AI entitlements and displayed billing terms.

## The strategy choice

Three approaches are available. A blog-first approach answers many questions, but can attract readers who need a quick answer and never need the product. A generator-and-template approach gives immediate utility, but generic free-tool searches are competitive and can convert poorly into a paid AI product. A niche solution approach creates a stronger fit with a profession, but unsupported industry claims and shallow pages weaken it.

Use all three as one connected library: **niche solution → useful example or template → task-specific product entrance → continuing client relationship**. Give existing proven pages the first opportunity to rank. Publish new URLs only for distinct reader needs. Broad head terms are longer-term targets; demonstrated near-ranking queries and specific tasks are the first candidates for faster gains.

Start with English in one explicitly selected measurement market, provisionally the United States. Keep global English discovery available. Country-specific payment availability, currencies, tax fields and legal requirements must be checked before localized promises or translated conversion pages go live.

## Search entrances and the product action

| Search cluster | Page and status | Reader gets | Relevant next action |
| --- | --- | --- | --- |
| AI proposal generator; create proposal from client conversation | `/proposals/`, present in working source | A visible worked brief-to-proposal example, editable-scope explanation and real sample PDF | Open the existing conversation and prepare a reviewed proposal |
| AI invoice generator; create invoice from conversation | Proposed `/invoices/`; validate and build a dedicated useful entrance | Itemized example, quantity/rate/amount review, invoice versus receipt explanation | Prepare the invoice in the same relationship |
| AI document generator; AI PDF generator; AI Word document generator | `/ai-documents/`, present in working source | Supported real formats, example output and review workflow | Choose the context and document format |
| Sign agreements online; send contract for signature | `/sign-agreements/`, present in working source | Complete terms, exact version, named signer and explicit consent explained | Each person reviews and signs with their own Receiz ID |
| Client communication software | `/client-communication/`, present in working source | One connected conversation from brief through delivery and the next project | Continue the client relationship |
| Client management software for small businesses | Proposed `/client-management/`; compare intent with existing Business page | A concrete relationship workflow and honest fit limits | Start with one real client |
| Proposals, contracts and payments in one place | Proposed `/client-workflow/`; avoid duplicate intent | An annotated complete workflow with explicit review at each consequential step | See the example, then open the existing workspace |
| Payment link for clients; accept payments through a link | Existing `/accept-payments/` and `/pay/`, assign separate owner intents | Actual supported link/QR experience and payment review | Create or use the existing receiving destination |
| Booking with clients; appointment from a conversation | Existing `/book/`; `/booking/` is a route template | Practical scheduling explanation | Review the actual appointment details |

Head terms are not automatically easy opportunities. Search results sampled for AI invoices contain usable free generators; a generic article is unlikely to satisfy that intent. Match the actual offer: manual editing and AI drafting have different access conditions. Do not advertise free AI, no signup, unlimited use, outside PDF import/signing, or currency support unless the actual released flow supports it. [Example of the competing invoice experience](https://invoice-generator.com/ai).

## Map every niche without splitting the product

The research map spans design and development, marketing, photography and video, consulting, coaching and education, administrative and financial services, homes and trades, personal services, creators and media, property, event services, industrial/B2B work, communities, startup services, regulated organizations and adjacent consumer/creator commerce.

Each niche receives a concrete problem, four candidate queries, a realistic deliverable, a matching workflow, a conversion action and a readiness stage. These stages determine the work queue, not a fabricated ranking score:

- **Launch:** twelve initial professions with strong alignment to a demonstrable client-work flow.
- **Expand:** similar client-work needs; require demand validation and a distinct example before publishing.
- **Adjacent:** useful account, creator-commerce or community tasks with a different activation event. Keep their conversion cohorts separate.
- **Discovery:** sensitive or specialized requirements must be understood first. A law firm, clinic, financial adviser or public agency does not become a supported vertical merely because it sends documents and takes payment.

The twelve launch niches are web designers, graphic designers, consultants, marketing agencies, photographers, videographers, copywriters, social media managers, software developers, business coaches, virtual assistants and bookkeepers. Existing `/business/for/` pages should absorb relevant new copy where their intent matches. A narrow role such as wedding photographer can initially be a substantive section within the photography resource; split it only when demand and a different task justify a standalone page.

Make people feel recognized through accurate detail: a designer’s revision rounds, a photographer’s shoot date and delivery, a consultant’s scope and milestones, a coach’s package and sessions, a bookkeeper’s monthly engagement and source questions. Merely changing the profession in a headline is insufficient. The page should show a usable artifact and a real decision that matters in that work.

## Find the actual low-hanging opportunities

The map contains hypotheses. The research owner must promote a candidate to the publication queue using this process:

1. Export the most recent available 90 days from Search Console, with the previous comparable period: query, landing URL, country, device, clicks, impressions, CTR and position. Exclude branded Bankeiz/Receiz variants for the nonbrand report. Account for reporting delay.
2. Find relevant queries with meaningful impressions and average positions roughly 5–20. Inspect their actual landing page and result type. These can offer an earlier opportunity than an entirely new head keyword; position averages are only a screening signal.
3. Expand the 512 candidates with Google Keyword Planner and one keyword dataset such as Ahrefs or Semrush. Record tool, date, country, language, search-volume estimate/range, trend, vendor difficulty and CPC. Keyword Planner’s advertising competition is not organic ranking difficulty. Do not sum close variants into inflated market size.
4. Review the live results for the best 40 distinct intent clusters in the target market. Save date, query, dominant result format, five relevant ranking URLs, ads/AI features, useful content gaps and whether smaller specialist sites are competitive. Query wording alone does not prove low competition.
5. Group synonyms by the result intent and URL overlap. Several expressions can belong to one strong page. Use an overlap of three or more of the same top-ten URLs as a starting clustering heuristic, then apply editorial judgment; it is not a search-engine rule.
6. Select pages where Bankeiz can meet the need now and add something concrete: an original example, usable template, tested workflow, transparent comparison or first-party finding. Record the evidence and exact owner URL before commissioning content.

Use this research record for each cluster: niche; problem; primary query; related terms; country/language; source/date; estimated demand; existing impressions/position; intent; observed result format; proposed canonical; product capability; unique contribution; owner; review date; publication state; clicks; activation; retained use. Unknown numerical fields remain blank until measured.

Prioritize in this order: existing relevant queries near a useful position; narrow tasks with strong commercial fit and weak answers; niche templates with a demonstrably better example; underserved workflow questions; commercial comparisons with a real product test; broad category terms. Revisit order weekly using activation and retention, not only clicks.

## Page system and the Bankeiz library

Use the main Bankeiz domain. A resource center or blog is useful when it supports product and niche pages. A separate keyword-only domain would split the work of building recognition and trust.

| Page family | Purpose | Required contribution |
| --- | --- | --- |
| Product entrance | Complete a recognized task | Actual workflow, example output, access terms and a direct relevant CTA |
| Niche solution | Recognize a profession’s workflow | Specific brief, deliverables, review decisions, sample and fit boundaries |
| Template or example | Give the reader something useful immediately | Full visible template plus an original worked example and usable file where offered |
| Problem guide | Answer a question arising during work | A direct answer, practical choices, sample wording and the next relevant action |
| Comparison | Help a buyer choose | Dated first-party checks, clear criteria, limitations and the cases where another tool fits better |
| Customer story or worked scenario | Demonstrate the connected result | Real consented evidence, or a clearly labeled fictional/product example |

Provisional resource paths are `/templates/{specific-task}/` and `/resources/{problem}/`; validate them against the route registry before implementation. Industry pages stay under the existing `/business/for/` structure where suitable. Do not create parallel `/solutions/`, `/industries/` and `/business/for/` pages for the same intent. Curated hub indexes should link to useful pages, not produce endless tag, date, author and filter archives.

Every page needs one intent owner, a descriptive title and H1, an immediately useful opening, a substantive example, a relevant next action and crawlable links. Use headings and terms naturally; an exact query need not be repeated mechanically. Link the resource to its niche and product entrance, and link back from those pages where useful. Maintain a short, purposeful path from the library index; do not inject hundreds of unrelated links into every footer.

For a template query, show the actual template before requiring account creation. Offer copyable text and a real download if that is the page promise. Personalization with the Twin leads into the existing account and actual AI entitlement. For a software query, lead with a realistic workflow and the product fit. For a quick question, answer it directly before introducing Bankeiz. A blog article must not masquerade as a working free generator.

### Example page brief

**Intent:** web design proposal template. **Working title:** Web design proposal template with scope, milestones and a worked example. **Owner:** proposed `/templates/web-design-proposal/`, checked against existing routes before creation.

Show a fictional client requesting five pages, a booking inquiry form, two revision rounds and an agreed budget. Provide scope, exclusions, client responsibilities, milestone dates, a checked pricing table and the next review step. Include a full sample, the corresponding real PDF and copyable source. Explain changes to the scope without presenting an unreviewed AI amount as agreed pricing. Then show how the brief, reviewed proposal, separate agreement signature, payment review and delivery continue in one conversation. CTA: **Prepare this proposal in your client conversation.** Show the actual access requirement beside AI drafting.

This example is grounded in the current proposal walkthrough; it is not a customer testimonial or evidence of a typical sale value. The generic template query is visibly competitive, including established template publishers. More specific variants must be researched rather than declared easy. [Bonsai web design proposal example](https://www.hellobonsai.com/proposal-template/freelance-web-design), [HubSpot web design template](https://www.hubspot.com/resources/templates/web-design-proposal).

## Practices to model from established products

| Product pattern observed | Bankeiz adaptation | Evidence limit |
| --- | --- | --- |
| HoneyBook shows a profession-specific client journey for photographers | Build niche pages around the moments of inquiry, document review, scheduling, payment and delivery | This demonstrates page strategy, not a traffic result or Bankeiz feature parity. [Photographer page](https://www.honeybook.com/lp/photographers). |
| Bonsai organizes a substantial template library by document and industry | Build an original library with useful artifacts and accurate niche fields | Do not copy its templates or assume its page count caused growth. [Template library](https://www.hellobonsai.com/templates). |
| PandaDoc connects consulting templates to a document workflow | Link examples to the actual proposal/agreement action | Bankeiz still needs its own tested outputs and specific fit. [Consulting templates](https://www.pandadoc.com/consulting-proposal-templates/). |
| HubSpot answers particular follow-up situations with examples | Answer moments such as a quiet proposal thread, missing approval or delivery handover | Borrow the useful format, not wording, statistics or conversion claims. [Follow-up examples](https://www.hubspot.com/sales/sales-follow-up-email). |

These are first-party observations of visible strategies. No independent causal traffic study was available for these examples.

## Production at daily scale

The durable asset is the evidence and example library. AI can help organize research, draft variations and check consistency; editors and product owners remain responsible for useful, accurate output. Generate drafts freely; publish only pages that pass review. Google prohibits scaled low-value content created to manipulate results, doorway pages and manipulative links. [Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

Maintain one content registry with the intent owner, niche, source evidence, supported capability, example files, public/private status and review dates. Reuse templates for page structure while giving each published page its own substantive artifact and scenario. Do not automatically publish the Cartesian product of 128 professions, every document type, every city and every synonym.

Daily workflow:

1. Researcher selects one validated task and checks for an existing intent owner.
2. Writer creates an original brief, complete example and useful answer.
3. Product reviewer runs the described workflow and checks the real file or outcome. Legal/financial/regulated claims receive a suitably qualified review where required.
4. Editor removes unsupported promises, invented quotes, repetitive filler and unnecessary protocol language.
5. Publisher checks initial HTML, metadata, links, images, files and a relevant conversion action in the compiled output.
6. Release owner publishes through the existing qualified release process. Record commit, CI and live verification separately.
7. Analyst groups results by publication cohort and checks indexing, traffic and activation; repair the underlying cause of failure before increasing volume.

An accelerated month targets up to 60 distinct URLs created or materially improved: 8 core entrances, 12 niche pages, 24 resources/templates, 12 problem guides and 4 worked examples or genuine case studies. That averages about two reviewed URL changes per calendar day, not dozens of unreviewed articles. Merging overlapping intents may reduce the final count. No quota justifies a thin page.

Resource assumption: a product/technical SEO owner, two capable content operators and fractional niche experts/editorial review. Planning capacity is roughly 60–90 hours of combined work weekly for this accelerated launch; validate against the first ten pages. A solo implementation should reduce throughput to roughly 12–20 strong pages in the first month and revise the model. These are workload assumptions, not industry cost benchmarks. Budget equals agreed hours × actual rates, plus selected tools, review and distribution; no budget was supplied.

## First 30 days

| Dates | Owner | Deliverable | Evidence required |
| --- | --- | --- | --- |
| Nov 16–18 | Technical SEO + release owner | Baseline exports; public URL classification; qualify client-work release; crawlability/metadata audit; verify new entrances after deployment | Actual HTTP status, robots/canonical, initial text, emitted files, exact commit/build/CI/live status |
| Nov 19–22 | Researcher + product editor | Validate 40 intent clusters; choose 12 launch niches; assign canonical ownership; approve the first 10 briefs | Demand source and date, observed result format, unique contribution, working product action |
| Nov 23–29 | Content + product reviewers | Reach up to 30 total reviewed URL changes, including core entrances and first niche/template cohort | Actual examples/downloads, full public HTML, mobile action review, internal links |
| Nov 30–Dec 6 | Content + distribution owner | Reach up to 50 total changes; publish question guides; release short demonstrations and useful partner resources | Reviewed outputs, consent for stories, relevant earned distribution; separate referral attribution |
| Dec 7–15 | Analyst + editor + technical owner | Reach up to 60 total changes only if useful; improve emerging performers; diagnose index exclusions and weak activation | Cohort report, search-console inspection, query-to-page mapping and documented scale decisions |

Suggested first questions: how to follow up after sending a proposal; what to include in a consulting scope; proposal versus contract versus invoice; how to request a client deposit; how to record a scope change; how to send a project handover; how to ask for missing client feedback; how to confirm a coaching package; how to prepare a freelance invoice; how to schedule from a client conversation; how to review agreement changes before signing; how to keep client documents and payments together. Research exact wording and cluster overlap before assigning URLs.

Week-one completion is technical readiness and a measured opportunity queue. Week-two completion is demonstrated content quality and released entrances. Week-four completion is a working acquisition system with observed cohorts, not a promise that Google has ranked every new page.

## Months two through six

| Period | Coverage and distribution | Capacity ceiling and decision |
| --- | --- | --- |
| Month 2 | Expand proven tasks in the first 12 niches; add the next 12–20 validated niches; improve pages with real impressions | Roughly 100–150 total curated pages/major improvements if the team sustains review. Stop any failing template. |
| Month 3 | Build fuller problem/template coverage for winning niches; publish consented customer stories and tested comparisons | Roughly 200–300 total. Reallocate effort by retained activation, not profession count. |
| Month 4 | Add validated adjacent niches; publish original findings using authorized, aggregated data | Roughly 350–500 total. All new claims need evidence; private chat contents never become research material by default. |
| Months 5–6 | Expand the strongest clusters; support selected languages/markets only with actual availability and native review | Roughly 600–1,000 total if demand and capacity justify it. These are editorial capacity ceilings, not traffic targets or automatic publication quotas. |

All 128 niches can enter research immediately. Publication scales by demonstrated fit and demand. Some will share a page; some remain discovery-only; new niches can be added when their workflows justify it. A broad market map does not require a page for every cell.

Build legitimate distribution alongside search: niche associations and educators, original template contributions to relevant resource lists, consented practitioner interviews, practical product videos with transcripts, useful forum answers that follow community rules, and genuine comparisons. Pitch a specific helpful resource to a relevant editor; do not purchase followed links, fabricate reviews or flood communities with promotion. Outreach and external messages require separate explicit authorization before being sent.

Public proposals, payment links and deliverables may introduce counterparties to Bankeiz through normal use. Measure that product/referral loop separately from search acquisition. Keep it optional and useful; never expose a private client relationship or add public indexing merely to obtain growth.

## Search, AI answers and discovery

Create pages that can stand as reliable answers: an understandable direct response, named author/reviewer where meaningful, actual examples, a clear product identity, supporting sources, useful images and concise demonstrations. Keep claims consistent across Bankeiz pages and authentic third-party references. Show the workflow rather than repeating that Bankeiz is the answer to everything.

Google says the same SEO foundations apply to AI Overviews and AI Mode, with no special eligibility markup needed. Inclusion and indexing remain discretionary. Their traffic appears within overall Web search reporting; do not claim a precise isolated AI Overview visitor count without an appropriate measurement source. [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features).

Track identifiable referrals from AI services separately when available, and maintain a small dated manual evaluation set of real buyer questions. The evaluation can reveal missing explanations; it is not a ranking guarantee or an excuse to produce answer-engine spam. No special `llms.txt` project, hidden text or mass repetition is needed for this plan.

## Technical SEO without new loading gates

Search visibility must use the existing immediate static/held display. Do not make normal page opening depend on an SEO service, analytics request, manifest, database, Source freshness check, new catalog read or network result. See [held-state navigation invariants](../held-state-navigation-invariants.md). Account creation remains governed by [the frozen entry invariants](../account-entry-frozen-invariants.md).

Audit by route family: public marketing and guides; public Originals; opted-in profiles; public collections; public reading alternates; generic route templates; private/account/auth/payment/receipt contexts. Index only intentionally public, useful canonical documents. Preserve known privacy refusals and owner bindings. “All pages indexed” must not include private client chats, private documents, account screens or empty route templates.

Acceptance criteria:

- Intended indexable pages return their correct status, one appropriate canonical and compatible robots controls. Titles/descriptions identify the particular page; they are not identical site slogans.
- The first HTML contains the useful public text and real existing view where required. JavaScript-disabled and API-stalled checks must preserve the available interface; attach interaction afterward.
- Sitemaps contain intended indexable canonical URLs. Reading alternates remain accessible, but should not send contradictory canonical preferences. A sitemap aids discovery and does not establish indexing. [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview).
- Use ordinary links, correct redirects, crawlable assets and useful social previews. Structured data must match visible content and eligibility; it is not a ranking switch or a promise of rich results.
- Inspect duplicate/alternate pages and actual Search Console canonical selection before a broad URL migration. Consolidate genuine duplicates without erasing distinct accepted public content or history.
- Measure compressed transfer, HTML parsing and rendering, image dimensions and delivery, long tasks, mobile interaction and field performance. A single lab score cannot prove every route is fast. Compare representative routes before and after the exact change.
- Keep important public text, metadata and meaningful discovery links before the crawler cutoff. Google currently documents a 2 MB uncompressed Googlebot limit. Sampled Business, profile and asset main content ends before that threshold, while later navigation/state carriers extend past it. This is not proof that every page is fully processed; verify rendered content and critical discovery paths by route family. [Googlebot limit](https://developers.google.com/search/docs/crawling-indexing/googlebot).
- Reuse carried data and prepare projections at the existing build/accepted transition. Do not add analytics or SEO JavaScript to the critical path. Any measurement must exclude private conversation/document contents, identity artifacts, credentials and sensitive payment data.
- Run relevant metadata/reading/template tests and the existing public-page build checks. Every production build enforces frozen creation. Shared identity/storage changes additionally require `npm run test:account-entry-freeze`; this marketing work should not change that system.

Deployment checks, Search Console URL Inspection and live field metrics answer different questions. Report local tests, compiled build, committed revision, GitHub CI, production delivery and search indexing as separate evidence. For changes that touch public state, qualify actual compiled anonymous entry with APIs stalled and a genuinely new accepted addition followed by retention/cold reopen as required by the repository rules.

## Conversion and retention

Choose the action that matches the landing task. A proposal visitor should see a proposal example and a path to prepare one; a payment-link visitor needs the receiving flow; a creator needs the supported publication/ownership action. The same general homepage button is not enough for every intent.

Measure this funnel by landing cluster and first-touch cohort: search click → landing session → example/template interaction → relevant workspace opened → first reviewed draft or document prepared → first item explicitly shared or real client relationship activated → signature/payment/delivery outcome where appropriate → return for further work → optional paid upgrade and retention.

Use distinct events for drafting, sending, agreement consent and confirmed payment. Opening a form or accepting a chat proposal is not a completed payment or legal signature. Record outcomes from existing supported confirmations without introducing a second financial authority. A proposed event name is instrumentation planning, not evidence that it currently exists.

Primary weekly report: nonbrand clicks; organic landing users; activation rate with an explicit event definition; number of real relationships activated; seven-day return rate; paid conversion; retained paid accounts; content/engineering cost per activated user and paying account. Report brand search separately. Distinguish seven-day activation from same-session conversion and avoid counting a client invitation as another independent organic acquisition.

At the current working offer, Business AI is metered and listed at $149/month with 7,500 monthly AI usage credits. The actual checkout confirms terms. At that price, established service businesses with repeated client work are a stronger initial paid hypothesis than people seeking only a free one-off PDF. This is a positioning inference to validate with actual cohorts, not a proven willingness-to-pay claim.

## Traffic model and the stretch goals

For a new or unknown organic baseline, use a transparent sensitivity model. Newly published content has only part of the launch month to earn clicks. Calculate:

**30-day incremental clicks = published or substantially improved target pages × fraction indexed during the window × fraction of indexed pages earning clicks × average full-month clicks per traffic-producing page × average fraction of the month available.**

| Illustrative scenario | Pages | Indexed in window | Click-producing share | Full-month clicks per producing page | Average availability | Incremental clicks in window |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Slow discovery | 60 | 50% | 40% | 20 | 50% | 120 |
| Useful early traction | 60 | 80% | 65% | 100 | 50% | 1,560 |
| Breakout requirement | 60 | 95% | 90% | 1,200 | 50% | 30,780 |

All inputs are assumptions, not forecasts or probabilities. Even the slow case is not a floor. The breakout case needs exceptionally strong early demand capture, indexation and ranking; it must not become the operating forecast without evidence. Add measured existing baseline clicks separately; do not count them as incremental gains. Search clicks and analytics users will not be identical.

For six months, define the goal precisely: **one million monthly organic visits at month six**, rather than quietly substituting one million cumulative impressions. A page model can show the burden: 1,000 targeted pages × 90% indexed × 70% producing clicks × about 1,587 clicks per producing page per month ≈ one million monthly clicks. Two million would require approximately twice that traffic yield or other independently justified changes. These page averages are demanding and not established for Bankeiz.

A demand cross-check is essential: one million clicks at an assumed 5% aggregate click share requires a deduplicated relevant pool of 20 million monthly searches. At 10% it requires 10 million. Establish whether the chosen markets and query clusters actually provide that demand; do not sum overlapping variants, languages or page targets. If validated demand or observed ranking yield is insufficient, extend the timeline, adjust the goal or expand supported audiences. Publishing more pages cannot create missing search demand.

Conversion sensitivity: 20,000 organic users × an assumed 3% activation = 600 activated users; 600 × an assumed 10% activation-to-paid rate = 60 new paid accounts. At an assumed 1% activation and 5% activation-to-paid rate, the same traffic gives 10 paid accounts. These are independent planning examples, not measured Bankeiz rates or revenue promises. Use net paid retention and actual plan mix for economics once cohorts exist.

## Decisions that control scaling

- Every week: inspect new and improved cohorts, actual search queries, correct canonical selection, useful impressions, conversion friction and retention. Fix an obvious delivery/technical defect immediately.
- Around day 14: use early impressions and URL Inspection diagnostically. A new page without clicks has not necessarily failed. If many intended pages are excluded or Google selects a different canonical, investigate before expanding that template.
- Around day 30: compare cohorts and actual effort. Expand niches with credible demand, functioning entry and early useful behavior. Preserve promising pages still awaiting discovery; avoid mass deletion or URL changes based on a short window.
- Around days 60–90: merge genuinely overlapping intents, improve useful pages with weak answers, and retire or exclude pages that lack a distinct reader purpose. Redirect only when a true replacement exists.
- Increase publishing capacity when quality review, technical delivery, observed search demand and retained activation can all sustain it. Restrict a particular niche or format when it repeatedly brings irrelevant visitors or unsupported feature expectations.

The repeatable growth loop is: **learn the problem → publish a useful answer and artifact → demonstrate the connected workflow → acquire a suitable user → observe completed work and return use → improve that niche’s coverage**. This can support a large library while keeping each new page accountable to a real reader and a real product action.
