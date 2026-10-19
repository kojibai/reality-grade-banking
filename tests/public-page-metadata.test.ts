// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {applyPublicMetadata,publicPage,publicEntryFallback,publicPages} from '../scripts/public-page-metadata.mjs';
import social from '../public/social/manifest.json';
const image=(path:string)=>social.images[path as keyof typeof social.images];
it('replaces generic preview metadata while preserving private-reader security and executable entry tags',()=>{
 const source='<html><head><title>Old</title><meta name="robots" content="index,follow"><meta name="referrer" content="no-referrer"><link rel="canonical" href="https://old.example/"><meta property="og:image" content="old.png"><meta name="twitter:image" content="old.png"><style>body{color:#172b45}</style></head><body><div id="root"></div><script type="module" src="/receipt.js"></script></body></html>';
 const html=applyPublicMetadata(source,publicPage('/receipt/index.html')!,image('/receipt/')),doc=new DOMParser().parseFromString(html,'text/html');
 expect(doc.title).toBe('Transaction receipt | Bankeiz');expect(doc.querySelectorAll('link[rel=canonical]')).toHaveLength(1);expect(doc.querySelectorAll('meta[property="og:image"]')).toHaveLength(1);
 expect(doc.querySelector('meta[name=robots]')?.getAttribute('content')).toBe('noindex,nofollow');expect(doc.querySelector('meta[name=referrer]')?.getAttribute('content')).toBe('no-referrer');
 expect(doc.querySelector('script[type=module]')?.getAttribute('src')).toBe('/receipt.js');expect(doc.querySelector('style')?.textContent).toBe('body{color:#172b45}');
 expect(doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe(doc.querySelector('meta[property="og:image"]')?.getAttribute('content'));
});
it('gives each public function its own preview while excluding private receipt records from indexing',()=>{
 expect(new Set(publicPages.map(page=>image(page.path).sha256)).size).toBe(publicPages.length);
 expect(publicPage('/explore/index.html')?.path).toBe('/explore/');expect(publicPage('/learn/signing-key/?from=bank')?.id).toBe('signing-key');expect(publicPage('/api/wallet/me')).toBeUndefined();
 expect(publicEntryFallback('/')).toBe('');expect(publicEntryFallback('/receipt/')).toBe('');
 const fallback=new DOMParser().parseFromString(publicEntryFallback('/verify/'),'text/html');expect(fallback.querySelector('h1')?.textContent).toBe('Verify an account proof');expect(fallback.body.textContent).toContain('no verification has run yet');expect(fallback.querySelector('script,input,button')).toBeNull();
});
