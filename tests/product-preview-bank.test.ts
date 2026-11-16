// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {packExampleBanks} from '../scripts/product-preview-bank.mjs';
// @ts-expect-error Public enhancement stays a standalone page-only module.
import {init} from '../public/learn/product-walkthrough.js';

it('shares exact repeated destination spans while preserving selected HTML, copy and inert first paint',()=>{
 const repeated='<p data-carried="Exact &amp; quoted &quot;terms&quot;">The complete example remains available.</p>'.repeat(120);
 const views={one:{html:'<div class="product-screen" data-example-view="one">'+repeated+'<strong>First destination</strong></div>',copy:'First exact description.'},two:{html:'<div class="product-screen" data-example-view="two">'+repeated+'<strong>Second destination</strong></div>',copy:'Second exact description.'}};
 const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;');
 const content='<section data-product-walkthrough="carried-spans"><button data-product-choice="one">One</button><button data-product-choice="two">Two</button><div data-product-panel="one"><div class="product-screen" data-example-view="held">Held first screen</div></div><div data-product-panel="two" hidden><div class="product-screen" data-example-view="held">Held second screen</div></div><p class="product-frame-caption">Held caption</p><template data-example-views>'+escape(JSON.stringify(views))+'</template></section>';
 const input={one:{head:'<style>.exact{color:navy}</style>',content}},before=structuredClone(input),packed=packExampleBanks(input);
 expect(packed.pages.one.head).toBe(input.one.head);expect(input).toEqual(before);
 expect((packed.pages.one.content+packed.shared).length).toBeLessThan(content.length*.6);
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 document.body.innerHTML=packed.pages.one.content+packed.shared;
 const held=document.querySelector('[data-product-panel="one"] .product-screen');init();
 expect(document.querySelector('[data-product-panel="one"] .product-screen')).toBe(held);expect(held?.textContent).toBe('Held first screen');
 for(const key of ['two','one','two']as const){(document.querySelector(`[data-product-choice="${key}"]`)as HTMLButtonElement).click();expect(document.querySelector(`[data-product-panel="${key}"] .product-screen`)?.outerHTML).toBe(views[key].html);expect(document.querySelector('.product-frame-caption')?.textContent).toBe(views[key].copy);}
 expect(fetcher).not.toHaveBeenCalled();
});
