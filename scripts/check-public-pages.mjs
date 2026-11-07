import {publicRouteAliases} from '../src/content/public-routes.mjs';
import {siteFooterHtml} from './site-footer.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync,gunzipSync } from 'node:zlib';
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
const sharedExamplePattern=/<template data-shared-example-views>[^<]*<\/template>/g;
const sharedExampleBank=html.match(sharedExamplePattern);
assert.equal(sharedExampleBank?.length,1,'The carried walkthrough destinations exist once in the initial document');
const navigation = structuredClone(carriedNavigation);
for(const page of [...Object.values(navigation.pages),navigation.bank,navigation.bank.css??{}])for(const field of Object.keys(page).filter(key=>key!=='styles'))if(Array.isArray(page[field]))page[field]=page[field].map(part=>typeof part==='number'?navigation.styles[part]:part).join('');
// Direct cold Explorer documents use the held complete build family. Keep the
// ordinary navigation/Bank entry compact and independent of that public seed.
assert.ok(!/<script\b[^>]*\bid="(?:public-market-seed|bank-public-market-(?:seed|hint))"/.test(html),'Static Bank entry never carries or waits for an Explorer document seed.');
assert.ok(Object.values(navigation.pages).every(page=>!/<script\b[^>]*\bid="public-market-seed"/.test(page.content)),'Ordinary navigation never duplicates the complete Explorer seed.');
const membershipInput=JSON.parse(await readFile('public/receiz-public-market.json','utf8')),capInput=JSON.parse(await readFile('public/receiz-public-capitalization.json','utf8')),historyInput=JSON.parse(await readFile('public/receiz-public-share-chart-history.json','utf8'));
const categoryMatches={music:item=>item.mediaKind==='audio',images:item=>item.mediaKind==='image',videos:item=>item.mediaKind==='video',books:item=>item.mediaKind==='epub',essays:item=>item.hasLongForm===true&&item.mediaKind!=='epub',moments:item=>item.mediaKind==='moment'&&!item.hasLongForm,collectibles:item=>item.category==='sports',documents:item=>item.mediaKind==='pdf'||item.mediaKind==='file'};
let staticFamily,staticCatalog;
for(const [path,page]of Object.entries(navigation.pages).filter(([,page])=>page.runtime==='explore')){
 const document=await readFile(`dist${path}index.html`,'utf8'),match=document.match(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>\s*<script id="receiz-navigation"/);
 assert.ok(Buffer.byteLength(document)<=32*1024*1024,`Cold ${path} stays within the existing public document capacity.`);
 assert.ok(match,`Cold ${path} carries one existing seed immediately before navigation for exact hydration.`);
 assert.equal((document.match(/id="public-market-seed"/g)??[]).length,1,`Cold ${path} carries the full family once.`);
 const seed=JSON.parse(match[1]);
 if(seed.catalogGzip){assert.equal(seed.catalog,undefined);assert.ok(seed.catalogGzip.bytes<=32*1024*1024);const compressed=Buffer.from(seed.catalogGzip.gzipB64u,'base64url');assert.ok(compressed.length<=8*1024*1024);const bytes=gunzipSync(compressed,{maxOutputLength:32*1024*1024});assert.equal(bytes.length,seed.catalogGzip.bytes);seed.catalog=JSON.parse(bytes.toString('utf8'));}
 const catalog=seed.catalog,ids=new Map(catalog.items.map(item=>[item.id,item]));
 assert.equal(seed.schema,'bank.public-market.document.v1');assert.equal(seed.path,path.slice(1,-1));assert.equal(catalog.complete,true);assert.equal(ids.size,catalog.items.length);assert.ok(catalog.items.every(item=>item.authority==='projection-only'&&item.canTrade===false));
 assert.equal(seed.visibleCount,Math.min(50,catalog.items.length));assert.deepEqual(seed.capitalization,capInput.marketCapProjection);assert.equal(seed.history.summary.serverPulse,historyInput.summary.serverPulse);
 for(const row of membershipInput.transport.publicOriginals)assert.equal(ids.get(row.id)?.assetId,row.receizId,`Cold ${path} retains every selected Original beyond the viewport.`);
 const family=JSON.stringify(catalog);if(staticFamily===undefined){staticFamily=family;staticCatalog=catalog;}else assert.equal(family,staticFamily,'Category documents retain the same underlying complete family.');
 const opening=document.slice(document.indexOf('id="public-explore-root"'),match.index),category=path.split('/')[2],items=category?catalog.items.filter(categoryMatches[category]):catalog.items;
 assert.ok(!opening.includes('public-entry-placeholder'),`Cold ${path} paints the existing interface before JavaScript.`);
 assert.equal((opening.match(/class="asset-row"/g)??[]).length,path==='/market-cap/'?0:Math.min(50,items.length),`Cold ${path} paints only its first viewport of held rows.`);
 assert.equal(page.preparedRevision,undefined,'Ordinary navigation keeps its existing entry contract without freshness coordinates.');
}
console.log('Verified cold Explorer/category rows, one complete display seed per document, and unchanged ordinary navigation/Bank seed boundaries.');
// Publication preparation consumes these exact compiled templates too. A new
// static seed must be replaced, not retained beside the accepted successor.
const {renderPublicMarketDocument}=await import(new URL('../server/profile-runtime/public-market-document.mjs',import.meta.url).href);
const {snapshot:publicationSnapshot,...publicationMembership}=membershipInput,publicationMaterial=JSON.stringify({membership:publicationMembership,snapshot:publicationSnapshot,sports:JSON.parse(await readFile('public/receiz-public-sports.json','utf8')),capitalization:capInput,history:historyInput,marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:Math.max(historyInput.summary.serverPulse,capInput.marketCapProjection.serverPulse)}}),publicationGeneration=createHash('sha256').update(publicationMaterial).digest('hex');
for(const path of ['/explore/','/explore/images/']){
 const template=await readFile(`dist${path}index.html`,'utf8'),output=await renderPublicMarketDocument({material:publicationMaterial,generation:publicationGeneration,template,path:path.slice(1,-1)}),scripts=[...output.matchAll(/<script id="public-market-seed" type="application\/json">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1,`Prepared ${path} replaces the static seed exactly once.`);const seed=JSON.parse(scripts[0][1]);
 assert.equal(seed.generation,publicationGeneration);assert.equal(seed.path,path.slice(1,-1));
 if(seed.catalogGzip){assert.equal(seed.catalog,undefined);assert.ok(seed.catalogGzip.bytes<=32*1024*1024);const compressed=Buffer.from(seed.catalogGzip.gzipB64u,'base64url');assert.ok(compressed.length<=8*1024*1024);const bytes=gunzipSync(compressed,{maxOutputLength:32*1024*1024});assert.equal(bytes.length,seed.catalogGzip.bytes);seed.catalog=JSON.parse(bytes.toString('utf8'));}
 assert.equal(JSON.stringify(seed.catalog),staticFamily,'Publication preserves the entire selected public family through the existing seed codec.');
 assert.ok(Buffer.byteLength(output)<=32*1024*1024,`Prepared ${path} retains the existing delivery capacity.`);assert.ok(output.includes(`src="${navigation.pages[path].entry}"`),'Publication preserves the exact compiled runtime facade.');
}
console.log('Verified accepted publication rendering from actual compiled Explorer/category templates with one full seed inside the existing delivery capacity.');
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
  // Feed is a dedicated immersive document; its lean navigation and first paint
  // have their own assertions below. Existing guide documents remain identical.
  if(path==='/feed/'||path==='/discover/')continue;
  const routeHtml=await readFile(`dist${path}index.html`,'utf8');
  assert.deepEqual(routeHtml.match(sharedExamplePattern),sharedExampleBank,`Cold ${path} keeps the same shared walkthrough destinations`);
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
 assert.equal((head.match(/rel="canonical"/g)??[]).length,page.template?0:1);if(!page.template)assert.ok(head.includes(`rel="canonical" href="${url}"`));
 assert.ok(head.includes(`name="description" content="${escapeMetadata(page.description)}"`));
 if(page.template)assert.ok(!head.includes('property="og:url"'),'A route template must not replace a personalized URL');else assert.ok(head.includes(`property="og:url" content="${url}"`));
 assert.ok(head.includes(`property="og:image" content="${publicOrigin+image.url}"`));assert.ok(head.includes(`name="twitter:image" content="${publicOrigin+image.url}"`));
 for(const field of ['og:image:width','og:image:height','og:image:alt','twitter:image:alt'])assert.ok(head.includes(field),`${field}: ${page.path}`);
 assert.equal(bytes.readUInt32BE(16),image.width);assert.equal(bytes.readUInt32BE(20),image.height);assert.equal(createHash('sha256').update(bytes).digest('hex'),image.sha256);assert.equal(bytes.length,image.bytes);
 if(page.path!=='/'){assert.ok(bytes.length<700_000,'Per-page share image size');assert.ok(!sw.includes(image.url),'Sharing art must never increase the PWA install or opening work');}
 assert.ok(!uniqueImages.has(image.sha256),`Unique sharing image: ${page.path}`);uniqueImages.add(image.sha256);uniqueTitles.add(page.title);uniqueDescriptions.add(page.description);
 assert.equal(sitemap.includes(`<loc>${url}</loc>`),!page.noindex,`Only indexable canonical pages belong in sitemap: ${page.path}`);
 assert.ok(head.includes(page.noindex?'noindex,':'index,follow,max-image-preview:large'));assert.ok(!head.includes('dateModified'), 'No invented modification date');
 const graphs=[...head.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].flatMap(match=>JSON.parse(match[1])['@graph']);
 if(page.template){assert.ok(page.noindex,'Route templates are not standalone search results');assert.ok(graphs.some(node=>node['@type']==='WebPage'&&node.name===page.title));}else{assert.ok(graphs.some(node=>node.url===url&&node['@id']===url+'#page'),'Page-specific structured data');assert.ok(graphs.some(node=>node['@type']==='BreadcrumbList'));}
 if(['/explore/','/ledger/','/verify/','/conformance/'].includes(page.path))assert.ok(/<h1>[\s\S]+?<\/h1>/.test(html),'Public entry has readable copy before JavaScript');
}
assert.equal(uniqueTitles.size,publicPages.length);assert.equal(uniqueDescriptions.size,publicPages.length);assert.ok(!sitemap.includes('<lastmod>'),'A build date must not impersonate a content modification date');
for (const url of html.matchAll(/(?:href|src)="(\/learn\/learn\.(?:css|js)\?v=[a-f0-9]{12})"/g)) assert.ok(sw.includes(JSON.stringify(url[1])), `Versioned Learn asset must be precached: ${url[1]}`);
const css = await readFile('dist/learn/learn.css'), motion = await readFile('dist/learn/learn.js');
// The route-scoped invitation-history privacy filter adds 59 gzip bytes to the
// 14,996-byte baseline. The receiving runtime and styles remain page-only.
assert.ok(gzipSync(css).length + gzipSync(motion).length < 15_100, 'Shared public presentation runtime budget, including guides and retained asset/profile routes');
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
// Both cold Ledger entries carry the same retained financial prefix and the
// complete current public Original cohort before any browser work begins.
const heldLedger=JSON.parse(gunzipSync(await readFile('public/receiz-public-ledger.json.gz.bin')).toString('utf8'));
const financialIds=heldLedger.records.filter(row=>row.source!=='proofs').map(row=>row.id).sort(),proofIds=membershipInput.transport.publicOriginals.map(row=>row.id).sort();
let financialPacket;
for(const path of ['ledger','ledger/proofs']){
 const document=path==='ledger'?ledger:await readFile(`dist/${path}/index.html`,'utf8'),scripts=[...document.matchAll(/<script id="public-ledger-document-seed" type="application\/json">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1,`Cold ${path} carries the settled Ledger exactly once.`);assert.ok(document.includes(`<link rel="canonical" href="https://bankeiz.com/${path}/">`));
 const seed=JSON.parse(scripts[0][1]);assert.equal(seed.schema,'bank.public-ledger.document.v1');assert.equal(seed.path,path);assert.equal(seed.snapshot,undefined);assert.equal(seed.snapshotGzip.length,2);
 const packets=seed.snapshotGzip.map(packet=>{const bytes=gunzipSync(Buffer.from(packet.gzipB64u,'base64url'),{maxOutputLength:64*1024*1024});assert.equal(bytes.length,packet.bytes);return JSON.parse(bytes.toString('utf8'));}),rows=packets.flatMap(packet=>packet.records);
 assert.deepEqual(rows.filter(row=>row.source!=='proofs').map(row=>row.id).sort(),financialIds,`Cold ${path} retains all financial history.`);
 assert.deepEqual(rows.filter(row=>row.source==='proofs').map(row=>row.sourceId).sort(),proofIds,`Cold ${path} carries every selected Original, with no withdrawn proof cohort.`);
 assert.equal(packets[0].inspectionVersion,heldLedger.inspectionVersion,'Packing public history never claims a newer financial inspection.');assert.ok(rows.every(row=>row.authority==='public-source-projection'&&row.origin===undefined));
 assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);const prefix=JSON.stringify(seed.snapshotGzip[0]);if(financialPacket===undefined)financialPacket=prefix;else assert.equal(prefix,financialPacket,'All Ledger categories reuse the exact compressed financial prefix.');
 const opening=document.slice(document.indexOf('id="public-ledger-root"'),scripts[0].index);assert.ok(/class="public-ledger-row(?:\s|")/.test(opening),`Cold ${path} paints held records before JavaScript.`);assert.ok(!opening.includes('public-entry-placeholder'));
 assert.ok(Buffer.byteLength(document)<=32*1024*1024,`Cold ${path} remains within the existing document capacity.`);
}
assert.ok(!html.includes('id="public-ledger-document-seed"'),'Bank entry never duplicates the complete Ledger.');
assert.ok(Object.values(navigation.pages).every(page=>!page.content.includes('id="public-ledger-document-seed"')),'Ordinary navigation keeps its existing compact Ledger entry.');
console.log('Verified cold Ledger and Proofs rows, all selected Originals, retained financial history and exact shared history packets.');
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

