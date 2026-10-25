import {standardPages} from '../src/content/standard-pages.mjs';
import {outcomePages} from '../src/content/outcome-pages.mjs';
import {bankMarkSvg} from '../branding/bank-mark.mjs';
// Public, static learning surfaces. No account state or application runtime is loaded here.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Fingerprint } from 'lucide-react';
import { branding } from '../branding/profile.mjs';
import {siteFooterHtml} from './site-footer.mjs';
import {learningPages,learningGroups,learningPath,assetCategories} from '../src/content/learning-pages.mjs';
import {learningVisual} from './learning-visuals.mjs';
import {businessFitPages,directoryPage} from '../src/content/business-fits.mjs';
import {twinSalesPages} from '../src/content/twin-pages.mjs';
import {togetherPages} from '../src/content/together.mjs';
import {cooperativePages} from '../src/content/cooperatives.mjs';
// Public discovery only. Existing routes and native authorities are unchanged.
const solutionGuides=[
 ...standardPages.map(page=>({...page,group:page.key.startsWith('market')?'Markets':'The standard'})),
 ...outcomePages.map(page=>({...page,group:page.key==='proof'?'Assets':'Banking',title:({agent:'Your agent',fraud:'Payment fraud',recover:'Recover your identity','get-paid':'Get paid. Keep the story.',proof:'Open the proof'})[page.key]})),
 {slug:'identity-continuity',path:'/id/',group:'Banking',title:'Identity continuity',description:'Open Bankeiz with the Receiz identity you already hold. Authentication, recovery and supported history stay connected.'},
 ...twinSalesPages.map(page=>({...page,group:'Banking',title:page.key==='your-twin'?'Your Twin':'See it in action'})),
 {slug:'vaults',path:'/vaults/',group:'Banking',title:'Your Vaults',description:'Hold money and originals separately, add optional passkey protection and share their proof.'},
 {slug:'protect-your-value',path:'/protect/',group:'Banking',title:'Protect your value',description:'See how separate Vault authority, optional passkey encryption and public proof protect access.'},
 {slug:'business',path:'/business/',group:'Banking',title:'Business',description:'Work from your context, create what comes next and help clients take the next step.'},
 {...directoryPage,group:'Banking'},
 ...businessFitPages.map(page=>({...page,group:'Business by your work',title:page.fit.label})),
 ...cooperativePages.map(page=>({...page,group:'Cooperatives'})),
 ...togetherPages.map(page=>({...page,group:'Together'}))
];
const relatedSolutions={
 'deposits':['/deposit/','/money/','/fees/'],
 'markets':['/market/','/market/buy/','/market/sell/'],
 'fractional-ownership':['/market/ownership/'],
 'price-history':['/market/value/'],
 'security':['/fraud/','/proof/','/protect/','/vaults/','/id/'],
 'receiz-id':['/recover/','/vaults/','/protect/','/id/'],
 'proof-objects':['/proof/','/vaults/'],'ownership':['/proof/','/vaults/'],
 'get-paid':['/get-paid/'],'payment-requests':['/get-paid/','/fraud/'],'receipts':['/proof/','/get-paid/'],
 'physical-assets':['/coops/'],'asset-rights-and-backing':['/cooperatives/infrastructure/'],
 'proof-native-economy':['/coops/','/together/'],'institutions':['/cooperatives/infrastructure/'],
 'messages':['/agent/','/business/','/fit/','/your-twin/','/in-action/'],
 'for-businesses':['/business/','/fit/','/your-twin/','/in-action/'],'for-independent-work':['/fit/'],
 'for-creators':['/fit/','/together/creators/'],'for-communities':['/coops/','/together/communities/'],
 'for-institutions':['/cooperatives/infrastructure/'],'for-public-finance':['/coops/']
};
const brandText = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>';
const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16m-6-6 6 6 6-6"/></svg>';
const fingerprint = renderToStaticMarkup(createElement(Fingerprint, { strokeWidth: 1.1, 'aria-hidden': true }));
const cube = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v8M7.5 5.5l9 5"/></svg>';
const document = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H5v18h14V8l-5-5ZM14 3v5h5M8 12h8M8 16h8"/></svg>';
const money = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 8.5h-4.5a2 2 0 0 0 0 4H13a2 2 0 0 1 0 4H9M12 6.5v12"/></svg>';
const reserve = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 9-5 9 5H3ZM3 21h18M5 18V11M10 18V11M14 18V11M19 18V11"/></svg>';
const layers = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5"/></svg>';

