import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { openingShellHtml } from './opening-shell.mjs';
import { buildLaunchImages } from './build-launch-images.mjs';
import { learnAssets } from './learn-assets.mjs';
import { learnHome, learnArticle } from './learn-template.mjs';
import { accountNoticePages } from './account-notice-pages.mjs';
import { realityGradePage, realityGradeContent } from './reality-grade-page.mjs';
import { valueExplainerPage, valueExplainerContent } from './value-explainer-template.mjs';
import { writePublicSdkSchemas } from './build-public-schemas.mjs';
import { writeValueExplainerAssets } from './value-explainer-assets.mjs';
import {publicPages as metadataPages,publicPage,applyPublicMetadata} from './public-page-metadata.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};
const origin = 'https://bankeiz.com';
const pages = [
  { slug: '', title: 'Proof-native banking', description: 'How Bankeiz connects your identity, proof objects, Reserve and Settlement in one mobile account.', intro: 'Your value. More possibilities.', sections: [
    ['One account for connected value', 'Open your account to hold, send and receive value. Your identity keeps Reserve, Settlement, assets and transaction history connected in one place.'],
    ['Start with your identity', 'Your Identity Seal opens your account and keeps your signing key with you. Open the original file on your device. Your permission allows account access; a payment still needs your separate approval.'],
    ['Explore a market of sealed proof objects', 'Explore publicly shared assets, see their values and inspect their original proofs. Market capitalization adds their current public valuations and identifies missing values. A displayed value does not mean funds are held against the asset or that a buyer has agreed to pay that amount.'],
    ['Built for continuity', 'Keep your identity and original proofs on your device. Ownership and history stay connected to their source, so you can inspect what you hold and what you receive. Payment requests make the recipient and amount clear before you authorize a payment.']
  ] },
  { slug: 'receiz-id', title: 'Receiz ID and Identity Seals', description: 'Open your account, keep your signing key on your device and save your Identity Seal.', intro: 'Your account starts with your Receiz ID.', sections: [
    ['Create or open an account', 'Choose Enter to create an account. Choose Use existing account to open your original Identity Seal. The file is checked on your device before opening. If your seal has an unlock phrase, enter it when asked.'],
    ['Back up your Identity Seal', 'Save your original Identity Seal somewhere private and secure. It lets you open your identity on another device. New seals need no separate recovery phrase; an older seal with a phrase still needs that phrase. Notes held by this device need their own transfer or deposit before you remove the ID.'],
    ['Returning to the bank', 'Return on the same device to reopen your account. Your saved balance appears while the latest account information is checked. An imported seal can also show an initial balance when it contains a complete, verified account summary. A saved balance shows when it was last read.'],
    ['History is carried evidence', 'Keep your original transaction receipts so you can verify what happened. An Identity Seal can include verified history, but it may not contain every transaction. Your private activity, public activity and saved balance readings remain clearly identified.']
  ] },
  { slug: 'proof-objects', title: 'Proof objects and asset ownership', description: 'Understand sealed proof objects, public showcases, asset definitions and custody-backed physical ownership.', intro: 'Hold the source. Keep the possibilities.', sections: [
    ['What is a proof object?', 'A proof object connects what you own with evidence you can inspect. Its original sealed source lets you verify integrity and examine the ownership and history it actually carries. The original establishes what the app can verify. Keep that original with you.'],
    ['Your assets and public showcase', 'See your saved originals and the public collection linked to your identity in Assets. A public listing helps you find an asset. Sending or selling it requires its current ownership proof.'],
    ['Create an asset', 'Give an asset a name, a short code, defined units and an optional description. The definition is sealed under your ID, with its exact original retained privately on this device. You can link a held proof. This records a definition and authorship; it does not spend funds or commit the linked proof as backing.'],
    ['Physical custody and fractional ownership', 'The bank model allows an item to remain with a custodian while verified ownership can move or be divided. The physical receipt, transferable claim, share supply and funding must follow their verified proofs and atomic execution rules. A deposit request alone cannot create custody, cash or a tradable ownership share.']
  ] },
  { slug: 'reserve-and-settlement', title: 'Settlement and Reserve', description: 'Settlement is proof-native value. Reserve is proof-backed funds. Learn how Reserve connects to payment rails and how receiving institutions demonstrate proof-continuity conformance.', intro: 'Value, settled in proof.', sections: [
    ['See the same shared balance', 'Your account brings Settlement and Reserve into one balance. Settlement is proof-native value; Reserve holds proof-backed funds. Both come from the same account sources and are counted once in the total. The verified proof remains authoritative.'],
    ['Settlement and destination continuity', 'Settlement is proof-native value, with its authority grounded in verified sources and ownership history. Value sets the standard: a receiving institution must demonstrate that it can verify the source, preserve ownership and history, and maintain proof continuity. Conformance qualifies the receiving destination for this protocol. Each transfer follows your authorization and verification of its current proof and ownership.'],
    ['Reserve', 'Reserve holds proof-backed funds with their ownership and history. A deposit becomes available when its funding proof verifies.'],
    ['How notes work', 'A funded Reserve Note keeps value with its proof in an original image. Save it on your device, transfer its ownership to a recipient, or deposit it back into Reserve. The two note designs identify their value clearly: proof-backed Reserve and proof-native Settlement. Keep the original PNG: a screenshot or converted photo can lose the proof inside it. A picture alone never establishes ownership or credits a balance.'],
    ['Your proof stays with you', 'Your Identity Seal and saved originals stay in your hands when a website or service is unavailable. You hold the source, rather than only a link to a page. Offline verification uses the original and the matching verifier on your device; a completed transfer records the change in ownership.'],
    ['The receiving standard', 'Receiving institutions must demonstrate that they can verify the value, preserve ownership and history, and maintain continuity. Until assessed, conformance is not demonstrated. A verified failure of continuity requirements is nonconforming for proof continuity within the assessed receiving capability until corrected and reassessed. Payment availability is checked separately.'],
    ['Leaving proof-native rails', 'A legacy payment route moves funds to a destination that does not preserve proof continuity. Your original transfer receipt remains verifiable; the receiving balance does not carry the same source, ownership and history. Review the destination before you authorize the transfer.'],
    ['Charts and Kai days', 'Compare saved balances for Total, Reserve and Settlement across time. Touch or point at the chart to see an exact amount and time. Settlement change uses the last recorded balance before the current Kai day began. When that opening balance is missing, the chart does not assume it was zero.'],
    ['Payment requests', 'A QR code, shared link or programmed NFC tag opens a payment request inside the bank. It does not send money automatically. The sender reviews the recipient, amount and available value route before any supported execution.']
  ] }
];
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const { css: publicCss, cssUrl, jsUrl } = await learnAssets();
await writePublicSdkSchemas('dist');
const valueAssets = await writeValueExplainerAssets('dist');
const valueHead = `<link rel="stylesheet" href="${valueAssets.cssUrl}"><script src="${valueAssets.jsUrl}" defer></script>`;
let bankHtml;
const publicPages = {};
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { AccountOpening } = await server.ssrLoadModule('/src/features/identity/AccountOpening.tsx');
  const { BANK_READ_CONSENT, BANK_READ_SCOPES } = await server.ssrLoadModule('/src/receiz/config.ts');
  pages.push(...accountNoticePages(BANK_READ_CONSENT, BANK_READ_SCOPES), realityGradePage, valueExplainerPage);
  const html = await readFile('dist/index.html', 'utf8');
  const launchImages = await buildLaunchImages('dist', AccountOpening);
  bankHtml = openingShellHtml(html, AccountOpening).replace('</head>', launchImages + '</head>');
} finally { await server.close(); }
for (const page of pages) {
  const path = `/learn/${page.slug ? page.slug + '/' : ''}`, url = origin + path;
  const structured = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': url, url, name: page.title + ' | Bankeiz', description: page.description, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en', dateModified: '2026-10-15' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Bankeiz', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] }] };
  const content = page === realityGradePage ? realityGradeContent() : page === valueExplainerPage ? valueExplainerContent() : page.slug ? learnArticle(page, pages, escape) : learnHome();
  const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcfe"><title>${escape(page.title)} | Bankeiz</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/icon.svg"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:url" content="${url}"><meta property="og:title" content="${escape(page.title)} | Bankeiz"><meta property="og:description" content="${escape(page.description)}"><meta property="og:image" content="${origin}/receiz-bank-learn-share.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="Bankeiz. Your value. More possibilities."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)} | Bankeiz"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${origin}/receiz-bank-learn-share.jpg"><meta name="twitter:image:alt" content="Bankeiz — Proof-native banking. Your value. More possibilities."><link rel="stylesheet" href="${cssUrl}">${valueHead}${page.slug ? '' : '<link rel="preload" href="/learn/proof-glass.webp" as="image" type="image/webp">'}<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script><script src="${jsUrl}" defer></script></head><body>${content}</body></html>`;
  const metadata=publicPage(path),document=applyPublicMetadata(output,metadata,socialImages.images[path]);
  publicPages[path] = { title: metadata.title, content, head: document.match(/<head>([\s\S]+)<\/head>/)[1] };
}
const bankEntry = bankHtml.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
const bankStyles = [...bankHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1]);
const bankHead = bankHtml.match(/<head>([\s\S]+)<\/head>/)[1];
const bundle = `<script id="receiz-navigation" type="application/json">${JSON.stringify({ pages: publicPages, bank: { head: bankHead, entry: bankEntry, styles: bankStyles } }).replaceAll('<', '\\u003c')}</script>`;
await writeFile('dist/learn/learn.css', publicCss);
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
for (const [path, page] of Object.entries(publicPages)) {
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}index.html`, `<!doctype html><html lang="en" class="learn-surface"><head>${page.head}</head><body data-bank-surface="learn"><div id="public-learn-root">${page.content}</div>${bundle}</body></html>`);
}
const urls = metadataPages.filter(page=>!page.noindex).map(page=>page.path);
// Omit lastmod rather than claiming that a build or a live pulse rewrote every
// guide. Canonical publication dates can be added when they are source-backed.
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>`);
console.log(`Prerendered the existing entrance and ${pages.length} public guides; generated canonical sitemap.`);
