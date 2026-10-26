import {publicRouteAliases} from '../src/content/public-routes.mjs';
import {siteFooterHtml} from './site-footer.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import {createHash} from 'node:crypto';
import { phoneLaunchTargets } from './build-launch-images.mjs';
import {publicPages,publicOrigin,escapeMetadata} from './public-page-metadata.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};
const html = await readFile('dist/index.html', 'utf8'), image = await readFile('dist/receiz-bank-share.png');
assert.match(html, /<div id="root"><div class="account-opening account-opening-screen"[^>]*data-entry="resume"/);
assert.match(html, /id="bankeiz-opening-critical"/);
assert.ok(html.includes('<svg class="account-opening-geometry"'), 'The first document carries its entrance artwork.');
assert.ok(html.includes('<noscript>') && html.includes('Enable JavaScript to open your account.'));
assert.ok(!/<link rel="stylesheet"/.test(html), 'The entrance must not wait on render-blocking stylesheet requests.');
for (const target of phoneLaunchTargets()) {
  assert.ok(html.includes(`href="${target.url}" media="${target.media}"`), 'iOS has an exact launch image media query.');
  const png = await readFile('dist' + target.url);
  const [width,height] = target.orientation === 'portrait' ? [target.width,target.height] : [target.height,target.width];
  assert.equal(png.readUInt32BE(16), width * target.scale);
  assert.equal(png.readUInt32BE(20), height * target.scale);
}
assert.ok(html.includes(`property="og:image" content="${publicOrigin+socialImages.images['/'].url}"`));
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.match(html, /rel="canonical" href="https:\/\/bankeiz\.com\/"/);
assert.equal(image.readUInt32BE(16), 1730); assert.equal(image.readUInt32BE(20), 909); assert.ok(image.length < 5_000_000);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const [slug, section] of [['account-access', 'account-access'], ['signing-key', 'device-held-signing']]) {
  const notice = await readFile(`dist/learn/${slug}/index.html`, 'utf8');
  assert.ok(notice.includes(`id="${section}"`), `The ${slug} link must resolve to its exact section`);
}
for (const path of ['', 'receiz-id/', 'proof-objects/', 'reserve-and-settlement/', 'account-access/', 'signing-key/', 'reality-grade-banking/']) {
  const page = await readFile(`dist/learn/${path}index.html`, 'utf8');
  assert.ok(page.includes(`<link rel="canonical" href="https://bankeiz.com/learn/${path}">`));
  assert.ok(page.includes('<h1>')); assert.ok(page.includes('<h2>')); assert.ok(!page.includes('<div id="root"></div>'));
  assert.ok(page.includes('class="site-footer"')&&page.includes('aria-label="Standards &amp; technology footer links"')&&page.includes('aria-label="Policies and source"'),'Public guides carry the complete institutional footer without JavaScript');
  assert.match(page, /property="og:image" content="https:\/\/bankeiz\.com\/social\/[a-z-]+-[a-f0-9]{16}\.png"/);
  assert.match(page, /name="twitter:image:alt"/);
  assert.match(page, /href="\/learn\/learn.css\?v=[a-f0-9]{12}"/); assert.match(page, /src="\/learn\/learn.js\?v=[a-f0-9]{12}" defer/);
  assert.ok(!/<script type="module"[^>]*src="\/assets\/index-/.test(page), 'Public guides must not execute the private app runtime');
  assert.ok(page.includes('id="receiz-navigation"'), 'Public guide transitions are preloaded');
  for (const json of page.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) JSON.parse(json[1]);
  assert.ok(sitemap.includes(`https://bankeiz.com/learn/${path}`));
}
// Every public entry carries the same routes, including legal notices, so
// navigation does not depend on fetching a replacement document.
const navigationPattern = /<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/;
const carriedNavigation = JSON.parse(html.match(navigationPattern)[1]);
const navigation = structuredClone(carriedNavigation);
for(const page of [...Object.values(navigation.pages),navigation.bank])if(Array.isArray(page.head))page.head=page.head.map(part=>typeof part==='number'?navigation.styles[part]:part).join('');
assert.ok(navigation.pages['/explore/'].head.includes('.ledger-proof-details')&&navigation.pages['/explore/'].head.includes('.ledger-proof-actions'),'Retained public asset navigation carries evidence styles before the lazy reader opens');
assert.ok(navigation.bank.content.includes('class="account-opening-geometry"'),'Cold Bank navigation carries its actual opening artwork');
for(const url of navigation.bank.styles)assert.equal(navigation.bank.css[url],await readFile('dist'+url,'utf8'),'Cold Bank navigation carries the exact emitted CSS');
assert.deepEqual(navigation.aliases,publicRouteAliases,'Retained navigation carries the public document aliases');
for(const [alias,path] of Object.entries(publicRouteAliases)){
 const legacy=await readFile(`dist${alias}index.html`,'utf8'),canonical=await readFile(`dist${path}index.html`,'utf8');
 assert.equal(legacy,canonical,`Legacy ${alias} must carry the same complete canonical document`);
 assert.ok(!sitemap.includes(`<loc>${publicOrigin}${alias}</loc>`),'Legacy URLs must not duplicate the canonical sitemap');
 assert.ok(canonical.includes(siteFooterHtml(path)),'The static footer omits its canonical current destination');
}
assert.equal(navigation.pages['/vault/'],undefined,'Marketing Vaults must never claim a proof route');
assert.ok(navigation.pages['/legal/'], 'Legal notices must use the retained public header too');
assert.ok(navigation.pages['/schemas/'], 'The complete schema reference must be carried for document-free public navigation');
const sharedHeader = navigation.pages['/learn/'].content.match(/<header class="learn-header">[\s\S]*?<\/header>/)[0];
for (const [path, entry] of Object.entries(navigation.pages)) {
  const output = await readFile(`dist${path}index.html`, 'utf8');
  if(entry.content.includes('class="site-footer"'))assert.ok(entry.content.includes(siteFooterHtml(path)),`Carried footer differs at ${path}`);
  assert.deepEqual(JSON.parse(output.match(navigationPattern)[1]), carriedNavigation, `Public navigation differs at ${path}`);
  if (path === '/schemas/') {
    assert.ok(entry.content.includes('class="schema-header"'),'Reference retains its own existing header');
    assert.ok(entry.head.includes('<style data-public-page-style="schemas">'),'Reference styles travel with the carried page');
    assert.ok(!entry.head.includes('href="/schemas/schemas.css"'),'No new stylesheet request is required on reference navigation');
  } else if(entry.runtime) {
    assert.ok(['explore','ledger','verify','conformance','receipt'].includes(entry.runtime));
    assert.ok(output.includes(`id="public-${entry.runtime}-root" data-public-runtime="${entry.runtime}"`));
    assert.ok(entry.head.includes(`<style data-public-page-style="${entry.runtime}">`),'Workspace styles are carried for immediate first paint');
    assert.ok(!entry.head.includes('<script type="module"'),'Carried metadata does not execute an unselected workspace');
    assert.ok(!entry.head.includes('rel="stylesheet"'),'A workspace transition does not wait for CSS');
    assert.ok(output.includes(`src="${entry.entry}"`),'Direct entry still executes its own module');
  } else assert.equal(entry.content.match(/<header class="learn-header">[\s\S]*?<\/header>/)[0], sharedHeader, `Shared header links differ at ${path}`);
  assert.ok(output.includes(entry.runtime?`id="public-${entry.runtime}-root"`:'id="public-learn-root"'));
}
for(const route of ['/ledger/','/explore/','/verify/','/conformance/'])assert.ok(navigation.pages[route]?.runtime,'All public workspaces share retained navigation');
const robots = await readFile('dist/robots.txt', 'utf8'); assert.match(robots, /Disallow: \/api\//); assert.ok(!sitemap.includes('#'));
const sw = await readFile('dist/sw.js', 'utf8'); assert.ok(sw.includes('qr-decoder'), 'The decoder stays lazily executed but is cached for offline scanning.');
const uniqueImages=new Set(),uniqueTitles=new Set(),uniqueDescriptions=new Set();
for(const page of publicPages){
 const html=await readFile(`dist${page.path}index.html`,'utf8'),head=html.match(/<head>([\s\S]+?)<\/head>/)[1],image=socialImages.images[page.path],bytes=await readFile('dist'+image.url),url=publicOrigin+page.path;
 assert.equal((head.match(/<title>/g)??[]).length,1,`Single title: ${page.path}`);assert.ok(head.includes(`<title>${escapeMetadata(page.title)}</title>`));
 assert.equal((head.match(/rel="canonical"/g)??[]).length,1);assert.ok(head.includes(`rel="canonical" href="${url}"`));
 assert.ok(head.includes(`name="description" content="${escapeMetadata(page.description)}"`));
 assert.ok(head.includes(`property="og:url" content="${url}"`));
 assert.ok(head.includes(`property="og:image" content="${publicOrigin+image.url}"`));assert.ok(head.includes(`name="twitter:image" content="${publicOrigin+image.url}"`));
 for(const field of ['og:image:width','og:image:height','og:image:alt','twitter:image:alt'])assert.ok(head.includes(field),`${field}: ${page.path}`);
 assert.equal(bytes.readUInt32BE(16),image.width);assert.equal(bytes.readUInt32BE(20),image.height);assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256);assert.equal(bytes.length,image.bytes);
 if(page.path!=='/'){assert.ok(bytes.length<700_000,'Per-page share image size');assert.ok(!sw.includes(image.url),'Sharing art must never increase the PWA install or opening work');}
 assert.ok(!uniqueImages.has(image.sha256),`Unique sharing image: ${page.path}`);uniqueImages.add(image.sha256);uniqueTitles.add(page.title);uniqueDescriptions.add(page.description);
 assert.equal(sitemap.includes(`<loc>${url}</loc>`),!page.noindex,`Only indexable canonical pages belong in sitemap: ${page.path}`);
 assert.ok(head.includes(page.noindex?'noindex,':'index,follow,max-image-preview:large'));assert.ok(!head.includes('dateModified'), 'No invented modification date');
 const graphs=[...head.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].flatMap(match=>JSON.parse(match[1])['@graph']);
 assert.ok(graphs.some(node=>node.url===url&&node['@id']===url+'#page'),'Page-specific structured data');assert.ok(graphs.some(node=>node['@type']==='BreadcrumbList'));
 if(['/explore/','/ledger/','/verify/','/conformance/'].includes(page.path))assert.ok(/<h1>[\s\S]+?<\/h1>/.test(html),'Public entry has readable copy before JavaScript');
}
assert.equal(uniqueTitles.size,publicPages.length);assert.equal(uniqueDescriptions.size,publicPages.length);assert.ok(!sitemap.includes('<lastmod>'),'A build date must not impersonate a content modification date');
for (const url of html.matchAll(/(?:href|src)="(\/learn\/learn\.(?:css|js)\?v=[a-f0-9]{12})"/g)) assert.ok(sw.includes(JSON.stringify(url[1])), `Versioned Learn asset must be precached: ${url[1]}`);
const css = await readFile('dist/learn/learn.css'), motion = await readFile('dist/learn/learn.js');
assert.ok(gzipSync(css).length + gzipSync(motion).length < 15_000, 'Shared public presentation runtime budget, including guides and retained asset/profile routes');
assert.ok((await readFile('dist/learn/proof-glass.webp')).length < 180_000, 'Hero art budget');
const share = await readFile('dist/receiz-bank-learn-share.jpg');
assert.equal(share.readUInt16BE(0), 0xffd8); assert.ok(share.length < 500_000, 'Social image budget');
assert.ok(css.toString().includes('prefers-reduced-motion:reduce'));
assert.ok(css.toString().includes('animation-play-state:paused'));
assert.ok(motion.toString().includes('IntersectionObserver'));
const learn = await readFile('dist/learn/index.html', 'utf8');
const reality = await readFile('dist/learn/reality-grade-banking/index.html', 'utf8');
assert.ok(learn.includes('href="/learn/reality-grade-banking/">Reality-Grade Banking</a>'));
for (const id of ['the-standard', 'continuity', 'notes', 'value', 'receiving', 'open-source']) assert.ok(reality.includes(`id="${id}"`));
assert.ok(reality.includes('href="https://github.com/kojibai/reality-grade-banking"'));
assert.ok(reality.includes('href="/conformance/"') && reality.includes('href="/verify/"'));
assert.ok(reality.includes('href="/ledger/"'), 'Continuity explains and links to the public Ledger');
assert.ok(learn.includes('href="/ledger/"'), 'Learn links directly to the public Ledger');
const ledger = await readFile('dist/ledger/index.html', 'utf8');
assert.ok(ledger.includes('<link rel="canonical" href="https://bankeiz.com/ledger/">'));
assert.ok(sitemap.includes('https://bankeiz.com/ledger/'));
const builds = JSON.parse(await readFile('dist/.vite/manifest.json', 'utf8'));
assert.ok(builds['ledger/index.html']?.isEntry, 'Public Ledger has its own read-only entry');
const publicEntries = new Set();
async function checkLedgerEntry(key) {
  if (publicEntries.has(key)) return;
  publicEntries.add(key);
  const entry = builds[key]; assert.ok(entry, 'Every Ledger import is present');
  const body = await readFile('dist/' + entry.file, 'utf8');
  assert.ok(!/receiz-bank-canonical-device-signer|\/api\/connect\/wallet\/me|bankeiz:private/.test(body), 'Public Ledger never opens private identity or account routes');
  for (const dependency of entry.imports ?? []) await checkLedgerEntry(dependency);
}
await checkLedgerEntry('ledger/index.html');
const noteGuide = await readFile('dist/learn/reserve-and-settlement/index.html', 'utf8');
assert.ok(!learn.includes('src="/learn/reserve-note.webp"'), 'Learn home stays free of note illustrations');
assert.ok(noteGuide.includes('id="how-notes-work"'));
assert.ok(noteGuide.includes('Unissued specimen, with no spendable value.'));
assert.equal((noteGuide.match(/class="note-specimen /g)??[]).length,1,'One Settlement Note specimen');
assert.ok(learn.includes('data-product-example="account"') && !learn.includes('Two connected rails.'),'Learn foregrounds the actual account and actions');
for (const rail of ['reserve', 'settlement']) {
  if(rail==='settlement')assert.ok(noteGuide.includes(`src="/learn/${rail}-note.webp" width="1620" height="972" style="width:100%;max-width:100%;height:auto" loading="lazy"`));
  else assert.ok(!noteGuide.includes(`src="/learn/${rail}-note.webp"`));
  const note = await readFile(`dist/learn/${rail}-note.webp`);
  assert.equal(note.toString('ascii', 0, 4), 'RIFF');
  assert.equal(note.toString('ascii', 8, 12), 'WEBP');
  assert.ok(note.length < 700_000, 'Below-fold note artwork budget');
  assert.ok(!note.includes(Buffer.from('receiz.bank.note')), 'Learn specimens must not contain issued proof payloads');
}
assert.ok(!learn.includes('still being connected'));
console.log(`Verified ${publicPages.length} unique social cards and canonical page metadata, structured data, indexable public copy, sitemap, robots, inline entrance, iPhone artwork and public navigation.`);

const checkout=await readFile('dist/pay/index.html','utf8');
assert.ok(builds['pay/index.html']?.isEntry,'Hosted checkout has a separate entry');
assert.ok(checkout.includes('data-checkout-root')&&checkout.includes('<noscript>')&&!checkout.includes('receiz-navigation'),'Checkout has its own readable shell without the public catalog');
const checkoutImports=new Set();
async function checkCheckoutEntry(key){
 if(checkoutImports.has(key))return;checkoutImports.add(key);const entry=builds[key];assert.ok(entry);
 const body=await readFile('dist/'+entry.file,'utf8');
 assert.ok(!/receiz-public-market\.json|bankeiz:private|\/api\/chat\/conversations|bankeiz-chart-worker/.test(body),'Checkout static entry does not start dashboard, messaging or market work');
 for(const dep of entry.imports??[])await checkCheckoutEntry(dep);
}
await checkCheckoutEntry('pay/index.html');
console.log('Verified dedicated hosted checkout entry and static import boundary.');
