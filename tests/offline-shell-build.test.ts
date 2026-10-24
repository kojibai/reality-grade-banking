import { expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('versions complete final pages and fixed-path native resources and includes lazy Bank resources', async () => {
  const { buildOfflineShell } = await import('../scripts/build-offline-shell.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'bankeiz-offline-build-'));
  try {
    await mkdir(join(dir, '.vite')); await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, '.vite/manifest.json'), JSON.stringify({ 'pay/index.html':{file:'assets/checkout.js',css:['assets/checkout.css']}, 'index.html': { file: 'assets/bank.js', dynamicImports: ['qr'] }, qr: { file: 'assets/qr-decoder.js' }, 'verify/index.html': { file: 'assets/verify.js' }, 'ledger/index.html': { file: 'assets/ledger.js', css: ['assets/ledger.css'], imports: ['ledger-reader'] }, 'ledger-reader': { file: 'assets/ledger-reader.js' }, 'conformance/index.html': { file: 'assets/conformance.js' } }));
    await mkdir(join(dir,'pay'));await writeFile(join(dir,'pay/index.html'),'static checkout shell');await writeFile(join(dir,'assets/checkout.js'),'checkout');await writeFile(join(dir,'assets/checkout.css'),'checkout css');
    await mkdir(join(dir, 'ledger')); await writeFile(join(dir, 'ledger/index.html'), 'public ledger');
    for (const file of ['ledger.js', 'ledger.css', 'ledger-reader.js']) await writeFile(join(dir, 'assets', file), file);
    await mkdir(join(dir, 'verify')); await writeFile(join(dir, 'verify/index.html'), 'public verifier'); await writeFile(join(dir, 'assets/verify.js'), 'verify');
    await writeFile(join(dir, 'assets/bank.js'), 'bank'); await writeFile(join(dir, 'assets/qr-decoder.js'), 'qr'); await writeFile(join(dir, 'assets/conformance.js'), 'console');
    const pages = { '/learn/protect-your-value/':{content:'Protection'},'/cooperatives/':{content:'Cooperatives'},'/cooperatives/producers/':{content:'Producers'}, '/business/for/':{content:'Fits'},'/business/for/agencies/':{content:'Agency'},'/business/':{content:'Business'}, '/learn/': { content: 'Learn' }, '/legal/': { content: 'Legal' },'/learn/notes/':{content:'Notes'},'/standards/':{content:'Standards'},'/market-cap/':{content:'Global Market Cap'},'/explore/music/':{content:'Music'} };
    for(const path of ['learn/protect-your-value','cooperatives','cooperatives/producers','business','business/for','business/for/agencies','learn/notes','standards','market-cap','explore/music','explore']){await mkdir(join(dir,path),{recursive:true});await writeFile(join(dir,path,'index.html'),path);}
    await writeFile(join(dir,'learn/business-fit.js'),'public directory enhancement');
    await writeFile(join(dir,'learn/cooperatives.js'),'cooperative interaction');await writeFile(join(dir,'learn/cooperative-twin.js'),'native twin projection');
    await mkdir(join(dir, 'launch'));
    await writeFile(join(dir, 'launch/iphone-402-874-3-portrait.png'), 'launch artwork');
    await writeFile(join(dir, 'index.html'), `<link rel="apple-touch-startup-image" href="/launch/iphone-402-874-3-portrait.png" media="screen"><script id="receiz-navigation" type="application/json">${JSON.stringify({ pages })}</script>`);
    for (const name of ['learn', 'legal']) { await mkdir(join(dir, name),{recursive:true}); await writeFile(join(dir, name, 'index.html'), name); }
    const native = '/native/test-runtime.mjs'; await mkdir(join(dir, 'native')); await writeFile(join(dir, native), 'native A');
    await mkdir(join(dir,'proof-verifier/v129'),{recursive:true});
    await writeFile(join(dir,'proof-verifier/v129/verifier.js'),'read-only canonical verifier');
    await writeFile(join(dir,'proof-verifier/v129/verifier.js.map'),'public complete source');
    await writeFile(join(dir,'proof-verifier/v129/verifier.js.map.bin'),'public complete source');
    const first = await buildOfflineShell(dir, { fixed: [native] });
    expect(first.resources.some((v: { url: string }) => v.url === '/proof-verifier/v129/verifier.js.map')).toBe(false);
    expect(first.resources.some((v: { url: string }) => v.url === '/proof-verifier/v129/verifier.js.map.bin')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url === '/assets/qr-decoder.js')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url === '/launch/iphone-402-874-3-portrait.png')).toBe(true);
    expect(first.resources.some((v: { url: string }) => v.url.includes('conformance'))).toBe(false);
    for(const url of ['/pay/index.html','/assets/checkout.js','/assets/checkout.css'])expect(first.resources.some((v:{url:string})=>v.url===url),url).toBe(true);
    expect(first.pages['/pay/index.html']).toBe('/pay/index.html');
    expect(first.pages).toMatchObject({ '/learn/': '/learn/', '/legal/': '/legal/' });
    expect(first.pages).toMatchObject({'/business/':'/learn/','/business':'/learn/','/learn/notes/':'/learn/','/standards/':'/learn/','/market-cap/':'/explore/','/explore/music/':'/explore/'});
    expect(first.pages).toMatchObject({'/business/for/':'/learn/','/business/for':'/learn/','/business/for/agencies/':'/learn/','/business/for/agencies':'/learn/'});
    expect(first.resources.some(resource=>resource.url==='/learn/business-fit.js')).toBe(true);
    expect(first.pages).toMatchObject({'/learn/protect-your-value/':'/learn/','/learn/protect-your-value':'/learn/'});
    expect(first.resources.some(resource=>resource.url==='/learn/protect-your-value/')).toBe(false);
    expect(first.pages).toMatchObject({'/cooperatives/':'/learn/','/cooperatives':'/learn/','/cooperatives/producers/':'/learn/','/cooperatives/producers':'/learn/'});
    for(const url of ['/learn/cooperatives.js','/learn/cooperative-twin.js'])expect(first.resources.some(resource=>resource.url===url),url).toBe(true);
    expect(first.resources.some((v:{url:string})=>['/learn/notes/','/standards/','/market-cap/','/explore/music/'].includes(v.url))).toBe(false);
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
