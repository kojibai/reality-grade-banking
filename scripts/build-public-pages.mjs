import {build as buildReceivingRuntime} from 'esbuild';
import {receivingContent,invitationContent} from './receiving-page.mjs';
import {receivingInvitationPage} from '../src/content/receiving-invitation-page.mjs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {merchantPage,merchantContent} from './merchant-page.mjs';
import {matterPage,matterContent} from './matter-page.mjs';
import {bookingGuidePage,bookingGuideContent,renderBookingExamples} from './booking-guide.mjs';
import {paymentGuidePage,paymentGuideContent,renderPaymentExamples} from './payment-guide.mjs';
import {renderDiscoveryState,applyDiscoveryState} from './discover-page.mjs';
import {renderFeedState,applyFeedState} from './feed-page.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {earlyPublicRuntimeDocument} from './public-runtime-document.mjs';
import {momentsPage,momentsContent} from './moments-page.mjs';
import {originalsQualificationContent} from './originals-qualification-template.mjs';
import {writeOriginalsQualificationAssets} from './originals-qualification-assets.mjs';
import {packExampleBanks} from './product-preview-bank.mjs';
import {withPublicIllustration} from './public-imagery.mjs';
import {meetingPage,meetingContent,meetingPreviewCss} from './meeting-page.mjs';
import {bankingPage,bankingContent} from './banking-page.mjs';
import {guidePage,guideContent,guideStyles} from './user-guide-page.mjs';
import {productPreviewCss} from './product-walkthrough.mjs';
import {portabilityPages,portabilityContent} from './portability-page.mjs';
import {economyPages,economyContent} from './economy-page.mjs';
import {standardPages,standardContent} from './standard-page.mjs';
import {institutionScorecardPage,institutionScorecardContent} from './institution-scorecard-page.mjs';
import {outcomePages,outcomeContent} from './outcome-page.mjs';
import {identityContinuityPage,identityContinuityContent} from './identity-continuity-page.mjs';
import {twinSalesPages,twinPageContent} from './twin-page.mjs';
import {togetherPages,togetherContent} from './together-page.mjs';
import {publicRouteAliases} from '../src/content/public-routes.mjs';
import {compactNavigation} from './compact-navigation.mjs';
import {bankOwnedStyles} from './public-bank-styles.mjs';
import {withPageFooter,siteFooterHtml} from './site-footer.mjs';
import {cooperativePages,cooperativeContent} from './cooperative-page.mjs';
import {vaultPage,vaultContent,vaultStyles} from './vault-page.mjs';
import {protectionPage,protectionContent} from './vault-protection-page.mjs';
import {businessPage,businessContent} from './business-page.mjs';
import {businessFitPages,directoryPage} from '../src/content/business-fits.mjs';
import {directoryContent,fitContent} from './business-fit-pages.mjs';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { createServer } from 'vite';
import { openingShellHtml } from './opening-shell.mjs';
import { buildLaunchImages } from './build-launch-images.mjs';
import { learnAssets } from './learn-assets.mjs';
import { learnHome, learnArticle,learnHeader,learningDirectoryPage } from './learn-template.mjs';
import {realityGradeStandardContent} from './reality-grade-standard.mjs';
import { accountNoticePages } from './account-notice-pages.mjs';
import { realityGradePage, realityGradeContent } from './reality-grade-page.mjs';
import {acceptMoneyPage,acceptMoneyContent,acceptMoneyStyles} from './accept-money-page.mjs';
import {independentBankPage,independentBankContent,independentBankStyles} from './independent-bank-page.mjs';
import { valueExplainerPage, valueExplainerContent } from './value-explainer-template.mjs';
import { writePublicSdkSchemas } from './build-public-schemas.mjs';
import { writeValueExplainerAssets } from './value-explainer-assets.mjs';
import {publicPages as metadataPages,publicPage,applyPublicMetadata,publicEntryFallback} from './public-page-metadata.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};
import {noteContinuityGuideSections} from '../src/content/note-continuity.mjs';
import {learningPages,learningPath,assetCategories} from '../src/content/learning-pages.mjs';
const origin = 'https://bankeiz.com';
const pages=[{slug:'',title:'Reality-grade banking',description:'Money, assets, markets and proof continuity explained.',intro:'Your value. More possibilities.',sections:[]},{slug:'guides',title:'All guides',description:'The complete guide to your account, assets, markets, history and standards.',sections:[]},...learningPages];
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
await buildReceivingRuntime({entryPoints:['src/adoption/receiving-public.ts'],bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,outfile:'dist/learn/receiving.js'});
const receivingCss=await readFile('public/learn/receiving.css','utf8');
const { css: publicCss, js:publicJs, cssUrl, jsUrl } = await learnAssets();
await writePublicSdkSchemas('dist');
const originalsAssets=await writeOriginalsQualificationAssets('dist');
const valueAssets = await writeValueExplainerAssets('dist');
const sceneCss=await readFile('public/learn/scenes.css','utf8');
const momentsCss=await readFile('public/learn/moments.css','utf8');
const meetingCss=meetingPreviewCss+await readFile('public/learn/meet.css','utf8');
const businessCss=await readFile('public/learn/business.css','utf8');
const togetherCss=await readFile('public/learn/together.css','utf8');
const imageryCss=await readFile('public/learn/public-imagery.css','utf8');
const productCss=productPreviewCss+await readFile('public/learn/product-walkthrough.css','utf8');
const twinCss=await readFile('public/learn/twin-pages.css','utf8');
const identityCss=await readFile('public/learn/identity-continuity.css','utf8');
const standardCss=await readFile('public/learn/standard-pages.css','utf8');
const institutionScorecardCss=await readFile('public/learn/institution-scorecard.css','utf8');
const portabilityCss=await readFile('public/learn/portability.css','utf8');
const outcomeCss=await readFile('public/learn/outcome-pages.css','utf8');
const economyCss=await readFile('public/learn/economy.css','utf8');
const cooperativeCss=await readFile('public/learn/cooperatives.css','utf8');
const protectionCss=await readFile('public/learn/vault-protection.css','utf8');
const valueHead = originalsAssets.head + `<link rel="stylesheet" href="${valueAssets.cssUrl}"><script src="${valueAssets.jsUrl}" defer></script>`;
let bankHtml,verificationFrame,bookingFrame,certificateShell,feedState,discoveryState,bookingExamples,paymentExamples,readingWriter,readingCatalog,readingLedger,readingLinks;
let assetPaths=[];
const explorerStates=new Map(),ledgerStates=new Map();
const publicPages = {};
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { AccountOpening } = await server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
  const { PublicCertificatePage } = await server.ssrLoadModule('/src/features/certificates/PublicCertificatePage.tsx');
  certificateShell=renderToStaticMarkup(createElement(PublicCertificatePage,{token:'',active:false}));
  feedState=await renderFeedState(server);
  discoveryState=await renderDiscoveryState(server);
  bookingExamples=await renderBookingExamples(server);
  paymentExamples=await renderPaymentExamples();
  const { BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_MESSAGING_CONSENT, BANK_MESSAGING_SCOPES } = await server.ssrLoadModule('/src/receiz/config.ts');
  const {parsePublicMarket}=await server.ssrLoadModule('/src/receiz/public-market.ts'),{mergePublicSports}=await server.ssrLoadModule('/src/receiz/public-sports.ts');
  const operandBytes=await Promise.all(['market','sports','capitalization','share-chart-history'].map(name=>readFile(`public/receiz-public-${name}.json`,'utf8')));
  const [market,sports,capitalizationInput,historyInput]=operandBytes.map(JSON.parse);
  readingCatalog=mergePublicSports(parsePublicMarket(market,market.snapshot),sports);
  const [{renderSelectedPublicMarketState,renderSelectedPublicMarketContent,publicMarketPreparedPaths},{parseMarketHistory},{parseMarketCapSource}]=await Promise.all([server.ssrLoadModule('/server/public-market-document.tsx'),server.ssrLoadModule('/src/receiz/market-projection/history.ts'),server.ssrLoadModule('/src/receiz/market-projection/source.ts')]);
  const history=parseMarketHistory(historyInput),capitalization=parseMarketCapSource(capitalizationInput),asOfPulse=Math.max(history.summary.serverPulse,capitalization.serverPulse),hash=createHash('sha256').update('bank.public-market.static.v1');
  for(const bytes of operandBytes)hash.update('\0').update(bytes);
  const generation=hash.digest('hex');
  for(const path of publicMarketPreparedPaths)explorerStates.set('/'+path+'/',renderSelectedPublicMarketState({catalog:readingCatalog,history,capitalization,asOfPulse,generation,path,compressCatalog:true}));
  // First paint is the real existing profile, prepared from this same catalog.
  // Keep the complete catalog in its one shared carrier, never one copy per
  // owner. A visit reads only its HTML fragment beside the existing template.
  const profileDirectory='server/profile-runtime/profile-pages';await mkdir(profileDirectory,{recursive:true});
  for(const file of await readdir(profileDirectory))if(file.endsWith('.html'))await unlink(profileDirectory+'/'+file);
  const {profilePagePath,profilePageUsername,selectHeldPublicProfile}=await server.ssrLoadModule('/src/receiz/public-profile.ts');
  let profileCount=0,profileBytes=0;
  for(const username of new Set(readingCatalog.items.filter(item=>item.category==='proof'&&item.ownerUsername).map(item=>item.ownerUsername))){
    if(profilePageUsername(profilePagePath(username))!==username||!selectHeldPublicProfile(username,readingCatalog))continue;
    const content=renderSelectedPublicMarketContent({catalog:readingCatalog,history,capitalization,asOfPulse,generation,profileUsername:username});
    const html='<!-- bank.profile.document.v1 '+generation+' '+username+' -->'+content;
    await writeFile(profileDirectory+'/'+username+'.html',html);profileCount++;profileBytes+=Buffer.byteLength(html);
  }
  console.log('Prerendered '+profileCount+' actual public profiles from the held catalog ('+(profileBytes/1048576).toFixed(1)+' MiB); no Source reads or duplicate catalog carriers.');
  const frames=await server.ssrLoadModule('/server/public-first-frames.tsx'),format=new Intl.DateTimeFormat().resolvedOptions(),frame={locale:format.locale,timeZone:format.timeZone,pulse:asOfPulse};
  verificationFrame=frames.renderVerificationFirstFrame();
  bookingFrame=frames.renderBookingFirstFrame(readingCatalog.items.find(item=>item.category==='proof'&&profilePageUsername(profilePagePath(item.ownerUsername??'')))?.ownerUsername??'bankeiz');
  const assetDirectory='server/asset-runtime/pages';await mkdir(assetDirectory,{recursive:true});
  for(const file of await readdir(assetDirectory))if(/\.json(?:\.gz)?$/.test(file))await unlink(assetDirectory+'/'+file);
  for(const item of [null,...readingCatalog.items]){
    const key=item?createHash('sha256').update(item.id).digest('hex'):'empty';
    await writeFile(assetDirectory+'/'+key+'.json.gz',gzipSync(JSON.stringify({schema:'bank.public-asset.first-frame.v1',item,frame,content:frames.renderAssetFirstFrame(item,frame)}),{level:6}));
  }
  console.log('Prepared actual asset, verification and booking first frames from the existing held inputs.');
  assetPaths=readingCatalog.items.map(item=>`/asset/${encodeURIComponent(item.id)}/`);
  const [reading,ledger,readingMetadata,ledgerBytes]=await Promise.all([server.ssrLoadModule('/scripts/public-reading-pages.mjs'),server.ssrLoadModule('/server/prepared-dependent-documents.tsx'),server.ssrLoadModule('/server/public-reading-links.ts'),readFile('public/receiz-public-ledger.json.gz.bin')]);
  readingWriter=reading.writePublicReadingPages;readingLinks=readingMetadata.publicReadingLinks;
  // Reuse the current accepted membership and the held financial prefix. The
  // same existing preparer owns SSR, the compressed document seed and /read.
  // No Source read, new cache or historical reverification belongs in a build.
  const {snapshot:ledgerQuotes,...ledgerMembership}=market,material=JSON.stringify({membership:ledgerMembership,snapshot:ledgerQuotes,ledgerCacheGzipB64u:ledgerBytes.toString('base64url')}),ledgerGeneration=createHash('sha256').update(material).digest('hex');
  readingLedger=(await ledger.preparePublicLedgerDocumentState(material,ledgerGeneration)).snapshot;
  for(const path of ['ledger','ledger/proofs']){
   const template='<html><head></head><body><div id="public-ledger-root"></div><script id="receiz-navigation" type="application/json">'+JSON.stringify({pages:{['/'+path+'/']:{}},bank:{}})+'</script></body></html>';
   const rendered=await ledger.renderPreparedDependentDocument({material,generation:ledgerGeneration,path,template}),content=rendered.match(/<div id="public-ledger-root">([\s\S]*?)<\/div>\s*<script id="public-ledger-document-seed"/),seed=rendered.match(/<script id="public-ledger-document-seed" type="application\/json">[\s\S]*?<\/script>/);
   if(!content||!seed)throw Error('PUBLIC_LEDGER_STATIC_STATE_REQUIRED');
   ledgerStates.set('/'+path+'/',{content:content[1],seedScript:seed[0]});
  }
  pages.push(receivingInvitationPage,institutionScorecardPage,merchantPage,momentsPage,bankingPage,guidePage,meetingPage,bookingGuidePage,paymentGuidePage,matterPage,...accountNoticePages(BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_MESSAGING_CONSENT, BANK_MESSAGING_SCOPES), realityGradePage, acceptMoneyPage, independentBankPage, valueExplainerPage, businessPage,vaultPage,protectionPage,directoryPage,...businessFitPages,...portabilityPages,...economyPages,...cooperativePages,...togetherPages,...twinSalesPages,identityContinuityPage,...outcomePages,...standardPages);
  const html = await readFile('dist/index.html', 'utf8');
  const launchImages = await buildLaunchImages('dist', AccountOpening);
  bankHtml = openingShellHtml(html, AccountOpening).replace('</head>', launchImages + '</head>');
} finally { await server.close(); }
for (const page of pages) {
  const path = page.slug ? learningPath(page) : '/learn/', url = origin + path;
  const structured = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': url, url, name: page.title + ' | Bankeiz', description: page.description, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en', dateModified: '2026-10-15' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Bankeiz', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] }] };
  const pageContent = page.invitation ? invitationContent() : page.receiving ? receivingContent() : page.slug==='standards' ? realityGradeStandardContent(page,learnHeader(),siteFooterHtml('/standards/')) : page.institutionScorecard ? institutionScorecardContent() : page.merchant ? merchantContent() : page.digitalMatter ? matterContent() : page.paymentGuide ? paymentGuideContent(paymentExamples) : page.bookingGuide ? bookingGuideContent(bookingExamples) : page.guide ? guideContent() : page.moments ? momentsContent() : page.meetingWalkthrough ? meetingContent() : page.originalsQualification ? originalsQualificationContent() : page.bankingWalkthrough ? bankingContent() : page.portability ? portabilityContent(page) : page.economy ? economyContent(page) : page.standard ? standardContent(page) : page.outcome ? outcomeContent(page) : page.identityContinuity ? identityContinuityContent() : page.twinSales ? twinPageContent(page) : page.together ? togetherContent(page) : page === protectionPage ? protectionContent() : page.cooperativeKind ? cooperativeContent(page) : page === vaultPage ? vaultContent() : page.fit ? fitContent(page.fit) : page === directoryPage ? directoryContent() : page === businessPage ? businessContent() : page === acceptMoneyPage ? acceptMoneyContent() : page === independentBankPage ? independentBankContent() : page === realityGradePage ? realityGradeContent() : page === valueExplainerPage ? valueExplainerContent() : page.slug==='guides'?learningDirectoryPage():page.slug ? learnArticle(page, pages, escape) : learnHome();
  const content=withPageFooter(withPublicIllustration(pageContent,page),path);
  const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcfe"><title>${escape(page.title)} | Bankeiz</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/icon.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:url" content="${url}"><meta property="og:title" content="${escape(page.title)} | Bankeiz"><meta property="og:description" content="${escape(page.description)}"><meta property="og:image" content="${origin}${socialImages.images[path].url}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="Bankeiz. Your value. More possibilities."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)} | Bankeiz"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${origin}${socialImages.images[path].url}"><meta name="twitter:image:alt" content="Bankeiz — Reality-grade banking. Your value. More possibilities."><link rel="stylesheet" href="${cssUrl}">${valueHead}${page === acceptMoneyPage ? `<style data-public-page-style="accept-money">${acceptMoneyStyles}</style>` : ''}${page === independentBankPage ? `<style data-public-page-style="independent-bank">${independentBankStyles}</style>` : ''}${page.slug==='standards'?`<style data-public-page-style="reality-grade-standard">${await readFile('public/learn/reality-grade-standard.css','utf8')}</style>`:''}${page.slug==='guides'?`<style data-public-page-style="guide-directory">${await readFile('public/learn/guide-directory.css','utf8')}</style><noscript><style>[data-guide-search]{display:none!important}</style></noscript>`:''}${page.merchant?`<style data-public-page-style="merchant">${await readFile('public/learn/merchant.css','utf8')}</style>`:''}${content.includes('data-public-imagery')?`<style data-public-page-style="source-imagery">${imageryCss}</style>`:''}${page.digitalMatter?`<style data-public-page-style="matter">${await readFile('public/learn/matter.css','utf8')}</style>`:''}${page.paymentGuide?`<style data-public-page-style="pay">${paymentExamples.css}${await readFile('public/learn/pay.css','utf8')}</style>`:''}${page.bookingGuide?`<style data-public-page-style="book">${bookingExamples.css}${await readFile('public/learn/book.css','utf8')}</style>`:''}${page.guide?`<style data-public-page-style="guide">${guideStyles}</style>`:''}${page.moments?`<style data-public-page-style="moments">${momentsCss}</style>`:''}${page.meetingWalkthrough?`<style data-public-page-style="meet">${meetingCss}</style>`:''}${page.bankingWalkthrough?`<style data-public-page-style="banking">${cooperativeCss}</style>`:''}${pageContent.includes('data-product-walkthrough')?`<style data-public-page-style="product-walkthrough">${productCss}</style>`:''}${page.portability ? `<style data-public-page-style="portability">${cooperativeCss}${portabilityCss}</style>` : ''}${page.standard ? `<style data-public-page-style="standard-${page.key}">${standardCss}</style>` : ''}${page.outcome ? `<style data-public-page-style="outcome-${page.key}">${page.key==='agent'?cooperativeCss+businessCss:''}${outcomeCss}</style>` : ''}${page.identityContinuity ? `<style data-public-page-style="identity-continuity">${identityCss}</style>` : ''}${page === protectionPage ? `<style data-public-page-style="vault-protection">${protectionCss}</style>` : ''}${page.twinSales ? `<style data-public-page-style="twin-sales">${cooperativeCss}${businessCss}${twinCss}</style>` : ''}${page.together ? `<style data-public-page-style="together">${cooperativeCss}${togetherCss}</style>` : ''}${page.economy ? `<style data-public-page-style="existing-economy">${cooperativeCss}${economyCss}</style>` : ''}${page.cooperativeKind ? `<style data-public-page-style="cooperatives">${cooperativeCss}${page.cooperativeKind==='main'?economyCss:''}</style>` : ''}${page === vaultPage ? `<style data-public-page-style="vaults">${vaultStyles}</style>` : ''}${page === businessPage || page === directoryPage || page.fit || !page.slug ? `<style data-public-page-style="business">${businessCss}</style>` : ''}${page.visual?`<style data-public-page-style="learning-scenes">${sceneCss}</style>`:''}${page.slug ? '' : '<link rel="preload" href="/learn/proof-glass.webp" as="image" type="image/webp">'}<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script><script src="${jsUrl}" defer></script></head><body>${content}</body></html>`;
  const receivingOutput=page.receiving||page.invitation?output.replace('</head>',`<style data-public-page-style="receiving">${receivingCss}</style></head>`):output;
  const styledOutput=page.institutionScorecard?output.replace('</head>',`<style data-public-page-style="institution-scorecard">${institutionScorecardCss}</style></head>`):receivingOutput;
  const metadata=publicPage(path),document=applyPublicMetadata(styledOutput,metadata,socialImages.images[path]);
  publicPages[path] = { title: metadata.title, content, head: document.match(/<head>([\s\S]+)<\/head>/)[1] };
}
const bankEntry = bankHtml.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
// The reference catalog is public build output too. Carry its exact markup and
// page-only styles with the guides, instead of fetching another document.
const schemasHtml = await readFile('dist/schemas/index.html','utf8');
const schemasCss = await readFile('dist/schemas/schemas.css','utf8');
const schemasHead = schemasHtml.match(/<head>([\s\S]+?)<\/head>/)[1].replace('<link rel="stylesheet" href="/schemas/schemas.css">','');
publicPages['/schemas/'] = {
  title: publicPage('/schemas/').title,
  head: `${schemasHead}<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script>${valueHead}<style data-public-page-style="schemas">${schemasCss}</style>`,
  content: withPageFooter(schemasHtml.match(/<body[^>]*>([\s\S]+?)<\/body>/)[1],'/schemas/'),
};
// Each public workspace keeps its own runtime and React root. Carry its
// existing readable first paint and exact emitted CSS with every public entry;
// route changes need neither a replacement document nor a stylesheet round trip.
const runtimeDocuments = new Map();
for (const runtime of ['ledger','explore','verify','conformance','receipt','feed','discover']) {
  const path = `/${runtime}/`; let html = await readFile(`dist${path}index.html`, 'utf8');
  if(runtime==='verify')html=html.replace(`<div id="root">${publicEntryFallback(path)}</div>`,()=>`<div id="root" data-public-verify-rendered>${verificationFrame}</div>`);
  if(runtime==='feed')html=applyFeedState(html,feedState);
  if(runtime==='discover')html=applyDiscoveryState(html,discoveryState);
  if(runtime==='ledger'){const state=ledgerStates.get(path),fallback=`<div id="root">${publicEntryFallback(path)}</div>`;if(!html.includes(fallback))throw Error('PUBLIC_LEDGER_STATIC_TEMPLATE_INVALID');html=html.replace(fallback,()=>`<div id="root">${state.content}</div>`).replace('</body>',()=>state.seedScript+'</body>');}
  if(runtime==='explore'){const state=explorerStates.get(path),fallback=`<div id="root">${publicEntryFallback(path)}</div>`;if(!html.includes(fallback))throw Error('PUBLIC_MARKET_STATIC_TEMPLATE_INVALID');html=html.replace(fallback,()=>`<div id="root">${state.content}</div>`).replace('</body>',()=>state.seedScript+'</body>');}
  const head = html.match(/<head>([\s\S]+?)<\/head>/)[1];
  const cssLinks = [...head.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
  const css = (await Promise.all(cssLinks.map(async match => {
    if (!/^\/assets\/[\w.-]+\.css$/.test(match[1])) throw Error('PUBLIC_STYLESHEET_INVALID');
    return readFile('dist'+match[1], 'utf8');
  }))).join('\n');
  const pageHead = head.replace(/<link rel="(?:stylesheet|modulepreload)"[^>]*>/g,'').replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g,'') + `<style data-public-page-style="${runtime}">${css}</style>`;
  publicPages[path] = { runtime, title: publicPage(path)?.title??'Transaction receipt · Bankeiz', content: runtime==='verify'?verificationFrame:runtime==='discover'?discoveryState.navigationContent:runtime==='feed'?feedState.navigationContent:publicEntryFallback(path)||'<main><h1>Transaction receipt</h1></main>', head: pageHead, entry: head.match(/<script type="module"[^>]*src="([^"]+)"/)[1] };
  runtimeDocuments.set(path, html.replace(/<head>[\s\S]+?<\/head>/,`<head>${pageHead}${head.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/)[0]}</head>`).replace('<div id="root"',`<div id="public-${runtime}-root" data-public-runtime="${runtime}"`));
}
// The direct Proofs entry uses the same retained Ledger and runtime. Only its
// current category, readable rows and seed path differ; navigation stays exact.
{
 const base=runtimeDocuments.get('/ledger/'),all=ledgerStates.get('/ledger/'),proofs=ledgerStates.get('/ledger/proofs/');
 const html=base.replace(/<head>([\s\S]*?)<\/head>/,(_all,head)=>'<head>'+head.replaceAll('https://bankeiz.com/ledger/','https://bankeiz.com/ledger/proofs/')+'</head>').replace(all.content,()=>proofs.content).replace(all.seedScript,()=>proofs.seedScript);
 runtimeDocuments.set('/ledger/proofs/',html);
}
// A direct certificate paints its own settled header/footer, never the
// unrelated catalog. Keep the same Explorer runtime and Bank purchase host.
{
 const base=publicPages['/explore/'],styles=await readFile('src/features/certificates/certificates.css','utf8');
 const head=base.head.replace(/<title>[\s\S]*?<\/title>/,'<title>Share certificate | Bankeiz</title>')+`<style data-public-page-style="certificate">${styles}</style>`;
 runtimeDocuments.set('/shares/',`<!doctype html><html lang="en"><head>${head}<script type="module" src="${base.entry}"></script></head><body><div id="public-explore-root" data-public-runtime="explore">${certificateShell}</div></body></html>`);
}
// Category and aggregate views retain the very same Explorer root and reader.
// Changing these routes cannot open another feed or another valuation engine.
for(const path of ['/market-cap/',...assetCategories.map(category=>category.path)]){
 const base=publicPages['/explore/'],metadata=publicPage(path);
 const state=explorerStates.get(path),content=publicPages[path]?.content??publicEntryFallback(path);
 const head=applyPublicMetadata(`<head>${base.head}</head>`,metadata,socialImages.images[path]).slice(6,-7);
 publicPages[path]={...base,title:metadata.title,head,content};
 runtimeDocuments.set(path,`<!doctype html><html lang="en"><head>${head}<script type="module" src="${base.entry}"></script></head><body><div id="public-explore-root" data-public-runtime="explore">${state.content}</div>${state.seedScript}</body></html>`);
}
{
 let html=await readFile('dist/booking/index.html','utf8');
 html=html.replace('<div id="root"></div>',()=>`<div id="root" data-public-booking-rendered>${bookingFrame}</div>`);
 for(const match of [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]){if(!/^\/assets\/[\w.-]+\.css$/.test(match[1]))throw Error('BOOKING_STYLESHEET_INVALID');const css=await readFile('dist'+match[1],'utf8');html=html.replace(match[0],()=>`<style data-public-page-style="booking">${css}</style>`);}
 await writeFile('dist/booking/index.html',html);
}
const bankStyles = [...bankHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1]);
const styleManifest = JSON.parse(await readFile('dist/.vite/manifest.json','utf8'));
const privateBankStyles = bankOwnedStyles(bankStyles,styleManifest);
const bankCss = Object.fromEntries(await Promise.all(bankStyles.map(async url => [url,await readFile('dist'+url,'utf8')])));
const bankContent = bankHtml.match(/<div id="root">([\s\S]*?)<\/div><noscript>/)[1];
const bankHead = bankHtml.match(/<head>([\s\S]+)<\/head>/)[1];
const exampleBanks=packExampleBanks(publicPages);Object.assign(publicPages,exampleBanks.pages);
const bundle = `<script id="receiz-navigation" type="application/json">${JSON.stringify(compactNavigation({ reserved:feedState.profileNames, pages: Object.fromEntries(Object.entries(publicPages).map(([path,page])=>[path,path==='/feed/'?{...page,content:''}:page])), aliases:publicRouteAliases, bank: { head: bankHead, entry: bankEntry, styles: privateBankStyles,css:bankCss,content:bankContent } })).replaceAll('<', '\\u003c')}</script>`+exampleBanks.shared;
await writeFile('dist/learn/learn.css', publicCss);
await writeFile('dist/learn/learn.js', publicJs);
let entryHtml = bankHtml.replace('</head>', `<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script>${valueHead}</head>`).replace('</body>', () => `${bundle}</body>`);
// The initial entrance must paint even while a deployment's CSS URLs are slow.
// Embed the exact emitted styles, so the settled account also has its styles
// before React can publish it. Navigation still retains the original CSS URLs.
for (const match of [...entryHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const resource = new URL(match[1], origin);
  if (resource.origin !== origin || !/^\/(?:assets|learn)\/[\w.-]+\.css$/.test(resource.pathname)) throw Error('ENTRY_STYLESHEET_INVALID');
  const css = await readFile('dist' + resource.pathname, 'utf8');
  entryHtml = entryHtml.replace(match[0], `<style data-bank-stylesheet="${escape(match[1])}">${css}</style>`);
}
const withReadingLink=(html,path)=>{const page=publicPage(path);return page&&!page.noindex?html.replace('</head>',()=>readingLinks('page',page.path)+'</head>'):html;};
await writeFile('dist/index.html', withReadingLink(entryHtml,'/'));
const runtimeDocumentHtml=(html,runtime)=>earlyPublicRuntimeDocument(html).replace('<body>',`<body data-bank-surface="${runtime}">`).replace('</head>',`<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script>${valueHead}</head>`).replace('</body>',()=>`${bundle}</body>`);
await writeFile('dist/discover/navigation.json',JSON.stringify(publicPages['/discover/']));
const sharedExampleSha256=createHash('sha256').update(exampleBanks.shared).digest('hex');
const navigationMetadata=Object.fromEntries(Object.entries(publicPages).map(([path,page])=>[path,path==='/discover/'?page:{...page,content:'',...(!page.runtime?{title:undefined}:{}),...(!['explore','ledger','feed','discover'].includes(page.runtime)?{head:''}:{}),...(!page.runtime?{head:'',headSha256:createHash('sha256').update(page.head).digest('hex'),headLength:page.head.length,contentSha256:createHash('sha256').update(page.content).digest('hex'),...(page.content.includes('data-example-views')?{sharedExampleSha256}:{})}:{})}]));
const documents={...publicPages,...Object.fromEntries(Object.entries(publicRouteAliases).map(([alias,path])=>[alias,publicPages[path]]))};
for (const [path, page] of Object.entries(documents)) {
  await mkdir(`dist${path}`, { recursive: true });
  const runtimeHtml = runtimeDocuments.get(path);
  const feedBundle=['feed','discover'].includes(page.runtime)?`<script id="receiz-navigation" type="application/json">${JSON.stringify(compactNavigation({reserved:feedState.profileNames,pages:{...navigationMetadata, '/feed/':{...publicPages['/feed/'],...(page.runtime==='feed'?{content:''}:{})},'/explore/':publicPages['/explore/'],'/discover/':{...publicPages['/discover/'],content:''}},aliases:{'/explorer/':'/explore/'},bank:{head:bankHead,entry:bankEntry,styles:privateBankStyles,css:bankCss,content:bankContent}})).replaceAll('<','\\u003c')}</script>`:null;
  const feedHtml=['feed','discover'].includes(page.runtime)?earlyPublicRuntimeDocument(runtimeHtml).replace('</head>',`<script src="${jsUrl}" defer></script></head>`).replace('</body>',()=>`${feedBundle}</body>`):null;
  await writeFile(`dist${path}index.html`, withReadingLink(feedHtml??(runtimeHtml ? runtimeDocumentHtml(runtimeHtml,page.runtime) : `<!doctype html><html lang="en" class="learn-surface"><head>${page.head}</head><body data-bank-surface="learn"><div id="public-learn-root">${page.content}</div>${bundle}</body></html>`),path));
}
await mkdir('dist/ledger/proofs',{recursive:true});
await writeFile('dist/ledger/proofs/index.html',runtimeDocumentHtml(runtimeDocuments.get('/ledger/proofs/'),'ledger'));
const urls = [...metadataPages.filter(page=>!page.noindex).map(page=>page.path),...assetPaths];
if(urls.length>50000)throw Error('SITEMAP_PARTITION_REQUIRED');
// Omit lastmod rather than claiming that a build or a live pulse rewrote every
// guide. Canonical publication dates can be added when they are source-backed.
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
console.log(`Prerendered the existing entrance and ${pages.length} public guides; generated canonical sitemap.`);

await mkdir('dist/shares',{recursive:true});
await writeFile('dist/shares/index.html',runtimeDocumentHtml(runtimeDocuments.get('/shares/'),'explore'));

// Build-only public reading. Existing app/navigation documents retain their
// exact content and runtime; inert alternate links are the only HTML addition.
const readingPages=Object.fromEntries(metadataPages.filter(page=>!page.noindex).flatMap(page=>{
 const existing=publicPages[page.path]??(page.path==='/'?publicPages['/learn/']:null);
 return existing?[[page.path,{title:page.title,description:page.description,content:existing.content}]]:[];
}));
const readingResult=await readingWriter({outdir:'dist',pages:readingPages,catalog:readingCatalog,ledger:readingLedger});
console.log(`Wrote ${readingResult.pages} static public reading pages from existing sources; ${readingResult.assets} assets and ${readingResult.publicRecords} public records, no additional source requests.`);
