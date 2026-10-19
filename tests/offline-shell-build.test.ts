import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('versions complete final pages and fixed-path native resources and includes lazy Bank resources', async () => {
  const { buildOfflineShell } = await import('../scripts/build-offline-shell.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'bankeiz-offline-build-'));
  try {
    await mkdir(join(dir, '.vite')); await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, '.vite/manifest.json'), JSON.stringify({ 'index.html': { file: 'assets/bank.js', dynamicImports: ['qr'] }, qr: { file: 'assets/qr-decoder.js' }, 'verify/index.html': { file: 'assets/verify.js' }, 'ledger/index.html': { file: 'assets/ledger.js', css: ['assets/ledger.css'], imports: ['ledger-reader'] }, 'ledger-reader': { file: 'assets/ledger-reader.js' }, 'conformance/index.html': { file: 'assets/conformance.js' } }));
    await mkdir(join(dir, 'ledger')); await writeFile(join(dir, 'ledger/index.html'), 'public ledger');
    for (const file of ['ledger.js', 'ledger.css', 'ledger-reader.js']) await writeFile(join(dir, 'assets', file), file);
    await mkdir(join(dir, 'verify')); await writeFile(join(dir, 'verify/index.html'), 'public verifier'); await writeFile(join(dir, 'assets/verify.js'), 'verify');
    await writeFile(join(dir, 'assets/bank.js'), 'bank'); await writeFile(join(dir, 'assets/qr-decoder.js'), 'qr'); await writeFile(join(dir, 'assets/conformance.js'), 'console');
    const pages = { '/learn/': { content: 'Learn' }, '/legal/': { content: 'Legal' } };
    await mkdir(join(dir, 'launch'));
    await writeFile(join(dir, 'launch/iphone-402-874-3-portrait.png'), 'launch artwork');
    await writeFile(join(dir, 'index.html'), `<link rel="apple-touch-startup-image" href="/launch/iphone-402-874-3-portrait.png" media="screen"><script id="receiz-navigation" type="application/json">${JSON.stringify({ pages })}</script>`);
    for (const name of ['learn', 'legal']) { await mkdir(join(dir, name)); await writeFile(join(dir, name, 'index.html'), name); }
    const native = '/native/test-runtime.mjs'; await mkdir(join(dir, 'native')); await writeFile(join(dir, native), 'native A');
    await mkdir(join(dir,'proof-verifier/v129'),{recursive:true});
    await writeFile(join(dir,'proof-verifier/v129/verifier.js'),'read-only canonical verifier');
    await writeFile(join(dir,'proof-verifier/v129/verifier.js.map'),'public complete source');
    const first = await buildOfflineShell(dir, { fixed: [native] });
    expect(first.resources.some((v: { url: string }) => v.url === '/proof-verifier/v129/verifier.js.map')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url === '/assets/qr-decoder.js')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url === '/launch/iphone-402-874-3-portrait.png')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url.includes('conformance'))).toBe(false);
    expect(first.pages).toMatchObject({ '/learn/': '/learn/', '/legal/': '/legal/' });
    expect(first.pages).toMatchObject({ '/verify/': '/verify/', '/verify': '/verify/' });
    expect(first.resources.some((v: { url: string }) => v.url === '/assets/verify.js')).toBe(true);
    expect(first.pages).toMatchObject({ '/ledger/': '/ledger/', '/ledger': '/ledger/' });
    for (const url of ['/ledger/', '/assets/ledger.js', '/assets/ledger.css', '/assets/ledger-reader.js']) expect(first.resources.some((v: { url: string }) => v.url === url), url).toBe(true);
    await writeFile(join(dir, native), 'native B'); const second = await buildOfflineShell(dir, { fixed: [native] });
    expect(second.version).not.toBe(first.version);
    await writeFile(join(dir, 'legal/index.html'), 'updated final notices'); const third = await buildOfflineShell(dir, { fixed: [native] });
    expect(third.version).not.toBe(second.version);
    expect(JSON.parse(await readFile(join(dir, 'offline-build.json'), 'utf8'))).toEqual(third);
    const sw = await readFile(join(dir, 'sw.js'), 'utf8'); expect(sw).not.toContain('__RESOURCE_HASHES__'); expect(sw).toContain(native);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