const checkout=await readFile('dist/pay/checkout.html','utf8');
assert.ok(builds['pay/checkout.html']?.isEntry,'Hosted checkout has a separate entry');
assert.ok(checkout.includes('data-checkout-root')&&checkout.includes('<noscript>')&&!checkout.includes('receiz-navigation'),'Checkout has its own readable shell without the public catalog');
const checkoutImports=new Set();
async function checkCheckoutEntry(key){
 if(checkoutImports.has(key))return;checkoutImports.add(key);const entry=builds[key];assert.ok(entry);
 const body=await readFile('dist/'+entry.file,'utf8');
 assert.ok(!/receiz-public-market\.json|bankeiz:private|\/api\/chat\/conversations|bankeiz-chart-worker/.test(body),'Checkout static entry does not start dashboard, messaging or market work');
 for(const dep of entry.imports??[])await checkCheckoutEntry(dep);
}
await checkCheckoutEntry('pay/checkout.html');
console.log('Verified dedicated hosted checkout entry and static import boundary.');

const certificateDocument=await readFile('dist/shares/index.html','utf8');
const certificatePaint=certificateDocument.slice(certificateDocument.indexOf('id="public-explore-root"'),certificateDocument.indexOf('<script id="receiz-navigation"'));
assert.ok(certificatePaint.includes('certificate-public-header')&&certificatePaint.includes('certificate-public-footer'),'A direct certificate carries its own settled public shell.');
assert.ok(!certificatePaint.includes('site-footer'),'A certificate never first paints the global footer.');
assert.ok(certificateDocument.includes('data-bank-surface="explore"')&&certificateDocument.includes('/learn/learn.js')&&certificateDocument.includes('id="receiz-navigation"'),'Certificate entry retains the existing public navigation and Bank purchase host.');
console.log('Verified direct certificate shell, compact footer, existing navigation and purchase runtime.');

