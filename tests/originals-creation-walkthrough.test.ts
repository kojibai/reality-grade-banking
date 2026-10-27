// @vitest-environment happy-dom
import {it,expect,vi} from 'vitest';
// @ts-expect-error Public enhancement stays a standalone page-only module.
import {init} from '../public/learn/product-walkthrough.js';
// @ts-expect-error Public templates are ESM.
import {originalsQualificationContent} from '../scripts/originals-qualification-template.mjs';
it('shows the actual Bank creation and PBI publishing screens with a direct Create asset action',()=>{
 const doc=new DOMParser().parseFromString(originalsQualificationContent(),'text/html');expect(doc.querySelector('main[data-coop]')).not.toBeNull();const tour=doc.querySelector('[data-product-walkthrough="originals-creation"]')!;
 expect(tour).not.toBeNull();expect([...tour.querySelectorAll('[data-product-choice]')].map(node=>node.textContent?.replace(/^\d+/,''))).toEqual(['Create','Sign']);for(const stage of ['create-asset','created-asset'])expect(tour.querySelector(`[data-product-panel="${stage}"] [data-source-components]`)).not.toBeNull();
 expect(tour.textContent).toContain('Publish');expect(tour.textContent).toContain('PBI');expect(tour.textContent).toContain('Example');
 const action=doc.querySelector<HTMLAnchorElement>('[data-create-original]')!;expect(action.textContent).toContain('Create an asset');expect(action.getAttribute('href')).toBe('/#account/currency');
 expect(doc.querySelector('.originals-hero a.learn-button')?.getAttribute('href')).toBe('/#account/currency');
 const faq=[...doc.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent==='Where do I sign my Original?')!;
 expect(faq.querySelector('a')?.getAttribute('href')).toBe('https://receiz.com/profile?manage=1');
 expect(doc.querySelector('a[href="https://receiz.com/profile?compose=1"]')).toBeNull();
});

it('advances the actual rendered Create and Publish controls without an account or signature request',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});const fetch=vi.spyOn(globalThis,'fetch');
 try{document.body.innerHTML=originalsQualificationContent();init();const tour=document.querySelector('[data-product-walkthrough="originals-creation"]')!;const active=()=>tour.querySelector('[data-product-panel]:not([hidden])')!;
 (active().querySelector('button[data-example-action="created-asset"]') as HTMLButtonElement).click();expect(active().getAttribute('data-product-panel')).toBe('created-asset');
 (active().querySelector('button[data-example-action="signed-asset"]') as HTMLButtonElement).click();expect(active().getAttribute('data-product-panel')).toBe('created-asset');expect(tour.querySelector('[data-product-choice][aria-pressed="true"]')?.textContent).toBe('02Sign');expect(active().textContent).toContain('Your signed Original is public');expect(fetch).not.toHaveBeenCalled();}
 finally{document.body.replaceChildren();fetch.mockRestore();vi.unstubAllGlobals();}
});
