// Original editorial resources. Worked examples below are explicitly fictional.
// Product references describe the independently shipped relationship, booking and payment paths.
export const clientWorkGuides = [
  {
    slug: "follow-up-on-proposal",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to follow up on a proposal without restarting the conversation",
    description: "Follow up with the decision, proposal version and useful next step the client needs. Includes sample messages and responses to common delays.",
    intro: "Follow up on a proposal by naming the version you sent, reminding the client which decision is open and offering one useful next step. Use the review date you agreed; if you never agreed one, suggest a date rather than pretending a deadline exists. A helpful follow-up makes the decision easier without treating silence as approval.",
    problem: "A message that only asks whether the client saw your proposal gives them another task. The real obstacle may be an unanswered scope question, a missing reviewer or timing that has changed.",
    sections: [
      {
        heading: "Check the conversation before writing",
        paragraphs: ["Open the actual proposal and the last conversation. Confirm its title, date, price, scope and recipient. Look for an agreed review date and any question you promised to answer. If a colleague has already replied, use that reply rather than sending a duplicate reminder.", "Separate what you know from what you are guessing. A read receipt does not tell you that the budget owner reviewed the price. An enthusiastic meeting does not tell you that the scope is approved. Your next message should address the unresolved decision."],
        bullets: ["Confirm the current version and review contact.", "Resolve your outstanding answer before asking for theirs.", "Check whether the client requested a different date or channel."]
      },
      {
        heading: "Send a follow-up with a clear question",
        paragraphs: ["Sample wording: ‘Hi Morgan, following up on the three-page website proposal dated 8 March. You mentioned reviewing it with Sam this week. The remaining decision is whether product photography stays outside this phase. Would a written answer or a 15-minute review help you decide? If your timing has changed, please suggest a better review date.’", "This message identifies the material and the open choice. Adapt the facts before sending it. If you have no existing review agreement, replace the second sentence with ‘Would reviewing this by Thursday work for you?’ Give the person room to name another date."],
        bullets: []
      },
      {
        heading: "Choose the next step from the actual reply",
        paragraphs: ["If the client needs clarification, answer the specific question and identify whether the answer changes the proposal. If the request changes deliverables, price or timing, prepare a revised version for review. Do not bury the change inside a casual follow-up that still points to an older price.", "If the budget is unavailable, ask whether a smaller phase would meet a real need; avoid offering a discount before understanding the constraint. If another reviewer is needed, agree who will bring them in. If the project is paused, record the pause and ask whether a later check-in is welcome."],
        bullets: ["Clarification: answer, then restate the decision.", "Changed work: review a revised scope and price.", "Paused project: agree whether and when to reconnect."]
      },
      {
        heading: "Close the loop without manufacturing urgency",
        paragraphs: ["When there is no reply, use one closing message tied to a real scheduling need: ‘I’m planning April work on Friday. I’ll mark this proposal paused for now. If you want to revisit it, reply here and we can confirm scope and availability again.’ Only mention an expiring price or reserved slot if that condition is real and was communicated.", "Keep the sent version, replies and next agreed date together. Do not mark the project accepted, issue a new payment demand or reserve scarce production time because a reminder was sent. A useful record distinguishes an open proposal, a paused discussion and an explicit client decision."],
        bullets: []
      }
    ],
    bankeiz: "Use Messages to work from the client context you choose and prepare follow-up wording you can review. Business can help summarize the open question from selected context. Check the actual proposal and recipient before sending; a drafted message is separate from the client’s decision, a booking or a payment.",
    related: ["/learn/templates/consulting-proposal/", "/learn/resources/client-brief-to-proposal/", "/learn/resources/client-scope-change/", "/business/"],
    keywords: ["how to follow up on a proposal", "proposal follow up message", "client proposal reminder"]
  },
  {
    slug: "proposal-contract-invoice",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "Proposal vs contract vs invoice: what each one is for",
    description: "Separate the offer, the agreed terms and the request for payment. Use a practical website example to choose the right next document and review.",
    intro: "A proposal presents the work you are offering. A contract or agreement records the terms the parties intend to work under. An invoice asks for a specified payment. Keep those purposes separate even when one document serves more than one purpose. Its title alone does not establish what was agreed, who approved it or whether money moved.",
    problem: "Client work becomes hard to inspect when a proposal total is treated as a payment request, a payment is treated as agreement to new terms, or a revised file silently replaces the version a client reviewed.",
    sections: [
      {
        heading: "Use the proposal to make the work understandable",
        paragraphs: ["A useful proposal connects the client’s problem to a concrete approach: deliverables, responsibilities, exclusions, timing and price. For a website, ‘five pages’ is incomplete without the actual page list, content owner, review rounds and launch responsibilities. Unknowns should be visible so the client knows what still needs a decision.", "Sample proposal wording: ‘This phase covers Home, Services, About, Work and Contact. You supply approved copy and images. Two consolidated design review rounds are included. Hosting migration and new photography are excluded. The proposed total is $3,000, subject to the scope review below.’ This is an offer to inspect, not evidence of acceptance."],
        bullets: []
      },
      {
        heading: "Use the agreement to review the working terms",
        paragraphs: ["An agreement can address the accepted scope, responsibilities, payment schedule, handling of changes, review process, delivery and other terms appropriate to the engagement. Identify the parties and the exact version under review. Check that attachments and linked scope descriptions are the ones the parties actually intend to use.", "Sample review request: ‘Please review Website Agreement v2 dated 12 March, including Scope A. The changes from v1 are the photography exclusion and the launch date. Please raise questions before confirming your decision.’ This is an operational review pattern, not a claim about legal effect. Required terms and formalities depend on the situation."],
        bullets: ["Name the exact document and its attachments.", "Resolve inconsistent prices, dates or deliverables.", "Use appropriate qualified help for legal terms you do not understand."]
      },
      {
        heading: "Use the invoice to explain the requested payment",
        paragraphs: ["An invoice should identify the supplier, customer, work or agreed milestone, amount, currency, reference and relevant payment timing. Include the business and tax details required for your circumstances. For the website example, the first invoice might request the agreed $900 initial payment and state that it is part of the $3,000 project total.", "Sample line: ‘Website project W-104, initial payment under the accepted 12 March scope: $900 USD. Remaining project balance before later agreed changes: $2,100.’ Do not describe the invoice as paid until the actual payment is confirmed. If it is a request for an upcoming milestone, label that milestone accurately."],
        bullets: []
      },
      {
        heading: "Choose the right next action",
        paragraphs: ["If the client is comparing approaches, improve the proposal. If both sides want to proceed but terms remain open, review the agreement. If the relevant payment is due under the agreed arrangement, prepare the invoice or payment request. A scope increase may need a revised proposal or agreement before a different amount is requested.", "Maintain a short reference chain: project W-104, accepted scope dated 12 March, agreement v2, invoice W-104-01 and the eventual payment result. The references make the story inspectable. They do not collapse the decisions into one: document review, personal consent and payment approval each have their own purpose."],
        bullets: []
      }
    ],
    bankeiz: "Messages can help you prepare wording from the project context you select. Keep the complete proposal and agreement in your current document process, with their reviewed versions identifiable. Use the existing payment experience when there is an agreed amount to request or pay, then inspect its confirmed result and return to the conversation with the context connected.",
    related: ["/learn/templates/web-design-proposal/", "/learn/resources/write-freelance-invoice/", "/learn/resources/changed-agreement-version/", "/pay/"],
    keywords: ["proposal vs contract vs invoice", "proposal and invoice difference", "contract and payment approval"]
  },
  {
    slug: "request-client-deposit",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to request a client deposit with clear terms",
    description: "Explain an agreed initial payment, what it covers and what happens next. Includes a reviewed deposit request and a confirmation checklist.",
    intro: "Request a client deposit by referring to the agreed scope, stating the amount and currency, explaining what the initial payment covers and giving the client a payment route they can review. Make the next step explicit. Do not introduce a new deposit condition after the client believes the price and schedule are settled.",
    problem: "The word ‘deposit’ can hide several different expectations. A client may think it reserves a date while a provider thinks it pays for the first milestone. Explain the actual arrangement before requesting money.",
    sections: [
      {
        heading: "Agree the purpose before requesting payment",
        paragraphs: ["Decide whether the initial payment is connected to starting work, reserving production time or a defined first milestone. State how it relates to the total project price and the remaining payments. Review what happens if dates move, work changes or the engagement ends; do not invent a blanket refund rule in the payment message.", "For an illustrative $2,400 design project with a $600 initial payment, the remaining project amount is $1,800 before any agreed changes. A percentage alone is less useful than the actual amount, currency and purpose. Check the calculation against the version the client accepted and resolve discrepancies before sending a link."],
        bullets: []
      },
      {
        heading: "Write a request the client can inspect",
        paragraphs: ["Sample wording: ‘Hi Ellis, following the design scope we reviewed on 10 April, the agreed initial payment is $600 USD toward the $2,400 project total. This covers starting the research phase. Please review the recipient and amount at the payment link. Once the payment is confirmed, I’ll confirm our research kickoff and the inputs needed. The remaining $1,800 follows the agreed milestone schedule.’", "Adapt every number and condition. If work begins only after both payment and supplied materials, say so. If you need a reply about unresolved cancellation terms, get that review before presenting the payment as the final step. A friendly message should still make the requested decision clear."],
        bullets: []
      },
      {
        heading: "Check the payment route and the result",
        paragraphs: ["Before sharing a payment link, inspect the intended recipient, requested amount, currency and project reference. Make sure the customer has enough information to recognize the request. If they report an unfamiliar recipient or a changed amount, pause and inspect it together rather than encouraging them to pay and sort it out later.", "After payment, use the confirmed result associated with that payment. A message saying ‘sent,’ a card funding step or a screenshot does not by itself settle the status of the recipient’s payment. If the result remains unfinished, check that exact attempt before requesting another payment. This reduces the chance of conflicting instructions or duplicate attempts."],
        bullets: ["Verify the recipient and reviewed amount.", "Check the original payment result before retrying.", "Record the confirmed amount against the right project."]
      },
      {
        heading: "Confirm what happens next",
        paragraphs: ["Sample confirmation: ‘The $600 initial payment for project D-22 is confirmed. Our next step is the research kickoff on Tuesday, subject to your confirmation of the invitation. Please send the approved audience notes by Monday through our agreed channel.’ Separate the confirmed payment from a meeting that is still only proposed.", "If the client requests different terms, return to the work arrangement before changing the amount. If payment is confirmed but the project cannot start, communicate the real dependency and next decision. Keep the invoice or payment request, relevant terms and receipt linked by a recognizable project reference. Calling an amount a deposit does not make the payment an escrow service."],
        bullets: []
      }
    ],
    bankeiz: "Use Messages to prepare a request from the agreed project context. The existing payment link lets the payer review the recipient and amount before approval; inspect the confirmed payment result afterward. Bankeiz payments are not described here as escrow. Any appointment following payment still needs its own reviewed booking and confirmation.",
    related: ["/learn/resources/proposal-contract-invoice/", "/learn/templates/photography-invoice/", "/learn/resources/client-payment-reminder/", "/pay/"],
    keywords: ["how to request a client deposit", "client deposit request message", "freelance initial payment request"]
  },
  {
    slug: "client-scope-change",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to handle a scope change with a client",
    description: "Compare a new request with the agreed work, explain the tradeoffs and review a clear scope revision before starting the addition.",
    intro: "Handle a scope change by comparing the request with the current agreed deliverables, explaining its effect on work, price and timing, and asking the client to review the revised arrangement before you start the addition. First decide whether the request is already included. A correction to agreed work is different from a new deliverable.",
    problem: "Small requests become confusing when they enter production through a quick chat while the agreed price, review rounds and delivery date still describe the earlier project. Both people need the same picture of what changes.",
    sections: [
      {
        heading: "Compare the request with the accepted baseline",
        paragraphs: ["Find the actual accepted scope and list the requested change in ordinary language. ‘Add a booking page’ is a new deliverable if the accepted five-page list does not include it. ‘Fix the broken contact button’ may be a correction to a promised working contact page. Avoid automatically labeling every piece of feedback as additional work.", "Sample acknowledgment: ‘Thanks for the request to add online booking. The current scope includes the five pages listed in version 2. I’ll outline the booking addition and its effect on the timeline before we decide how to proceed.’ This acknowledges the idea without implying that you have agreed to deliver it at the existing price."],
        bullets: []
      },
      {
        heading: "Make the tradeoffs visible",
        paragraphs: ["Describe the added output, required client inputs, dependencies and review effort. Include any effect on existing work. A new booking page may need offer details, calendar access through an approved process, testing and updated navigation. A price for the page alone can be misleading if its setup also changes the launch sequence.", "Offer realistic choices. The client might add the work and move the date, replace a deliverable of comparable effort, or keep the original scope and schedule a second phase. Do not promise all three dimensions—more work, the same fee and the same date—unless you have deliberately confirmed that you can deliver them."],
        bullets: ["Added deliverables and explicit exclusions.", "Price difference and revised total.", "Timing, client inputs and affected milestones.", "What remains part of the existing scope."]
      },
      {
        heading: "Ask for a specific review decision",
        paragraphs: ["Sample wording: ‘Change C-03 adds one booking page and setup of the agreed appointment offer. It adds $450 to the $3,000 project, for a revised total of $3,450. Delivery moves from 6 May to 10 May if the offer details arrive by Friday. The original five pages remain included. Please review this addition and confirm whether you want C-03 or prefer to retain the original scope.’", "A useful response selects an option and identifies unresolved questions. If the client replies with another new requirement, update the change before treating it as settled. If an agreement needs revision, use your existing document and consent process with an identifiable new version. An informal reaction should not be stretched into acceptance of terms the person did not review."],
        bullets: []
      },
      {
        heading: "Update the working record before production",
        paragraphs: ["Keep the earlier scope and the reviewed change. Summarize which version now guides the work and make sure the people producing and reviewing it have the same information. Update the milestone checklist, client responsibilities and relevant payment request after the decision, rather than relying on everyone to reconstruct it from a long message thread.", "If the client declines the addition, confirm that the original scope continues and note any genuine scheduling effect caused by the review delay. If no answer arrives, leave the change open and avoid beginning disputed work. At handover, inspect delivery against the accepted scope plus accepted changes, with unfinished items named separately."],
        bullets: []
      }
    ],
    bankeiz: "Messages can help compare the scope context you select with the new request and prepare a change summary for your review. Keep ordinary agreement revision in the process you already use. Review any resulting payment or booking separately; a scope draft, an accepted change and a confirmed payment are different records.",
    related: ["/learn/templates/website-scope-of-work/", "/learn/templates/consulting-scope-of-work/", "/learn/resources/changed-agreement-version/", "/learn/resources/project-handover/"],
    keywords: ["how to handle scope changes with a client", "client scope change message", "scope change checklist"]
  },
  {
    slug: "ask-client-for-feedback",
    kind: "guide",
    niche: "Creative and professional services",
    title: "How to ask a client for feedback they can act on",
    description: "Name the exact work, ask focused review questions and give the client a clear response format. Includes a practical feedback request and decision checklist.",
    intro: "Ask for client feedback by naming the exact version, explaining which stage it is at and asking for the decisions needed to move forward. Give the reviewer a small set of focused questions and a clear way to respond. ‘What do you think?’ is less useful than asking whether a specific page communicates the intended offer to its audience.",
    problem: "Feedback becomes hard to use when people review different files, comment on details that are not ready or send conflicting instructions without an agreed decision maker. A clear request gives the review a job.",
    sections: [
      {
        heading: "Define what this review should decide",
        paragraphs: ["Choose a review goal that fits the stage. A first website layout review might decide content priority and navigation; it should not imply that final copy and every mobile detail are ready. A final video review might focus on approved edits, captions and export quality. Tell the client what is ready and what will be checked later.", "Name the exact material: ‘Homepage layout v3, dated 14 June, at the review link below.’ Check that the link opens for the intended reviewer without exposing unrelated client material. If there are three options, label them and explain what decision you want. Avoid sending a folder full of files and asking the client to discover the current one."],
        bullets: []
      },
      {
        heading: "Give the client focused questions and a format",
        paragraphs: ["Sample wording: ‘Please review Homepage v3 by Thursday at 3pm Eastern, if that timing works for you. We need to decide: does the opening explain the service accurately, are the three priorities in the right order, and is any necessary information missing? Please collect your team’s comments into one reply, with the section name and the change you want. Final image retouching comes after this layout review.’", "Choose a deadline that leaves the client enough review time and matches the project arrangement. Ask them to flag a conflict instead of silently missing it. Give an example of useful feedback: ‘In Services, replace “weekly” with “monthly” because this package is billed monthly.’ This supplies a location, change and reason."],
        bullets: ["Identify the file or page and version.", "Ask two or three stage-specific questions.", "Name the reviewer, response channel and proposed date."]
      },
      {
        heading: "Turn vague or conflicting feedback into decisions",
        paragraphs: ["If the client says ‘make it more premium,’ ask what they want the audience to notice and which examples demonstrate it. Offer a concrete interpretation for review: more space, fewer competing calls to action, or a different photographic direction. Do not assume a subjective adjective means the same thing to both people.", "If two stakeholders disagree, summarize the conflict and ask the named decision maker to choose. If feedback introduces a new deliverable, separate it from corrections to agreed work and review the scope effect. Keep a visible list of accepted edits, open questions and declined requests so the next version has a clear purpose."],
        bullets: []
      },
      {
        heading: "Confirm what you will change",
        paragraphs: ["Sample response: ‘I’ll update the service frequency, move the pricing section above the testimonials and keep the current heading. The requested second landing page is outside this review; I’ll outline it separately. Version 4 will be ready Tuesday for the final content check.’ This prevents a broad ‘thanks’ from concealing different expectations.", "When asking for final acknowledgment, say what is being acknowledged: the named deliverable against the agreed review criteria. Keep remaining issues visible. Silence, a reaction emoji or approval of one section should not be reported as approval of every file, a new fee or the whole project. Record the actual decision and move to the corresponding next step."],
        bullets: []
      }
    ],
    bankeiz: "Use Messages to prepare a focused request from the material and conversation context you choose. Review the wording and the actual file access before you send it. The relationship context can help you continue the discussion, while the client’s response still determines what was reviewed and what remains open.",
    related: ["/learn/templates/social-media-client-approval/", "/learn/templates/graphic-design-client-brief/", "/learn/resources/client-scope-change/", "/learn/resources/project-handover/"],
    keywords: ["how to ask a client for feedback", "client feedback request message", "design feedback questions"]
  },
  {
    slug: "project-handover",
    kind: "guide",
    niche: "Creative and technical services",
    title: "How to hand over a completed project",
    description: "Check actual deliverables, access, scope and open issues before requesting acknowledgment. Includes a handover message and an inspection checklist.",
    intro: "Hand over a project by matching the actual delivered files and access to the agreed scope, explaining how the client can inspect and use them, and naming any remaining work. Ask for acknowledgment only after the client has a real opportunity to inspect. Sending a link is a delivery step; it does not by itself confirm that everything is accessible or accepted.",
    problem: "A final message can sound complete while a file is missing, access belongs to the wrong person or the client cannot tell which export is current. A good handover makes the delivered work inspectable.",
    sections: [
      {
        heading: "Reconcile delivery against the accepted work",
        paragraphs: ["Open the agreed scope and accepted changes. Build a short list of required outputs, then inspect the actual delivery against it. For a video project this may be a full-length edit, three short cuts and caption files. For a software project it may include the agreed source, setup notes and operating documentation. Do not substitute a list of intended deliverables for a check of the files that exist.", "Name partial or missing items directly. If final images are delivered but editable source files were excluded, make that distinction visible. If a promised operating guide is unfinished, give its status and next decision rather than describing the whole project as complete. Keep payment status separate from the delivery checklist."],
        bullets: []
      },
      {
        heading: "Prepare files and access for the actual recipient",
        paragraphs: ["Use recognizable names and a short index explaining each file’s purpose, format and version. Open representative exports to check they are usable. Verify that the recipient can access the correct folder or system through your agreed sharing method. If access has an expiry date, tell the client and discuss any longer-term need before the link expires.", "Transfer administrative access through the system’s approved invitation or ownership-transfer process. Do not put passwords, private keys or recovery material in a public handover note. Explain where the client will manage their own access and who should accept the invitation. A documentation page can describe a process without containing the credentials themselves."],
        bullets: ["Required outputs are present and correctly named.", "The intended recipient can open them.", "Access instructions and any expiry are explicit.", "Sensitive credentials use the approved secure process."]
      },
      {
        heading: "Send a handover that invites inspection",
        paragraphs: ["Sample wording: ‘Project V-18 delivery is ready at the agreed folder. It includes Final Film v4 in 1080p, three vertical cuts and the caption files listed in the index. These match the scope dated 2 May plus change C-01. Please open the files, check captions and confirm access by Friday if that timing works. The separate source archive was not included in this package. Reply with a filename and issue if anything needs inspection.’", "Include concise use instructions where they matter, such as which export is intended for a website and which for social platforms. Do not describe ownership or usage rights more broadly than the actual terms. Where licensed materials have restrictions, point to the relevant agreed terms and supporting information."],
        bullets: []
      },
      {
        heading: "Record the acknowledgment and support boundary",
        paragraphs: ["If the client reports an issue, determine whether it is a missing agreed item, an access problem, a defect or a new request. Resolve a delivery problem without recasting it as extra scope. Review genuinely new work separately. Confirm any agreed support period and the route for questions; avoid inventing ongoing maintenance obligations at handover.", "Record what the client actually acknowledged, with the delivered version and any open items. For example: ‘Files opened; captions accepted; account invitation still awaiting Alex.’ Keep the final index, relevant conversation and confirmed payment records findable under the same project reference. That lets you resume a later question without treating delivery, acceptance and payment as interchangeable."],
        bullets: []
      }
    ],
    bankeiz: "Messages can help prepare a handover summary from selected project context and keep the follow-up conversation with the client. Inspect actual files in your existing delivery location. Use the confirmed payment record for payment questions, and Calendar for any reviewed training or follow-up appointment. A summary does not replace the deliverables.",
    related: ["/learn/templates/video-project-handover/", "/learn/templates/software-project-handover/", "/learn/resources/ask-client-for-feedback/", "/book/"],
    keywords: ["how to hand over a completed project", "client project handover checklist", "project delivery message"]
  },
  {
    slug: "write-freelance-invoice",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to write a freelance invoice the client can check",
    description: "Build a clear invoice from agreed work, line items, payment timing and project references. Includes sample arithmetic and a pre-send checklist.",
    intro: "Write a freelance invoice by identifying who is billing whom, describing the agreed work, showing the amount and currency, and stating the payment timing and route. Check each line against the actual engagement and include the business and tax details required for your circumstances. A polished invoice still needs accurate underlying facts.",
    problem: "Clients cannot easily approve payment when an invoice uses vague descriptions, omits a project reference or requests an amount that does not match the agreed milestone. Clarity starts before you choose a layout.",
    sections: [
      {
        heading: "Collect the facts before drafting",
        paragraphs: ["Start with the current agreed scope, accepted changes and payment schedule. Confirm the correct billing name, contact, project reference and any purchase-order reference the client requires. Use a recognizable invoice identifier and an issue date. Check your own required business and registration details through the rules that apply to you; this checklist is not a universal tax-compliance form.", "Decide what this particular invoice covers. It may request a defined initial payment, bill an approved milestone or bill a completed period of hourly work. If a previous payment reduces the amount now due, show that clearly and check it against the confirmed record. Avoid billing a proposed addition that the client has not yet reviewed."],
        bullets: ["Supplier and customer details.", "Invoice identifier, issue date and project reference.", "Agreed work, quantity or milestone and applicable rate.", "Currency, amount due and agreed payment timing."]
      },
      {
        heading: "Use descriptions and arithmetic that can be inspected",
        paragraphs: ["Illustrative invoice: ‘Project C-14, approved website copy: four service pages at $180 each, $720; one About page, $240; accepted interview extension C-02, $120. Subtotal $1,080 USD. Previously confirmed payment allocated to this work: $300. Remaining amount requested: $780.’ This example does not add a tax amount; determine the correct treatment for your own situation.", "For hourly work, name the period, quantity, rate and useful work description. For a fixed fee, avoid inserting fictional hours just to fill a template. Use enough detail for the client to recognize the work without placing sensitive interview notes or customer information on a document that may circulate within their finance team."],
        bullets: []
      },
      {
        heading: "State the due date and payment route clearly",
        paragraphs: ["Use the payment timing you agreed, and check how it applies to the issue date or milestone. A concrete date is easier to inspect than an unexplained phrase such as ‘due soon.’ Identify the payment recipient and use your established payment route. If details change, verify the change through a known channel before encouraging the client to use unfamiliar instructions.", "Sample accompanying message: ‘Invoice C-14-03 requests the remaining $780 USD for the copy listed above, due 22 September under our agreed schedule. Please use the payment link after checking the recipient and amount. If your finance team needs the agreed PO reference added, let me know before processing.’ Do not introduce an unagreed penalty in this message."],
        bullets: []
      },
      {
        heading: "Review before sending and confirm after payment",
        paragraphs: ["Recalculate quantities, rates, credits and the final amount. Compare the invoice to the earlier payments so the same work is not billed twice. Check that the right person receives it and that any requested attachment is actually included through your existing document process. Read the invoice as someone who has not attended your project meetings.", "After sending, record the invoice as sent or outstanding according to what you know. Mark it paid only from a confirmed payment associated with the right amount and project. If payment is partial, keep the paid amount and remaining balance visible. If the client disputes a line, resolve that line before composing a generic overdue reminder."],
        bullets: []
      }
    ],
    bankeiz: "Messages can help prepare invoice descriptions and accompanying wording from context you choose. Create and review the ordinary invoice in your current document process. Bankeiz’s existing payment experience provides a separately reviewed way to pay and a confirmed result to inspect; a draft invoice or payment link is not a paid receipt.",
    related: ["/learn/templates/photography-invoice/", "/learn/resources/proposal-contract-invoice/", "/learn/resources/client-payment-reminder/", "/pay/"],
    keywords: ["how to write a freelance invoice", "freelance invoice fields", "freelance invoice example"]
  },
  {
    slug: "client-brief-to-proposal",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to turn a client brief into a proposal",
    description: "Separate confirmed needs from assumptions, define deliverables and dependencies, and prepare a proposal the client can review without invented details.",
    intro: "Turn a brief into a proposal by separating confirmed needs from unknowns, translating the intended outcome into specific deliverables and reviewing the responsibilities, price and timing. Do not turn every sentence in the brief into a promise. Ask about important gaps before presenting a confident scope or mark the proposal as conditional on those answers.",
    problem: "Briefs mix goals, preferences, background and possible ideas. A proposal becomes unreliable when an appealing example is mistaken for required work or an AI draft fills missing facts with plausible details.",
    sections: [
      {
        heading: "Sort the brief into facts, preferences and questions",
        paragraphs: ["Read the actual brief and relevant conversation. Extract the problem, audience, desired output, reviewer, intended date and known constraints. Keep the client’s wording where interpretation matters. Separate a confirmed requirement such as ‘three service pages’ from a preference such as ‘we like animation’ and an unresolved question such as who supplies the copy.", "For a website project, unknowns might include the page list, content ownership, existing platform, accessibility expectations, integration needs and launch responsibilities. Ask the questions that change the scope first. A long questionnaire is not always necessary; a focused clarification about an integration can be more important than another paragraph of brand adjectives."],
        bullets: ["Confirmed: what the client actually requested.", "Proposed: your recommended approach, subject to review.", "Unknown: information that could change work, price or timing."]
      },
      {
        heading: "Translate goals into inspectable deliverables",
        paragraphs: ["‘Improve our online presence’ is a goal, not a deliverable. A concrete first phase might be five named website pages, one responsive design direction and two consolidated design review rounds. State what the client supplies and what is excluded. If a requested result depends on traffic, sales activity or other factors outside the project, do not guarantee that result.", "Sample wording: ‘You want visitors to understand the three services and send a useful enquiry. I propose a five-page site with an enquiry form. You supply approved copy and images. Paid advertising, ongoing content production and hosting migration are excluded. We will review the page list before confirming the price.’ This gives the client something specific to correct."],
        bullets: []
      },
      {
        heading: "Connect delivery to inputs, review and price",
        paragraphs: ["Build the sequence around real dependencies: discovery, client inputs, first draft, review, revisions and delivery. Name who makes the client decision and how feedback will be collected. State timing relative to supplied materials when a fixed date would otherwise be misleading. Identify where additional work would require a new review.", "Prepare the pricing from your actual scope and assumptions, not from a made-up industry average. Explain the payment schedule you are proposing and distinguish it from the final agreement. If a critical requirement is still unknown, offer a discovery phase, a range with explicit assumptions or a request for clarification rather than disguising uncertainty as a final quotation."],
        bullets: []
      },
      {
        heading: "Inspect the draft against the source brief",
        paragraphs: ["Read each proposed deliverable and ask where it came from. Delete invented client facts, unsupported results and unnecessary private details. Check that prices and dates agree across sections. Verify names and the review contact. Make exclusions understandable: ‘no new photography’ is more useful than a broad sentence that says anything not mentioned is excluded.", "Send a short review request: ‘Please check the page list, your content responsibilities and the review schedule. The open question is whether booking integration belongs in this phase. Once that is answered, I can confirm the final scope and price.’ Keep the reviewed proposal version and actual reply. A draft is a preparation step, not client acceptance or payment approval."],
        bullets: []
      }
    ],
    bankeiz: "Choose the brief and conversation context you want to use in Messages, then ask for a scope outline or clarification questions. Review the wording against the sources. Keep final document preparation in your existing process. Business can help you pick up the relationship context, while the client still reviews the actual offer and any next action.",
    related: ["/learn/templates/graphic-design-client-brief/", "/learn/templates/web-design-proposal/", "/learn/templates/consulting-proposal/", "/business/"],
    keywords: ["how to turn a client brief into a proposal", "client brief to proposal", "proposal scope from brief"]
  },
  {
    slug: "schedule-from-conversation",
    kind: "guide",
    niche: "Consultants, coaches and service businesses",
    title: "How to schedule a meeting from a client conversation",
    description: "Turn a suggested meeting into a reviewed appointment with the right date, timezone, duration, people and purpose. Includes confirmation wording.",
    intro: "Schedule from a conversation by confirming the purpose, exact date, time, timezone, duration and participants, then creating or sharing the appropriate booking. Inspect the confirmed appointment before reporting it as booked. ‘Tuesday afternoon works’ is useful availability, but it leaves several details unresolved and does not identify a confirmed slot.",
    problem: "A conversation can contain several possible times, a timezone assumption and a meeting link copied from an earlier call. Treating that discussion as the final appointment creates avoidable uncertainty for both people.",
    sections: [
      {
        heading: "Extract the meeting details and identify gaps",
        paragraphs: ["Read the recent conversation and write a single proposed appointment: purpose, calendar date, start time, timezone, duration, participants and location or meeting route. Use the full date when ‘next Tuesday’ could be interpreted differently. If the client says ‘after lunch,’ ask for a time or offer a booking link rather than guessing.", "Choose the minimum useful preparation question. A project review may need the current draft and the decision to make. A consultation may need the client’s main question. Avoid copying a whole private conversation into a calendar description, especially if additional attendees will see the invitation. Include only what those participants need to prepare."],
        bullets: ["Purpose and desired decision.", "Exact date, start time, timezone and duration.", "Required participants and meeting route.", "Preparation material that is appropriate to share."]
      },
      {
        heading: "Offer a clear time or the actual booking link",
        paragraphs: ["Sample wording: ‘Would 18 June at 10am America/New_York for 30 minutes work for our homepage review? We will decide the page order and open copy questions. If that time does not work, please choose an available slot at my booking link. I’ll use the confirmed appointment as the final time.’ Replace the example date and timezone with the real ones.", "When using a booking link, make sure the appointment offer has the intended duration and any price. The client should choose from actual offered availability. If you create an appointment directly, inspect its details and invited people. A suggested time in a message and a saved appointment are different stages of the task."],
        bullets: []
      },
      {
        heading: "Inspect confirmation, especially for paid appointments",
        paragraphs: ["Check the confirmed result: date, time, displayed timezone, duration, attendees and meeting link. Ask the client to inspect the invitation in their own timezone. If a paid offer is involved, the guest reviews the appointment and price through the payment step. Do not describe an appointment as confirmed merely because a payment link was opened or a time was discussed.", "Sample confirmation: ‘The appointment is confirmed for 18 June at 10am America/New_York, 30 minutes. Your invitation has the meeting link and the time in your calendar. Please bring the consolidated comments on Homepage v3.’ If the result remains unfinished, explain the missing step instead of sending a confident confirmation that the system does not support."],
        bullets: []
      },
      {
        heading: "Keep changes attached to the same appointment",
        paragraphs: ["If the client asks to move the meeting, inspect the current appointment and follow the available change or cancellation path. Confirm the new saved time rather than leaving two competing invitations. Explain whether the purpose, preparation or attendees changed. If a paid appointment’s terms need clarification, resolve that explicitly through the relevant process.", "After the meeting, record the agreed actions, owners and whether another session is actually needed. ‘Let’s talk again in two weeks’ is a prompt to arrange the next appointment, not a confirmed recurrence. A short follow-up linking the discussion to a reviewed next booking helps the relationship continue without repeatedly reconstructing the earlier conversation."],
        bullets: []
      }
    ],
    bankeiz: "Calendar and booking links keep the appointment details together. Available times are shown in the guest’s displayed timezone, and the guest can inspect it before choosing. Messages can help prepare the invitation wording. With the relevant Business and Twin access, conversational booking uses the configured offers; confirmation and any priced appointment’s payment review remain explicit steps.",
    related: ["/learn/templates/coaching-session-follow-up/", "/learn/resources/ask-client-for-feedback/", "/book/", "/your-twin/"],
    keywords: ["how to schedule from a client conversation", "client meeting confirmation message", "meeting timezone confirmation"]
  },
  {
    slug: "changed-agreement-version",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "What to review when a signed agreement changes",
    description: "Preserve the exact earlier version, explain the proposed changes and request a new review. A practical version-control guide without jurisdiction-specific legal claims.",
    intro: "When an agreement changes, preserve the exact earlier signed version and make the proposed new terms identifiable for a fresh review. Do not overwrite the earlier file or present its recorded consent as consent to altered wording. The operational task is to show what changed, who needs to review it and which version guides the next work.",
    problem: "A file called ‘final’ can be edited several times. Without stable versions, neither party can readily tell which scope, price or dates they saw when they made a decision. This guide addresses review and recordkeeping, not the legal effect of an amendment.",
    sections: [
      {
        heading: "Preserve the earlier original and its context",
        paragraphs: ["Keep the earlier signed original in the form you received it, including the associated signing information available through your existing process. Use a working copy for edits. A screenshot, a pasted signature image or a summary of the old terms is not the same review object as the complete earlier document.", "Record the title, date and version label, plus any attachments that were part of the review. Avoid renaming several different files to the same ‘final’ label. If the earlier file is missing, obtain the actual record through the process you used before making claims about what it contains. Do not reconstruct it from memory and describe the reconstruction as the original."],
        bullets: []
      },
      {
        heading: "Describe the proposed changes in plain language",
        paragraphs: ["Prepare an identifiable new version or other change document appropriate to your existing agreement process. Explain the changed deliverables, responsibilities, price, dates and attachments. Show unchanged context where the reader needs it to understand the revision. A change summary helps navigation, but the complete proposed terms still need to be available for inspection.", "Sample review note: ‘Please review Project Agreement v3 dated 4 August alongside v2. The proposed changes add a sixth page, increase the total by $300 and move the delivery date to 22 August. The new page uses the existing review process. Scope attachment A is updated; the other listed attachments are unchanged.’ Check that the documents actually match that summary."],
        bullets: ["Current signed version remains available.", "Proposed version and changed attachments are identifiable.", "The change summary matches the complete proposed text."]
      },
      {
        heading: "Request review without assuming consent",
        paragraphs: ["Give the intended reviewers the actual changed terms and enough context to ask questions. Use the document review and consent process suitable for the engagement. If the identity or authority of the reviewer is uncertain, resolve it before treating a response as the decision. A reply about scheduling is not necessarily a response to the revised price.", "Sample wording: ‘Please check the complete v3 terms and let me know if the added page, revised total and new date reflect our discussion. We will follow our usual agreement process once questions are resolved. I have not started the additional page.’ Do not copy earlier consent into a new file or describe silence as approval of the revision."],
        bullets: []
      },
      {
        heading: "State the working version after the decision",
        paragraphs: ["Once the relevant review is complete, tell the people doing the work which version and accepted changes to use. Update the production checklist and related payment references to reflect the actual decision. Retain the earlier version and the new record so a later question can be traced without erasing the sequence.", "If the client declines or asks another question, keep the proposal open and clarify the effect on current work. If the documents conflict, pause the affected decision and seek appropriate qualified help rather than improvising a legal conclusion. Version labels and careful records make review clearer; they do not establish universal enforceability, replace needed advice or determine the rights of either party."],
        bullets: []
      }
    ],
    bankeiz: "Messages can help prepare a change summary from the versions and context you choose. Inspect the full originals through your existing document process and keep the actual review decision. Return to the client conversation with the current version identified. Review any revised payment or appointment separately and inspect its confirmed result before reporting it complete.",
    related: ["/learn/resources/client-scope-change/", "/learn/resources/proposal-contract-invoice/", "/learn/resources/client-documents-and-payments/", "/learn/templates/website-scope-of-work/"],
    keywords: ["what happens when a signed agreement changes", "agreement version review", "revised agreement checklist"]
  },
  {
    slug: "client-documents-and-payments",
    kind: "guide",
    niche: "Agencies, consultants and service businesses",
    title: "How to keep client documents and payments together",
    description: "Use consistent project references to connect scope, invoices, messages and confirmed payments while keeping each review decision clear.",
    intro: "Keep client documents and payments connected with a consistent project reference, links to the actual documents and a record of the confirmed payment results. Track the current decision separately from the next proposed action. You do not need to merge every file into one document; you need a reliable way to inspect the source behind each claim.",
    problem: "A client may have several projects, invoices and payments at once. A contact name alone is not enough to explain which work a payment covers or which proposal version a new request refers to.",
    sections: [
      {
        heading: "Give the engagement a recognizable reference",
        paragraphs: ["Choose a short project reference such as ‘NORTH-WEB-01’ and use it in the scope, relevant messages, invoice descriptions and handover index. Add a plain-language title so neither person has to decode the identifier. For recurring work, include the service period as well as the client name. Do not reuse one vague ‘monthly work’ label across several distinct engagements.", "Build a small project index in your existing working process. It should point to the current accepted scope, open change requests, payment requests, confirmed payments, delivery location and next decision. Keep sensitive source material in the appropriate access-controlled location rather than copying it into every summary. The index is a navigation aid, not a replacement for the originals."],
        bullets: []
      },
      {
        heading: "Keep the document and payment states distinct",
        paragraphs: ["Describe the actual stage using ordinary labels: proposal under review, scope accepted, invoice sent, payment unfinished, payment confirmed, delivery ready or client inspection pending. More than one can be true at once. An accepted scope can have an unpaid invoice; a confirmed initial payment can precede final delivery.", "For example: ‘NORTH-WEB-01: scope v2 accepted; $900 initial payment confirmed; Homepage v1 awaiting feedback; final payment not yet requested.’ This is more useful than ‘project active.’ It tells the next person what happened, which source to inspect and which action would be premature. Do not infer client acceptance from the presence of a receipt."],
        bullets: ["Document version and its actual review decision.", "Payment request, amount and purpose.", "Confirmed payment result and allocation.", "Delivery status and the next open question."]
      },
      {
        heading: "Resolve mismatches before continuing",
        paragraphs: ["If the invoice requests a different amount from the accepted schedule, inspect the documents and any accepted change before sending another reminder. If a payment has the right client but no clear project reference, ask which work it covers and confirm your allocation. If the status is unfinished, check that exact payment result before asking the client to attempt it again.", "Sample clarification: ‘I can see the confirmed $500 payment, thank you. We have two open projects. Is this intended for the July support invoice J-07 or the website initial payment W-02? I’ll update the project record after we confirm.’ Avoid silently assigning the payment to whichever balance you would prefer to reduce."],
        bullets: []
      },
      {
        heading: "Prepare a concise client-facing update",
        paragraphs: ["Use a short message that states the relevant work, what is confirmed and what needs a response: ‘Website scope v2 remains the current version. The initial $900 payment is confirmed. Please review Homepage v1 by Thursday or suggest another date. The booking-page addition is still a separate open change.’ Link only to material the recipient is allowed to see.", "At closeout, keep the final delivery index, actual accepted versions and payment records discoverable under that same reference. Retain the history appropriate to your work rather than replacing everything with a single ‘complete’ summary. When a later question arrives, inspect the relevant record and continue the relationship with its context intact."],
        bullets: []
      }
    ],
    bankeiz: "Use Messages with the selected client and payment context you want to discuss. Business can help summarize that context and prepare an update for review. Keep ordinary documents in your established document process, inspect confirmed Bankeiz payment records for payment status, and use Calendar for a separately confirmed next appointment. The shared reference connects the work without merging its approvals.",
    related: ["/learn/resources/proposal-contract-invoice/", "/learn/resources/client-payment-reminder/", "/learn/resources/project-handover/", "/business/"],
    keywords: ["how to keep client documents and payments together", "client project payment records", "organize client documents and invoices"]
  },
  {
    slug: "client-payment-reminder",
    kind: "guide",
    niche: "Freelancers and service businesses",
    title: "How to prepare a client payment reminder",
    description: "Inspect the actual payment status, explain the amount and project, and send a contextual reminder. Includes sample wording for open questions and partial payments.",
    intro: "Prepare a payment reminder by checking the actual payment status and agreed due date first, then naming the invoice or project, remaining amount and requested next step. If payment is already confirmed, do not send the reminder. If there is a dispute, missing purchase-order detail or unfinished attempt, address that issue rather than treating every delay as the same problem.",
    problem: "An inaccurate reminder makes the client repeat information and can encourage another payment attempt when one is already in progress. The best first step is to inspect what happened, not to sharpen the wording.",
    sections: [
      {
        heading: "Check the request and the latest result",
        paragraphs: ["Open the invoice or payment request and confirm its identifier, amount, currency, scope and agreed due date. Review the relevant conversation for a changed date, a query or promised correction. Check actual confirmed payments allocated to this work. A separate funding step or a client’s screenshot may require inspection; it should not be casually equated with the recipient’s completed payment.", "If the payment is unfinished, inspect the same attempt through the available payment experience before asking for another one. If the client says the payment belongs to a different project, resolve that allocation. If the invoice contains an error, correct it through your existing document process and explain the correction before asking the client to act."],
        bullets: ["Right invoice, amount, currency and due date.", "No confirmed payment or credit missed.", "No unanswered client question or unfinished attempt ignored."]
      },
      {
        heading: "Write a neutral reminder with a useful next step",
        paragraphs: ["Sample wording: ‘Hi Ren, I’m checking invoice M-08 for the August content package. The remaining amount is $640 USD, due 12 September under our agreed schedule. I have not found a confirmed payment allocated to it. Please check the invoice and payment link, or let me know if your team needs a correction or has a processing date. If you have already paid, please share the payment reference so I can inspect the result.’", "Use this wording only after the checks are true. Avoid a broad ‘you have not paid’ if you cannot see every possible payment route. Include a recognizable reference and the existing payment route rather than changing bank or recipient details in a reminder. Keep unnecessary private project information out of the message."],
        bullets: []
      },
      {
        heading: "Adapt the reminder to the actual obstacle",
        paragraphs: ["For a partial payment, acknowledge the confirmed amount and show the remaining balance: ‘The $400 payment is confirmed; $240 remains on M-08.’ For a missing reference, ask for that detail. For a price question, point to the exact line and relevant accepted scope, then resolve the question. For an internal processing delay, ask the client for a specific expected date.", "If the client cannot pay as expected, discuss a real next arrangement instead of implying one already exists. Record any agreed change to timing or amounts and check its effect on the project. Do not add unagreed fees, legal threats or invented consequences to make the message stronger. If specialist help is needed, seek it based on the actual circumstances."],
        bullets: []
      },
      {
        heading: "Confirm the outcome before closing the reminder",
        paragraphs: ["When a payment is confirmed, check that it belongs to this request and send a concise acknowledgment. If a balance remains, state it accurately. If the client promises a processing date, record that as a promised date, not as a completed payment. Set your next review around the real arrangement so reminders do not continue after the matter is resolved.", "Keep the invoice, relevant conversation and payment result connected by the project reference. A useful closing note might be: ‘The remaining $240 for M-08 is confirmed, thank you. That invoice is now fully paid. Our next action is your review of the September outline.’ This finishes the payment question and returns the relationship to the work."],
        bullets: []
      }
    ],
    bankeiz: "Choose the relevant payment records and conversation context in Messages, then prepare reminder wording for review. Inspect the original payment result before sending or retrying. Use the existing payment experience for an approved payment. Business helps with the context you provide; it does not automatically know unshared outside payments or send every drafted reminder.",
    related: ["/learn/resources/write-freelance-invoice/", "/learn/resources/request-client-deposit/", "/learn/resources/client-documents-and-payments/", "/pay/"],
    keywords: ["how to prepare a client payment reminder", "client payment reminder message", "freelance unpaid invoice follow up"]
  }
];

