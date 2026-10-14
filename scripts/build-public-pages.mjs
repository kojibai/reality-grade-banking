import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { scopeLearnCss } from './scope-learn-css.mjs';
import { learnHome, learnArticle } from './learn-template.mjs';
const origin = 'https://bank.receiz.com';
const pages = [
  { slug: '', title: 'Proof-native banking', description: 'How Receiz Bank connects your identity, proof objects, Reserve and Settlement in one mobile account.', intro: 'Your value. More possibilities.', sections: [
    ['One account for connected value', 'Receiz Bank is a mobile web application built around your Receiz ID. Open an existing Identity Seal or create an account, then view the same Reserve and Settlement balances used by Receiz. The account keeps Send, Receive, Deposit, Assets, Market and Ledger together in a familiar console.'],
    ['Start with your identity', 'An Identity Seal carries signing custody and may also carry verified account state. The bank opens the exact seal on your device. Your signing key stays local; account opening uses protected identity transport and signed consent.'],
    ['Explore a market of sealed proof objects', 'The public Market collects proof objects visible in Receiz showcases. Explore assets, read public valuations and inspect original sources. Market capitalization is the sum of current public valuations, with missing values disclosed. A valuation is distinct from cash backing or a price at which a buyer has committed to trade.'],
    ['Know what is available', 'Account opening, shared balance reads, public showcase discovery, proof inspection, payment QR links and local asset definitions are implemented. Camera scanning uses an on-device decoder. NFC writing depends on browser support. Card deposits use the Receiz embedded checkout. Physical custody, ownership transfers, fractional sales, funded asset issuance and wire instructions require their native sources and execution routes to be connected.']
  ] },
  { slug: 'receiz-id', title: 'Receiz ID and Identity Seals', description: 'Open your existing Receiz account, understand device-held identity and save a self-contained Identity Seal.', intro: 'Your account starts with your Receiz ID.', sections: [
    ['Create or open an account', 'Enter creates a Receiz identity and opens the bank account. Use existing account opens your uploaded Identity Seal automatically after inspection when it does not require a phrase. A legacy seal protected with a phrase asks for that phrase before opening.'],
    ['Back up your Identity Seal', 'New Identity Seal downloads are self-contained and do not ask you to save a generated recovery phrase. Keep the original file private: it carries signing custody. Existing imported seals retain their original protection. Device custody and remote identity transport remain protected separately.'],
    ['Returning to the bank', 'The browser retains encrypted device custody and a source-bound balance observation. Returning users go back to the account. A complete signed wallet summary carried by an imported seal can provide the initial balance while the bank reads the current shared account.'],
    ['History is carried evidence', 'An Identity Seal may contain verified portable history. A seal with identity alone does not imply that every historical transaction is inside it. The bank preserves the distinction between carried private history, public activity and display observations.']
  ] },
  { slug: 'proof-objects', title: 'Proof objects and asset ownership', description: 'Understand sealed proof objects, public showcases, asset definitions and custody-backed physical ownership.', intro: 'Hold the source. Keep the possibilities.', sections: [
    ['What is a proof object?', 'A Receiz proof object is an exact sealed source whose integrity and continuity can be inspected with the Receiz verifier. The object carries evidence; a summary, a public listing or an AI explanation does not replace its original bytes.'],
    ['Your assets and public showcase', 'Assets combines originals held by the open account on this device with public proof objects attributed to its Receiz showcase. Showcase information is discovery data. Transfer rights require current native ownership admission.'],
    ['Create an asset', 'Give an asset a name, a short code, defined units and an optional description. Receiz seals the definition under your ID and retains its exact original privately on this device. You can link a held proof. This records a definition and authorship; it does not spend funds or commit the linked proof as backing.'],
    ['Physical custody and fractional ownership', 'The bank model allows an item to remain with a custodian while verified ownership can move or be divided. The physical receipt, transferable claim, share supply and funding must follow their admitted sources and atomic execution rules. A deposit request alone cannot create custody, cash or a tradable ownership share.']
  ] },
  { slug: 'reserve-and-settlement', title: 'Reserve and Settlement balances', description: 'How Receiz Bank displays Reserve, Settlement, total account value and Kai-day balance changes.', intro: 'One view. Two connected value rails.', sections: [
    ['See the same shared balance', 'Receiz Bank reads the same account summary as the Receiz wallet. Reserve and Settlement add up to the displayed total. The bank keeps amounts in exact cents; proof objects are not counted again as an extra invented balance.'],
    ['Reserve', 'Reserve represents the account value designated for funded settlement and compatible external payment rails. A deposit becomes available when Receiz confirms the actual credited amount and the same receiving account.'],
    ['Settlement and destination continuity', 'Settlement represents proof-native value. Transfers to an external institution require that destination to preserve the applicable proof-backed continuity. Destination integration and capability determine whether a route is available.'],
    ['Charts and Kai days', 'Charts show retained account observations for Total, Reserve and Settlement. Touch or pointer inspection reveals exact amounts and local timestamps. Settlement change compares with the last observed balance before the start of the current Kai day. The v129 day lattice is 17,491,270,421 micro-pulses; an absent opening observation is not treated as a zero balance.'],
    ['Payment requests', 'A QR code, shared link or programmed NFC tag opens a payment request inside the bank. It does not send money automatically. The sender reviews the recipient, amount and available value route before any supported execution.']
  ] }
];
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
let bankHtml;
const publicPages = {};
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { Entrance } = await server.ssrLoadModule('/src/features/identity/Entrance.tsx');
  const html = await readFile('dist/index.html', 'utf8');
  const entrance = renderToStaticMarkup(createElement(Entrance, { opening: false, busy: false, error: null, onCreate: async () => {}, onImport: async () => {} }));
  bankHtml = html.replace('<div id="root"></div>', `<div id="root">${entrance}</div><noscript><p style="text-align:center">Enable JavaScript to open your account. You can read the <a href="/learn/">public bank guides</a> without JavaScript.</p></noscript>`);
} finally { await server.close(); }
for (const page of pages) {
  const path = `/learn/${page.slug ? page.slug + '/' : ''}`, url = origin + path;
  const structured = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', '@id': url, url, name: page.title + ' | Receiz Bank', description: page.description, isPartOf: { '@id': origin + '/#website' }, inLanguage: 'en', dateModified: '2026-10-14' }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Receiz Bank', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: page.title, item: url }] }] };
  const content = page.slug ? learnArticle(page, pages, escape) : learnHome();
  const output = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fbfcfe"><title>${escape(page.title)} | Receiz Bank</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="icon" href="/icon.svg"><meta property="og:type" content="website"><meta property="og:site_name" content="Receiz Bank"><meta property="og:url" content="${url}"><meta property="og:title" content="${escape(page.title)} | Receiz Bank"><meta property="og:description" content="${escape(page.description)}"><meta property="og:image" content="${origin}/receiz-bank-learn-share.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="Receiz Bank. Your value. More possibilities."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)} | Receiz Bank"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${origin}/receiz-bank-learn-share.jpg"><meta name="twitter:image:alt" content="Receiz Bank — Proof-native banking. Your value. More possibilities."><link rel="stylesheet" href="/learn/learn.css">${page.slug ? '' : '<link rel="preload" href="/learn/proof-glass.webp" as="image" type="image/webp">'}<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script><script src="/learn/learn.js" defer></script></head><body>${content}</body></html>`;
  publicPages[path] = { title: page.title + ' | Receiz Bank', content, head: output.match(/<head>([\s\S]+)<\/head>/)[1] };
}
const bankEntry = bankHtml.match(/<script type="module"[^>]*src="([^"]+)"/)[1];
const bankStyles = [...bankHtml.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"/g)].map(match => match[1]);
const bankHead = bankHtml.match(/<head>([\s\S]+)<\/head>/)[1];
const bundle = `<script id="receiz-navigation" type="application/json">${JSON.stringify({ pages: publicPages, bank: { head: bankHead, entry: bankEntry, styles: bankStyles } }).replaceAll('<', '\\u003c')}</script>`;
await writeFile('dist/learn/learn.css', scopeLearnCss(await readFile('public/learn/learn.css', 'utf8')));
await writeFile('dist/index.html', bankHtml.replace('</head>', '<link rel="stylesheet" href="/learn/learn.css"><script src="/learn/learn.js" defer></script></head>').replace('</body>', `${bundle}</body>`));
for (const [path, page] of Object.entries(publicPages)) {
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}index.html`, `<!doctype html><html lang="en" class="learn-surface"><head>${page.head}</head><body data-bank-surface="learn"><div id="public-learn-root">${page.content}</div>${bundle}</body></html>`);
}
const urls = ['/', ...pages.map(page => `/learn/${page.slug ? page.slug + '/' : ''}`)];
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path => `<url><loc>${origin}${path}</loc><lastmod>2026-10-14</lastmod></url>`).join('')}</urlset>`);
console.log(`Prerendered the existing entrance and ${pages.length} public guides; generated canonical sitemap.`);
