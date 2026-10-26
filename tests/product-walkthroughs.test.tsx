// @vitest-environment happy-dom
import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductScreen} from '../src/presentation/ProductScreen';
it.each(['entry','account','deposit','receive','send','record','vault','messages'])('renders %s from the actual product components as an inert example',screen=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen={screen}/>),'text/html');
 expect(doc.querySelector('[data-product-example]')).not.toBeNull();expect(doc.querySelector('[inert]')).not.toBeNull();expect(doc.body.textContent).toContain('Example');
 expect(doc.querySelector('[data-source-components]')?.getAttribute('data-source-components')?.length).toBeGreaterThan(4);
 expect(doc.querySelector('iframe,script')).toBeNull();
});

import {afterEach,vi} from 'vitest';
import preview from '../src/content/product-ui.generated.json';
import {productWalkthrough,productMoment} from '../scripts/product-walkthrough.mjs';
// @ts-expect-error Public enhancement stays a standalone page-only module.
import {init} from '../public/learn/product-walkthrough.js';
import {canonicalPublicPath} from '../src/content/public-routes.mjs';
import {publicPage} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Public document template stays standalone ESM.
import {bankingContent} from '../scripts/banking-page.mjs';
import {paymentQr,paymentQrPath} from '../src/receiz/payment-qr';
afterEach(()=>{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();});
it('keeps example IDs local, dialogs visible and receiving coordinates nonfunctional',()=>{
 const doc=new DOMParser().parseFromString(productWalkthrough()+productMoment(),'text/html');
 const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);
 expect([...doc.querySelectorAll('dialog')].every(el=>el.hasAttribute('open'))).toBe(true);
 const qr=doc.querySelector('[data-product-example=receive] .payment-qr path')?.getAttribute('d');
 expect(qr).toBe(paymentQrPath(paymentQr('https://example.invalid/')));
 expect(doc.querySelectorAll('[data-product-choice]')).toHaveLength(8);
 expect(preview.css).not.toMatch(/(?:^|})\s*(?:body|html|:root)\s*\{/);
 expect(preview.css).toContain('@container product-screen');
});
it('publishes separate one-word banking and Business stories while retaining live Twin and exact payment destination',()=>{
 expect(canonicalPublicPath('/in-action/')).toBe('/action/');expect(publicPage('/banking/')?.path).toBe('/banking/');
 const doc=new DOMParser().parseFromString(bankingContent(),'text/html');
 expect(doc.querySelectorAll('[data-product-choice]')).toHaveLength(8);expect(doc.querySelector('[data-coop-twin]')).not.toBeNull();
 expect(doc.querySelector('[data-product-example] [data-coop-twin]')).toBeNull();
 expect(doc.querySelector('a[href="/action/"]')).not.toBeNull();
});
it('supports repeated step selection and keyboard selection without transport or touching the live conversation',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 document.body.innerHTML=productWalkthrough()+'<div data-coop-twin><p>Real conversation stays here.</p></div>';init();init();
 const click=(key:string)=>(document.querySelector(`[data-product-choice="${key}"]`) as HTMLButtonElement).click();
 click('send');click('account');click('send');expect((document.querySelector('[data-product-panel=send]') as HTMLElement).hidden).toBe(false);
 const sender=document.querySelector('[data-product-choice=send]')!;sender.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
 expect(document.querySelector('[data-product-choice=messages]')?.getAttribute('aria-pressed')).toBe('true');
 expect(document.querySelector('[data-coop-twin]')?.textContent).toBe('Real conversation stays here.');expect(fetch).not.toHaveBeenCalled();
 window.dispatchEvent(new Event('receiz-learn:page'));click('account');expect(document.querySelector('[data-product-choice=account]')?.getAttribute('aria-pressed')).toBe('true');
});
it('animates typing into complete example replies, then reveals the follow-up without a model request',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);document.body.innerHTML=productMoment();init();callbacks[0]([{isIntersecting:true}]);
 expect(document.querySelector('.bank-typing-dots')).not.toBeNull();vi.advanceTimersByTime(3000);
 expect(document.querySelector('[data-example-response] p')?.textContent).toContain('$1,875');
 vi.advanceTimersByTime(5000);expect(document.querySelectorAll('[data-example-response]')[1].textContent).toContain('partial payment');expect((document.querySelector('[data-example-followup]') as HTMLElement).hidden).toBe(false);expect(fetch).not.toHaveBeenCalled();
});

import {outcomePages,outcomeContent} from '../scripts/outcome-page.mjs';
it('keeps the agent example inside its cold-entry enhancement root',()=>{const doc=new DOMParser().parseFromString(outcomeContent(outcomePages.find(page=>page.key==='agent')!),'text/html');expect(doc.querySelector('[data-coop] [data-product-walkthrough=agent-money-ui]')).not.toBeNull();});

