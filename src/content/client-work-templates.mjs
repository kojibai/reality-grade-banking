// Original educational resources. All example people, projects and amounts are fictional.
export const clientWorkTemplates = [
  {
    slug: 'web-design-proposal', kind: 'template', niche: 'Web designers',
    title: 'Web design proposal template for a defined website',
    description: 'Plan a website proposal with named pages, client content, revision limits, milestones and pricing that needs an explicit decision.',
    intro: 'A useful website proposal lets a client picture the finished site and the decisions needed to reach it. Start with a page list and a clear division of responsibilities, then explain timing and the price being proposed.',
    problem: '“A new website” can mean five informational pages or a booking system with hundreds of records. A proposal becomes hard to review when those possibilities share one vague scope line.',
    sections: [
      { heading: 'Describe the site someone can approve', paragraphs: ['List each page and its purpose. Separate a reusable layout from the number of pages using it, and say whether the work includes migration, copywriting or connecting an existing service.'], bullets: ['Name the supported screen sizes and the browsers you will inspect.', 'Identify forms, their destination and who tests incoming messages.', 'Keep ecommerce, account areas and custom integrations outside scope unless specifically described.'] },
      { heading: 'Put decisions beside milestones', paragraphs: ['Make content readiness a real dependency. A design review cannot confirm final text or image placement when neither has been supplied. Define a revision round as one consolidated response from the named reviewer.'], bullets: ['Ask for page copy, brand assets and image permissions before the content deadline.', 'Separate layout approval from build review and launch authorization.', 'Added pages or new functionality need a written price and schedule decision.'] },
      { heading: 'Review before sending', paragraphs: ['Check the proposal against the discovery notes. An estimate is still a proposal until the client accepts its actual terms; do not label an unreviewed figure an agreed price.'], bullets: ['Every page appears once and every feature has an owner.', 'Revision rounds, exclusions and handover files are explicit.', 'Amounts add up, currency is named and payment stages have clear triggers.', 'The client has a specific next decision and a way to raise questions.'] },
    ],
    template: `WEB DESIGN PROPOSAL — working draft
Prepared for / by: [client; designer]
Version and date: [version; date]
Goal and audience: [what visitors need to do; who they are]
Pages and purpose: [page name — purpose; repeat for every page]
Included features: [forms, CMS editing, integrations and limits]
Client content: [copy, images, brand assets; owner; due date]
Designer provides: [research, layouts, build, checks and handover]
Review contact: [one contact consolidating feedback]
Milestones: [content ready; design review; build review; launch decision]
Revisions included: [number; what one round means]
Exclusions: [work outside this proposal]
Proposed fee and currency: [line items; adjustments; total]
Proposed payment stages: [amount; trigger; review status]
Changes: [describe addition; assess price/timing; obtain decision before work]
Handover: [files, editing notes and approved access-transfer process]
Next decision: [questions or explicit acceptance of this version by date]`,
    example: `FICTIONAL FILLED EXAMPLE — not a customer result or accepted quote
Mira Studio proposes a five-page site for Cedar Cycle: Home, Repairs, Workshop, About and Contact. Visitors should understand repair options and send an enquiry. The build includes one enquiry form and editable page text; online payment and appointment booking are excluded.
Cedar supplies final copy and six approved photographs by 8 March. Mira supplies layouts, responsive build and editing notes. Jo consolidates feedback into two design rounds and one build correction list. Content review is 9 March, layout review 16 March and proposed launch review 30 March.
Proposed pricing: design $1,200 plus build $1,800 = $3,000 USD. Proposed stages: $1,500 after acceptance and $1,500 after final build review. These are fictional proposed terms requiring Cedar’s decision. Extra pages require a separate estimate. Jo is asked to approve this scope or identify missing requirements before work is scheduled.`,
    bankeiz: 'Adapt the proposal in any editor. In Bankeiz Messages, use only the client context you choose when preparing wording; review the complete draft yourself. Review any supported payment action separately after scope and price are agreed.',
    related: ['/learn/templates/website-scope-of-work/', '/learn/resources/client-brief-to-proposal/', '/business/for/designers/'],
    keywords: ['web design proposal template', 'website design proposal example', 'five page website proposal'],
  },
  {
    slug: 'website-scope-of-work', kind: 'template', niche: 'Web designers',
    title: 'Website scope of work template with acceptance checks',
    description: 'Define website deliverables, content owners, exclusions, acceptance checks and the process for reviewing a change.',
    intro: 'A website scope of work turns a broad plan into inspectable work. Use it to say what will be delivered, what the client must supply and which checks will support a completion decision.',
    problem: 'A page count alone does not resolve content loading, form behavior, redirects or access handover. Those details often surface near launch unless the scope assigns them early.',
    sections: [
      { heading: 'Separate pages, behavior and content', paragraphs: ['Describe deliverables in the way the client will inspect them. “Contact page” is incomplete without the fields, recipient and success response of its form. Record assumptions about the existing site instead of silently treating them as facts.'], bullets: ['List page inventory and reusable layouts separately.', 'State how many content items will be loaded and who checks accuracy.', 'Identify redirects or migrations by a named list, not “all existing content.”'] },
      { heading: 'Make acceptance observable', paragraphs: ['Use checks someone can repeat: a named form arrives at the test recipient, navigation reaches each page and the client can edit a named text field. Choose supported devices and browsers together.'], bullets: ['Keep proposed checks distinct from results actually observed.', 'Assign one reviewer and a feedback date to each milestone.', 'When inputs arrive late, agree revised dates instead of implying the original schedule still holds.'] },
      { heading: 'Scope review checklist', paragraphs: ['Read the scope alongside the proposal and flag differences before using either document to start work. This planning template does not replace an appropriate agreement.'], bullets: ['Content counts, integrations and exclusions are specific.', 'Every dependency names an owner and date.', 'Acceptance checks cover actual deliverables.', 'A change records effects on work, price and timing before approval.', 'Launch authorization and later maintenance are separate decisions.'] },
    ],
    template: `WEBSITE SCOPE OF WORK
Project / version / date: [details]
Related proposal or agreement: [reference and version]
Objective: [visitor task and business purpose]
Pages: [named pages and purpose]
Layouts: [unique templates and where used]
Functionality: [behavior; limits; external service owner]
Content inventory: [type; quantity; supplier; loading owner]
Migration / redirects: [specific list, or excluded]
Client inputs: [item; owner; due date]
Milestones: [deliverable; target date; reviewer]
Acceptance checks: [check; expected result; inspection environment]
Revisions: [rounds; consolidated feedback process]
Exclusions / assumptions: [limits; unresolved questions]
Change request: [difference; cost/timing effect; decision owner]
Launch: [authorizer; required outstanding checks]
Handover / ongoing work: [files/access notes; support scope or exclusion]
Next decision: [owner; date]`,
    example: `FICTIONAL FILLED EXAMPLE
Cedar Cycle scope v2 covers Home, Repairs, Workshop, About and Contact using three layouts. Mira loads five final text documents and six client-approved photographs. The enquiry form has name, email and message fields; Jo receives a test enquiry and confirms arrival before launch.
No shop, booking integration, old blog migration or ongoing maintenance is included. Cedar owns domain renewal and supplies its approved connection method without putting passwords in the scope.
Review checks are: every menu link reaches its named page; the form shows its confirmation; Jo can change workshop text; and agreed mobile and desktop checks are recorded. Jo reviews the staged build on 27 March. A request for a sixth page is logged with a separate price and revised date before proceeding. Launch remains a separate explicit decision after outstanding issues are resolved.`,
    bankeiz: 'Keep a reviewed scope reference in the relevant Bankeiz conversation. Messages can help prepare a clear change request using chosen context, while you decide the actual deliverables and any payment terms.',
    related: ['/learn/templates/web-design-proposal/', '/learn/resources/client-scope-change/', '/learn/resources/project-handover/'],
    keywords: ['website scope of work template', 'web design scope checklist', 'website acceptance criteria example'],
  },
  {
    slug: 'graphic-design-proposal', kind: 'template', niche: 'Graphic designers',
    title: 'Graphic design proposal template for a defined asset package',
    description: 'Specify design assets, concepts, revision rounds, production formats and the client decisions needed before final delivery.',
    intro: 'A graphic design proposal should describe the actual package the client can expect to receive. Name the assets, how concepts will be reviewed and what “final files” means for this particular job.',
    problem: 'One logo or campaign can involve dozens of variations, layouts and production uses. An undefined asset package leaves both sides guessing how many concepts, revisions and exports the fee covers.',
    sections: [
      { heading: 'Count assets and versions', paragraphs: ['Separate a creative concept from a finished deliverable. Two starting directions do not necessarily mean two completed identities. List sizes, variants and intended uses so the client can identify missing requirements before production.'], bullets: ['Name each final asset and required color or orientation variants.', 'List editable source files only if included.', 'Identify printer specifications, licensed fonts or supplied imagery needing confirmation.'] },
      { heading: 'Give feedback a decision structure', paragraphs: ['Describe when the client selects a direction and when refinements happen. Ask the decision maker to combine team feedback into one response so contradictory comments do not become separate rounds.'], bullets: ['Define the number of concepts and refinement rounds.', 'State what happens when a selected direction is replaced.', 'Review ownership and third-party permissions in the appropriate agreement; do not imply every supplied item can be transferred.'] },
      { heading: 'Proposal review checklist', paragraphs: ['Compare the asset list with the client’s intended production channels. A file is useful only if its format and dimensions suit the agreed destination.'], bullets: ['Asset counts, sizes and formats match the brief.', 'Concept selection and refinement have decision dates.', 'Client-supplied material has an owner.', 'Proposed fees are labeled proposed and arithmetic is checked.', 'Excluded production services and next approval are clear.'] },
    ],
    template: `GRAPHIC DESIGN PROPOSAL
Client / designer / version / date: [details]
Audience and use: [who sees the work; where]
Objective: [communication problem]
Asset package: [asset; variants; dimensions; quantity]
Concepts: [number; presentation method]
Direction decision: [reviewer; date]
Refinement rounds: [number; consolidated feedback definition]
Client provides: [copy, references, existing assets; dates]
Production: [printer/platform specifications to confirm]
Final formats: [format; purpose; source-file inclusion]
Third-party material: [permissions needing review]
Exclusions: [printing, extra sizes, new directions or other limits]
Proposed price and currency: [items; total]
Proposed payment stages: [amounts and triggers]
Changes: [request; fee/date effect; explicit decision]
Next step: [questions or acceptance of this version]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed terms
Pine Workshop asks Sol Design for an identity refresh for its café. The package includes one selected logo with horizontal and stacked versions, one single-color variant, a color palette and a two-page usage sheet. Two initial directions are presented; the chosen direction receives two consolidated refinement rounds.
Pine supplies its exact business name and approved wording by 4 May. Lee chooses the direction on 11 May. Exports are SVG, print-ready PDF as specified by Pine’s printer, and transparent PNG; editable source artwork is included for the selected logo. Printing and menu design are excluded.
Sol proposes $1,200 USD for identity work plus $300 for the usage sheet, totaling $1,500. Proposed payments are $750 at acceptance and $750 after final review. These fictional figures need client approval. An extra menu layout would require a separate scope and price decision.`,
    bankeiz: 'Use the asset list to prepare a focused message in Bankeiz with only the project context you select. Review deliverables, permissions and wording yourself, then handle any supported payment as a separate action.',
    related: ['/learn/templates/graphic-design-client-brief/', '/learn/resources/ask-client-for-feedback/', '/business/for/designers/'],
    keywords: ['graphic design proposal template', 'branding proposal example', 'design deliverables proposal'],
  },
  {
    slug: 'graphic-design-client-brief', kind: 'template', niche: 'Graphic designers',
    title: 'Graphic design client brief template with useful references',
    description: 'Gather audience, message, usage, references, constraints and one approval contact before beginning graphic design work.',
    intro: 'A design brief collects decisions that shape the work before anyone chooses a visual direction. Use references to explain a preference, then connect that preference to the audience and intended use.',
    problem: '“Make it modern” leaves too much room for interpretation. The same phrase could mean quiet typography, bright illustration or fewer details, and none of those choices necessarily solves the client’s communication problem.',
    sections: [
      { heading: 'Start with the communication task', paragraphs: ['Ask what someone should understand or do after seeing the design. Identify the primary audience and setting. Record secondary audiences without forcing one asset to serve every purpose equally.'], bullets: ['Name the asset and real destination, including dimensions where known.', 'Ask which message must be noticed first.', 'Separate confirmed requirements from ideas the designer may explore.'] },
      { heading: 'Turn references into reasons', paragraphs: ['A useful reference explains a preference such as “the hierarchy is easy to scan” or “the illustration feels too playful for our audience.” References guide discussion; they are not instructions to reproduce another person’s work.'], bullets: ['Collect liked and disliked references with reasons.', 'Request existing brand files through an approved sharing channel.', 'Record mandatory wording, accessibility needs and production constraints.', 'Name who resolves conflicting feedback.'] },
      { heading: 'Brief review checklist', paragraphs: ['Review the completed brief before translating it into scope. Unknown dimensions, missing copy and unconfirmed permissions should remain visible questions rather than disappearing into assumptions.'], bullets: ['The primary audience and intended action are specific.', 'Each reference explains a trait, not a request to copy.', 'Assets and production destinations are listed.', 'Copy, imagery and approvals have owners.', 'Both parties know what still needs an answer.'] },
    ],
    template: `GRAPHIC DESIGN CLIENT BRIEF
Project / date / brief owner: [details]
Asset: [what is being designed]
Primary audience: [people; situation; relevant needs]
Desired understanding or action: [one priority]
Main message: [exact message or working draft]
Placement: [channels; size; print/digital requirements]
Existing identity: [brand files; colors/type; sharing reference]
Must include: [wording, marks, information]
Must avoid: [constraints and reasons]
Liked references: [reference; trait; reason]
Disliked references: [reference; trait; reason]
Client material: [copy/image; owner; date; permission status]
Budget and timing: [confirmed limits or questions]
Decision maker / feedback: [name; consolidation method]
Success review: [how work will be assessed against this brief]
Open questions: [question; owner; date]`,
    example: `FICTIONAL FILLED EXAMPLE
Pine Workshop needs a café window poster announcing Saturday repair mornings. Its primary audience is local residents carrying everyday items needing small repairs. The first message is “Saturday repair mornings”; the second is the start time and address. The desired action is to visit the café for details.
The poster will be A3 portrait, with a matching square digital image scoped separately. Pine likes a reference’s generous spacing but does not want its illustration copied. Neon colors and dense paragraphs are unsuitable because the poster must be read from the pavement.
Lee supplies approved wording and the café logo by Tuesday, confirms image permissions and consolidates feedback. The printer’s margin requirement is still unknown; Lee obtains it before final artwork. Review will check message hierarchy, legibility at the intended viewing distance and the exact time and address.`,
    bankeiz: 'Keep the answered brief and unresolved questions in the relevant conversation. Chosen context in Bankeiz Messages can help prepare a concise clarification, but the client still needs to confirm actual design requirements.',
    related: ['/learn/templates/graphic-design-proposal/', '/learn/templates/copywriting-client-brief/', '/learn/resources/client-brief-to-proposal/'],
    keywords: ['graphic design client brief template', 'design questionnaire template', 'creative brief for graphic design'],
  },
  {
    slug: 'consulting-proposal', kind: 'template', niche: 'Consultants',
    title: 'Consulting proposal template built around a client decision',
    description: 'Explain the client situation, consulting approach, deliverables, dependencies and proposed fee without promising unsupported results.',
    intro: 'A consulting proposal should connect a known client problem to work the consultant can actually deliver. Explain the approach and the decision it will support, then identify the information and participation required.',
    problem: 'Broad promises such as “improve operations” hide the difference between advice, implementation and a business outcome. A client needs to know which is being proposed and what evidence will be delivered.',
    sections: [
      { heading: 'State the situation without overselling certainty', paragraphs: ['Summarize the client’s observed issue and distinguish it from an untested explanation. A project can investigate why approvals are slow without asserting that a particular department is the cause.'], bullets: ['Name the practical decision the engagement will inform.', 'Record available baseline information and missing inputs.', 'Describe deliverables you control instead of guaranteeing savings or revenue.'] },
      { heading: 'Show how the approach produces deliverables', paragraphs: ['Link interviews, analysis and workshops to a defined output. Explain what the client must make available and when a missing input would change the plan.'], bullets: ['Specify interview or workshop counts and participants.', 'List report sections, working files or presentations.', 'Separate recommendations from implementation and ongoing support.', 'Give the sponsor a clear review and next-decision point.'] },
      { heading: 'Consulting proposal review checklist', paragraphs: ['Read the proposal as if the sponsor will explain the engagement to a colleague. The boundary between analysis and execution should survive that retelling.'], bullets: ['The problem uses information actually supplied.', 'Every activity supports a named output.', 'Dependencies, exclusions and dates are explicit.', 'Proposed fee stages add up in one currency.', 'No outcome is a guarantee or an already achieved result.'] },
    ],
    template: `CONSULTING PROPOSAL
Client / consultant / version / date: [details]
Situation: [observations; sources; uncertainties]
Decision or objective: [what the engagement helps the client decide]
Approach: [stages and activities]
Deliverables: [output; contents; format]
Client participation: [people; information; access; availability]
Schedule: [stage; target date; dependency]
Review: [reviewer; checks against scope; feedback date]
Assumptions: [conditions needing confirmation]
Exclusions: [implementation, support or other boundaries]
Proposed fee and currency: [items and total]
Proposed payment stages: [amount; trigger]
Changes: [review effect on work, price and timing before proceeding]
Open questions: [question; owner]
Next decision: [approve this version, request changes or clarify]`,
    example: `FICTIONAL FILLED EXAMPLE — proposal, not a promise of results
Oak Field Supply reports that purchase approvals are difficult to trace. Consultant Dana proposes a three-week review to help its operations lead choose a simpler approval process. The cause has not been established.
Work includes four staff interviews, review of a client-selected sample of ten completed requests, one process map and a recommendations workshop. Oak supplies redacted examples and schedules participants. The deliverable is a findings report with observed issues, two options and implementation questions. System configuration and staff training are excluded.
Dana proposes a fixed $2,400 USD fee: $1,200 after acceptance and $1,200 after the scoped report and workshop. The sponsor reviews whether the agreed work is complete, rather than using projected benefits as acceptance criteria. The next step is to confirm interview availability and decide on proposal v1.`,
    bankeiz: 'Prepare the sponsor’s next-step message in Bankeiz using only the conversation context you choose. Optional metered Business assistance does not replace your review of findings, scope or separately approved payment actions.',
    related: ['/learn/templates/consulting-scope-of-work/', '/learn/resources/follow-up-on-proposal/', '/business/for/consultants/'],
    keywords: ['consulting proposal template', 'consultant proposal example', 'consulting engagement proposal'],
  },
  {
    slug: 'consulting-scope-of-work', kind: 'template', niche: 'Consultants',
    title: 'Consulting scope of work template with clear dependencies',
    description: 'Document consulting activities, outputs, client inputs, assumptions, exclusions and how changed requests will be reviewed.',
    intro: 'Use a consulting scope of work to make the delivery plan inspectable. Name the analysis, meetings and outputs, then put client dependencies beside the dates they affect.',
    problem: 'A consultant can be ready while waiting for data, interview availability or a sponsor’s decision. If those inputs are invisible, a schedule looks unconditional even though work cannot move forward.',
    sections: [
      { heading: 'Give each output a boundary', paragraphs: ['An output should say what it contains and how it will be reviewed. “Strategy” is less inspectable than a document covering three options, assumptions and the decision needed for each.'], bullets: ['State meeting and interview counts and durations.', 'Specify analysis populations or sample boundaries.', 'Separate recommendations from responsibility for implementation.'] },
      { heading: 'Record assumptions and unresolved inputs', paragraphs: ['Write the conditions used to plan the work, including who supplies information and whether it is complete enough for the analysis. Do not turn a missing source into a confident conclusion.'], bullets: ['Assign an owner and due date to each input.', 'Define how delayed inputs change the review conversation.', 'Keep access authorization in the approved channel.', 'Describe changes by their effect on outputs, effort and timing.'] },
      { heading: 'Scope review checklist', paragraphs: ['Compare this scope with the proposal and actual commercial agreement. Resolve contradictory dates or deliverables before either team relies on them.'], bullets: ['Outputs can be checked without a guaranteed business result.', 'Inputs have owners and realistic dates.', 'Meeting counts, revision limits and exclusions are clear.', 'Unknowns have a visible next action.', 'Changed instructions need an explicit decision before work.'] },
    ],
    template: `CONSULTING SCOPE OF WORK
Project / version / date: [details]
Related proposal or agreement: [exact reference]
Purpose and decision supported: [statement]
Activities: [activity; count; duration or limit]
Deliverables: [output; contents; format; due date]
Information boundary: [period; sample; sources; known gaps]
Client dependencies: [input; owner; date; effect if unavailable]
Consultant responsibilities: [work and coordination]
Assumptions: [assumption requiring confirmation; owner]
Review: [reviewer; checks; feedback date; rounds]
Exclusions: [work not included]
Schedule: [stage; dependency; target date]
Change record: [request; output/price/date effect; decision]
Commercial reference: [where agreed fees and terms are recorded]
Completion review: [scoped delivery evidence; outstanding questions]
Next action: [owner and date]`,
    example: `FICTIONAL FILLED EXAMPLE
Oak Field Supply scope v1 covers four 45-minute interviews, analysis of ten redacted purchase requests from April and one 90-minute workshop. Dana delivers a current-process map and a report comparing two approval options. Changing purchasing software and supervising implementation are excluded.
Oak’s operations lead supplies the sample by 6 June and books interviews by 8 June. The draft report is targeted for 19 June if inputs arrive as planned. If the sample is incomplete, Dana flags the gap and discusses a revised analysis boundary with the sponsor.
The sponsor checks that the map, two options and assumptions are present, then gives one consolidated correction response. An additional warehouse team is outside the interview count; including it requires a documented fee and timing decision. Completion is reviewed against the specified outputs, retaining unresolved implementation questions.`,
    bankeiz: 'Use the reviewed scope to keep the next client message precise. In Bankeiz Messages, select only relevant context when preparing wording, and confirm changed work and any supported payment separately.',
    related: ['/learn/templates/consulting-proposal/', '/learn/resources/client-scope-change/', '/learn/resources/project-handover/'],
    keywords: ['consulting scope of work template', 'consultant statement of work example', 'consulting project scope'],
  },
  {
    slug: 'marketing-agency-proposal', kind: 'template', niche: 'Marketing agencies',
    title: 'Marketing agency proposal template for a defined campaign',
    description: 'Plan a campaign with channels, deliverable counts, approval responsibilities, exclusions and separately reviewed media spend.',
    intro: 'A campaign proposal should show what the agency will make, manage and report during a named period. Put production fees, client responsibilities and any media budget in distinct lines so scope is easy to assess.',
    problem: '“Campaign management” can blur creative production, ad spend, customer replies and website changes. A client needs to see which services are included before judging the price or workload.',
    sections: [
      { heading: 'Define work by channel and period', paragraphs: ['Name the campaign window and deliverables for each channel. Specify formats and counts rather than a loose promise to “create content.” Measurement access is a dependency, not proof that tracking works.'], bullets: ['Separate creative assets, publishing and reporting.', 'State whether landing pages are reviewed or changed.', 'Separate media spend from fees and identify its authorizer.'] },
      { heading: 'Make approvals and exclusions practical', paragraphs: ['Identify who supplies product facts, reviews claims and approves final material. Set approval before publication, with a plan for missing feedback instead of assuming silence means consent.'], bullets: ['Name who consolidates client feedback.', 'Specify revision rounds and how new ideas are scoped.', 'List excluded community management, photography and platform costs.', 'Report observed figures and context without a guaranteed result.'] },
      { heading: 'Campaign proposal review checklist', paragraphs: ['Check the proposal against actual input requirements. A short production window still needs approved claims, suitable imagery and working destinations.'], bullets: ['Each channel has counts and a period.', 'Facts, permissions and reviewer availability have owners.', 'Fees and media budgets cannot be confused.', 'Timing depends on explicit approvals.', 'The proposal asks for a clear scope and budget decision.'] },
    ],
    template: `MARKETING AGENCY PROPOSAL
Client / agency / version / date: [details]
Objective and audience: [specific purpose]
Campaign period: [start/end; dependencies]
Channels and deliverables: [channel; asset type; count; service]
Landing destination: [page; owner; included checks/changes]
Client inputs: [facts, claims, images; owner; date]
Approval: [reviewer; draft date; decision date; revision rounds]
Agency responsibilities: [creation, setup, management, reporting]
Client responsibilities: [access authorization, factual review, response handling]
Reporting: [measures; source; frequency; limitations]
Exclusions: [services and platform costs]
Proposed agency fee: [items; currency; total]
Separate media budget proposal: [amount; payer; authorization]
Payment / changes: [proposed stages; change review]
Next action: [approve this version or identify changes]`,
    example: `FICTIONAL FILLED EXAMPLE — no performance result implied
North Lane Agency proposes a four-week spring campaign for Fern Furnishings. It includes six social images, two email drafts, one existing landing-page review and a final report. Photography, customer replies and website implementation are excluded.
Fern supplies approved descriptions, prices and images by 2 April. Sam combines comments into one revision round per batch and explicitly approves final material before publication. The report states observed visits and enquiries from available data, including tracking gaps; it promises no sales outcome.
Proposed fees are production $1,400 plus coordination and reporting $600 = $2,000 USD. A separate proposed $500 media budget would be paid by Fern through its approved account only after authorization. Neither figure is an accepted price in this fictional example. Sam’s next decision is to confirm assets, review availability and separate budgets.`,
    bankeiz: 'Prepare a campaign decision message with chosen context in Bankeiz Messages. Optional metered Business assistance can support drafting; people still review claims, publication decisions and any supported payment action.',
    related: ['/learn/templates/agency-client-onboarding/', '/learn/templates/social-media-management-proposal/', '/business/for/agencies/'],
    keywords: ['marketing agency proposal template', 'campaign proposal example', 'agency campaign scope template'],
  },
  {
    slug: 'agency-client-onboarding', kind: 'template', niche: 'Marketing agencies',
    title: 'Agency client onboarding checklist for the first week',
    description: 'Collect approved scope, contacts, brief, source material and first next steps without collecting client passwords.',
    intro: 'Onboarding should turn an accepted scope into a clear first week. Identify contacts, collect approved source material and leave the client with one concrete next step.',
    problem: 'A welcome message can feel complete while the agency still lacks a decision maker, product facts or approved access. Those gaps become rushed questions when production is already scheduled.',
    sections: [
      { heading: 'Start from the actual engagement', paragraphs: ['Confirm the scope version accepted and the work ready to begin. A checklist should not quietly add a channel, service or reporting promise absent from that scope.'], bullets: ['Record main contact, final decision maker and substitute.', 'Confirm period, deliverables and immediate dependencies.', 'Hold unresolved scope or commercial questions for an explicit decision.'] },
      { heading: 'Gather useful inputs safely', paragraphs: ['Request the specific material for the first deliverable: approved copy, facts, brand files and references. Ask the client to authorize access through its existing process rather than sending credentials in a questionnaire.'], bullets: ['Record where approved assets live and who maintains them.', 'Name the owner of claims and usage permissions.', 'Set a feedback channel and review dates.', 'Define what the agency sends first and what the client decides.'] },
      { heading: 'Ready-to-start review', paragraphs: ['Mark an item complete only after checking it. A link received is not necessarily a file production can open; access requested is not access confirmed.'], bullets: ['Scope reference and contacts are current.', 'First-stage material is readable and approved.', 'Access was tested using the authorized account.', 'First review has an owner, date and decision.', 'Missing inputs have follow-up actions rather than silent assumptions.'] },
    ],
    template: `AGENCY CLIENT ONBOARDING
Status: [not started / in progress / ready for named work]
Client / campaign / checklist owner: [details]
Accepted scope: [version/date; unresolved differences]
Main contact / decision maker / substitute: [names/roles]
Period and first deliverable: [details]
[ ] Brief confirmed — [owner; date]
[ ] Approved facts and claims — [source; reviewer]
[ ] Brand files and imagery — [sharing reference; permissions owner]
[ ] Access authorized and tested — [service; role; owner; no secrets]
[ ] Feedback process agreed — [channel; response expectations]
[ ] Review dates and decision owners confirmed — [details]
[ ] Reporting inputs checked — [source; gaps]
[ ] Administrative questions resolved separately — [reference/status]
Missing inputs: [item; owner; date; effect on work]
Agency first action: [output; owner; date]
Client next decision: [request; date]
Kickoff summary: [sent/reviewed date; corrections]`,
    example: `FICTIONAL FILLED EXAMPLE
Fern Furnishings onboarding uses campaign scope v2. Sam is the client contact and final reviewer; Noor substitutes during leave. The first output is a six-image concept board due 7 April.
The brief and brand files are checked complete. Sam supplied descriptions for four products, but two price claims need confirmation. Those products stay out of creative until Sam responds. An agency member tested the authorized analytics role without recording any password.
Feedback goes in the campaign conversation, with one combined response from Sam. Review is set for 9 April. The agency sends the concept board and three specific questions; Sam confirms product selection and pending claims by 6 April. Missing inputs remain visible in the kickoff summary. The team marks readiness only for the approved products and does not treat a requested account invitation as confirmed access.`,
    bankeiz: 'Use Bankeiz Messages to prepare a kickoff summary from chosen context. Keep credentials in the client’s approved access process, and review scheduling or supported payment actions explicitly when needed.',
    related: ['/learn/templates/marketing-agency-proposal/', '/learn/templates/social-media-client-approval/', '/learn/resources/ask-client-for-feedback/'],
    keywords: ['agency client onboarding checklist', 'marketing agency onboarding template', 'new agency client checklist'],
  },
  {
    slug: 'photography-proposal', kind: 'template', niche: 'Photographers',
    title: 'Photography proposal template for a clearly defined shoot',
    description: 'Describe shoot coverage, selected image count, editing, delivery and client decisions before confirming photography work.',
    intro: 'A photography proposal connects intended use to a shoot and delivered image package. State coverage, selection and practical conditions needing confirmation before a date is treated as booked.',
    problem: '“A half-day shoot” says little about priorities, image count or editing. Location, weather, product readiness and usage expectations can change the work substantially when left unresolved.',
    sections: [
      { heading: 'Plan around the intended use', paragraphs: ['Name subjects, location and priority shots. Ask where images will be used and record terms for appropriate review; do not casually promise unrestricted rights for every person or asset involved.'], bullets: ['Specify date, coverage window and setup allowance.', 'Assign location access and participant permissions.', 'List weather or location decisions requiring a contingency plan.'] },
      { heading: 'Define selection, editing and delivery', paragraphs: ['Separate proofs from final images. Explain who selects them, what editing includes and which formats will be delivered.'], bullets: ['State final image count and intended resolution or purpose.', 'Distinguish standard editing from substantial retouching.', 'Name delivery timing relative to shoot and selection.', 'Keep extra images, travel and reshoot terms visible for review.'] },
      { heading: 'Shoot proposal review checklist', paragraphs: ['Read the proposal with the production contact. Replace “to be arranged” with an owner and decision date wherever it affects the shoot.'], bullets: ['Subjects, place, date and coverage are specific.', 'Image count, formats and editing limits are clear.', 'Usage and permissions receive appropriate review.', 'Proposed fees and additional expenses are distinguished.', 'The next step explains booking confirmation under actual agreed terms.'] },
    ],
    template: `PHOTOGRAPHY PROPOSAL
Client / photographer / version / date: [details]
Purpose and uses: [channels; audience]
Subjects and priority shots: [specific scenes/items]
Proposed shoot: [date; time; timezone; coverage; location]
Site arrangements: [owner; access; equipment needs]
People / permissions: [responsible contact; unresolved items]
Contingency: [weather/location issue; owner; decision date]
Selection: [proof process; selector; deadline]
Final package: [count; formats; resolution/purpose]
Editing included / excluded: [boundaries]
Delivery: [method; timing; access review]
Usage terms for review: [reference; limits needing agreement]
Proposed fee and expenses: [items; currency; total; unconfirmed costs]
Proposed payment stages: [amounts; triggers]
Changes / additions: [review and approval process]
Next decision: [scope questions; booking requirements]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed booking
Ari Photo proposes photography for Juniper Ceramics at its studio on 12 May, 9:00–12:00 local time. Priority shots cover eight mugs, two group arrangements and two workshop scenes. Juniper prepares products and confirms studio and participant permissions.
The package includes 20 final edited JPEG images for agreed website and organic social uses, with terms reviewed separately. Ari supplies proofs; Juniper chooses within three working days. Color and exposure adjustments are included; complex compositing and raw files are excluded. Final delivery is proposed five working days after selection.
Proposed fees are shoot coverage $600 plus editing $300 = $900 USD, with no travel charge for this location. Proposed stages are $450 after acceptance and $450 after delivery review. The date is not represented as confirmed. Juniper’s next step is to review package and booking terms.`,
    bankeiz: 'Prepare shoot confirmation wording in Bankeiz Messages using chosen context. Check the exact date, scope and booking decision yourself; review any supported payment action separately from the message.',
    related: ['/learn/templates/photography-invoice/', '/learn/resources/schedule-from-conversation/', '/learn/resources/project-handover/'],
    keywords: ['photography proposal template', 'commercial photography proposal example', 'photo shoot proposal'],
  },
  {
    slug: 'photography-invoice', kind: 'template', niche: 'Photographers',
    title: 'Photography invoice template and itemized fictional example',
    description: 'Prepare an invoice from agreed photography work with exact line items, recorded payments, a due date and payment reference.',
    intro: 'An invoice should connect a payment request to work and prices already agreed. Check the client, shoot reference, line items and remaining amount before sending this practical template.',
    problem: 'One “photography” line leaves clients unsure whether coverage, editing or earlier payments are included. An invoice becomes misleading when proposed extras appear as authorized work.',
    sections: [
      { heading: 'Build from the actual agreement', paragraphs: ['Use accepted scope and separately approved additions as the source for amounts. Resolve unknown prices or expenses before including them as agreed charges.'], bullets: ['Name the shoot date and project reference.', 'Describe quantities, units and rates.', 'Keep unsupported extras and unverified payment claims off the invoice.'] },
      { heading: 'Reconcile the amount still due', paragraphs: ['Calculate each line and the balance after payments actually received. Confirm currency and reference. This is a practical example, not a universal list of tax or invoice requirements; check what applies to your situation.'], bullets: ['Apply discounts or tax only with a confirmed basis.', 'Separate received payments from money merely requested.', 'Use the due date from agreed terms.', 'Inspect recipient and payment destination before sending.'] },
      { heading: 'Invoice review checklist', paragraphs: ['Compare the invoice with underlying records and current payment status. A copied draft can carry an old balance even when its line arithmetic is correct.'], bullets: ['Each charge has an agreement reference.', 'Quantity times rate equals the amount.', 'Subtotal, adjustments, received payments and balance reconcile.', 'Names, currency, identifier and due date are correct.', 'The reference is specific and destination checked.'] },
    ],
    template: `PHOTOGRAPHY INVOICE — review before sending
Invoice identifier / issue date: [details]
From: [business and appropriate contact details]
To: [billing name and approved contact]
Project / shoot / accepted scope: [references]
Currency: [currency]
Lines: [description] | [quantity] × [rate] = [amount]
[Repeat for each agreed service/expense]
Subtotal: [sum of lines]
Discount / applicable adjustment: [basis and amount, if relevant]
Total: [subtotal minus discount plus adjustments]
Payments received: [date; reference; amount; verified status]
Balance due: [total minus received payments]
Due date / agreed terms: [reference]
Payment method / checked destination: [approved instructions]
Payment reference: [invoice identifier]
Questions: [contact/channel]
Review record: [scope, arithmetic, status, recipient; reviewer/date]`,
    example: `FICTIONAL FILLED EXAMPLE — assumed prior agreement, not a price for your shoot
Invoice AP-104, issued 20 May, is addressed by Ari Photo to Juniper Ceramics for the 12 May shoot under accepted scope JC-02. This fictional scenario assumes those terms were previously agreed.
Currency: USD. Shoot coverage: 3 hours × $200 = $600. Editing: 20 images × $15 = $300. Subtotal and total: $900. No tax is included in this arithmetic example; it does not establish anyone’s tax treatment.
Verified payment received on 5 May, reference JC-02: $450. Balance due: $900 − $450 = $450. The fictional agreed due date is 3 June. The invoice requests reference AP-104 and directs the client to the checked destination. Any discrepancy should be raised before payment, rather than assuming an unexplained charge is accepted.`,
    bankeiz: 'Use the template in any editor and verify agreement and payment records. In Bankeiz, prepare a contextual message in Messages, then separately inspect amount, recipient and supported payment method before acting.',
    related: ['/learn/templates/photography-proposal/', '/learn/resources/write-freelance-invoice/', '/learn/resources/client-payment-reminder/'],
    keywords: ['photography invoice template', 'photography invoice example', 'photographer invoice line items'],
  },
  {
    slug: 'video-production-proposal', kind: 'template', niche: 'Videographers',
    title: 'Video production proposal template from planning to final export',
    description: 'Define production phases, shoot coverage, edit rounds, client inputs, output formats and final review decisions.',
    intro: 'A video proposal connects the planned shoot to finished edits. Describe pre-production, production and post-production separately so the client can see what each phase needs and produces.',
    problem: '“A two-minute video” does not define shoot days, script work, alternate formats or revisions. A small story change can become substantial unplanned production without those boundaries.',
    sections: [
      { heading: 'Define story and production limits', paragraphs: ['Start with audience, use and message. Name the duration range, location and contributors. State planning work included instead of assuming the client or producer supplies it.'], bullets: ['Assign script, interview questions and location arrangements.', 'Confirm contributor permissions and supplied material owners.', 'List shoot hours, crew scope and travel assumptions.'] },
      { heading: 'Make edits and exports concrete', paragraphs: ['An edit round means one consolidated response on a named version. Separate story changes from technical corrections and explain how late requests affect the schedule.'], bullets: ['Name the main film and every cutdown or aspect-ratio version.', 'Specify captions, audio, graphics and file formats.', 'State whether project files or raw footage are included.', 'Review third-party usage permissions without implying universal ownership.'] },
      { heading: 'Production proposal review checklist', paragraphs: ['Check that the client can follow the path from approved plan to files. Do not call a date fixed when it depends on an unconfirmed shoot or review.'], bullets: ['Phases have outputs, owners and dates.', 'Coverage and final versions are counted.', 'Rounds and excluded work are explicit.', 'Proposed pricing and payment stages reconcile.', 'The next decision covers exact scope and assumptions.'] },
    ],
    template: `VIDEO PRODUCTION PROPOSAL
Client / producer / version / date: [details]
Audience, message and use: [statement]
Outputs: [duration; aspect ratio; count; format]
Pre-production: [script, shot list, planning; owners]
Shoot: [date; time; timezone; location; coverage; crew]
Client inputs: [people, products, claims; dates]
Permissions / third-party material: [responsible parties; review items]
Post-production: [edit, sound, graphics, captions; limits]
Reviews: [rounds; reviewer; consolidated feedback dates]
Schedule: [plan approval; shoot; first edit; final review]
Handover: [exports; source/raw inclusion or exclusion; access]
Exclusions / assumptions: [boundaries]
Proposed fee and currency: [phases; total; expenses]
Proposed payment stages: [amounts and triggers]
Changes: [scope/price/date review before work]
Next decision: [questions or acceptance of this version]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed project
Frame Studio proposes a 90-second workshop introduction for Harbor Furniture, plus one 20-second square cutdown. The package includes a planning call, shot list, one four-hour shoot, editing, simple titles and reviewed captions. Harbor supplies approved claims, interview participants and location permission.
The main edit is reviewed first; two consolidated edit rounds are included. Re-recording interviews, extra filming and additional cutdowns are excluded. Delivery is MP4 plus a caption file. Raw footage and editing project files are not included in this proposed package.
Proposed fees are planning $400, shoot $1,200 and post-production $900 = $2,500 USD. Proposed stages are $1,250 after acceptance and $1,250 after final review. Delivery depends on confirmed shoot and feedback dates. Harbor’s next decision is to confirm outputs, contributors and scope before scheduling.`,
    bankeiz: 'Prepare a production decision message using selected context in Bankeiz Messages. Review permissions and dates yourself, and separately inspect any supported booking or payment action before confirming it.',
    related: ['/learn/templates/video-project-handover/', '/learn/resources/ask-client-for-feedback/', '/business/for/filmmakers/'],
    keywords: ['video production proposal template', 'videography proposal example', 'video project proposal'],
  },
  {
    slug: 'video-project-handover', kind: 'template', niche: 'Videographers',
    title: 'Video project handover checklist for inspectable final files',
    description: 'Hand over actual video exports, captions, version references and access instructions with a precise client review request.',
    intro: 'A video handover guides the client through delivered files. Identify final versions, explain intended uses and ask the client to inspect the package before acknowledging receipt.',
    problem: 'A folder link leaves clients guessing which edit is final, whether captions are included and how long access lasts. A polished message cannot compensate for missing or unreadable files.',
    sections: [
      { heading: 'Inventory what actually exists', paragraphs: ['Build the handover from the delivered folder rather than a remembered proposal. List each file’s version and purpose, including cutdowns, captions and source material actually included.'], bullets: ['Distinguish final exports from review edits in filenames.', 'Record duration, aspect ratio and relevant details.', 'List exclusions and unresolved issues instead of prematurely calling the package complete.'] },
      { heading: 'Check access and playback', paragraphs: ['Open the path with recipient-equivalent access. Inspect sound, titles and captions in actual exports. Review usage notes for music and supplied material without a blanket rights claim.'], bullets: ['Confirm download access and any known expiry.', 'Explain whether captions are embedded or separate.', 'Limit archive and future revision arrangements to agreed scope.', 'Ask for a specific inspection response.'] },
      { heading: 'Handover review checklist', paragraphs: ['Acknowledgment should relate to a named package. Give a corrected export a new version reference and identify the difference if it is delivered later.'], bullets: ['Scoped exports exist and open.', 'The approved edit matches delivery.', 'Captions, sound and titles were inspected.', 'Access, usage and outstanding issues are explained.', 'Receipt and approval of unresolved work remain separate decisions.'] },
    ],
    template: `VIDEO PROJECT HANDOVER
Project / client / sender / date: [details]
Scope and final review reference: [version; date]
Package version: [identifier]
Delivery location: [approved sharing reference]
Access / known expiry: [details; no passwords]
Inventory: [filename; version; duration; ratio; format; purpose]
Captions: [file; language; embedded/separate; instructions]
Source / raw material: [included list, or excluded]
Checks: [playback, audio, titles, captions; reviewer/date]
Usage notes: [agreed reference; limitations]
Open issues: [issue; owner; decision, or none known]
Archive / revisions: [actual arrangements]
Client request: [open files; check access/content; respond by date]
Response record: [receipt / access issue / correction; date]
Next step: [action and owner]`,
    example: `FICTIONAL FILLED EXAMPLE
Frame Studio delivers Harbor Furniture package HF-v3 after final-edit review. The approved sharing folder contains Harbor-main-v3.mp4, 90 seconds in 16:9; Harbor-square-v3.mp4, 20 seconds in 1:1; and Harbor-main-v3-en.srt. The caption file belongs with the main film. Raw footage is excluded under the accepted scope.
Frame checked playback, audio, titles and captions in the exports. Authorized recipient access was tested. Known folder availability ends 30 July; Harbor is asked to retain a copy before then. Usage notes refer to reviewed music and contributor arrangements.
Jo is asked to download and open both films and the caption file by Friday, then confirm receipt or name a problem. No new edits or indefinite archive service are implied. A corrected export would be labeled separately so acknowledgment could refer to the actual version received.`,
    bankeiz: 'Use Bankeiz Messages to prepare a handover note from file references and chosen context. Inspect real files and access yourself; a prepared message is not evidence of complete delivery.',
    related: ['/learn/templates/video-production-proposal/', '/learn/templates/software-project-handover/', '/learn/resources/project-handover/'],
    keywords: ['video project handover checklist', 'video delivery checklist', 'videographer handover message'],
  },
  {
    slug: 'copywriting-proposal', kind: 'template', niche: 'Copywriters',
    title: 'Copywriting proposal template with pages, inputs and edit rounds',
    description: 'Scope copywriting assets, research inputs, interview counts, revisions, factual review and final handover.',
    intro: 'A copywriting proposal should show what will be written and what information supports it. List assets, source material, review responsibilities and boundaries before proposing a production schedule.',
    problem: 'Word counts alone do not describe research or approvals. Five pages can be straightforward when facts are ready and a much larger assignment when the offer, audience and evidence still need decisions.',
    sections: [
      { heading: 'Name the writing package', paragraphs: ['Identify each asset and its purpose. Use a word range as a planning aid where useful, but do not let it replace an explanation of the reader’s task and required sections.'], bullets: ['Count interviews, research sources and stakeholder sessions.', 'State whether messaging strategy or only copy production is included.', 'Separate draft copy from design, publishing and translation.'] },
      { heading: 'Assign evidence and feedback responsibilities', paragraphs: ['The client should confirm product facts, pricing, claims and permissions. Mark unsupported claims as questions instead of turning them into confident marketing language.'], bullets: ['Name a reviewer who consolidates feedback.', 'Define revisions around the agreed brief.', 'Explain how a new audience, offer or page changes scope.', 'Make dates depend on confirmed inputs and reviewer availability.'] },
      { heading: 'Copy proposal review checklist', paragraphs: ['Read the scope alongside the brief. Help the client distinguish a factual correction from a change in direction needing another decision.'], bullets: ['Each asset has a purpose and count.', 'Interviews and sources have owners and dates.', 'Factual review, revisions and exclusions are explicit.', 'Proposed arithmetic is correct and currency named.', 'Final format and next decision are clear.'] },
    ],
    template: `COPYWRITING PROPOSAL
Client / writer / version / date: [details]
Audience and reader task: [audience; intended action]
Assets: [page/asset; purpose; count; indicative length]
Research / interviews: [sources; sessions; limits]
Client inputs: [facts, offer, references, evidence; owner; date]
Tone / messaging reference: [brief version]
Draft schedule: [asset/batch; date; input dependency]
Factual reviewer: [name; responsibilities]
Feedback / revisions: [rounds; consolidated response; dates]
Handover: [editable format; inventory]
Exclusions: [design, publishing, extra research or other limits]
Proposed fee and currency: [items; total]
Proposed payment stages: [amounts; triggers]
Changes: [new brief/asset; fee/date review; decision]
Open questions: [question; owner]
Next step: [review this version and respond]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed work
Writer Nia proposes copy for Elm Services: Home, Services, About and Contact. It includes one 60-minute founder interview, review of supplied service notes and two consolidated revision rounds. Page lengths are planning ranges; the structure and reader task guide delivery.
Elm supplies service details and approved claims by 5 August. Alex reviews facts and combines feedback. First drafts are targeted for 12 August, subject to inputs arriving. Design, publishing, SEO performance guarantees and customer interviews are excluded. Final copy is delivered as editable text, one section per page.
The proposed fee is four pages × $300 = $1,200 USD. Proposed payments are $600 after acceptance and $600 after final review. These fictional terms require a decision. A case-study request would receive a separate scope, evidence review and estimate, rather than being treated as an included revision.`,
    bankeiz: 'Prepare the next-step message in Bankeiz Messages using selected project context. Review facts, claims and wording yourself, and consider supported payment actions separately after terms are agreed.',
    related: ['/learn/templates/copywriting-client-brief/', '/learn/resources/client-brief-to-proposal/', '/business/for/authors/'],
    keywords: ['copywriting proposal template', 'website copy proposal example', 'copywriter scope proposal'],
  },
  {
    slug: 'copywriting-client-brief', kind: 'template', niche: 'Copywriters',
    title: 'Copywriting client brief template for evidence-based drafts',
    description: 'Gather audience, offer, voice examples, source material, claim evidence and a factual reviewer before writing client copy.',
    intro: 'A copywriting brief makes the audience, offer and required action concrete. Distinguish confirmed information from questions so the writer can draft without inventing facts.',
    problem: 'A writer can match tone while describing the wrong offer or repeating an unsupported claim. Missing source material often appears later as feedback that the copy “doesn’t sound like us.”',
    sections: [
      { heading: 'Understand the reader and offer', paragraphs: ['Describe the reader’s situation and the decision the copy supports. Ask what the offer includes, excludes and needs to explain before the reader acts.'], bullets: ['Name the specific page, email or asset.', 'Collect current offer details and actual restrictions.', 'Choose one primary next action.'] },
      { heading: 'Separate voice references from evidence', paragraphs: ['Voice examples explain style; they do not prove facts. Ask what works in a sample and gather evidence for objective claims separately. Do not copy another business’s wording.'], bullets: ['Request examples with reasons for liking or disliking them.', 'List claims needing a source or confirmation.', 'Use visible placeholders for missing facts.', 'Name the factual reviewer and permissions owner.'] },
      { heading: 'Brief review checklist', paragraphs: ['Review before drafting. If the client cannot describe its offer or substantiate a claim, identify the needed decision instead of filling the gap with persuasive language.'], bullets: ['Audience, purpose and action align.', 'Offer details are current and have a source owner.', 'References explain traits rather than imitation.', 'Claims and testimonials have evidence or stay excluded.', 'The factual reviewer and date are confirmed.'] },
    ],
    template: `COPYWRITING CLIENT BRIEF
Project / asset / date: [details]
Primary audience: [reader; situation; need]
Reader’s main question: [question]
Next action: [specific step]
Offer: [inclusions; audience fit; restrictions]
Required information: [facts the asset must contain]
Voice: [concrete traits; examples with reasons]
Avoid: [tone, phrases or claims; reasons]
Source material: [reference; owner; date/current status]
Claims needing evidence: [claim; source; reviewer; status]
Quotations/testimonials: [permission/source, or none]
Alternatives for context: [reader choices; no copied wording]
Mandatory wording / review needs: [details]
Factual decision maker: [name/role]
Draft / feedback dates: [dates; dependencies]
Open questions: [question; owner; date]
Brief confirmation: [reviewer; version; corrections]`,
    example: `FICTIONAL FILLED EXAMPLE
Elm Services needs a Services page for small shop owners seeking routine premises maintenance. Readers need to know which tasks Elm handles and how to request a quote. The primary action is to send a task list and location through the enquiry route.
Elm wants a calm, direct voice. Alex likes an internal note because it names tasks plainly; the writer should not reuse another company’s copy. Services include scheduled minor repairs, excluding emergency callouts and specialist electrical work.
Alex supplies the current service list and coverage area. “Fastest local service” has no evidence and is excluded. No testimonial is supplied. Alex owns factual review and confirms boundaries by 15 August. Callout hours remain an open question, so the draft keeps a visible placeholder. The writer will ask for the missing fact rather than create a plausible schedule.`,
    bankeiz: 'Use selected brief context in Bankeiz Messages to prepare a clarification. Optional metered Business assistance can help with wording, while you and the client remain responsible for facts and final review.',
    related: ['/learn/templates/copywriting-proposal/', '/learn/templates/graphic-design-client-brief/', '/learn/resources/ask-client-for-feedback/'],
    keywords: ['copywriting client brief template', 'copywriter questionnaire', 'website copy brief example'],
  },
  {
    slug: 'social-media-management-proposal', kind: 'template', niche: 'Social media managers',
    title: 'Social media management proposal template with monthly limits',
    description: 'Define per-period content, channels, client approvals, response responsibilities, exclusions and proposed pricing.',
    intro: 'A social media proposal describes a repeatable period of work. Count assets and publishing tasks, explain approval and distinguish content production from paid media or customer response services.',
    problem: '“Manage our social media” can mean creating posts, replying daily, filming videos or running ads. A monthly fee cannot be reviewed meaningfully until those activities have explicit boundaries.',
    sections: [
      { heading: 'Count deliverables in the right unit', paragraphs: ['State channels and the service period. Explain whether a post adapted for two channels counts as one concept or two deliverables, and specify formats rather than treating all content alike.'], bullets: ['Separate originals, adaptations and scheduling.', 'State whether photography, recording or ads are included.', 'Identify who supplies facts and approved images.'] },
      { heading: 'Choose a review and response process', paragraphs: ['Give each batch a reviewer, version and approval deadline. Missing approval needs a schedule conversation; silence should not become permission to publish.'], bullets: ['Define rounds and combined feedback.', 'Name the owner of messages, complaints and sensitive questions.', 'Report observed information without reach or sales promises.', 'Keep urgent work and extra content subject to another decision.'] },
      { heading: 'Monthly scope review checklist', paragraphs: ['Check that the client understands a typical week and what needs extra approval. Avoid promising availability outside the service window.'], bullets: ['Period, channels and counts are unambiguous.', 'Review dates and publication decisions have owners.', 'Response handling and exclusions are named.', 'Fees, external spend and timing are distinct.', 'Next-period work follows actual agreed terms.'] },
    ],
    template: `SOCIAL MEDIA MANAGEMENT PROPOSAL
Client / manager / version / date: [details]
Period and channels: [dates; account names]
Audience and purpose: [statement]
Deliverables: [format; original/adaptation; count; channel]
Scheduling/publishing: [tasks; approval condition]
Client inputs: [facts; images; permissions; owner; date]
Review: [batch dates; reviewer; decision deadline]
Revisions: [rounds; combined feedback]
Customer responses: [included limits or client owner]
Reporting: [measures; frequency; limitations]
Availability: [hours; response expectations]
Exclusions: [recording, ads, extra channels, urgent work]
Proposed fee and currency: [items; total; external spend separately]
Payment / next period: [proposed terms; decision date]
Changes: [request; scope/price/date effects; approval]
Next decision: [confirm or amend this version]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed monthly package
Lena proposes September content for Brookside Plants on two channels: eight original square images, eight caption sets and adaptations for the second channel. Video shoots, paid ads and customer-message replies are excluded; Brookside owns enquiries.
Brookside supplies facts and photographs by 23 August. Pat reviews two batches with one combined revision response per batch. Publication occurs only after Pat approves named versions; missing approval can change dates.
The proposed fee is production $600 plus scheduling and reporting $200 = $800 USD. No media budget is included. Reports summarize observed platform data and gaps without a reach or sales promise. Pat’s next decision is to confirm counts, response ownership and proposed terms. The same assets on two channels do not silently become sixteen original concepts; that counting convention is stated before the client reviews the price.`,
    bankeiz: 'Prepare a monthly scope or approval request with chosen context in Bankeiz Messages. Review content and publication decisions yourself; any supported payment needs separate amount and recipient review.',
    related: ['/learn/templates/social-media-client-approval/', '/learn/templates/marketing-agency-proposal/', '/business/for/agencies/'],
    keywords: ['social media management proposal template', 'monthly social media proposal', 'social media retainer scope'],
  },
  {
    slug: 'social-media-client-approval', kind: 'template', niche: 'Social media managers',
    title: 'Social media client approval message for a named content batch',
    description: 'Ask a client to approve specific posts, captions and dates with an explicit decision and a plan for requested changes.',
    intro: 'An approval request tells the client what to inspect and how to respond. Name material and version, ask focused questions and separate approval from a request for revisions.',
    problem: '“Can you approve the posts?” is difficult to answer when several drafts and calendars circulate. An ambiguous reply can become mistaken permission to publish a different version.',
    sections: [
      { heading: 'Identify material without ambiguity', paragraphs: ['Use a stable batch reference and list its assets. State proposed channels and dates, using only a sharing location the recipient is authorized to open.'], bullets: ['Name visual and caption versions together.', 'Highlight facts, dates and claims needing attention.', 'Exclude unresolved assets or clearly mark them pending.'] },
      { heading: 'Ask for an explicit decision', paragraphs: ['Offer clear responses: approve the named batch or request numbered changes. Ask one reviewer to combine comments and explain how a late decision affects planning.'], bullets: ['Give a real deadline and timezone where relevant.', 'Request comments against post references.', 'Get approval of revised material when changes occur.', 'Treat missing approval as pending and discuss new dates.'] },
      { heading: 'Approval message review checklist', paragraphs: ['Inspect references before sending. The request must identify the material actually being reviewed, rather than an earlier folder or superseded draft.'], bullets: ['Assets and captions are readable.', 'Batch, channels and dates match.', 'Claims have a responsible reviewer.', 'Decision and deadline are explicit.', 'The message implies neither silence-as-approval nor existing publication.'] },
    ],
    template: `Subject: Review [batch/version] for [period]
Hi [name],
Please review [batch/version] at [approved sharing reference]. It contains:
• [post ID — visual version — caption version — channel — proposed date]
• [repeat for each item]
Please check [facts, offer dates and claims] as well as the overall material.
By [date, time, timezone], please reply with either:
1. “Approved: [exact batch/version] for [channels and dates]”; or
2. A combined change list using the post IDs.
[Items] remain pending and are excluded from this request.
If changes are needed, I will send a revised version for review. If the decision is late, we will confirm new dates rather than assume approval.
Open question: [question, or none].
Thanks, [sender]
Decision record: [reviewer; version; response; date]`,
    example: `FICTIONAL FILLED EXAMPLE
Subject: Review Brookside September batch A-v2
Hi Pat, please review batch A-v2 in our approved folder. It contains BS-01 through BS-04, each with image v2 and caption v2, proposed for both agreed channels on 2, 5, 9 and 12 September.
Please check plant names, prices and collection hours. By 28 August at 3:00 p.m. Eastern time, reply “Approved: A-v2 for the listed channels and dates,” or send one combined change list using post numbers.
BS-05 is waiting for a confirmed photograph and is excluded. Requested changes will return as a revised batch for approval. Late approval means we agree new dates. Thanks, Lena.
The decision record stays pending until Pat responds. This example does not represent actual approval or publication; sending the request itself is not consent to post the material.`,
    bankeiz: 'Prepare the request in Bankeiz Messages using batch details and chosen context. Check files and final wording before sending; an approval draft is not a publication action.',
    related: ['/learn/templates/social-media-management-proposal/', '/learn/resources/ask-client-for-feedback/', '/learn/templates/agency-client-onboarding/'],
    keywords: ['social media client approval message', 'social post approval template', 'client content approval request'],
  },
  {
    slug: 'software-development-proposal', kind: 'template', niche: 'Software developers',
    title: 'Software development proposal template with acceptance criteria',
    description: 'Define a build with user tasks, milestones, dependencies, testable acceptance criteria and a reviewed change process.',
    intro: 'A software proposal explains supported user tasks and evidence for reviewing completion. Keep the initial scope small enough that features, dependencies and exclusions can be understood.',
    problem: '“Build a dashboard” can conceal authentication, migrations, integrations and operations. Features without acceptance criteria leave the client unsure how to judge whether the build is ready.',
    sections: [
      { heading: 'Describe behavior before technology', paragraphs: ['Name roles and tasks. For each important feature, write an observable result and identify its data source or external dependency. An assumed integration capability is not a confirmed one.'], bullets: ['Distinguish initial release from later ideas.', 'Specify migration boundaries and supported environments.', 'Name required client authorizations without secrets.'] },
      { heading: 'Use inspectable milestones', paragraphs: ['Each milestone delivers a reviewable slice and a client decision. Distinguish defects against accepted scope from requests for new behavior.'], bullets: ['Assign test data and acceptance review owners.', 'Include deployment and handover only as scoped.', 'Define support boundaries rather than indefinite maintenance.', 'Review price and timing before changed work begins.'] },
      { heading: 'Software proposal review checklist', paragraphs: ['Read from the perspective of the user and operator. Questions about data, access and acceptance must stay visible rather than becoming hidden assumptions.'], bullets: ['Roles and features form a bounded release.', 'Criteria can be demonstrated with agreed data.', 'Dependencies have owners and confirmation status.', 'Proposed stages add up and have observable triggers.', 'Operating responsibility and next decision are explicit.'] },
    ],
    template: `SOFTWARE DEVELOPMENT PROPOSAL
Client / developer / version / date: [details]
Problem and users: [roles; tasks; situation]
Initial scope: [feature; behavior; limits]
Acceptance: [scenario; action; observable result]
Data/integrations: [source; dependency; owner; confirmation]
Client inputs: [decisions, sample data, authorized access; dates]
Milestones: [working slice; date; reviewer]
Testing: [environment; data; responsibilities]
Deployment/handover: [tasks; operating owner]
Support: [period/tasks, or excluded]
Exclusions/assumptions: [boundaries]
Proposed fee and currency: [milestone amounts; total]
Proposed payment stages: [amount; trigger]
Changes: [difference; cost/date effect; prior approval]
Open technical questions: [owner; investigation]
Next decision: [scope review; acceptance of this version]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed build
Imani proposes an internal stock-request tool for Alder Workshop. Staff create requests with item, quantity and note; managers accept or decline and view decision history. Payments, supplier ordering and forecasting are excluded.
Acceptance checks include staff seeing only their requests, a manager seeing the team list and a decision remaining visible after reopening. Alder supplies approved sample data and confirms roles before build. Production deployment and operating notes are included; maintenance is separate.
Proposed milestones are prototype $1,000, working build $2,000 and deployment/handover $1,000 = $4,000 USD. These fictional proposed amounts need agreement. Each milestone has a scoped demonstration before its payment trigger. Supplier integration would need investigation and a new scope decision. The proposal does not assert that an untested external service can support the desired workflow.`,
    bankeiz: 'Use chosen project context in Bankeiz Messages to prepare a scope clarification or milestone review. Review technical claims and acceptance evidence yourself; confirm supported payments separately.',
    related: ['/learn/templates/software-project-handover/', '/learn/resources/client-scope-change/', '/business/for/developers/'],
    keywords: ['software development proposal template', 'software project proposal example', 'development proposal acceptance criteria'],
  },
  {
    slug: 'software-project-handover', kind: 'template', niche: 'Software developers',
    title: 'Software project handover checklist without credential collection',
    description: 'Transfer deliverables, operating notes, known issues and access responsibilities with a practical acceptance review.',
    intro: 'A software handover helps the client locate, inspect and operate the delivered work. Identify release, documentation and owners while keeping secrets out of messages and downloadable checklists.',
    problem: 'A repository link is incomplete when the client cannot identify the deployed version, build it or find known issues. Access ownership needs a clear authorized transfer process too.',
    sections: [
      { heading: 'Identify the delivered release', paragraphs: ['Record a release identifier and the repositories, packages or environments actually included. Tie acceptance evidence to that version instead of a generic “everything passed” claim.'], bullets: ['List setup instructions and required versions.', 'Describe migration work and remaining limits.', 'Keep known issues and deferred features visible.'] },
      { heading: 'Make operation and access understandable', paragraphs: ['Name owners for hosting, domains, accounts and operation. Transfer access through the approved process, never passwords, tokens, recovery codes or private keys in this document.'], bullets: ['List configuration names and management locations without values.', 'Document deployment and recovery only as actually supplied.', 'Separate demonstrated checks from untested procedures.', 'State actual support scope or identify it as separate.'] },
      { heading: 'Handover review checklist', paragraphs: ['Ask the client to inspect named items and report blockers. Receipt of a link, acceptance and approval of future support are distinct decisions.'], bullets: ['Exact release and documentation are accessible.', 'Relevant setup and acceptance evidence is recorded.', 'Secrets are absent.', 'Operational owners and limits are named.', 'The review requests a response on a specific release.'] },
    ],
    template: `SOFTWARE PROJECT HANDOVER
Project / client / sender / date: [details]
Release: [tag/commit/build identifier]
Accepted scope: [version]
Deliverables: [repository/package/environment; purpose; access reference]
Setup/build: [documentation; supported versions]
Configuration: [names; authorized management location; no values]
Deploy/rollback: [notes; tested status]
Data: [migration scope; checks; limits]
Acceptance evidence: [criterion; result; date; environment]
Known/deferred issues: [impact; owner; decision]
Access transfer: [service; client owner; authorized process; status]
Operations: [hosting, renewal, backups or other agreed tasks]
Support: [actual period/tasks; future work separate]
Client review: [checks; reviewer; response date]
Outstanding actions: [owner; date]
Acknowledgment: [exact release; response; date]`,
    example: `FICTIONAL FILLED EXAMPLE
Imani hands over Alder Workshop release v1.0.2 under scope AW-03: client repository, internal tool, setup notes and acceptance results from agreed staging checks. Notes identify runtime versions and configuration names without secret values.
Alder’s operations lead owns hosting. Repository and hosting access are checked through authorized service processes. A known limitation remains: bulk request export was outside scope. Rollback instructions identify the tested staging procedure separately from production recovery.
The client opens release notes, confirms access and repeats three agreed task checks by Thursday. Support follows separately recorded scope; no indefinite maintenance is promised. If a blocker appears, the client identifies the affected task and release so the developer can assess it. The checklist does not imply that documenting a recovery procedure proves it has been demonstrated in production.`,
    bankeiz: 'Prepare a handover note in Bankeiz Messages from selected context, keeping secrets out. Verify the real release, access and evidence before requesting the client’s decision.',
    related: ['/learn/templates/software-development-proposal/', '/learn/templates/video-project-handover/', '/learn/resources/project-handover/'],
    keywords: ['software project handover checklist', 'developer client handover template', 'software delivery checklist'],
  },
  {
    slug: 'business-coaching-proposal', kind: 'template', niche: 'Business coaches',
    title: 'Business coaching proposal template for a defined session package',
    description: 'Describe sessions, responsibilities, practical goals and next decisions without guaranteeing business outcomes.',
    intro: 'A coaching proposal explains work the coach and client will do together. Name sessions, preparation and follow-up while keeping desired progress separate from results nobody can guarantee.',
    problem: '“Grow the business” does not explain package contents or client responsibilities. Broad outcomes obscure the difference between coaching, specialist advice and implementation.',
    sections: [
      { heading: 'Translate goals into a package', paragraphs: ['Describe the stated situation and decisions the client wants to explore. Specify session counts, durations and included preparation or follow-up.'], bullets: ['Choose practical objectives such as comparing priorities.', 'State cadence and scheduling window.', 'Keep specialist legal, medical, investment or tax advice outside this general business-coaching template.'] },
      { heading: 'Explain shared responsibilities', paragraphs: ['The coach provides scoped support; the client owns decisions and actions. Describe between-session availability precisely instead of implying unlimited access.'], bullets: ['Name preparation the client supplies.', 'Say how actions are reviewed next time.', 'Use actual rescheduling terms rather than a universal policy.', 'Scope implementation work separately.'] },
      { heading: 'Coaching proposal review checklist', paragraphs: ['Check that the package can be understood without reading guarantees into its goals. Review dates and service boundaries before requesting acceptance.'], bullets: ['Count, duration and method are explicit.', 'Preparation and contact have limits.', 'Client and coach responsibilities are distinct.', 'Proposed stages reconcile.', 'Revenue, profit or productivity results are not guaranteed.'] },
    ],
    template: `BUSINESS COACHING PROPOSAL
Client / coach / version / date: [details]
Situation: [challenge; uncertainties]
Goals for discussion: [priorities; no guaranteed result]
Package: [session count; duration; method; period]
Session focus: [session; topic; intended decision]
Client preparation: [notes/questions; timing]
Coach provides: [sessions; summaries; materials]
Between-session contact: [channel; limits; response expectations]
Client responsibilities: [attendance; chosen actions; decisions]
Progress review: [how actions and priorities are revisited]
Scheduling/rescheduling: [dates; actual terms reference]
Exclusions: [implementation; specialist advice boundaries]
Proposed fee and currency: [calculation; total]
Proposed payment stages: [amounts; triggers]
Open questions / next decision: [review package and scheduling]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed coaching package
Rowan proposes four 60-minute online sessions for Priya, a design-studio owner wanting a clearer weekly priority process. Sessions explore commitments, compare priorities, review one planning experiment and choose a process Priya wants to continue.
Priya brings a short workload summary. Rowan provides sessions and action summaries afterward. One clarification message between sessions is included; implementation, financial advice and unlimited messaging are excluded. Priya retains responsibility for decisions and actions.
The proposed fee is four sessions × $150 = $600 USD, with $300 after acceptance and $300 before session three. These fictional terms require review. No revenue or productivity result is promised. The next step is to confirm package and four mutually workable dates. A proposed date remains a scheduling option until both parties explicitly confirm the time and timezone.`,
    bankeiz: 'Prepare session wording in Bankeiz Messages with chosen context. Review exact date, timezone and details before confirming a supported booking, and review any supported payment separately.',
    related: ['/learn/templates/coaching-session-follow-up/', '/learn/resources/schedule-from-conversation/', '/business/for/coaches/'],
    keywords: ['business coaching proposal template', 'coaching package proposal', 'business coach proposal example'],
  },
  {
    slug: 'coaching-session-follow-up', kind: 'template', niche: 'Business coaches',
    title: 'Coaching session follow-up template with owned actions',
    description: 'Summarize decisions, client-owned actions, unresolved questions and the actual next meeting status after coaching.',
    intro: 'A session follow-up helps clients remember what they chose to do. Keep it short, assign action owners and dates, and distinguish decisions from ideas still under consideration.',
    problem: 'Long notes can bury the next action; a cheerful “great session” can omit it entirely. A proposed meeting may also be mistaken for a booking if status is unclear.',
    sections: [
      { heading: 'Reflect decisions accurately', paragraphs: ['Use the client’s priorities. Separate “we discussed” from “you decided” and invite corrections where nuance may be missing. A tentative idea is not a commitment.'], bullets: ['Name the session date and focus.', 'Include only context needed for follow-up.', 'Avoid unnecessary sensitive details.'] },
      { heading: 'Keep actions small and owned', paragraphs: ['Say who will do what by when. Include coach commitments and mark anything waiting for another decision.'], bullets: ['Use an observable step rather than an abstract goal.', 'Retain unresolved questions for review.', 'State meeting date, time, timezone and duration only as confirmed.', 'When scheduling is pending, propose options and request a decision.'] },
      { heading: 'Follow-up review checklist', paragraphs: ['Read against the session record. The message should support the relationship without claiming actions happened or outcomes were achieved.'], bullets: ['Decisions differ from options.', 'Each action has an owner and date.', 'Coach commitments are feasible.', 'Meeting status is confirmed or proposed.', 'The client can correct the summary and answer a specific question.'] },
    ],
    template: `Subject: [date] session summary and next steps
Hi [name],
Our focus was [topic/priority].
Decisions you confirmed:
• [decision, or no final decision on named question]
Options still considered:
• [option/question; what would help decide]
Actions before next review:
• [owner] will [specific action] by [date].
• [owner] will [specific action] by [date].
My follow-up: [coach action/date, or none].
Next meeting: [confirmed/proposed/pending]; [date; time; timezone; duration; method if confirmed].
We plan to review [action/question].
Please correct anything misunderstood, especially [item needing confirmation].
Next response needed: [specific request].
Thanks, [coach]
Summary reference: [session/date/version]`,
    example: `FICTIONAL FILLED EXAMPLE
Subject: 8 June session summary and next steps
Hi Priya, today we chose a planning experiment. You decided to reserve 20 minutes Monday to select three priorities. We discussed declining a project, but you have not decided that.
You will list commitments by 11 June and test the planning block on 15 June. I will send the two reflection questions by 10 June. No extra work was agreed.
Our next session is confirmed for 22 June, 10:00–11:00 a.m. Eastern time, online with the existing meeting details. We will review what the experiment revealed, not assume a particular metric improves.
Please correct the actions if I misunderstood and confirm that the commitment-list date works. Thanks, Rowan.
The summary records intentions, not completed work. At the next session, the client can explain what happened and choose whether to continue or change the experiment.`,
    bankeiz: 'Prepare a summary in Bankeiz Messages using selected context. Verify decisions and actual booking status yourself; a proposed date in a draft is not a confirmed appointment.',
    related: ['/learn/templates/business-coaching-proposal/', '/learn/resources/schedule-from-conversation/', '/learn/resources/ask-client-for-feedback/'],
    keywords: ['coaching session follow up template', 'coach follow up email example', 'coaching action summary'],
  },
  {
    slug: 'virtual-assistant-proposal', kind: 'template', niche: 'Virtual assistants',
    title: 'Virtual assistant proposal template with task and availability limits',
    description: 'Define assistant tasks, package limits, authorized actions, availability, client inputs and proposed pricing.',
    intro: 'A virtual assistant proposal defines tasks the assistant may perform and when the client can expect attention. Make authorization boundaries as clear as the service price.',
    problem: '“Admin support” can mean formatting files or replying as the client. An undefined package can imply authority or availability neither person intended.',
    sections: [
      { heading: 'Name tasks and authority limits', paragraphs: ['Distinguish preparation from actions needing approval. Drafting a reply differs from sending it; organizing information differs from making commitments for the client.'], bullets: ['List work that waits for approval.', 'Exclude spending or sensitive changes unless authorized separately.', 'Use approved access processes rather than collecting credentials.'] },
      { heading: 'Explain capacity and communication', paragraphs: ['Say whether pricing uses hours, a task package or another defined unit. Describe service windows, response expectations and what happens at the limit.'], bullets: ['Name the period and priority-setting owner.', 'Explain time or task summaries.', 'Use actual agreed terms for urgent work and unused capacity.', 'Ask before exceeding scope or capacity.'] },
      { heading: 'Assistant proposal review checklist', paragraphs: ['Read every line as an instruction someone might act on. Narrow wording that grants more authority than intended.'], bullets: ['Tasks and approval-dependent actions are distinct.', 'Capacity and availability are realistic.', 'Access and inputs have owners.', 'Proposed rate and totals reconcile.', 'Extra work requires a separate decision.'] },
    ],
    template: `VIRTUAL ASSISTANT PROPOSAL
Client / assistant / version / date: [details]
Purpose and period: [statement; dates]
Tasks: [task; output; frequency]
Approval-dependent actions: [preparation allowed; authorizer]
Excluded tasks / authority: [boundaries]
Capacity: [hours/package; period; limit]
Availability: [days; timezone; window; response expectation]
Intake/priorities: [channel; client owner; ordering]
Inputs/access: [item; owner; authorized process; no secrets]
Work summary: [time/task record; frequency]
Proposed price and currency: [rate × quantity or package; total]
Proposed payment: [amount; trigger]
Limit/extra work: [pause; estimate review; authorization]
Unused capacity/rescheduling: [terms to review]
Next decision: [scope questions; acceptance of this version]`,
    example: `FICTIONAL FILLED EXAMPLE — proposed support package
Evan proposes ten hours of June support for Maple Studio: formatting documents, organizing approved project files and preparing a weekly open-task summary. Evan may draft replies but cannot send them, make purchases or change accounts without separate authorization.
Service windows are proposed for Tuesday and Thursday, 9:00 a.m.–noon Eastern time, with responses in the next window. Maya sets priorities. Access is authorized through the studio process; passwords are not collected here.
Proposed pricing is 10 hours × $35 = $350 USD. Evan gives weekly time summaries and flags remaining capacity. Extra hours need Maya’s price and scope approval first. Unused-time treatment remains a term to review. Maya’s next decision is to confirm tasks, availability and terms. The proposal does not imply that a request received outside the windows will be completed immediately.`,
    bankeiz: 'Prepare a capacity or task-boundary message in Bankeiz Messages using chosen context. Review authorization for each action yourself, and separately confirm supported payment amounts and recipients.',
    related: ['/learn/templates/virtual-assistant-onboarding/', '/learn/resources/client-scope-change/', '/learn/resources/client-documents-and-payments/'],
    keywords: ['virtual assistant proposal template', 'VA service proposal example', 'virtual assistant scope template'],
  },
  {
    slug: 'virtual-assistant-onboarding', kind: 'template', niche: 'Virtual assistants',
    title: 'Virtual assistant onboarding checklist for approved work',
    description: 'Confirm priorities, communication, authorized access and action boundaries before assistant work without collecting credentials.',
    intro: 'Assistant onboarding should enable a small set of approved tasks predictably. Confirm what can be done, what needs a decision and how the client prioritizes requests.',
    problem: 'Tools and passwords do not explain authority. The assistant still needs to know which replies can be sent, which files changed and who resolves conflicting requests.',
    sections: [
      { heading: 'Confirm decision boundaries', paragraphs: ['Start with accepted scope and first tasks. Permission to act is separate from access: having a tool role does not authorize every action available there.'], bullets: ['Name the priority owner.', 'List allowed tasks and approval-dependent actions.', 'Clarify spending, deletion, external replies and account changes.'] },
      { heading: 'Prepare access without secrets', paragraphs: ['The client grants access through its existing authorized process. Record status and owners here, never passwords, payment details, recovery codes or tokens.'], bullets: ['Test only required tools and folders.', 'Confirm naming, storage and privacy expectations.', 'Agree windows, timezone and urgent-request handling.', 'Choose a first output and review point before expanding work.'] },
      { heading: 'Ready-to-work checklist', paragraphs: ['Do not mark ready while permissions or instructions are ambiguous. A small approved first task gives better evidence than a large unchecked inventory.'], bullets: ['Scope and priority owner are identified.', 'Communication and limits are understood.', 'Access is appropriate and tested.', 'Approval boundaries cover sensitive changes.', 'The first task has an output, reviewer and date.'] },
    ],
    template: `VIRTUAL ASSISTANT ONBOARDING
Client / assistant / date / owner: [details]
Scope and capacity: [version; period; limits]
Priority owner/substitute: [names/roles]
Service window/timezone: [details]
Intake/communication: [channel; expectations]
Allowed tasks: [task; output; limit]
Approval before: [action; decision maker; record]
Not authorized: [specific actions]
[ ] Access authorized — [tool; role; client owner; status]
[ ] Scoped access tested — [result; date; no secrets]
[ ] Naming/storage confirmed — [reference]
[ ] Sensitive-information handling confirmed — [approved process]
[ ] Capacity reporting agreed — [method; frequency]
First task: [instruction; output; date; reviewer]
Blockers: [item; owner; action]
Readiness: [ready for named tasks / pending; reason]
First-task review: [date; process corrections]`,
    example: `FICTIONAL FILLED EXAMPLE
Maple Studio onboarding uses support scope MS-06, ten hours in June. Maya sets priorities; Alex substitutes. Evan works Tuesday and Thursday mornings Eastern time, receiving requests in the agreed conversation.
Evan may format drafts and organize copies in the working folder. External replies, deletion of originals, spending and account changes need separate authorization. Maya grants a limited document role through the studio’s process; Evan tests the first file. No credential is recorded here.
The first task is formatting a four-page overview without changing claims, due Thursday for Maya’s review. A missing logo is a blocker assigned to Maya. Readiness covers formatting and the task summary only; other work remains pending. The checklist does not convert a general “help with admin” request into permission to act externally or alter account settings.`,
    bankeiz: 'Prepare the first-task summary in Bankeiz Messages with chosen context. Keep credentials in the approved access process and review external actions or supported payments separately before confirming them.',
    related: ['/learn/templates/virtual-assistant-proposal/', '/learn/templates/agency-client-onboarding/', '/learn/resources/ask-client-for-feedback/'],
    keywords: ['virtual assistant onboarding checklist', 'VA client onboarding template', 'assistant client setup checklist'],
  },
  {
    slug: 'bookkeeping-engagement-proposal', kind: 'template', niche: 'Bookkeepers',
    title: 'Bookkeeping engagement proposal template with period boundaries',
    description: 'Define a bookkeeping engagement by period, records, deliverables, unresolved questions and excluded specialist work.',
    intro: 'A bookkeeping proposal identifies periods, records and outputs, plus questions needing resolution. Keep this planning document separate from any required professional engagement terms.',
    problem: '“Monthly bookkeeping” hides assumptions about accounts, volume, opening balances and record condition. A fixed fee is difficult to assess when those assumptions are missing.',
    sections: [
      { heading: 'Bound the period and records', paragraphs: ['Name months, entities and accounts. Describe records and volume assumptions. If pricing needs preliminary review, say so rather than inventing an agreed fee.'], bullets: ['List supplied records and approved disclosure route.', 'Separate current work from historical cleanup.', 'Identify unconfirmed balances and missing supporting documents.'] },
      { heading: 'Describe outputs and questions', paragraphs: ['Specify reconciliation or reporting work suited to the engagement. Keep missing information visible without promising the proposal establishes compliance.'], bullets: ['Name reports and summaries.', 'Assign a client contact and question response date.', 'Exclude filing, audit, payroll or specialist advice unless appropriately scoped.', 'Use authorized access, never banking credentials in this document.'] },
      { heading: 'Engagement review checklist', paragraphs: ['Check assumptions against available information. Appropriate professional review may be needed for specific terms and obligations; this educational template does not provide it.'], bullets: ['Period, accounts and volume are explicit.', 'Records, owners and timing are named.', 'Outputs and exclusions match the service.', 'Prices stay conditional where review is needed.', 'No tax, legal or universal compliance outcome is promised.'] },
    ],
    template: `BOOKKEEPING ENGAGEMENT PROPOSAL — planning draft
Client / provider / version / date: [details]
Entity and period: [business; months]
Accounts/volume: [inventory; assumptions to confirm]
Record status: [sources; gaps; preliminary review]
Included work: [activities and boundaries]
Client supplies: [record; approved route; owner; date]
Deliverables: [report/summary; period; format; target]
Questions: [contact; response timing; unresolved-item treatment]
Access: [authorized process; no credentials]
Exclusions: [cleanup, filing, payroll or other limits]
Proposed fee/currency: [basis; assumptions; total or review needed]
Proposed payment: [amount; trigger]
Changes/volume variance: [scope/price/date review]
Professional engagement review: [separate terms/reviewer]
Next decision: [question; owner; date]`,
    example: `FICTIONAL FILLED EXAMPLE — conditional proposal
Morgan proposes June support for Willow Repair: one checking account and one business card, assuming at most 120 transactions. Historical cleanup and confirmation of earlier opening balances are excluded pending review.
Willow supplies June statements and supporting records through its approved route by 7 July. Morgan proposes reconciliation, an income-and-expense summary and an unresolved-question list. Kim answers missing-record questions. Payroll, tax filing and audit are excluded; engagement terms need separate appropriate review.
The proposed fee is $300 USD for these assumptions, subject to checking record condition before acceptance. It is not an agreed price. Volume differences or missing prior information trigger a scope, fee and timing discussion. Kim confirms available records without sharing credentials. Nothing in the example determines tax treatment or establishes that the business has met professional or regulatory obligations.`,
    bankeiz: 'Prepare an engagement clarification in Bankeiz Messages with chosen context. Keep sensitive records in the approved route, review professional terms appropriately and inspect supported payment actions separately.',
    related: ['/learn/templates/bookkeeping-client-information-request/', '/learn/resources/client-scope-change/', '/business/for/accountants/'],
    keywords: ['bookkeeping engagement proposal template', 'monthly bookkeeping proposal', 'bookkeeper scope proposal example'],
  },
  {
    slug: 'bookkeeping-client-information-request', kind: 'template', niche: 'Bookkeepers',
    title: 'Bookkeeping client information request template for missing records',
    description: 'Request specific missing records with a reason, owner, deadline and the client’s approved disclosure route.',
    intro: 'A clear request helps the client supply records without guessing. Name the period and missing item, then explain which work is waiting on it.',
    problem: '“Send your documents” invites duplicates and unnecessary disclosure. Narrow requests help clients locate records and use an existing approved sharing method.',
    sections: [
      { heading: 'Request the smallest useful set', paragraphs: ['Check existing material first. Use safe account labels rather than full numbers and identify periods or transaction dates. Ask for factual context instead of making clients guess accounting classifications.'], bullets: ['Number each question.', 'Explain the fact or reconciliation step supported.', 'Avoid unrelated personal or customer details.'] },
      { heading: 'Use an approved disclosure route', paragraphs: ['Direct clients to the process already approved for sensitive records. Do not collect passwords, card details, codes or recovery information. Confirm the route before transmission if unclear.'], bullets: ['Allow an unavailable-record response.', 'Explain effects without invented compliance deadlines.', 'Set a practical date and contact.', 'Retain unresolved items until information is checked.'] },
      { heading: 'Request review checklist', paragraphs: ['Inspect for unnecessary disclosure and duplicate work. A received file needs checking for period and completeness before resolution.'], bullets: ['Items are genuinely missing and specific.', 'Reasons and dependencies are understandable.', 'The route is already approved.', 'No secrets or full account details appear.', 'Date, contact and unavailable-record option are clear.'] },
    ],
    template: `Subject: Records/questions needed for [business; period]
Hi [name],
I reviewed available records for [period]. To continue [scoped work], please help with:
1. [Reference]: [exact record/question; safe account label; period/date]. Needed to [reason].
2. [Reference]: [exact item]. Needed to [reason].
Provide only the requested material through [existing approved disclosure route]. Do not send passwords, authentication codes, card details or recovery information here.
Requested response: [date]. If an item is unavailable or the route unclear, reply with its reference so we can confirm the next step before transmission.
Work waiting: [specific output/check].
Questions contact: [name; approved channel].
Thanks, [sender]
Tracking: [reference; received date; checked result; remaining question; owner]`,
    example: `FICTIONAL FILLED EXAMPLE
Subject: Two items needed for Willow Repair’s June review
Hi Kim, I checked June records already available. Q-01 is the June statement for the business card labeled “Workshop card,” needed to compare closing balance and recorded activity. Q-02 is the supplier document or factual description for the 18 June Cedar Parts payment, needed to understand the purchase; I am not asking you to choose a category.
Please use our approved records-sharing route and supply only those items. Do not send login details or authentication codes here. Could you respond by 10 July? If an item is unavailable, reply with its reference so we can discuss next steps.
The June summary stays pending these questions. I will check supplied records before marking them resolved. Thanks, Morgan. A duplicate or wrong-period file would remain an open item rather than being recorded as complete.`,
    bankeiz: 'Use Bankeiz Messages to prepare a narrow request from chosen context. Keep sensitive records in the approved disclosure process and verify information before reporting an item resolved.',
    related: ['/learn/templates/bookkeeping-engagement-proposal/', '/learn/templates/virtual-assistant-onboarding/', '/learn/resources/ask-client-for-feedback/'],
    keywords: ['bookkeeping client information request template', 'missing bookkeeping documents email', 'bookkeeper client records request'],
  },
];