const feedDocument=await readFile('dist/feed/index.html','utf8');
const feedOpening=feedDocument.slice(0,feedDocument.indexOf('<script id="receiz-navigation"'));
assert.ok(feedOpening.includes('data-public-runtime="feed"')&&feedOpening.includes('data-feed-item=')&&feedOpening.includes('id="public-feed-seed"'),'Feed first paint carries actual existing source rows and their matching stage.');
assert.ok(feedOpening.includes('<style data-public-page-style="feed">')&&!/<link rel="stylesheet"/.test(feedOpening),'The feed stage never waits on a stylesheet request.');
assert.ok(/<script type="module" async[^>]*src="\/assets\/feed-/.test(feedDocument),'Feed starts before its unrelated navigation payload.');
assert.ok(!feedOpening.includes('site-footer')&&!feedOpening.includes('account-opening-screen'),'Feed first paint is the actual content, with no global footer or account-entry work.');
const feedNavigation=JSON.parse(feedDocument.match(navigationPattern)[1]);
assert.deepEqual(Object.keys(feedNavigation.pages).sort(),[...new Set([...Object.keys(navigation.pages),'/feed/','/discover/'])].sort(),'Feed retains every known destination for the existing instant controller.');
for(const [path,page]of Object.entries(feedNavigation.pages))if(!['/explore/','/feed/','/discover/'].includes(path)){assert.equal(page.content,'','Only the existing Explore return carries a full body in the immersive Feed.');if(!page.runtime){if(path==='/legal/')assert.equal(page.head,navigation.pages[path].head,'The final legal generator keeps its exact current notices head.');else{assert.equal(page.head,'','Unvisited static heads remain compact.');assert.match(page.headSha256,/^[a-f0-9]{64}$/);}assert.match(page.contentSha256,/^[a-f0-9]{64}$/);}}
assert.equal(feedNavigation.pages['/feed/'].content,'','The current Feed body is already present in its retained runtime root.');
const expandFeedPart=value=>Array.isArray(value)?value.map(part=>typeof part==='number'?feedNavigation.styles[part]:part).join(''):value;
const carriedDiscover=feedNavigation.pages['/discover/'];
assert.deepEqual({...carriedDiscover,head:expandFeedPart(carriedDiscover.head),content:expandFeedPart(carriedDiscover.content)},{...navigation.pages['/discover/'],content:''},'Feed retains exact static Discover metadata and its original cached JSON fallback without duplicating the body.');
assert.ok(navigation.pages['/discover/'].content.includes('id="public-discovery-seed"'),'The global restored Discover descriptor retains its matching static seed.');
assert.ok(feedNavigation.reserved?.includes('learn')&&feedNavigation.reserved?.includes('ledger'),'The shipped lean navigation carries the existing reserved route projection.');
// Complete authored text is carried data, not interface overhead. Keep the
// original interface budgets without cutting text or making readers fetch it.
const staticItems=new Map(staticCatalog.items.map(item=>[item.id,item]));
function carriedTextSize(document,id,count){
 const match=document.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>'));
 assert.ok(match);const items=JSON.parse(match[1]);assert.equal(items.length,count,'The existing first-paint item count is preserved.');
 return items.reduce((size,item)=>{assert.deepEqual(item.carriedText,staticItems.get(item.id)?.carriedText,'First-paint text is the complete selected Original text.');return size+(item.carriedText?JSON.stringify(item.carriedText).replaceAll('<','\\u003c').replaceAll('>','\\u003e').replaceAll('&','\\u0026').length:0);},0);
}
assert.ok(feedDocument.length-carriedTextSize(feedDocument,'public-feed-seed',8)<600000,'The dedicated feed interface and non-text payload stay under 600 kB uncompressed.');
const feedImports=new Set();
async function checkFeedEntry(key){if(feedImports.has(key))return;feedImports.add(key);const entry=builds[key];assert.ok(entry);const body=await readFile('dist/'+entry.file,'utf8');assert.ok(!/createNativeIdentity|\/api\/chat\/conversations|native-account\/ensure|createCheckoutIdentitySession/.test(body),'Feed static entry cannot mount account/payment/messaging execution before user intent.');for(const dep of entry.imports??[])await checkFeedEntry(dep);}
await checkFeedEntry('feed/index.html');
console.log('Verified source-carried Feed first paint, inline styles, lean navigation and intent-only account import boundary.');

const discoveryDocument=await readFile('dist/discover/index.html','utf8');
const discoveryOpening=discoveryDocument.slice(0,discoveryDocument.indexOf('<script id="receiz-navigation"'));
assert.ok(discoveryOpening.includes('data-public-runtime="discover"')&&discoveryOpening.includes('class="discover-gallery"')&&discoveryOpening.includes('id="public-discovery-seed"'),'Discovery paints the real gallery and its same source before navigation.');
assert.ok(discoveryOpening.includes('<style data-public-page-style="discover">')&&!/<link rel="stylesheet"/.test(discoveryOpening),'Discovery does not wait for a stylesheet.');
assert.ok(/<script type="module" async[^>]*src="\/assets\/discover-/.test(discoveryDocument),'Discovery hydrates before unrelated document payload.');
assert.ok(!discoveryOpening.includes('site-footer')&&!discoveryOpening.includes('account-opening-screen'),'Discovery starts with works, without footer or account work.');
assert.ok(discoveryDocument.length-carriedTextSize(discoveryDocument,'public-discovery-seed',12)<700000,'Discovery interface and non-text payload remain below 700 kB uncompressed.');