it('keeps all four turns readable outside the inert animation with native disclosure and no script',()=>{
 const doc=new DOMParser().parseFromString(productMoment({example:'agencies'}),'text/html'),transcript=doc.querySelector('.product-transcript')!;
 expect(transcript.closest('[inert]')).toBeNull();expect(transcript.querySelector('summary')).not.toBeNull();expect(transcript.querySelectorAll('p')).toHaveLength(4);
 expect(transcript.textContent).toContain('remaining $4,800');
});
it('keeps the Business follow-through account and payment in the same story',()=>{
 const doc=new DOMParser().parseFromString(productWalkthrough({kind:'business',example:'action-followthrough'}),'text/html');
 expect(doc.querySelector('[data-product-panel=account]')?.textContent).toContain('$9,500.00');
 expect(doc.querySelector('[data-product-panel=record]')?.textContent).toContain('$900.00');
 expect(doc.querySelector('[data-product-panel=record]')?.textContent).toContain('Leah');
 expect(doc.querySelector('[data-product-panel=send]')).toBeNull();
});

it.each(['send','receive','deposit','messages'])('makes the published %s example scrollable while its actions stay inert',screen=>{
 const doc=new DOMParser().parseFromString(preview.screens[screen as keyof typeof preview.screens],'text/html'),scroll=doc.querySelector('[data-example-scroll]');
 expect(scroll).not.toBeNull();expect(scroll?.closest('[inert]')).toBeNull();expect(scroll?.getAttribute('tabindex')).toBe('0');
 for(const el of doc.querySelectorAll('.product-screen button,.product-screen input,.product-screen a,.product-screen form'))expect(el.hasAttribute('inert')).toBe(true);
});
it('lets a reader scroll back while replies stream and never restarts their reading position',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 document.body.innerHTML=productMoment();const box=document.querySelector('.bank-conversation-scroll') as HTMLElement;let top=0;Object.defineProperties(box,{clientHeight:{value:100},scrollHeight:{value:500},scrollTop:{get:()=>top,set:value=>{top=Math.max(0,Math.min(400,value));}}});
 init();callbacks[0]([{isIntersecting:true}]);vi.advanceTimersByTime(2200);box.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true}));box.scrollTop=100;box.dispatchEvent(new Event('scroll'));vi.advanceTimersByTime(30000);
 expect(box.scrollTop).toBe(100);expect(document.querySelectorAll('[data-example-response]')[1].textContent).toContain('partial payment');
 callbacks[0]([{isIntersecting:false}]);callbacks[0]([{isIntersecting:true}]);expect(box.scrollTop).toBe(100);
});

it('preserves a manually chosen chat position when switching away and back to Messages',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 document.body.innerHTML=productWalkthrough();init();const select=(step:string)=>(document.querySelector(`[data-product-choice="${step}"]`)as HTMLButtonElement).click();select('messages');callbacks.at(-1)!([{isIntersecting:true}]);
 const box=document.querySelector('.bank-conversation-scroll')as HTMLElement;let top=0;Object.defineProperties(box,{clientHeight:{value:100},scrollHeight:{value:500},scrollTop:{get:()=>top,set:value=>{top=Math.max(0,Math.min(400,value));}}});
 box.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true}));box.scrollTop=240;box.dispatchEvent(new Event('scroll'));select('account');select('messages');callbacks.at(-1)!([{isIntersecting:true}]);vi.advanceTimersByTime(30000);
 expect(box.scrollTop).toBe(240);expect(document.querySelectorAll('[data-example-response]')[1].textContent).toContain('partial payment');
});

it('follows the first streaming reply by default and respects a reader scrolling back',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 document.body.innerHTML=productMoment();const box=document.querySelector('.bank-conversation-scroll')as HTMLElement;let top=0;Object.defineProperties(box,{clientHeight:{value:100},scrollHeight:{value:500},scrollTop:{get:()=>top,set:value=>{top=Math.max(0,Math.min(400,value));}}});
 init();callbacks[0]([{isIntersecting:true}]);vi.advanceTimersByTime(1000);expect(box.scrollTop).toBe(400);
 box.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true}));box.scrollTop=100;box.dispatchEvent(new Event('scroll'));vi.advanceTimersByTime(1500);expect(box.scrollTop).toBe(100);
});
it('keeps the account backdrop outside the scroll container while a real sheet example scrolls',()=>{
 const css=readFileSync('public/learn/product-walkthrough.css','utf8');expect(css).toMatch(/\.product-screen:has\(dialog\) \.console\{overflow:clip\}/);
 expect(css).toContain('.product-screen [data-example-scroll]{overflow-y:auto');
});
