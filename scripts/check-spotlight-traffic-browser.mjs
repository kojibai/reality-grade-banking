import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, resolve} from 'node:path';
import {chromium} from 'playwright';

const directory = resolve('dist');
const report = '/api/bank/spotlight/in-view';
const mimeTypes = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png'};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = resolve(directory, '.' + (url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname));
    if (!path.startsWith(directory + '/')) return response.writeHead(404).end();
    const bytes = await readFile(path);
    response.writeHead(200, {'content-type': mimeTypes[extname(path)] ?? 'application/octet-stream'}).end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const entry = JSON.parse(await readFile(resolve(directory, '.vite/manifest.json'), 'utf8'))['discover/index.html'].file;
let browser;
try {
  browser = await chromium.launch({headless: true, ...(process.env.BANK_BROWSER_EXECUTABLE
    ? {executablePath: process.env.BANK_BROWSER_EXECUTABLE} : {})});
  const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
  const page = await context.newPage();
  const received = [];
  await page.route('**/*', route => {
    const {origin: site, pathname} = new URL(route.request().url());
    if (site !== origin || (pathname.startsWith('/api/') && pathname !== report)) return route.abort();
    if (pathname === report) {
      received.push(route.request());
      return route.fulfill({status: 204});
    }
    return route.continue();
  });
  let releaseEntry;
  const gate = new Promise(resolve => { releaseEntry = resolve; });
  await page.route('**/' + entry, async route => { await gate; await route.continue(); });
  await page.goto(origin + '/discover/', {waitUntil: 'commit'});
  await page.locator('.discover-gallery .discover-work').first().waitFor({state: 'visible'});
  assert.equal(received.length, 0, 'held Discover must paint with the runtime and APIs blocked');
  await page.evaluate(() => { window.heldSpotlightCard = document.querySelector('.discover-gallery .discover-work'); });
  const seen = page.waitForRequest(request => new URL(request.url()).pathname === report);
  releaseEntry();
  const request = await seen;
  assert.equal(request.method(), 'POST');
  assert.equal(request.postData(), null);
  const headers = await request.allHeaders();
  assert.equal(headers['sec-fetch-site'], 'same-origin');
  assert.equal(headers['sec-fetch-mode'], 'same-origin');
  assert.equal(headers['sec-fetch-dest'], 'empty');
  assert.equal(new URL(headers.referer).pathname, '/discover/');
  assert.equal(await page.evaluate(() => window.heldSpotlightCard === document.querySelector('.discover-gallery .discover-work')), true);
  await page.locator('.discover-gallery .discover-work').nth(5).scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_150);
  assert.equal(received.length, 1, 'one audience sample per document even as more eligible cards enter view');
  await context.close();
  console.log('Verified compiled Discover first paint and one post-paint, credentialless, same-origin Spotlight sample.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