export function learnHeader() {
  const base = '/learn/';
  return `<a class="skip-link" href="#main">Skip to content</a><header class="learn-header"><div class="learn-shell header-inner"><a class="learn-brand" href="/learn/" aria-label="${brandText(branding.applicationName)} Learn">${bankMarkSvg}</a><nav class="header-nav" aria-label="Learn navigation"><a href="${base}#how-it-works">How it works</a><a href="/business/">Business</a><a href="${base}#guides">Guides</a></nav><a class="learn-button button-ink header-enter" href="/">Enter bank ${arrow}</a></div><div class="reading-progress" aria-hidden="true"></div></header>`;
}

const flowPaths = [
  'M190 72H205C228 72 224 154 284 154',
  'M190 182H284',
  'M190 292H205C228 292 224 210 284 210',
  'M394 154C444 154 438 48 502 48H536',
  'M394 174C448 174 452 130 502 130H536',
  'M394 194C448 194 452 224 502 224H536',
  'M394 212C444 212 438 306 502 306H536'
];
const flow = `<div class="proof-flow" role="img" aria-label="Money, physical assets, and proof objects connect to an inspectable proof. Its admitted ownership can be held, sent, divided, or redeemed."><svg class="flow-wires" viewBox="0 0 640 360" aria-hidden="true">${flowPaths.map((d, i) => `<path class="wire" d="${d}"/><circle class="flow-particle particle-${i}" r="2.5" style="offset-path:path('${d}');animation-delay:-${i * 1.7}s"/>`).join('')}<g fill="var(--paper)" stroke="var(--cobalt)" stroke-width="1.5"><circle cx="536" cy="48" r="4"/><circle cx="536" cy="130" r="4"/><circle cx="536" cy="224" r="4"/><circle cx="536" cy="306" r="4"/></g></svg><div class="flow-source source-money"><span>${money}</span>Money</div><div class="flow-source source-physical"><span>${cube}</span>Physical assets</div><div class="flow-source source-proof"><span>${document}</span>Proof objects</div><div class="flow-seal">${fingerprint}<span>Proof</span></div><span class="flow-action action-hold">Hold</span><span class="flow-action action-send">Send</span><span class="flow-action action-divide">Divide</span><span class="flow-action action-redeem">Redeem</span></div>`;

const noteShowcase = `<div class="article-notes motion-region"><div class="notes-gallery"><figure class="note-specimen reveal"><img src="/learn/reserve-note.webp" width="1620" height="972" style="width:100%;max-width:100%;height:auto" loading="lazy" decoding="async" alt="Unissued $100 Reserve Note specimen, with engraved denomination in all four corners and the words Proof-backed value"><figcaption><h3>Reserve Note</h3><span>Proof-backed value.</span></figcaption></figure><figure class="note-specimen reveal"><img src="/learn/settlement-note.webp" width="1620" height="972" style="width:100%;max-width:100%;height:auto" loading="lazy" decoding="async" alt="Unissued $100 Settlement Note specimen, with engraved denomination in all four corners and the words Proof-native value"><figcaption><h3>Settlement Note</h3><span>Proof-native value.</span></figcaption></figure><figure class="note-specimen reveal"><img src="/learn/settlement-reserve-note.webp" width="1620" height="972" style="width:100%;max-width:100%;height:auto" loading="lazy" decoding="async" alt="Unissued $100 Settlement Reserve Note specimen, Proof-backed Native value"><figcaption><h3>Settlement Reserve Note</h3><span>Proof-backed Native value.</span></figcaption></figure></div><p class="specimen-caption">Illustrative $100 designs. Unissued specimens, with no spendable value.</p><div class="note-benefits reveal"><div><span>01</span><h3>Keep it with you.</h3><p>Save the original note on your device. Its amount and carried history stay with you, even offline.</p></div><div><span>02</span><h3>Give with confidence.</h3><p>Send a funded Note addressed to your recipient. Your recipient can verify the original and see the history that comes with it.</p></div><div><span>03</span><h3>Put it back to work.</h3><p>Deposit a Note into your account. Ownership is checked before credit, so the same note cannot be credited twice.</p></div></div></div>`;

