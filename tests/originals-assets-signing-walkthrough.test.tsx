// @vitest-environment happy-dom
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {ProductScreen} from '../src/presentation/ProductScreen';
// @ts-expect-error Static guide module.
import {originalsQualificationContent} from '../scripts/originals-qualification-template.mjs';
// @ts-expect-error Page-only enhancement has no account runtime.
import {init} from '../public/learn/product-walkthrough.js';
it('shows actual Assets held-proof and Showcase fingerprint controls for the same synthetic Original',()=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="assets-originals"/>),'text/html');
 expect(doc.querySelector('[data-source-components]')?.getAttribute('data-source-components')).toContain('LiveAssets');expect(doc.querySelector('[data-source-components]')?.getAttribute('data-source-components')).toContain('OriginalSigning');
 expect(doc.body.textContent).toContain('Held proof objects');expect(doc.body.textContent).toContain('Your showcase');expect(doc.querySelectorAll('button[aria-label="Unlock value with PBI"]')).toHaveLength(2);expect(doc.querySelector('script,iframe')).toBeNull();expect(doc.querySelector('[inert]')).not.toBeNull();
 const signed=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="assets-originals-signed"/>),'text/html');expect(signed.body.textContent).toContain('Example field notes');expect(signed.querySelector('button[aria-label="Unlock value with PBI"]')).toBeNull();
});
it('directs the signing FAQ to Bank Assets with the exact current control and approval steps',()=>{
 const doc=new DOMParser().parseFromString(originalsQualificationContent(),'text/html'),faq=[...doc.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent==='Where do I sign my Original?')!;
 expect(faq.textContent).toContain('Assets');expect(faq.textContent).toContain('Your showcase');expect(faq.textContent).toContain('Held proof objects');expect(faq.textContent).toContain('Unlock value with PBI');expect(faq.querySelector('a')?.getAttribute('href')).toBe('/#assets');expect(faq.textContent).not.toContain('Open your Originals in Receiz');
 expect(doc.querySelector('[data-product-walkthrough="originals-assets-signing"]')?.textContent).toContain('Synthetic example');
});
it('follows Assets, fingerprint, device-approval explanation and signed state without auth, signing or network',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{document.body.innerHTML=originalsQualificationContent();init();const tour=document.querySelector('[data-product-walkthrough="originals-assets-signing"]')!,choose=(key:string)=>(tour.querySelector(`[data-product-choice="${key}"]`)as HTMLButtonElement).click(),active=()=>tour.querySelector('[data-product-panel]:not([hidden])')!;
 choose('assets-originals');(active().querySelector('button[aria-label="Unlock value with PBI"]')as HTMLButtonElement).click();expect(tour.querySelector('[data-product-choice="assets-originals-approval"]')?.getAttribute('aria-pressed')).toBe('true');expect(tour.querySelector('.product-frame-caption')?.textContent).toContain('your device');
 choose('assets-originals');(active().querySelectorAll('button[aria-label="Unlock value with PBI"]')[1]as HTMLButtonElement).click();expect(tour.querySelector('[data-product-choice="assets-originals-approval"]')?.getAttribute('aria-pressed')).toBe('true');
 choose('assets-originals-signed');expect(active().textContent).toContain('Example field notes');expect(active().querySelector('[aria-label="Unlock value with PBI"]')).toBeNull();expect(fetch).not.toHaveBeenCalled();
 }finally{document.body.replaceChildren();vi.unstubAllGlobals();}
});
