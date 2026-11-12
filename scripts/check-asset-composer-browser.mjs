import assert from 'node:assert/strict';
import {access, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const cache = await mkdtemp(join(tmpdir(), 'bankeiz-asset-composer-browser-'));
const server = await createServer({cacheDir: cache, server: {host: '127.0.0.1', port: 5229, strictPort: false}, optimizeDeps: {noDiscovery: true, include: ['react', 'react-dom/client', 'lucide-react', 'fflate']}});
let browser;
try {
  await server.listen();
  const origin = server.resolvedUrls.local[0].replace(/\/$/, '');
  const executables = process.env.BANK_BROWSER_EXECUTABLE ? [process.env.BANK_BROWSER_EXECUTABLE] : [
    chromium.executablePath(),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  ];
  let executablePath;
  for (const candidate of executables) { try { await access(candidate); executablePath = candidate; break; } catch {} }
  assert.ok(executablePath, 'Install Playwright Chromium or set BANK_BROWSER_EXECUTABLE to an installed Chromium browser.');
  browser = await chromium.launch({headless: true, executablePath});

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7XkAAAAASUVORK5CYII=', 'base64');
  async function pageFor(width, composer = false, reducedMotion = 'reduce') {
    const context = await browser.newContext({viewport: {width, height: 844}, isMobile: width < 600, hasTouch: width < 600, reducedMotion, serviceWorkers: 'block'});
    const page = await context.newPage(), errors = [], forbidden = [];
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname.startsWith('/api/')) { forbidden.push(url.href); return route.abort(); }
      if (url.pathname === '/favicon.ico') return route.fulfill({status: 204});
      return route.continue();
    });
    if (composer) await context.addInitScript(() => {
      window.__assetComposerMediaRequests = 0;
      Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {getUserMedia: async () => {
        window.__assetComposerMediaRequests++;
        throw Error('No camera hardware in composer browser qualification.');
      }}});
    });
    const clean = () => { assert.deepEqual(forbidden, [], 'Fixture attempted a service request'); assert.deepEqual(errors, [], 'Browser errors are never suppressed'); };
    return {page, context, clean};
  }
  async function fullscreen(page, width) {
    const bounds = await page.locator('dialog.sheet--asset-studio').evaluate(element => {
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return {x: box.x, y: box.y, width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, radius: style.borderRadius, overflow: document.documentElement.scrollWidth};
    });
    assert.ok(Math.abs(bounds.x) <= 1 && Math.abs(bounds.y) <= 1 && Math.abs(bounds.width - bounds.viewportWidth) <= 1 && Math.abs(bounds.height - bounds.viewportHeight) <= 1, `Creation sheet must fill ${width}px viewport: ${JSON.stringify(bounds)}`);
    assert.equal(bounds.radius, '0px');
    assert.ok(bounds.overflow <= bounds.viewportWidth + 1, `No horizontal overflow at ${width}px`);
  }

  for (const reducedMotion of ['no-preference', 'reduce']) {
    const {page, context, clean} = await pageFor(390, true, reducedMotion);
    try {
      await page.goto(origin + '/tests/browser/asset-composer.html?delivery=controlled');
      await page.getByLabel('Choose original', {exact: true}).setInputFiles({name: 'local-original.png', mimeType: 'image/png', buffer: png});
      await page.getByLabel('Title', {exact: true}).fill('One held Original');
      await page.getByRole('button', {name: 'Review original', exact: true}).click();
      await page.getByRole('button', {name: 'Create asset', exact: true}).click();
      await page.getByRole('status', {name: 'Delivering your Original', exact: true}).waitFor();
      assert.equal(await page.getByRole('button', {name: 'Retry public delivery', exact: true}).count(), 0);
      assert.equal(await page.getByRole('button', {name: 'Sign', exact: true}).isEnabled(), true);
      const animation = await page.locator('.asset-seal-progress .inline-opening-trace i').first().evaluate(element => getComputedStyle(element).animationName);
      assert.equal(animation, reducedMotion === 'reduce' ? 'none' : 'inline-opening-trace');
      await fullscreen(page, 390);
      await page.evaluate(() => window.composerFixture.finishDelivery());
      await page.getByRole('status', {name: 'Delivering your Original', exact: true}).waitFor({state: 'detached'});
      assert.equal(await page.getByRole('button', {name: 'Sign', exact: true}).isEnabled(), true);
      assert.deepEqual(await page.evaluate(() => ({created: window.composerFixture.created, retried: window.composerFixture.retried})), {created: 1, retried: 0});
      clean();
      console.log(`PASS immediate held Original, animated first delivery, early Sign and automatic acknowledgment without retry: motion=${reducedMotion}`);
    } finally { await context.close(); }
  }

  for (const width of [320, 390, 1280]) {
    const {page, context, clean} = await pageFor(width, true);
    try {
      await page.goto(origin + '/tests/browser/asset-composer.html');
      await page.getByRole('button', {name: 'Review original', exact: true}).waitFor();
      await fullscreen(page, width);
      assert.equal(await page.evaluate(() => window.__assetComposerMediaRequests), 0, 'Opening Create must not request camera permission');
      assert.deepEqual(await page.evaluate(() => ({created: window.composerFixture.created, retried: window.composerFixture.retried, funded: window.composerFixture.funded})), {created: 0, retried: 0, funded: 0});
      const original = page.getByLabel('Choose original', {exact: true});
      await original.evaluate(input => input.addEventListener('change', () => { window.__chosenOriginal = input.files[0]; }, {capture: true, once: true}));
      await original.setInputFiles({name: 'local-original.png', mimeType: 'image/png', buffer: png});
      await page.getByLabel('Title', {exact: true}).fill('A complete release');
      await page.getByLabel('Description', {exact: true}).fill('Local original with its complete source material.');
      await page.getByRole('button', {name: 'Review original', exact: true}).click();
      await page.locator('[data-creation-step="review"]').waitFor();
      assert.equal(await page.getByLabel('Title', {exact: true}).inputValue(), 'A complete release');
      assert.match(await page.locator('.asset-review-preview').textContent(), /local-original\.png/);
      await page.getByRole('button', {name: 'Edit original', exact: true}).click();
      await page.locator('[data-creation-step="canvas"]').waitFor();
      assert.equal(await page.getByLabel('Title', {exact: true}).inputValue(), 'A complete release');
      await page.waitForFunction(() => document.querySelector('img[alt="Selected original"]')?.naturalWidth > 0);
      await page.getByRole('button', {name: 'Attach', exact: true}).click();
      const additions = page.locator('details[data-composer-section="attachments"]');
      await additions.waitFor();
      assert.equal(await additions.getAttribute('open'), '', 'Attach opens the actual attachment editor');
      await page.getByLabel('Add attachments', {exact: true}).setInputFiles({name: 'source-notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Retained original source notes.')});
      await page.getByLabel('Full text', {exact: true}).fill('A complete original, written in the browser fixture.');
      await additions.locator('li details summary').click();
      await additions.locator('li select').selectOption('source');
      await additions.locator('li textarea').fill('Research accompanying the original.');
      await page.locator('summary').filter({hasText: /^Asset details/}).click();
      await page.getByLabel('Short code', {exact: true}).fill('LOCAL');
      await page.getByLabel('Defined units', {exact: true}).fill('25');
      const collection = page.locator('details[data-composer-section="collection"]');
      assert.equal(await collection.getAttribute('open'), null, 'Collection starts collapsed in Details');
      await collection.locator('summary').click();
      assert.equal(await page.getByLabel('Allow original download', {exact: true}).isChecked(), true);
      assert.equal(await page.getByLabel('Allow derivative download', {exact: true}).isChecked(), false);
      assert.equal(await page.getByLabel('Gate audio playback', {exact: true}).count(), 0, 'Only audio exposes the playback gate');
      await page.getByLabel('Original download quantity', {exact: true}).fill('7');
      await page.getByLabel('Original download price (USD)', {exact: true}).fill('0.001');
      await page.getByRole('button', {name: 'Create asset', exact: true}).click();
      await page.getByRole('button', {name: 'Create asset', exact: true}).waitFor();
      assert.equal(await page.evaluate(() => window.composerFixture.created), 0, 'An invalid price must stop before creation');
      assert.equal(await page.getByLabel('Original download price (USD)', {exact: true}).getAttribute('aria-invalid'), 'true');
      await page.getByLabel('Original download price (USD)', {exact: true}).fill('1.25');
      await page.getByLabel('Allow derivative download', {exact: true}).check();
      await page.getByLabel('Derivative download quantity', {exact: true}).fill('3');
      await page.getByLabel('Derivative download price (USD)', {exact: true}).fill('2.50');
      await page.getByLabel('Allow moment record download', {exact: true}).check();
      await fullscreen(page, width);
      if (process.env.BANK_ASSET_COMPOSER_SCREENSHOTS) {
        await mkdir(process.env.BANK_ASSET_COMPOSER_SCREENSHOTS, {recursive: true});
        await collection.evaluate(element => element.scrollIntoView({block: 'center'}));
        await page.screenshot({path: join(process.env.BANK_ASSET_COMPOSER_SCREENSHOTS, `collection-${width}.png`)});
      }
      assert.equal(await page.evaluate(() => window.composerFixture.created), 0, 'Editing metadata must not seal the original');
      await page.getByRole('button', {name: 'Create asset', exact: true}).click();
      await page.getByRole('heading', {name: 'Your Original is sealed.', exact: true}).waitFor();
      const selected = await page.evaluate(async () => {
        const fixture = window.composerFixture, primary = fixture.draft.files.find(entry => entry.role === 'primary'), attachment = fixture.draft.files.find(entry => entry.role === 'attachment');
        return {created: fixture.created, funded: fixture.funded, exactFile: primary.file === window.__chosenOriginal, primary: {name: primary.file.name, type: primary.file.type, bytes: Array.from(new Uint8Array(await primary.file.arrayBuffer()))}, attachment: {name: attachment.file.name, role: attachment.attachmentRole, description: attachment.description}, longForm: fixture.draft.longForm, definition: fixture.definition, collection: fixture.draft.collection};
      });
      assert.equal(selected.created, 1); assert.equal(selected.funded, 0); assert.equal(selected.exactFile, true, 'Canvas/review/back must retain the same File object');
      assert.deepEqual(selected.primary, {name: 'local-original.png', type: 'image/png', bytes: [...png]});
      assert.deepEqual(selected.attachment, {name: 'source-notes.txt', role: 'source', description: 'Research accompanying the original.'});
      assert.equal(selected.longForm, 'A complete original, written in the browser fixture.');
      assert.deepEqual(selected.collection, {allowOriginalDownload: true, allowDerivativeDownload: true, allowMomentRecordDownload: true, gateAudioPlayback: false, originalDownloadLimit: 7, derivativeDownloadLimit: 3, originalDownloadPriceCents: 125, derivativeDownloadPriceCents: 250});
      assert.equal(selected.definition.name, 'A complete release'); assert.equal(selected.definition.symbol, 'LOCAL'); assert.equal(selected.definition.units, '25');
      await page.getByRole('button', {name: 'Retry public delivery', exact: true}).click();
      await page.getByRole('button', {name: 'Sign', exact: true}).waitFor();
      assert.deepEqual(await page.evaluate(() => ({created: window.composerFixture.created, retried: window.composerFixture.retried, funded: window.composerFixture.funded})), {created: 1, retried: 1, funded: 0}, 'Retry must deliver the existing original without creating another');
      assert.equal(await page.evaluate(() => window.__assetComposerMediaRequests), 0);
      clean();
      console.log(`PASS fullscreen Create asset, exact local file, canvas/review/back, attachments/text/metadata, pending delivery retry and no camera/service work: ${width}px`);
    } finally { await context.close(); }
  }

  for (const width of [320, 390, 1280]) {
    const {page, context, clean} = await pageFor(width);
    try {
      await page.goto(origin + '/tests/browser/asset-camera.html');
      await page.getByRole('button', {name: 'Enable synthetic camera', exact: true}).waitFor();
      const supported = await page.evaluate(() => window.assetCameraFixture.supported);
      assert.ok(supported.captureStream && supported.recorder && supported.mimes.length, `UNSUPPORTED browser media APIs; camera qualification did not pass: ${JSON.stringify(supported)}`);
      assert.equal(await page.evaluate(() => window.assetCameraFixture.requests), 0);
      const openCamera = async () => {
        await page.getByRole('button', {name: 'Enable synthetic camera', exact: true}).click();
        await page.waitForFunction(() => document.querySelector('.asset-camera')?.getAttribute('data-state') === 'ready' && document.querySelector('.asset-camera video')?.videoWidth === 640);
        await fullscreen(page, width);
      };
      const hold = async () => {
        const bounds = await page.getByRole('button', {name: 'Capture photo or hold for video', exact: true}).boundingBox();
        assert.ok(bounds, 'Shutter must be visible');
        await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.waitForFunction(() => document.querySelector('.asset-camera')?.getAttribute('data-state') === 'recording');
      };
      await openCamera();
      const shutter = page.getByRole('button', {name: 'Capture photo or hold for video', exact: true});
      if (width < 600) await shutter.tap(); else await shutter.click();
      await page.getByRole('button', {name: 'Enable synthetic camera', exact: true}).waitFor();
      const photo = await page.evaluate(async () => {
        const file = window.assetCameraFixture.files[0], bitmap = await createImageBitmap(file);
        const result = {type: file.type, size: file.size, header: Array.from(new Uint8Array(await file.arrayBuffer()).slice(0, 3)), width: bitmap.width, height: bitmap.height};
        bitmap.close(); return result;
      });
      assert.equal(photo.type, 'image/jpeg'); assert.ok(photo.size > 1000 && photo.size < 4 * 1024 * 1024); assert.deepEqual(photo.header, [255, 216, 255]); assert.equal(photo.width, 640); assert.equal(photo.height, 360);
      await openCamera();
      await hold();
      await page.waitForFunction(() => document.querySelector('time[aria-label="Recording duration"]')?.textContent === '0:01');
      await page.mouse.up();
      await page.getByRole('button', {name: 'Enable synthetic camera', exact: true}).waitFor();
      const movie = await page.evaluate(async () => {
        const file = window.assetCameraFixture.files[1], bytes = new Uint8Array(await file.arrayBuffer()), video = document.createElement('video'), url = URL.createObjectURL(file);
        let timeout;
        try {
          const metadata = new Promise((resolve, reject) => {
            timeout = setTimeout(() => reject(Error('Captured video metadata timed out')), 8000);
            video.onloadedmetadata = resolve; video.onerror = () => reject(Error('Captured video could not decode'));
          });
          video.src = url; await metadata;
          return {type: file.type, size: file.size, header: Array.from(bytes.slice(0, 4)), box: String.fromCharCode(...bytes.slice(4, 8)), width: video.videoWidth, height: video.videoHeight};
        } finally { clearTimeout(timeout); video.removeAttribute('src'); video.load(); URL.revokeObjectURL(url); }
      });
      assert.match(movie.type, /^video\/(mp4|webm)(?:;|$)/); assert.ok(movie.size > 1000 && movie.size < 4 * 1024 * 1024); assert.equal(movie.width, 640); assert.equal(movie.height, 360);
      if (movie.type.startsWith('video/mp4')) assert.equal(movie.box, 'ftyp'); else assert.deepEqual(movie.header, [26, 69, 223, 163]);
      await openCamera();
      await hold();
      await page.keyboard.press('Escape');
      await page.getByRole('button', {name: 'Enable synthetic camera', exact: true}).waitFor();
      await page.mouse.up();
      const cleanup = await page.evaluate(() => {
        const qa = window.assetCameraFixture;
        return {requests: qa.requests, stops: qa.stops, mounts: qa.mounts, unmounts: qa.unmounts, closes: qa.closes, liveAtClose: qa.liveAtClose, captures: qa.files.length, frames: qa.frames, frameLoops: qa.frameLoops.size, tracks: qa.streams.flatMap(stream => stream.getTracks()).map(track => track.readyState)};
      });
      assert.equal(cleanup.requests, 3); assert.equal(cleanup.stops, 3); assert.equal(cleanup.mounts, 3); assert.equal(cleanup.unmounts, 3); assert.equal(cleanup.closes, 1); assert.equal(cleanup.liveAtClose, 0); assert.equal(cleanup.captures, 2); assert.equal(cleanup.frameLoops, 0); assert.deepEqual(cleanup.tracks, ['ended', 'ended', 'ended']); assert.ok(cleanup.frames > 5);
      clean();
      console.log(`PASS synthetic canvas → real JPEG + ${movie.type} encoder, hold/release, cancel/discard and complete track/unmount cleanup: ${width}px`);
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  await server.close();
  await rm(cache, {recursive: true, force: true});
}