export function learnHome() {
  return `${learnHeader()}<main id="main"><section class="learn-hero learn-shell motion-region"><div class="hero-copy"><h1>Use the value<br><span>you already hold.</span></h1><p>Hold, exchange and inspect proof objects. Keep value connected to its source, ownership and history.</p><div class="hero-actions"><a class="learn-button button-cobalt" href="/">Enter bank ${arrow}</a><a class="text-action" href="#how-it-works">See how it works ${down}</a></div></div><div class="hero-art" aria-hidden="true"><div class="glass-shadow"></div><img class="proof-glass" src="/learn/proof-glass.webp" width="1000" height="1000" alt="" decoding="async" fetchpriority="high"></div><div class="hero-footnote"><span>Your value should carry its proof.</span><span>Hold it. Move it. Put it to work.</span></div></section>
  <section id="how-it-works" class="learn-shell possibilities motion-region"><div class="possibility-copy reveal"><h2>Same familiar actions.<br><span>Entirely new possibilities.</span></h2><p>A proof object keeps the asset, its ownership, and its history connected.</p></div><div class="reveal flow-wrap">${flow}</div></section>
  <section class="rail-section motion-region"><div class="learn-shell rail-inner"><h2 class="reveal">One balance.<br>Two connected rails.</h2><div class="rail-list reveal"><a href="/learn/reserve-and-settlement/#settlement-and-destination-continuity" class="rail-row"><span class="rail-icon">${layers}</span><div><h3>Settlement</h3><p>Proof-native value.</p></div>${arrow}</a><a href="/learn/reserve-and-settlement/#reserve" class="rail-row"><span class="rail-icon">${reserve}</span><div><h3>Reserve</h3><p>Proof-backed funds.</p></div>${arrow}</a></div><svg class="rail-stream" viewBox="0 0 1280 340" preserveAspectRatio="none" aria-hidden="true"><path d="M0 292H400C530 292 500 140 650 140H950C1050 140 1060 220 1180 220H1280"/><path d="M0 312H420C550 312 530 240 680 240H930C1050 240 1060 160 1180 160H1280"/><circle r="3.5" style="offset-path:path('M0 292H400C530 292 500 140 650 140H950C1050 140 1060 220 1180 220H1280')"/><circle r="3" style="offset-path:path('M0 312H420C550 312 530 240 680 240H930C1050 240 1060 160 1180 160H1280');animation-delay:-7s"/></svg></div></section>
  <div class="learn-shell value-note reveal">Value sets the standard. Receiving institutions must demonstrate proof-continuity conformance.</div>
  <div class="learn-shell value-note reveal">A valuation shows value. A completed transaction moves ownership.</div>
  <section id="your-identity" class="learn-shell identity-section motion-region"><div class="identity-copy reveal"><h2>Your identity.<br>In your hands.</h2><p>Your identity opens your account.<br>Your signing key stays on your device.</p><a class="underlined-action" href="/learn/receiz-id/">Understand your Identity Record ${arrow}</a></div><div class="identity-diagram reveal"><div class="identity-mark" aria-hidden="true">${fingerprint}</div><div class="identity-points"><div><h3>Device-held signing</h3><p>Your signing key stays on your device.</p></div><div><h3>Exact sealed sources</h3><p>Linked to verifiable originals.</p></div><div><h3>Inspectable continuity</h3><p>A clear, traceable history you can review.</p></div></div><svg viewBox="0 0 560 340" aria-hidden="true"><path d="M192 88 254 18h45M206 170l48-30h45M204 248l50 40h45"/><circle cx="192" cy="88" r="4"/><circle cx="206" cy="170" r="4"/><circle cx="204" cy="248" r="4"/></svg></div></section>
  <section id="guides" class="learn-shell guide-section"><div class="reveal"><p class="section-intro">Go a little deeper.</p><h2>The foundations.</h2></div><div class="guide-list">${[
    ['01','Your identity','Open your account and keep your value and history connected. Your signing key stays with you.','receiz-id'],
    ['02','Proof objects & ownership','Understand the original source, ownership, and the possibilities of physical custody.','proof-objects'],
    ['03','Settlement & Reserve','Native value, connected payment rails, and the standard for receiving institutions.','reserve-and-settlement'],
    ['04','How value is calculated','Inspect the deterministic valuation rules, the Kai pulse and the exact Phi-to-dollar calculation.','how-value-works'],
    ['05','Your Vaults','Hold your money and originals separately. Share the proof without sharing access.','/vaults/'],
    ['06','Protect your value','See the protection behind separate Vault authority and optional passkey encryption.','/protect/'],
    ['07','The cooperative economy','Put what your members already produce to work through defined rights and connected proof.','/coops/']
  ].map(([number,title,copy,slug])=>`<a class="guide-row reveal" href="${slug.startsWith('/')?slug:'/learn/'+slug+'/'}"><span class="guide-number">${number}</span><div><h3>${title}</h3><p>${copy}</p></div>${arrow}</a>`).join('')}</div></section>
  <section class="learn-shell learn-business-offer"><div><h2>Get the work out the door.<br>Keep your day moving.</h2><p>The proposal you need to finish. The client reply waiting on you. The campaign that needs its next version. Bring the brief and decisions you choose, then work toward something ready to review and use.</p></div><div><strong>Less re-explaining. Fewer loose ends.</strong><p>Keep useful context for the next conversation. Create the documents and creative around the same work. Give client enquiries answers and a clear path to the next booking, payment or person.</p><small>Your account, originals and supported value stay available without Business. The optional upgrade adds tools for the work around your business.</small><a class="learn-button button-cobalt" href="/business/">See it in your work ${arrow}</a></div></section>
  <section class="learn-finale motion-region"><div class="learn-shell"><div class="reveal"><h2>A familiar place.<br>A new kind of possibility.</h2><a class="learn-button button-paper" href="/">Enter bank ${arrow}</a></div></div></section></main>${siteFooterHtml('/learn/')}`;
}

