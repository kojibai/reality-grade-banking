// Task owners: invoices are the payment-request document; client management is
// the connected relationship workflow. Existing proposal, document, signing and
// communication entrances keep their own canonical paths.
export const clientWorkProductPages=[
 {
  clientWorkProduct:true,slug:'business-invoices',path:'/business/invoices/',
  title:'AI invoice generator for client work',
  description:'Prepare an editable invoice in Messages. Review the scope, exact line items, amount, payment terms and PDF before using the supported send and payment flow.',
  heading:'Create client invoices.<br>Review every detail.',
  intro:'Start with the client conversation and the recent context you choose. Prepare an invoice with the actual line items, quantities and price, edit it yourself, then inspect the PDF before sharing. Keep the payment request beside the work it covers.',
  intent:'invoice',scenarioId:'photography',lines:['The work. The amount.','A clear invoice.'],caption:'Your invoice. Your review. Your final say.',
  sections:[
   {title:'Make the request specific',body:'Name the service period or milestone, explain each line item and check the total. A deposit, balance and full-project invoice are different obligations. Credit a recorded payment once and keep separately approved additions visible.'},
   {title:'Edit before you share',body:'Manual editing lets you change the description, quantity, exact cent price, scope and terms. Preview and download the edited file. AI drafting uses the selected recent context and metered Business allowance; review its output before using it.'},
   {title:'Keep payment review with the record',body:'An invoice draft is a request, not evidence that money moved. In your account, sending and payment use their existing review and authorization steps. Keep the actual payment result and source with the conversation when it is available.'},
  ],
  questions:[
   ['Can I try an invoice without creating an account?','Yes. The local example lets you edit a fictional invoice, preview it and download the edited file. The scripted Twin does not call AI or send an invoice, create a payment request, move money or record a client payment.'],
   ['Can I write the invoice manually?','Yes. Use the editable line items, quantities, prices, scope and terms. Check the amount and applicable tax treatment yourself. The sample file contains authored example content and no proof or payment metadata.'],
   ['Does preparing an invoice charge or pay the client?','No. Preparing or downloading a document does not move money. Use the supported account flow, review the exact recipient and amount and approve the relevant action. Only an actual payment result establishes what happened.'],
   ['How is this different from a proposal?','A proposal sets out the work and price for review. An invoice requests payment for a specified obligation. Keep the agreed scope and the exact billing milestone connected; the proposal entrance remains at /proposals/.'],
  ],
 },
 {
  clientWorkProduct:true,slug:'business-client-management',path:'/business/client-management/',
  title:'Client management software in Messages Workspace',
  description:'Keep the brief, proposal, working documents, review, invoice and handover in the client conversation. Explore the actual Messages Workspace with editable local examples.',
  heading:'The client relationship.<br>The whole working context.',
  intro:'The next client step should begin with the work already in front of you. In Messages, open Workspace to work with your Twin, prepare documents and keep the context you choose close. Return to the conversation with a clear draft, review question or handover.',
  intent:'management',scenarioId:'consulting',lines:['One client conversation.','A clearer next step.'],caption:'The brief. The work. The next conversation.',
  sections:[
   {title:'Start with the actual brief',body:'Clarify the goal, deliverables, dates, decision maker and missing inputs. Choose the recent conversation context that matters for the task. Keep an open question visible instead of turning an assumption into an agreed term.'},
   {title:'Prepare the work in Workspace',body:'Move between Twin, Work and Context without rebuilding the client’s story. Draft a proposal, invoice, document or working agreement; edit the details manually, inspect the file and return to the conversation. Review a changed version as a changed version.'},
   {title:'Carry the next decision through',body:'Ask for consolidated feedback, record what still needs approval and prepare a clear handover. Actual messages, signing, booking and payment keep their supported account operations and approval boundaries. A local example does not complete those actions.'},
  ],
  questions:[
   ['What does client management mean here?','It is the work around a client relationship in Messages: the brief, selected context, proposals, invoices, documents, review questions, delivery and follow-up. The relationship stays connected while each consequential action keeps its own review.'],
   ['Can I explore the real interface first?','Yes. Choose a fictional client example, read the brief, open Workspace and edit a draft. Preview and download the actual edited file, then return to the sample conversation. The example stays local to the page session.'],
   ['Does the Twin read every earlier conversation?','Use the recent context you choose for the task. Do not assume that missing or earlier material has been included. Check the scope and source information yourself before sharing generated material. AI use in the account is metered.'],
   ['What does Business include and cost?','Business is an optional $149/month or $1,499/year subscription, renewing on the selected interval until cancelled. Both include 7,500 monthly AI usage credits with metered use. Manual editing and your core account remain separate from an AI generation request; review current access and billing terms in the upgrade flow.'],
  ],
 },
];