export const clientWorkExamples = [
  {
    slug: "website-client-workflow",
    kind: "example",
    niche: "Web designers",
    title: "A website client workflow from brief to delivery",
    description: "A fictional five-page website project with a clear brief, reviewed scope change, initial payment, client feedback and inspectable handover.",
    intro: "Fictional worked scenario: designer Avery and client Rowan plan a five-page website for an invented repair studio, Northline. Names, dates and amounts are illustrative. This is a practical walkthrough, not a customer story or measured result. Ordinary documents and delivered files use the parties’ existing tools.",
    problem: "Rowan wants a clearer website but has not separated the launch essentials from a later booking idea. Avery needs a specific first phase, a client input list and a way to handle changes without losing the conversation.",
    sections: [
      {
        heading: "1. Turn the conversation into a concrete brief",
        paragraphs: ["Rowan’s opening request is ‘a modern website with easier enquiries.’ Avery asks which services matter, who supplies the content and what must be ready for launch. The first-phase list becomes Home, Services, About, Work and Contact. Rowan supplies approved copy and photographs, and is the contact who collects the team’s feedback.", "The open booking idea remains a question, not a hidden commitment. A useful review message is: ‘This brief covers five pages and an enquiry form. Do you need online booking at launch, or should I price it as a separate option?’ Avery uses only the selected brief and relevant conversation when preparing a scope outline."],
        bullets: []
      },
      {
        heading: "2. Review the scope and the initial payment separately",
        paragraphs: ["The ordinary proposal describes the five pages, two consolidated design review rounds, client content responsibilities and exclusions. In this scenario the reviewed price is $3,000 USD, with a $900 initial payment and later payments defined in the parties’ working terms. They inspect the exact document version through their existing agreement process.", "Only then does Avery prepare the initial payment request: ‘Please review the $900 payment toward Northline website W-104. After confirmation and receipt of the approved copy, we can confirm kickoff.’ Rowan checks the recipient and amount in the payment experience. Avery inspects the confirmed result; a draft request or a funding step is not reported as a received payment."],
        bullets: []
      },
      {
        heading: "3. Resolve a new request before building it",
        paragraphs: ["During design review, Rowan asks for a booking page. Avery compares it with the five-page scope and identifies it as additional work. The proposed change adds a booking page and setup of one appointment offer for $450, moving the delivery date by four days if Rowan supplies the offer details on time.", "Avery offers two choices: keep the original launch scope or review change C-01 with the revised $3,450 total. Rowan’s choice is recorded through their existing scope and agreement process. The production checklist changes only after that decision. If Rowan does not accept the addition, the five-page scope remains the reference rather than a vague memory of the request."],
        bullets: []
      },
      {
        heading: "4. Ask for feedback on the named version",
        paragraphs: ["Avery sends Homepage v2 with three questions: is the service description accurate, are the priorities in the right order and is any essential information missing? Rowan collects one team response. Avery distinguishes corrections to the promised work from suggestions for new pages, then summarizes the edits planned for v3.", "When a live review is useful, they choose a real available time and inspect the confirmed appointment, including timezone and duration. The meeting is used to decide the remaining page-order question. It does not silently approve a new price or replace the review of the actual scope change."],
        bullets: []
      },
      {
        heading: "5. Hand over what is actually ready",
        paragraphs: ["Avery checks the delivered site and files against the accepted scope plus C-01. The handover index names the pages, operating notes, access invitations and open issues. Rowan opens the site and accepts the account invitation through the approved process. Credentials are not pasted into a public message.", "The closing record distinguishes delivered work, client inspection and confirmed payments. Missing items stay visible until resolved. A later maintenance request becomes a new discussion with its own scope rather than an assumed extension of the website project."],
        bullets: ["Current scope and accepted changes are identifiable.", "Payment results match their project and purpose.", "Actual deliverables and access are inspected.", "The next support or maintenance decision is explicit."]
      }
    ],
    bankeiz: "Messages can help prepare wording from chosen client context. Calendar supports a reviewed appointment, and the payment path supports payer approval and a confirmed result. Business and a configured Twin can help continue the relationship. Keep the ordinary documents and delivered files in your established process, with clear references in the conversation.",
    related: ["/learn/templates/web-design-proposal/", "/learn/templates/website-scope-of-work/", "/learn/resources/client-scope-change/", "/business/for/designers/"],
    keywords: ["website client workflow example", "web design brief to delivery", "website project client process"]
  },
  {
    slug: "consulting-client-workflow",
    kind: "example",
    niche: "Consultants",
    title: "A consulting engagement from first scope to the next project",
    description: "A fictional operations consulting engagement with selected context, a revised scope, payment review, handover and a separately considered follow-on project.",
    intro: "Fictional worked scenario: consultant Mira and client Devon plan an operations review for an invented service business, Fieldwell. All people, amounts and work described here are illustrative. The example follows the decisions and working records; it does not report a customer outcome or prove a financial benefit. Documents are prepared and reviewed through the parties’ existing process.",
    problem: "Devon wants fewer handoff problems but initially asks for an undefined ‘operations improvement project.’ Mira needs a bounded engagement, appropriate source material and a clear point at which implementation becomes a separate decision.",
    sections: [
      {
        heading: "1. Define the question and the evidence needed",
        paragraphs: ["Mira asks Devon which handoffs cause trouble, who is involved and what a useful first deliverable would be. They settle on reviewing the enquiry-to-scheduling process. The proposed inputs are three process interviews and anonymized examples of the current handoff checklist. They do not gather unrelated customer records just because those records are available.", "The proposed outputs are a current-state map, a prioritized issue list and a review meeting. Mira explicitly excludes system implementation and staff training from this phase. A draft prepared from selected context is checked against Devon’s actual answers so it does not invent interview counts, access rights or promised efficiency gains."],
        bullets: []
      },
      {
        heading: "2. Review the ordinary engagement documents",
        paragraphs: ["In this scenario the initial proposal is $2,000 USD. Before the agreement review finishes, Devon requests a fourth interview. Mira prepares version 2 with the additional interview, a $200 increase and an updated input schedule. Both versions remain identifiable. The complete revised terms, rather than only the change summary, are available to inspect.", "The parties use their existing agreement process to review the $2,200 scope. If a document had already been signed, earlier recorded consent would stay associated with that earlier original; the new terms would need a fresh review through the appropriate process. This walkthrough makes no jurisdiction-specific claim about legal effect."],
        bullets: []
      },
      {
        heading: "3. Connect payment and meetings to the engagement",
        paragraphs: ["The agreed first payment is $1,100 toward the $2,200 total. Mira’s message names the engagement reference F-09 and the payment purpose. Devon reviews the recipient and amount before approving. Mira checks the confirmed payment and records it against F-09. An open payment attempt would remain unfinished, not be counted as a paid milestone.", "They book the review meeting using the actual offered availability. The confirmed appointment contains its date, timezone, duration and meeting link. The preparation note identifies the current-state map to inspect, without copying private interview notes into a calendar invitation that other participants might see."],
        bullets: []
      },
      {
        heading: "4. Deliver findings that separate evidence from suggestions",
        paragraphs: ["Mira hands over the map and issue list at the agreed delivery location. Each recommendation is labeled as a proposed action, with the observed process issue and any unanswered question. Devon can tell which items were directly supported by the supplied examples and which still need testing. The example does not claim that a recommendation has already improved the business.", "The handover message lists the actual files, asks Devon to confirm access and invites corrections to factual descriptions. The final payment request follows the agreed arrangement and references the engagement. Delivery, Devon’s review and the eventual confirmed payment remain distinct states in the project record."],
        bullets: []
      },
      {
        heading: "5. Make the next project a new decision",
        paragraphs: ["Devon asks for help implementing two recommendations. Mira uses the retained relationship context to prepare questions about the desired work, owners and system constraints. She does not treat interest in the recommendations as approval of an implementation fee. A new scope identifies deliverables, responsibilities, timing and price for Devon to review.", "If Devon postpones implementation, the first engagement remains complete according to its own actual delivery and payment state. A next conversation can be booked without implying a recurring contract. The useful continuity is knowing what was discussed and delivered, while giving the new project its own review."],
        bullets: ["First engagement has a bounded scope and real inputs.", "Every revision has an identifiable version.", "Payment and appointment confirmations are inspected.", "Follow-on work receives its own scope decision."]
      }
    ],
    bankeiz: "Messages and selected context can help a consultant prepare clarification questions, a review agenda and follow-up wording. Payment records and Calendar provide the relevant confirmed results. Business can help continue the client relationship from available context. Inspect the ordinary engagement documents and delivered work in your existing process before using their details in the next conversation.",
    related: ["/learn/templates/consulting-proposal/", "/learn/templates/consulting-scope-of-work/", "/learn/resources/changed-agreement-version/", "/business/for/consultants/"],
    keywords: ["consulting client workflow example", "consulting engagement process", "consulting scope to handover"]
  },
  {
    slug: "coaching-client-workflow",
    kind: "example",
    niche: "Business coaches",
    title: "A coaching package from first question to the next session",
    description: "A fictional business coaching package with clear session boundaries, reviewed booking, selected preparation context and an actionable follow-up.",
    intro: "Fictional worked scenario: business coach Jules and client Casey discuss a planning package for Casey’s invented design practice. People, prices and dates are illustrative. This is a process example, not a testimonial or promised business result. The package document uses the existing document process; booking and payment are reviewed separately.",
    problem: "Casey wants help deciding which service offer to develop next. Jules needs to explain the package, what Casey should prepare and what happens between sessions without promising an outcome the sessions cannot guarantee.",
    sections: [
      {
        heading: "1. Clarify the question and the package boundaries",
        paragraphs: ["Casey asks whether to focus on recurring design support or one-off identity projects. Jules asks which information can inform that decision. The package is three 45-minute business planning sessions, with a written action summary after each. It excludes running Casey’s sales process or doing client delivery.", "The package description lists the sessions, scheduling window, preparation responsibilities, between-session contact boundaries and terms for review. Jules describes developing and testing a decision framework, without guaranteeing customers, revenue or a strategic choice. Casey can ask questions before deciding whether the package fits."],
        bullets: []
      },
      {
        heading: "2. Review price and the first booking",
        paragraphs: ["In this fictional package the agreed total is $450 USD. Casey inspects the package description through Jules’s existing process, then reviews the actual payment recipient and amount. Jules checks the confirmed result before describing the package payment as received. An unanswered package question is not waved away because a payment route exists.", "For the first session, Casey chooses an offered time and reviews the date, displayed timezone and duration. The confirmed appointment provides the meeting link. Jules checks that it is the intended session type. If payment and scheduling are separate in their arrangement, each still needs its own completed result; one should not be invented from the other."],
        bullets: []
      },
      {
        heading: "3. Prepare from context the client chooses to share",
        paragraphs: ["Jules requests a short description of Casey’s current offers, available working time and the question Casey most wants to resolve. Casey chooses which information to share. A useful preparation request is: ‘Please bring your two current package descriptions and a rough view of delivery time. Leave out client names or private customer material we do not need.’", "Before the meeting, Jules prepares an agenda from the supplied context and checks it for assumptions. The agenda asks which offer best fits Casey’s intended work and which uncertainty needs a small test. It does not claim that an assistant can see unshared business accounts or know the real profitability of every past project."],
        bullets: []
      },
      {
        heading: "4. Send a follow-up with owners and decisions",
        paragraphs: ["After the session, Jules writes: ‘We compared recurring support and identity projects. Casey will draft one recurring-support package by Friday and note the delivery limits. Jules will send the agreed decision questions. The pricing choice remains open until Casey has estimated delivery time.’ The summary distinguishes discussion, agreed actions and unanswered questions.", "Casey reviews the summary and corrects any misunderstanding. The follow-up does not add commitments that were never discussed. If Jules uses selected context to prepare wording, the final review checks names, dates and ownership against the actual session notes. Sensitive session content is not copied into a public booking description."],
        bullets: []
      },
      {
        heading: "5. Arrange the next session explicitly",
        paragraphs: ["They agree that the next session should inspect Casey’s draft package. Jules shares the actual booking route or creates a reviewed appointment, and both inspect the confirmed date and time. ‘Two weeks from now’ remains a preference until a real appointment exists. If Casey needs longer for the draft, they discuss the change within the package terms.", "At the third session, Jules lists what was covered, outstanding client actions and whether any sessions remain. A new package is a new decision, with its own reviewed terms and payment. Retaining the relationship context helps Jules continue the conversation without treating a past payment as unlimited future coaching."],
        bullets: ["Package scope and contact boundaries are clear.", "The client chooses appropriate preparation context.", "Follow-up actions have owners and dates.", "Each next appointment has a confirmed result."]
      }
    ],
    bankeiz: "Calendar and booking support reviewed appointments. Messages can help prepare agendas and follow-ups from the context you choose. Business with a configured Twin can help people reach an appropriate next step. Keep the package document in your existing process, and review the actual session context before sending the follow-up or arranging the next appointment.",
    related: ["/learn/templates/business-coaching-proposal/", "/learn/templates/coaching-session-follow-up/", "/learn/resources/schedule-from-conversation/", "/business/for/coaches/"],
    keywords: ["coaching client workflow example", "business coaching package process", "coaching session follow up example"]
  },
  {
    slug: "creative-client-workflow",
    kind: "example",
    niche: "Creative production teams",
    title: "A creative production workflow through approved delivery",
    description: "A fictional short-video project with a defined brief, staged client review, an explicit scope change and delivery checked against the agreed files and rights.",
    intro: "Fictional worked scenario: producer Sol and client Lee plan a launch video for an invented homeware studio, Finch. People, materials and amounts are illustrative. This shows a review process, not a customer outcome or measured savings. Documents and file sharing use the parties’ existing tools.",
    problem: "The client wants a launch film and social edits, but ‘all the footage’ and ‘a few changes’ mean different things to the two people. Sol must make deliverables, review rounds and usage expectations specific before production starts.",
    sections: [
      {
        heading: "1. Define the outputs and unresolved rights questions",
        paragraphs: ["The reviewed brief calls for one 60-second film, two 15-second vertical cuts and caption files. Sol names the production stages, shoot date, client-supplied product claims, review contact and two consolidated edit rounds. Raw footage and editable project files are explicitly excluded.", "They identify music, image and participant permissions to address through the production’s existing process. The proposal points to actual usage terms for review, without promising that every element can be used everywhere forever. Sol flags unresolved rights questions before relying on that material in delivery."],
        bullets: []
      },
      {
        heading: "2. Review the work arrangement and payment",
        paragraphs: ["The illustrative price is $2,800 USD, with an agreed $1,400 initial payment and later payment timing set out in the working terms. Lee inspects the full production scope and relevant attachments through the existing agreement process. Sol keeps the reviewed version identifiable rather than editing it in place as new preferences arrive.", "The payment message names project FIN-06 and the initial payment purpose. Lee checks the recipient and amount before approval. Sol inspects the confirmed result before describing the initial payment as received. If a shoot planning call is needed, they arrange a real appointment and review its confirmation separately from the payment."],
        bullets: []
      },
      {
        heading: "3. Ask for staged, specific client decisions",
        paragraphs: ["Before the shoot, Sol requests approval of the factual product statements and the shot plan. At first edit, the request focuses on sequence, message and required corrections. Final sound balancing and caption checks are named as later steps, so Lee knows what this review can usefully decide. Each link identifies the exact cut version.", "A sample request is: ‘Please review FIN-06 Edit v2 and send one consolidated response with timecodes. Confirm that the product claims are accurate and flag any missing required scene. Please keep new campaign ideas separate so we can assess them.’ Lee’s reply can be inspected against the named material rather than a folder of competing exports."],
        bullets: []
      },
      {
        heading: "4. Treat new outputs as a scope decision",
        paragraphs: ["Lee requests a third vertical cut. Sol prepares change C-02: one additional cut, $180, with a revised delivery date if the new message arrives after the agreed input deadline. Lee can choose the addition or retain the original deliverables. A review comment is not silently turned into free additional production.", "After the parties review the change through their existing process, Sol updates the deliverable list and payment references. Any changed usage request is reviewed against the actual terms rather than assumed to follow from the edit fee. The accepted scope remains discoverable alongside earlier versions."],
        bullets: []
      },
      {
        heading: "5. Deliver the agreed files for real inspection",
        paragraphs: ["Sol exports and opens the final film, the accepted vertical cuts and captions, then places them at the agreed delivery location. The index gives filenames, formats, intended uses and any applicable access expiry. Lee checks the files and reports one caption correction, which stays open until Sol delivers and identifies the corrected version.", "The handover points to the agreed usage terms and any relevant license information without inventing broader ownership. Final payment, file access and acknowledgment of the corrected delivery are recorded separately. A later request for raw footage starts a new conversation about availability, terms and price; it is not inferred from acceptance of the finished film."],
        bullets: ["Deliverables match accepted scope and changes.", "Review decisions name the exact cut version.", "Files and captions are opened and checked.", "Usage statements match the actual reviewed terms."]
      }
    ],
    bankeiz: "Messages can help prepare brief questions, a version-specific feedback request and a delivery summary from selected context. Booking and payment support their own reviewed actions and confirmed results. Keep production documents, permissions and file delivery in your established processes, and use clear references to continue the client conversation with the relevant work in view.",
    related: ["/learn/templates/video-production-proposal/", "/learn/templates/video-project-handover/", "/learn/resources/ask-client-for-feedback/", "/business/for/filmmakers/"],
    keywords: ["creative production client workflow", "video production client process example", "creative project delivery example"]
  }
];
