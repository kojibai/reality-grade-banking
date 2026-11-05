import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
const document=new Window().document;
import {existsSync,readFileSync} from 'node:fs';
import {publicPages} from '../scripts/public-page-metadata.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';

it('gives the public receiver page its own route without hiding an existing same-name identity',()=>{
 expect(publicPages.find(page=>page.path==='/build/')?.noindex).not.toBe(true);
 expect(publicPages.some(page=>page.path==='/build/')).toBe(true);
 expect(profilePagePath('build')).toBe('/u/build/');expect(profilePageUsername('/build/')).toBeNull();expect(profilePageUsername('/u/build/')).toBe('build');
});
it('paints distinct applications, bounded demonstrations and resolving receiver resources before JavaScript',async()=>{
 expect(existsSync('scripts/independent-bank-page.mjs')).toBe(true);
 const modulePath='../scripts/independent-bank-page.mjs';const {independentBankContent}=await import(/* @vite-ignore */ modulePath);document.body.innerHTML=independentBankContent();
 expect(document.querySelectorAll('h1')).toHaveLength(1);expect(document.querySelectorAll('main section')).toHaveLength(13);
 expect(document.querySelector('[data-ib-hero-bank="bankeiz"]')!.textContent).toContain('BANKEIZ');expect(document.querySelector('[data-ib-hero-bank="independent"]')!.textContent).toContain('YOUR BANK');
 expect([...document.querySelectorAll('[data-ib-balance]')].map(node=>node.textContent)).toEqual(['$1,000','$0','$0']);
 expect(document.querySelector('[data-ib-send="second"]')!.hasAttribute('disabled')).toBe(true);
 expect(document.querySelectorAll('[data-ib-dev-step]')).toHaveLength(9);expect(document.querySelector('[data-ib-verification="authentic"]')!.textContent).toContain('Not run');
 for(const a of document.querySelectorAll('main a[href^="#"]'))expect(document.getElementById(a.getAttribute('href')!.slice(1)),a.getAttribute('href')!).not.toBeNull();
 const links=[...document.querySelectorAll('main a')].map(a=>a.getAttribute('href'));
 for(const suffix of ['institution/README.md','institution/receiving-standard.md','institution/receiver-profile.json','docs/conformance/integration-and-assessment.md','institution/qualification.md'])expect(links.some(url=>url?.endsWith(suffix))).toBe(true);
 expect(document.querySelector('[data-ib-qualification]')!.textContent).toContain('not-assessed');
 expect(document.querySelector('[data-ib-sdk-code]')!.textContent).toBe(readFileSync('institution/examples/accept-money.ts','utf8'));
});
