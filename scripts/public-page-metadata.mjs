import {matterPage} from '../src/content/digital-matter.mjs';
import {bookingGuidePage} from '../src/content/booking-guide.mjs';
import {momentsPage,momentsFaq} from '../src/content/personal-moments.mjs';
import {meetingPage} from '../src/content/meeting-page.mjs';
import {bankingPage} from '../src/content/banking-walkthrough.mjs';
import {guidePage} from '../src/content/user-guide.mjs';
import {portabilityPages} from '../src/content/portability-pages.mjs';
import {economyPages} from '../src/content/existing-economy.mjs';
import {standardPages} from '../src/content/standard-pages.mjs';
import {outcomePages} from '../src/content/outcome-pages.mjs';
import {identityContinuityPage} from '../src/content/identity-continuity.mjs';
import {twinSalesPages} from '../src/content/twin-pages.mjs';
import {togetherPages} from '../src/content/together.mjs';
import {bankMarkSvg} from '../branding/bank-mark.mjs';
// Public presentation metadata only. No account or runtime source is read here.
import {siteFooterHtml} from './site-footer.mjs';
import {learningPages,learningPath,assetCategories} from '../src/content/learning-pages.mjs';
import {cooperativePages,cooperativeSectors} from '../src/content/cooperatives.mjs';
import {businessFits,directoryPage} from '../src/content/business-fits.mjs';
import {businessFitArt} from '../src/content/business-fit-art.mjs';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {protectionPage} from './vault-protection-page.mjs';
export const publicOrigin = 'https://bankeiz.com';
export const publicPages = [
 {path:'/merchant/',id:'merchant',title:'Counter: your products, stock and payments | Bankeiz',description:'Bring your offerings, prices and stock together. Tap to build a sale, share one checkout and keep the complete payment record.',lines:['Your Counter.','Ready for business.'],caption:'Your offerings. Your stock. Your next sale.',motif:'bank'},
 {...momentsPage,id:'moments',motif:'layers',faq:momentsFaq},
 {...bankingPage,id:'banking',motif:'bank'},
 {...guidePage,id:'guide',motif:'book'},
 {...meetingPage,id:'meet',motif:'bank'},
 {...bookingGuidePage,id:'book',motif:'calendar'},
 {...matterPage,id:'digital-matter',motif:'cube'},
 ...portabilityPages.map(page=>({path:page.path,id:page.slug,title:page.title+' | Reality-Grade Banking',description:page.description,lines:page.shareLines,caption:page.shareCaption,motif:'layers'})),
 ...economyPages.map(page=>({path:page.path,id:page.slug,title:page.title+' | Reality-Grade Banking',description:page.description,lines:page.lines,caption:page.eyebrow,motif:'layers'})),
 ...standardPages.map(page=>({path:page.path,id:'standard-'+page.key,title:page.title+' | Open standard',description:page.description,lines:page.lines,caption:'The standard of the proof-native economy.',motif:'layers'})),
 ...outcomePages.map(page=>({path:page.path,id:'solution-'+page.key,title:page.title+' | Reality-grade banking',description:page.description,lines:page.lines,caption:page.promise,motif:'layers'})),
 {path:identityContinuityPage.path,id:'identity-continuity',title:identityContinuityPage.title+' | Bankeiz',description:identityContinuityPage.description,lines:identityContinuityPage.lines,caption:'Authentication opens the door. Continuity brings your identity with you.',motif:'key'},
 ...twinSalesPages.map(page=>({path:page.path,id:page.slug,title:page.title+' | Reality-grade banking',description:page.description,lines:page.lines,caption:'Client payment questions. Connected context. Less financial admin.',motif:'bank'})),
 ...togetherPages.map(page=>({path:page.path,id:page.slug,title:page.title+' | Reality-grade banking',description:page.description,lines:page.lines,caption:'Your source. Your ownership. Our next possibility.',motif:'globe'})),
  {path:protectionPage.path,id:'protect-your-value',title:protectionPage.title+' | Reality-grade banking',description:protectionPage.description,lines:['Prove it’s yours.','Keep it yours.'],caption:'Share proof without sharing access.',motif:'key'},
  ...cooperativePages.map(page=>{const sector=cooperativeSectors.find(s=>s.slug===page.cooperativeKind);return {path:page.path,id:page.slug,title:page.title+' | Reality-grade banking',description:page.description,lines:sector?[sector.short+'.','Value, put to work.']:page.cooperativeKind==='main'?['Your members.','Have the value.']:page.cooperativeKind==='connect'?['Start with','your next exchange.']:['See the exchange.','Inspect the source.'],caption:'The proof-native economy. Reality-grade banking.',motif:'layers',size:80};}),
  {path:'/vaults/',id:'vaults',title:'Vaults: yours to hold | Bankeiz',description:'A private place for money, originals and investments. Keep their proof, add optional passkey protection and share evidence without giving access.',lines:['Yours to hold.','Yours to unlock.'],caption:'Your money. Your originals. Their proof.',motif:'key'},
  {path:'/business/',id:'business',title:'Less money admin. More control of your day. | Business — $149/month',description:'Understand cash flow, simplify payment requests and follow-ups, and spend less time on financial admin. Business is an optional $149/month banking upgrade.',lines:['Your money, clearer.','Your day, easier.'],caption:'Less chasing. Less financial admin. Your final say.',motif:'bank',size:84},
  {path:directoryPage.path,id:'business-for',title:'Find your fit: money help for 30 kinds of work | Business',description:directoryPage.description,lines:['Your money.','Less on your plate.'],caption:'Make the money side of your work easier.',motif:'layers',size:88},
  ...businessFits.map(fit=>({path:`/business/for/${fit.slug}/`,id:`business-fit-${fit.slug}`,title:`${fit.headline} | ${fit.label} — $149/month`,description:fit.description,lines:businessFitArt[fit.slug].lines,caption:'Your money. Your context. Your final say.',motif:{context:'layers',create:'cube',teach:'book',connect:'bank',build:'code',own:'badge'}[fit.story],size:Math.min(92,Math.floor(900/(Math.max(fit.label.length+1,15)*.54)))})),
  {path:'/',id:'home',title:'Reality-grade banking | The proof-native economy',description:'The open standard for interacting with the proof-native economy. Hold originals, verify ownership and move value through Receiz reality-grade infrastructure.',lines:['Your value.','More possibilities.'],caption:'Hold. Move. Grow.',motif:'layers'},
  {path:'/learn/',id:'learn',title:'Reality-grade banking explained | Proof-native economy',description:'Learn how proof-native banking connects your identity, verifiable asset ownership, Reserve funds and Settlement value in one account.',lines:['Your value.','Connected.'],caption:'The foundations of proof-native banking.',motif:'layers'},
  {path:'/learn/guides/',id:'guides',title:'All guides: banking, assets & economic standards | Bankeiz',description:'Explore the complete Bankeiz guide collection: your account, payments, Notes, assets, markets, transaction history and implementation standards.',lines:['The complete','picture.'],caption:'Banking. Assets. Markets. History. Standards.',motif:'book'},
  {path:'/learn/receiz-id/',id:'receiz-id',title:'Receiz ID & Identity Records | Bankeiz',description:'Create a Receiz ID, open an existing account and back up your Identity Record. Understand how device-held signing keeps your authority with you.',lines:['Your identity.','In your hands.'],caption:'Receiz ID & Identity Records.',motif:'fingerprint'},
  {path:'/learn/proof-objects/',id:'proof-objects',title:'Proof objects & verifiable asset ownership | Bankeiz',description:'Understand sealed proof objects, original evidence, ownership history, public asset listings and custody-backed physical assets.',lines:['Own the source.','Carry the proof.'],caption:'Verifiable assets. Connected ownership.',motif:'cube'},
  {path:'/learn/reserve-and-settlement/',id:'reserve-settlement',title:'Reserve & Settlement: connected value | Bankeiz',description:'Understand Reserve proof-backed funds and Settlement proof-native value, original Notes, payment requests and proof-continuity requirements.',lines:['One balance.','Connected value.'],caption:'Proof-native value. Proof-backed funds.',motif:'rails'},
  {path:'/learn/account-access/',id:'account-access',title:'Account access & read permissions | Bankeiz',description:'See what opening your Bankeiz account authorizes, how private account reads work and why financial actions need separate approval.',lines:['Your account.','Your permission.'],caption:'Clear access. Deliberate authorization.',motif:'shield'},
  {path:'/learn/signing-key/',id:'signing-key',title:'Device-held signing & Identity Record protection | Bankeiz',description:'Understand your device-held signing key, protected Identity Record transport, backups and the authority needed to authorize an action.',lines:['Your authority.','Held by you.'],caption:'Device-held signing. Protected originals.',motif:'key'},
  {path:'/learn/reality-grade-banking/',id:'reality-grade-banking',title:'Reality-Grade Banking: value with its proof | Bankeiz',description:'Explore Reality-Grade Banking: verifiable ownership, source-carried history, proof-native value, proof-backed funds and an open implementation.',lines:['Reality-Grade','Banking.'],caption:'Value. Ownership. Continuity.',motif:'bank'},
  {path:'/learn/how-value-works/',id:'how-value-works',title:'How proof value & Phi to USD are calculated | Bankeiz',description:'Inspect the deterministic proof valuation rules, live Kai pulse basis and exact Phi-to-USD display calculation. Reconstruct supported values locally.',lines:['Value.','By exact rules.'],caption:'Deterministic valuation. Inspectable math.',motif:'valuation'},
  {path:'/conformance/',id:'conformance',title:'Proof-continuity conformance checks | Bankeiz',description:'Run Receiz reference checks, inspect original funded Notes and examine verification, ownership and history requirements for receiving systems.',lines:['Verification.','Without compromise.'],caption:'The proof-continuity standard.',motif:'badge'},
  {path:'/verify/',id:'verify',title:'Verify an original account proof | Bankeiz',description:'Inspect a public account proof on your device. Check its Receiz ID binding, disclosed Reserve funds, Settlement value and carried history without logging in.',lines:['Open the proof.','See the evidence.'],caption:'Original source. Local verification.',motif:'scan'},
  {path:'/ledger/',id:'ledger',title:'Public Ledger: transactions & proof history | Bankeiz',description:'Explore public transactions, transfers and source-carried proof history. Inspect original evidence and save the loaded Ledger as a local Memory Crystal.',lines:['History.','In the open.'],caption:'The public Ledger. Connected to source.',motif:'ledger'},
  {path:'/discover/',id:'discover',title:'Discover people and their work | Bankeiz',description:'Discover music, videos, books, images and moments. Search public Originals and connect with their creators.',lines:['Find your next','discovery.'],caption:'People. Originals. Possibilities.',motif:'globe'},
  {path:'/feed/',id:'feed',title:'For you: watch, listen and read | Bankeiz',description:'Discover public Originals in your Bankeiz feed. Watch films, listen to music, read books and connect directly with their creators.',lines:['Something new.','For you.'],caption:'Watch. Listen. Read. Connect.',motif:'play'},
  // This static document hosts /book/:username. Unknown preview clients get
  // complete sharing metadata without a server read on the visitor's path.
  // Only the personalized crawler response can declare the owner's URL.
  {path:'/booking/',id:'booking',title:'Make time | Bankeiz',description:'Choose a time. Keep the conversation moving. Book directly with someone on Bankeiz.',lines:['A little time.','Set aside.'],caption:'Choose a time. Keep life connected.',motif:'calendar',noindex:true,template:true},
  {path:'/explore/',id:'explore',title:'Asset explorer: public proof objects & live value | Bankeiz',description:'Explore public proof objects and assets without an account. Inspect live valuations, sealed moments, ownership and the original evidence behind each listing.',lines:['A world of value.','Open to explore.'],caption:'Sealed moments. Public value.',motif:'globe'},
  {path:'/schemas/',id:'schemas',title:'Receiz SDK schemas & proof formats | Bankeiz',description:'Inspect and download the original Receiz SDK schemas, source documentation and integrity digests for independent proof-object integrations.',lines:['The standard.','Down to the byte.'],caption:'Original schemas. Open implementation.',motif:'code'},
  {path:'/legal/',id:'legal',title:'License, source & notices | Bankeiz',description:'Read the Bankeiz software license, attribution, source archive, build materials and third-party notices for the open reference implementation.',lines:['Open source.','Clear foundations.'],caption:'Source. License. Attribution.',motif:'book',noindex:true},
  {path:'/receipt/',id:'receipt',title:'Transaction receipt | Bankeiz',description:'Inspect the selected transaction record, its carried source evidence, recorded event value and supported ownership history.',lines:['The record.','Stays connected.'],caption:'Transaction evidence. Preserved.',motif:'receipt',noindex:true,robots:'noindex,nofollow'},
];
const motifs={Banking:'bank',Assets:'cube',Markets:'globe',History:'ledger',Standards:'badge','For you':'receipt'};
for(const page of learningPages){
 const record={path:learningPath(page),id:page.slug,title:`${page.title} | Bankeiz`,description:page.description,lines:[page.title.split(' ').slice(0,3).join(' '),page.title.split(' ').slice(3).join(' ')||page.intro.split('. ')[0]+'.'],caption:page.intro,motif:motifs[page.group]};
 // Human authored short headlines fit the established social-card layout.
 const headlines={'get-paid':['Get paid.','Keep the proof.'],'proof-native-economy':['Value.','Connected to source.'],'global-market-cap':['Global','Market Cap.'],'reserve-and-settlement':['One balance.','Complete continuity.'],'asset-rights-and-backing':['Defined rights.','Visible backing.'],'fractional-ownership':['A defined share.','An inspectable whole.'],'source-of-funds':['Every payment.','Connected to source.'],'time-and-ordering':['A familiar time.','An exact moment.'],'payment-requests':['A clear request.','A deliberate payment.'],'for-people':['Send your share.','Keep the receipt.'],'for-businesses':['Take a payment.','Keep the record.'],'for-independent-work':['Finish the work.','Get paid.'],'for-creators':['Your work.','Its original.'],'for-communities':['A shared plan.','Clear payments.'],'for-institutions':['Open the receipt.','Follow the source.'],'for-public-finance':['Show what was paid.','Keep the evidence.'],'for-platforms':['Build the experience.','Keep the result.']};
 const audienceMotifs={'for-people':'fingerprint','for-businesses':'bank','for-independent-work':'receipt','for-creators':'cube','for-communities':'globe','for-institutions':'ledger','for-public-finance':'badge','for-platforms':'code'};
 record.motif=audienceMotifs[page.slug]??record.motif;
 record.lines=headlines[page.slug]??[page.title+'.','The complete picture.'];
 record.size=Math.min(108,Math.floor(950/(Math.max(...record.lines.map(line=>line.length))*.53)));
 const index=publicPages.findIndex(item=>item.path===record.path);if(index<0)publicPages.push(record);else publicPages[index]=record;
}
for(const category of assetCategories)publicPages.push({path:category.path,id:`explore-${category.slug}`,title:`${category.label}: explore public assets | Bankeiz`,description:category.description,lines:[category.label+'.','Open to explore.'],caption:'Original sources. Verifiable ownership.',motif:'globe'});
export const escapeMetadata = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function publicPage(path) {
  return publicPages.find(page=>page.path===canonicalPublicPath(path));
}
export function socialMetadata(page,image) {
  const esc=escapeMetadata,url=publicOrigin+page.path,src=publicOrigin+image.url;
  return `<title>${esc(page.title)}</title><meta name="description" content="${esc(page.description)}"><meta name="robots" content="${page.robots??(page.noindex?'noindex,follow':'index,follow,max-image-preview:large')}">${page.template?'':`<link rel="canonical" href="${url}">`}<meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:locale" content="en_US">${page.template?'':`<meta property="og:url" content="${url}">`}<meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:image" content="${src}"><meta property="og:image:secure_url" content="${src}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="${image.width}"><meta property="og:image:height" content="${image.height}"><meta property="og:image:alt" content="${esc(image.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(page.title)}"><meta name="twitter:description" content="${esc(page.description)}"><meta name="twitter:image" content="${src}"><meta name="twitter:image:alt" content="${esc(image.alt)}">`;
}
export function publicEntryFallback(path) {
  const category=assetCategories.find(item=>item.path===path);
  const copy=category?[category.label,'Original sources. Verifiable ownership.',category.description,'/explore/','Explore all assets']:{
    '/explore/':['Explore proof objects','Sealed moments. Public value. Connected history.','Explore publicly listed assets, their supported live valuations, ownership and original proofs.','/learn/proof-objects/','Understand proof objects'],
    '/ledger/':['History. In the open.','Public activity. Connected sources.','Inspect public transactions and transfers, their recorded value and the evidence carried by their original sources.','/learn/how-value-works/','Inspect the valuation method'],
    '/verify/':['Verify an account proof','Identity. Funds. History.','Open a deliberately shared original account proof to inspect its disclosed identity, value and carried history on your device. Verification requires the local reader; no verification has run yet.','/learn/receiz-id/','Understand Identity Records'],
    '/conformance/':['Proof-continuity conformance','Verification. Ownership. History.','Run reference checks and inspect the evidence required to preserve proof continuity across receiving systems. Checks require the local console; no conformance result has been established.','/learn/reality-grade-banking/','Understand the receiving standard'],
  }[path];
  if(!copy)return '';
  return `<main class="public-entry-placeholder"><style>.public-entry-placeholder{max-width:1120px;margin:auto;padding:44px 28px 100px;color:#172b45;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.public-entry-placeholder nav{display:flex;align-items:center;flex-wrap:wrap;gap:24px;font-size:14px}.public-entry-placeholder a{color:inherit;text-underline-offset:4px}.public-entry-placeholder h1{font-size:clamp(40px,7vw,76px);letter-spacing:-.045em;font-weight:650;margin:110px 0 24px;line-height:1.08}.public-entry-placeholder p{max-width:620px;font-size:17px;line-height:1.6}.public-entry-placeholder h1+p{font-size:22px}.public-entry-placeholder footer{margin-top:40px}</style><nav aria-label="Public navigation"><a href="/" aria-label="Bankeiz home">${bankMarkSvg}</a><a href="/learn/">Learn</a><a href="/explore/">Explore</a><a href="/ledger/">Ledger</a></nav><h1>${copy[0]}</h1><p>${copy[1]}</p><p>${copy[2]}</p><footer><a href="${copy[3]}">${copy[4]}</a></footer></main>${siteFooterHtml(path)}`;
}
export function structuredMetadata(page,image) {
  const url=publicOrigin+page.path,parts=page.path.split('/').filter(Boolean),crumbs=[{name:'Bankeiz',item:publicOrigin+'/'}];
  if(page.template)return {'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:page.title,description:page.description,inLanguage:'en',isPartOf:{'@id':publicOrigin+'/#website'},primaryImageOfPage:{'@type':'ImageObject',url:publicOrigin+image.url,width:image.width,height:image.height,caption:image.alt}}]};
  if(parts[0]==='learn'&&parts.length>1)crumbs.push({name:'Learn',item:publicOrigin+'/learn/'});
  if(page.path!=='/')crumbs.push({name:page.title.split(' | ')[0],item:url});
  return {'@context':'https://schema.org','@graph':[
    {'@type':['/explore/','/ledger/','/feed/','/discover/'].includes(page.path)?'CollectionPage':'WebPage','@id':url+'#page',url,name:page.title,description:page.description,inLanguage:'en',isPartOf:{'@id':publicOrigin+'/#website'},publisher:{'@id':publicOrigin+'/#organization'},primaryImageOfPage:{'@type':'ImageObject',url:publicOrigin+image.url,width:image.width,height:image.height,caption:image.alt}},
    {'@type':'BreadcrumbList',itemListElement:crumbs.map((item,index)=>({'@type':'ListItem',position:index+1,...item}))},
    ...(Array.isArray(page.faq)?[{'@type':'FAQPage','@id':url+'#questions',mainEntity:page.faq.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))}]:[]),
    ...((page.id.startsWith('standard-')||['reality-grade-banking','proof-native-economy'].includes(page.id))?[{'@type':'DefinedTermSet','@id':publicOrigin+'/about/#terminology',name:'Proof-native economy, reality-grade banking and reality-grade infrastructure',hasDefinedTerm:[{name:'Proof-native economy',description:'The economic system where participating value carries its required source, rights and proof.'},{name:'Reality-grade banking',description:'The open standard for interacting with the proof-native economy while preserving source, authority and continuity.'},{name:'Reality-grade infrastructure',description:'Receiz implements the primitives of reality-grade banking through its SDK, MCP and AI Skills.'}].map((term,index)=>({'@type':'DefinedTerm','@id':publicOrigin+'/about/#term-'+index,inDefinedTermSet:publicOrigin+'/about/#terminology',...term}))}]:[])
  ]};
}
export function applyPublicMetadata(html,page,image) {
  if(!page||!image)throw Error('PUBLIC_PAGE_METADATA_REQUIRED');
  const clean=html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'');
  // Preserve the homepage Organization/WebSite/WebApplication graph. Other
  // pages receive one consistent graph without invented publication dates.
  const base=page.path==='/'?clean:clean.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
  return base.replace('</head>',socialMetadata(page,image)+`<script type="application/ld+json">${JSON.stringify(structuredMetadata(page,image)).replaceAll('<','\\u003c')}</script></head>`);
}
