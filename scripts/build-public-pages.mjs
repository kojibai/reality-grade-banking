import {standardPages,standardContent} from './standard-page.mjs';
import {outcomePages,outcomeContent} from './outcome-page.mjs';
import {identityContinuityPage,identityContinuityContent} from './identity-continuity-page.mjs';
import {twinSalesPages,twinPageContent} from './twin-page.mjs';
import {togetherPages,togetherContent} from './together-page.mjs';
import {publicRouteAliases} from '../src/content/public-routes.mjs';
import {compactNavigation} from './compact-navigation.mjs';
import {withPageFooter} from './site-footer.mjs';
import {cooperativePages,cooperativeContent} from './cooperative-page.mjs';
import {vaultPage,vaultContent,vaultStyles} from './vault-page.mjs';
import {protectionPage,protectionContent} from './vault-protection-page.mjs';
import {businessPage,businessContent} from './business-page.mjs';
import {businessFitPages,directoryPage} from '../src/content/business-fits.mjs';
import {directoryContent,fitContent} from './business-fit-pages.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { openingShellHtml } from './opening-shell.mjs';
import { buildLaunchImages } from './build-launch-images.mjs';
import { learnAssets } from './learn-assets.mjs';
import { learnHome, learnArticle,learningDirectoryPage } from './learn-template.mjs';
import { accountNoticePages } from './account-notice-pages.mjs';
import { realityGradePage, realityGradeContent } from './reality-grade-page.mjs';
import { valueExplainerPage, valueExplainerContent } from './value-explainer-template.mjs';
import { writePublicSdkSchemas } from './build-public-schemas.mjs';
import { writeValueExplainerAssets } from './value-explainer-assets.mjs';
import {publicPages as metadataPages,publicPage,applyPublicMetadata,publicEntryFallback} from './public-page-metadata.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};
import {noteContinuityGuideSections} from '../src/content/note-continuity.mjs';
import {learningPages,learningPath,assetCategories} from '../src/content/learning-pages.mjs';
const origin = 'https://bankeiz.com';
const pages=[{slug:'',title:'Proof-native banking',description:'Money, assets, markets and proof continuity explained.',intro:'Your value. More possibilities.',sections:[]},{slug:'guides',title:'All guides',description:'The complete guide to your account, assets, markets, history and standards.',sections:[]},...learningPages];
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const { css: publicCss, js:publicJs, cssUrl, jsUrl } = await learnAssets();
await writePublicSdkSchemas('dist');
const valueAssets = await writeValueExplainerAssets('dist');
const sceneCss=await readFile('public/learn/scenes.css','utf8');
const businessCss=await readFile('public/learn/business.css','utf8');
const togetherCss=await readFile('public/learn/together.css','utf8');
const twinCss=await readFile('public/learn/twin-pages.css','utf8');
const identityCss=await readFile('public/learn/identity-continuity.css','utf8');
const standardCss=await readFile('public/learn/standard-pages.css','utf8');
const outcomeCss=await readFile('public/learn/outcome-pages.css','utf8');
const cooperativeCss=await readFile('public/learn/cooperatives.css','utf8');
const protectionCss=await readFile('public/learn/vault-protection.css','utf8');
const valueHead = `<link rel="stylesheet" href="${valueAssets.cssUrl}"><script src="${valueAssets.jsUrl}" defer></script>`;
let bankHtml;
let assetPaths=[];
const publicPages = {};
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { AccountOpening } = await server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
  const { BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_MESSAGING_CONSENT, BANK_MESSAGING_SCOPES } = await server.ssrLoadModule('/src/receiz/config.ts');
  const {parsePublicMarket}=await server.ssrLoadModule('/src/receiz/public-market.ts'),{mergePublicSports}=await server.ssrLoadModule('/src/receiz/public-sports.ts');
  const [market,sports]=await Promise.all(['market','sports'].map(name=>readFile(`public/receiz-public-${name}.json`,'utf8').then(JSON.parse)));
  assetPaths=mergePublicSports(parsePublicMarket(market,market.snapshot),sports).items.map(item=>`/asset/${encodeURIComponent(item.id)}/`);
  pages.push(...accountNoticePages(BANK_READ_CONSENT, BANK_READ_SCOPES, BANK_MESSAGING_CONSENT, BANK_MESSAGING_SCOPES), realityGradePage, valueExplainerPage, businessPage,vaultPage,protectionPage,directoryPage,...businessFitPages,...cooperativePages,...togetherPages,...twinSalesPages,identityContinuityPage,...outcomePages,...standardPages);
  const html = await readFile('dist/index.html', 'utf8');
  const launchImages = await buildLaunchImages('dist', AccountOpening);
  bankHtml = openingShellHtml(html, AccountOpening).replace('</head>', launchImages + '</head>');
} finally { await server.close(); }
for (const page of pages) {
  const path = page.slug ? learningPath(page) : '/learn/', url = origin + path;
  const structured = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': url, url, name: page.title + ' | Bankeiz', description: page.description, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en', dateModified: '2026-10-15' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Bankeiz', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] }] };
  const pageContent = page.standard ? standardContent(page) : page.outcome ? outcomeContent(page) : page.identityContinuity ? identityContinuityContent() : page.twinSales ? twinPageContent(page) : page.together ? togetherContent(page) : page === protectionPage ? protectionContent() : page.cooperativeKind ? cooperativeContent(page) : page === vaultPage ? vaultContent() : page.fit ? fitContent(page.fit) : page === directoryPage ? directoryContent() : page === businessPage ? businessContent() : page === realityGradePage ? realityGradeContent() : page === valueExplainerPage ? valueExplainerContent() : page.slug==='guides'?learningDirectoryPage():page.slug ? learnArticle(page, pages, escape) : learnHome();
  const content=withPageFooter(pageContent,path);
  const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcfe"><title>${escape(page.title)} | Bankeiz</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/icon.svg"><link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:url" content="${url}"><meta property="og:title" content="${escape(page.title)} | Bankeiz"><meta property="og:description" content="${escape(page.description)}"><meta property="og:image" content="${origin}${socialImages.images[path].url}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="Bankeiz. Your value. More possibilities."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)} | Bankeiz"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${origin}${socialImages.images[path].url}"><meta name="twitter:image:alt" content="Bankeiz — Proof-native banking. Your value. More possibilities."><link rel="stylesheet" href="${cssUrl}">${valueHead}${page.standard ? `<style data-public-page-style="standard-${page.key}">${standardCss}</style>` : ''}${page.outcome ? `<style data-public-page-style="outcome-${page.key}">${page.key==='agent'?cooperativeCss+businessCss:''}${outcomeCss}</style>` : ''}${page.identityContinuity ? `<style data-public-page-style="identity-continuity">${identityCss}</style>` : ''}${page === protectionPage ? `<style data-public-page-style="vault-protection">${protectionCss}</style>` : ''}${page.twinSales ? `<style data-public-page-style="twin-sales">${cooperativeCss}${businessCss}${twinCss}</style>` : ''}${page.together ? `<style data-public-page-style="together">${cooperativeCss}${togetherCss}</style>` : ''}${page.cooperativeKind ? `<style data-public-page-style="cooperatives">${cooperativeCss}</style>` : ''}${page === vaultPage ? `<style data-public-page-style="vaults">${vaultStyles}</style>` : ''}${page === businessPage || page === directoryPage || page.fit || !page.slug ? `<style data-public-page-style="business">${businessCss}</style>` : ''}${page.visual?`<style data-public-page-style="learning-scenes">${sceneCss}</style>`:''}${page.slug ? '' : '<link rel="preload" href="/learn/proof-glass.webp" as="image" type="image/webp">'}<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script><script src="${jsUrl}" defer></script></head><body>${content}</body></html>`;
  const metadata=publicPage(path),document=applyPublicMetadata(output,metadata,socialImages.images[path]);
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
for (const runtime of ['ledger','explore','verify','conformance','receipt']) {
  const path = `/${runtime}/`, html = await readFile(`dist${path}index.html`, 'utf8');
  const head = html.match(/<head>([\s\S]+?)<\/head>/)[1];
  const cssLinks = [...head.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
  const css = (await Promise.all(cssLinks.map(async match => {
    if (!/^\/assets\/[\w.-]+\.css$/.test(match[1])) throw Error('PUBLIC_STYLESHEET_INVALID');
    return readFile('dist'+match[1], 'utf8');
  }))).join('\n');
  const pageHead = head.replace(/<link rel="(?:stylesheet|modulepreload)"[^>]*>/g,'').replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g,'') + `<style data-public-page-style="${runtime}">${css}</style>`;
  publicPages[path] = { runtime, title: publicPage(path)?.title??'Transaction receipt · Bankeiz', content: publicEntryFallback(path)||'<main><h1>Transaction receipt</h1></main>', head: pageHead, entry: head.match(/<script type="module"[^>]*src="([^"]+)"/)[1] };
  runtimeDocuments.set(path, html.replace(/<head>[\s\S]+?<\/head>/,`<head>${pageHead}${head.match(/<script type="module"[^>]*>[\s\S]*?<\/script>/)[0]}</head>`).replace('<div id="root">',`<div id="public-${runtime}-root" data-public-runtime="${runtime}">`));
}
// Category and aggregate views retain the very same Explorer root and reader.
// Changing these routes cannot open another feed or another valuation engine.
for(const path of ['/market-cap/',...assetCategories.map(category=>category.path)]){
 const base=publicPages['/explore/'],metadata=publicPage(path);
 const content=publicPages[path]?.content??publicEntryFallback(path);
 const head=applyPublicMetadata(`<head>${base.head}</head>`,metadata,socialImages.images[path]).slice(6,-7);
 publicPages[path]={...base,title:metadata.title,head,content};
 runtimeDocuments.set(path,`<!doctype html><html lang="en"><head>${head}<script type="module" src="${base.entry}"></script></head><body><div id="public-explore-root" data-public-runtime="explore">${content}</div></body></html>`);
}
const bankStyles = [...bankHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1]);
const bankCss = Object.fromEntries(await Promise.all(bankStyles.map(async url => [url,await readFile('dist'+url,'utf8')])));
const bankContent = bankHtml.match(/<div id="root">([\s\S]*?)<\/div><noscript>/)[1];
const bankHead = bankHtml.match(/<head>([\s\S]+)<\/head>/)[1];
const bundle = `<script id="receiz-navigation" type="application/json">${JSON.stringify(compactNavigation({ pages: publicPages, aliases:publicRouteAliases, bank: { head: bankHead, entry: bankEntry, styles: bankStyles,css:bankCss,content:bankContent } })).replaceAll('<', '\\u003c')}</script>`;
await writeFile('dist/learn/learn.css', publicCss);
await writeFile('dist/learn/learn.js', publicJs);
let entryHtml = bankHtml.replace('</head>', `<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script>${valueHead}</head>`).replace('</body>', `${bundle}</body>`);
// The initial entrance must paint even while a deployment's CSS URLs are slow.
// Embed the exact emitted styles, so the settled account also has its styles
// before React can publish it. Navigation still retains the original CSS URLs.
for (const match of [...entryHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)]) {
  const resource = new URL(match[1], origin);
  if (resource.origin !== origin || !/^\/(?:assets|learn)\/[\w.-]+\.css$/.test(resource.pathname)) throw Error('ENTRY_STYLESHEET_INVALID');
  const css = await readFile('dist' + resource.pathname, 'utf8');
  entryHtml = entryHtml.replace(match[0], `<style data-bank-stylesheet="${escape(match[1])}">${css}</style>`);
}
await writeFile('dist/index.html', entryHtml);
const documents={...publicPages,...Object.fromEntries(Object.entries(publicRouteAliases).map(([alias,path])=>[alias,publicPages[path]]))};
for (const [path, page] of Object.entries(documents)) {
  await mkdir(`dist${path}`, { recursive: true });
  const runtimeHtml = runtimeDocuments.get(path);
  await writeFile(`dist${path}index.html`, runtimeHtml ? runtimeHtml.replace('<body>',`<body data-bank-surface="${page.runtime}">`).replace('</head>',`<link rel="stylesheet" href="${cssUrl}"><script src="${jsUrl}" defer></script>${valueHead}</head>`).replace('</body>',`${bundle}</body>`) : `<!doctype html><html lang="en" class="learn-surface"><head>${page.head}</head><body data-bank-surface="learn"><div id="public-learn-root">${page.content}</div>${bundle}</body></html>`);
}
const urls = [...metadataPages.filter(page=>!page.noindex).map(page=>page.path),...assetPaths];
if(urls.length>50000)throw Error('SITEMAP_PARTITION_REQUIRED');
// Omit lastmod rather than claiming that a build or a live pulse rewrote every
// guide. Canonical publication dates can be added when they are source-backed.
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
console.log(`Prerendered the existing entrance and ${pages.length} public guides; generated canonical sitemap.`);
