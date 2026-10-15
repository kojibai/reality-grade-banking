import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const html = await readFile('dist/index.html', 'utf8'), image = await readFile('dist/receiz-bank-share.png');
assert.match(html, /<h1[^>]*>Your value\./);
assert.match(html, /property="og:image" content="https:\/\/bank\.receiz\.com\/receiz-bank-share\.png"/);
assert.match(html, /name="twitter:card" content="summary_large_image"/);
assert.match(html, /rel="canonical" href="https:\/\/bank\.receiz\.com\/"/);
assert.equal(image.readUInt32BE(16), 1730); assert.equal(image.readUInt32BE(20), 909); assert.ok(image.length < 5_000_000);
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
for (const path of ['', 'receiz-id/', 'proof-objects/', 'reserve-and-settlement/']) {
  const page = await readFile(`dist/learn/${path}index.html`, 'utf8');
  assert.ok(page.includes(`<link rel="canonical" href="https://bank.receiz.com/learn/${path}">`));
  assert.ok(page.includes('<h1>')); assert.ok(page.includes('<h2>')); assert.ok(!page.includes('<div id="root"></div>'));
  assert.match(page, /property="og:image" content="https:\/\/bank\.receiz\.com\/receiz-bank-learn-share\.jpg"/);
  assert.match(page, /name="twitter:image:alt"/);
  assert.match(page, /href="\/learn\/learn.css"/); assert.match(page, /src="\/learn\/learn.js" defer/);
  assert.ok(!/<script type="module"[^>]*src="\/assets\/index-/.test(page), 'Public guides must not execute the private app runtime');
  assert.ok(page.includes('id="receiz-navigation"'), 'Public guide transitions are preloaded');
  for (const json of page.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) JSON.parse(json[1]);
  assert.ok(sitemap.includes(`https://bank.receiz.com/learn/${path}`));
}
const robots = await readFile('dist/robots.txt', 'utf8'); assert.match(robots, /Disallow: \/api\//); assert.ok(!sitemap.includes('#'));
const sw = await readFile('dist/sw.js', 'utf8'); assert.ok(!sw.includes('qr-decoder'));
const css = await readFile('dist/learn/learn.css'), motion = await readFile('dist/learn/learn.js');
assert.ok(gzipSync(css).length + gzipSync(motion).length < 12_000, 'Public presentation runtime budget');
assert.ok((await readFile('dist/learn/proof-glass.webp')).length < 180_000, 'Hero art budget');
const share = await readFile('dist/receiz-bank-learn-share.jpg');
assert.equal(share.readUInt16BE(0), 0xffd8); assert.ok(share.length < 500_000, 'Social image budget');
assert.ok(css.toString().includes('prefers-reduced-motion:reduce'));
assert.ok(css.toString().includes('animation-play-state:paused'));
assert.ok(motion.toString().includes('IntersectionObserver'));
const learn = await readFile('dist/learn/index.html', 'utf8');
assert.ok(learn.includes('Carry value.<br>Keep the proof.'));
assert.ok(learn.includes('Unissued specimens, with no spendable value.'));
assert.ok(learn.includes('legacy payment rails') && !learn.includes('familiar payment rails'));
assert.ok(learn.indexOf('id="notes"') > learn.indexOf('class="rail-section'));
for (const rail of ['reserve', 'settlement']) {
  assert.ok(learn.includes(`src="/learn/${rail}-note.webp" width="1620" height="972" loading="lazy"`));
  const note = await readFile(`dist/learn/${rail}-note.webp`);
  assert.equal(note.toString('ascii', 0, 4), 'RIFF');
  assert.equal(note.toString('ascii', 8, 12), 'WEBP');
  assert.ok(note.length < 700_000, 'Below-fold note artwork budget');
  assert.ok(!note.includes(Buffer.from('receiz.bank.note')), 'Learn specimens must not contain issued proof payloads');
}
assert.ok(!learn.includes('still being connected'));
console.log('Share image, static metadata, prerendered entrance, four canonical public guides, structured data, sitemap, robots and QR lazy loading verified.');
