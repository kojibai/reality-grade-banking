import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('versions complete final pages and fixed-path native resources and includes lazy Bank resources', async () => {
  const { buildOfflineShell } = await import('../scripts/build-offline-shell.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'bankeiz-offline-build-'));
  try {
    await mkdir(join(dir, '.vite')); await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, '.vite/manifest.json'), JSON.stringify({ 'index.html': { file: 'assets/bank.js', dynamicImports: ['qr'] }, qr: { file: 'assets/qr-decoder.js' }, 'conformance/index.html': { file: 'assets/conformance.js' } }));
    await writeFile(join(dir, 'assets/bank.js'), 'bank'); await writeFile(join(dir, 'assets/qr-decoder.js'), 'qr'); await writeFile(join(dir, 'assets/conformance.js'), 'console');
    const pages = { '/learn/': { content: 'Learn' }, '/legal/': { content: 'Legal' } };
    await writeFile(join(dir, 'index.html'), `<script id="receiz-navigation" type="application/json">${JSON.stringify({ pages })}</script>`);
    for (const name of ['learn', 'legal']) { await mkdir(join(dir, name)); await writeFile(join(dir, name, 'index.html'), name); }
    const native = '/native/test-runtime.mjs'; await mkdir(join(dir, 'native')); await writeFile(join(dir, native), 'native A');
    const first = await buildOfflineShell(dir, { fixed: [native] });
    expect(first.resources.some((v: { url: string }) => v.url === '/assets/qr-decoder.js')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url.includes('conformance'))).toBe(false);
    expect(first.pages).toMatchObject({ '/learn/': '/learn/', '/legal/': '/legal/' });
    await writeFile(join(dir, native), 'native B'); const second = await buildOfflineShell(dir, { fixed: [native] });
    expect(second.version).not.toBe(first.version);
    await writeFile(join(dir, 'legal/index.html'), 'updated final notices'); const third = await buildOfflineShell(dir, { fixed: [native] });
    expect(third.version).not.toBe(second.version);
    expect(JSON.parse(await readFile(join(dir, 'offline-build.json'), 'utf8'))).toEqual(third);
    const sw = await readFile(join(dir, 'sw.js'), 'utf8'); expect(sw).not.toContain('__RESOURCE_HASHES__'); expect(sw).toContain(native);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