export const sectionId = heading => heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function learnArticle(page, pages, escape) {
  const notice = page.kind === 'account-notice';
  const contents = `<nav aria-label="On this page"><span>On this page</span>${page.sections.map(([heading])=>`<a href="#${sectionId(heading)}">${escape(heading)}</a>`).join('')}</nav>`;
  const related = page.related?.map(path=>({path,title:pages.find(item=>learningPath(item)===path)?.title??({'/explore/':'Explore assets','/conformance/#note-continuity':'The Note continuity standard','/conformance/':'Conformance','/schemas/':'Schemas and reference','/verify/':'Verify a proof','/ledger/':'Public Ledger'}[path]??path)}))??pages.filter(item => item.slug && item.slug !== page.slug && (!notice || item.kind === 'account-notice')).slice(0,3);
  for(const path of relatedSolutions[page.slug]??[]){
    if(related.some(item=>(item.path??learningPath(item))===path))continue;
    const solution=solutionGuides.find(item=>item.path===path);
    if(!solution)throw Error('PUBLIC_RELATED_SOLUTION_MISSING:'+path);
    related.push(solution);
  }
  return `${learnHeader()}<main id="main" class="learn-shell article-main">
    <a class="article-back text-action" href="${notice ? '/' : '/learn/guides/'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6"/></svg>${notice ? 'Back to bank' : 'All guides'}</a>
    <div class="article-heading">${notice ? `<div class="article-notice-meta">Account information · Updated ${escape(page.updated)}</div>` : `<div class="learning-eyebrow">${escape(page.group??'Learn')} · The complete picture</div>`}<h1>${escape(page.title)}</h1><p>${escape(page.intro)}</p></div>
    ${page.visual?learningVisual(page,escape):''}
    <div class="article-layout"><aside class="article-toc">${notice ? `<details class="notice-contents"><summary>In this notice</summary>${contents}</details>` : contents}</aside>
      <article class="article-content">${page.sections.map(([heading,copy])=>`<section id="${sectionId(heading)}"><h2>${escape(heading)}</h2>${heading === 'How notes work' ? '<span id="value-you-can-carry" aria-hidden="true"></span>' : ''}<p>${escape(copy)}</p>${page.slug === 'reserve-and-settlement' && heading === 'How notes work' ? noteShowcase : ''}${page.slug === 'reserve-and-settlement' && heading === 'Using Notes offline' ? `<a class="underlined-action" href="/conformance/#note-continuity">Inspect the Note continuity standard ${arrow}</a>` : ''}${page.slug === 'reserve-and-settlement' && heading === 'Device integration and availability' ? `<a class="underlined-action" href="/conformance/#device-evidence">Check this device’s evidence ${arrow}</a>` : ''}${page.slug === 'reserve-and-settlement' && heading === 'Settlement and destination continuity' ? `<a class="underlined-action" href="/learn/how-value-works/">See how value is calculated ${arrow}</a>` : ''}${heading === 'History is carried evidence' || heading === 'The receiving standard' ? `<a class="underlined-action" href="/ledger/">Explore the public ledger ${arrow}</a>` : ''}</section>`).join('')}
        ${page.slug==='notes'?noteShowcase:''}
        ${page.resources?.length?`<nav class="article-next" aria-label="Implementation resources">${page.resources.map(([title,url])=>`<a class="related-guide" href="${escape(url)}">${escape(title)} ${arrow}</a>`).join('')}</nav>`:''}
        ${!notice?`<details class="learning-depth"><summary>Method, sources and assessment</summary><p>This explanation describes the supported implementation. Exact protocol requirements come from the pinned Receiz contracts and original sources. A reference result does not qualify a production deployment or a physical device.</p><nav aria-label="Technical reference"><a href="/schemas/">Original schemas and contracts</a><a href="/conformance/">Checks and assessment scope</a><a href="/releases/">Release and qualification status</a></nav></details>`:''}
        <div class="article-next"><h2>${notice ? 'Related information.' : 'Keep exploring.'}</h2><nav aria-label="Related guides">${related.map(item=>`<a class="related-guide" href="${escape(item.path??learningPath(item))}">${escape(item.title)} ${arrow}</a>`).join('')}</nav></div>
      </article>
    </div>
  </main>
  ${notice ? '' : `<section class="article-cta"><div class="learn-shell"><h2>Your value.<br>More possibilities.</h2><a class="learn-button button-cobalt" href="/">Enter bank ${arrow}</a></div></section>`}
  ${siteFooterHtml(learningPath(page))}`;
}

export function learningDirectoryPage(){
 const guides=[...learningPages,...solutionGuides];
 const groups=[...learningGroups.slice(0,2),'Business by your work','Cooperatives','Together',...learningGroups.slice(2)];
 return `${learnHeader()}<main id="main"><section class="learn-shell learning-directory"><p class="section-intro">The complete picture.</p><h1>All guides.</h1><p class="directory-intro">Start with what you want to do. Follow the evidence as far as you need.</p><nav class="learning-group-links" aria-label="Guide subjects">${groups.map(group=>`<a href="#guides-${sectionId(group)}">${group}</a>`).join('')}</nav>${groups.map(group=>`<section id="guides-${sectionId(group)}" class="learning-group"><h2>${group}</h2><div>${guides.filter(page=>page.group===group).map(page=>`<a href="${learningPath(page)}"><h3>${brandText(page.title)}</h3><p>${brandText(page.description)}</p>${arrow}</a>`).join('')}</div></section>`).join('')}<div class="learning-category-links"><h2>Explore by content</h2><nav aria-label="Public asset categories">${assetCategories.map(category=>`<a href="${category.path}">${category.label} ${arrow}</a>`).join('')}</nav></div></section></main>${siteFooterHtml('/learn/guides/')}`;}
