// Public authored task coordinates. Complete manuals remain canonical in docs-app.
import {docsArticles,docsPaths,docsOrigin} from '../../docs-app/content.mjs';
export const guidePage=Object.freeze({guide:true,slug:'guide',path:'/guide/',title:'How to use Bankeiz: your practical user guide',description:'Send, receive, add money, create Originals, move ownership, plan meetings and use your Twin. Follow the actual controls, confirmed result and evidence in 45 sourced operating chapters.',lines:['Your next step.','From here to done.'],caption:'The controls to use. The result to inspect.',sections:[]});
export const guideGroups=Object.freeze([
 {id:'money',title:'Your money and ownership',summary:'Start with the familiar action. Keep its result connected.'},
 {id:'people',title:'Your people and plans',summary:'Talk, book and meet with the same identity.'},
 {id:'business',title:'Your business, moving forward',summary:'Ask the task. Review the actual action and result.'},
 {id:'protection',title:'Your originals, in your hands',summary:'Keep private authority and public evidence distinct.'},
]);
export const guideTasks=Object.freeze([
  {
    "id": "send",
    "group": "money",
    "slug": "payments",
    "title": "Send money",
    "why": "Pay a person and keep the payment with its purpose.",
    "click": "Account → Send → Send money. Enter the recipient and amount, then Review payment.",
    "result": "Send payment submits your approved request. Payment sent identifies its accepted result.",
    "evidence": "Open the Ledger receipt for the participants, amount and connected funding sources."
  },
  {
    "id": "receive",
    "group": "money",
    "slug": "receiving",
    "title": "Get paid",
    "why": "Give the next person a clear way to pay you.",
    "click": "Account → Receive → Checkout link. Add an optional amount, then share the link or QR.",
    "result": "The payer reviews and approves. Check your receiving account or Counter for the confirmed payment.",
    "evidence": "Keep the receipt or Counter → Payment evidence → Save payment evidence."
  },
  {
    "id": "fund",
    "group": "money",
    "slug": "funding",
    "title": "Add money or a Note",
    "why": "Bring the source you already hold into the account.",
    "click": "Add → Add money for secure payment, or Settlement Note to open its original PNG.",
    "result": "Inspect the confirmed account credit. A card form or received-but-uncredited Note is a different state.",
    "evidence": "Keep the saved deposit reference, original Note and accepted deposit proof."
  },
  {
    "id": "trade",
    "group": "money",
    "slug": "market-trading",
    "title": "Buy ownership or take cash",
    "why": "Acquire supported shares or sell from a holding you own.",
    "click": "Open a Market asset → Buy ownership, or Assets → Investments → holding → Take cash.",
    "result": "Review the budget or quantity and approve the actual trade. Trade recorded retains its accepted result.",
    "evidence": "Open Investments → Trade history and the related Ledger record for actual shares, price and proceeds."
  },
  {
    "id": "create",
    "group": "money",
    "slug": "assets",
    "title": "Create and sign an Original",
    "why": "Keep your work, ownership and inspectable source together.",
    "click": "Market → Create an asset. Add the work and details → Create asset; use Add backing only when intended.",
    "result": "Save the sealed Original. Sign this Original with PBI to unlock its accrued value; public delivery has its own result.",
    "evidence": "Open your asset and its original proof. Bankeiz Market listing is separate."
  },
  {
    "id": "transfer",
    "group": "money",
    "slug": "ownership",
    "title": "Send ownership",
    "why": "Move exact ownership while its Original and history stay connected.",
    "click": "Account → Send → Send ownership. Choose Asset, Ownership to send and Recipient → Review ownership transfer.",
    "result": "Approve the displayed exact terms, then Send ownership. Transaction complete. identifies the accepted result.",
    "evidence": "Retain the accepted transaction proof and source. Resolve an unknown request through its saved recovery."
  },
  {
    "id": "meet",
    "group": "people",
    "slug": "calendar-booking",
    "title": "Plan a time or meet now",
    "why": "Keep the person, appointment, invitation and conversation together.",
    "click": "Header message icon → Calendar → New appointment or Meet now. Your booking link shares available times and any appointment offers.",
    "result": "Create appointment saves the event. Its optional price applies to each invited guest. Free guests use Book this time; priced bookings use Continue to payment or the Twin’s review, then explicit Pay. Only the accepted result says You’re booked.",
    "evidence": "Open the confirmed event, actual invitation status and supported Record continuity. A priced booking also retains its payment Original; funding alone is pending."
  },
  {
    "id": "messages",
    "group": "people",
    "slug": "messages",
    "title": "Start a conversation",
    "why": "Talk to the right person through your existing Receiz identity.",
    "click": "Header message icon → Messages → New conversation. Select the person or group → Start conversation.",
    "result": "Send your message and inspect its delivery state. Voice call and Video call use the selected conversation.",
    "evidence": "Reopen that thread, its earlier messages and actual call state; an unknown delivery is not a second-send instruction."
  },
  {
    "id": "agent",
    "group": "business",
    "slug": "agents",
    "title": "Put your agent to work",
    "why": "Work through what is owed, what is due and the next useful action.",
    "click": "Header message icon → Your agent. Ask the task and supply the relevant context; Business uses its actual plan and credits.",
    "result": "Inspect the actual task result and any exact approval. Work shows started, running, completed or blocked work.",
    "evidence": "Use the returned source proof, contact, Calendar event or payment record. A generated answer has its stated scope."
  },
  {
    "id": "protect",
    "group": "protection",
    "slug": "vaults",
    "title": "Protect and carry your value",
    "why": "Hold money, Originals and investments in separate Vault custody.",
    "click": "Account settings → Your vaults → Create a vault. Choose its name and optional passkey protection.",
    "result": "Review, save and reselect the exact private Original when asked, then Approve. Save its updated state.",
    "evidence": "Share proof discloses selected holdings without private access. Keep the private Vault and identity backup separately."
  }
]);
export const guideArticleUrl=slug=>{if(!docsArticles.some(article=>article.slug===slug))throw Error('GUIDE_ARTICLE_UNKNOWN:'+slug);return docsOrigin+'/'+slug+'/';};
export const guideManualPaths=docsPaths.map((path,index)=>({...path,id:'manual-'+(index+1),articles:path.slugs.map(slug=>{const article=docsArticles.find(row=>row.slug===slug);if(!article)throw Error('GUIDE_ARTICLE_UNKNOWN:'+slug);return{slug,title:article.title,summary:article.summary,url:guideArticleUrl(slug)};})}));
