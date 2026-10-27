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
 expect(doc.querySelectorAll('[data-product-choice]')).toHaveLength(9);
 expect(preview.css).not.toMatch(/(?:^|})\s*(?:body|html|:root)\s*\{/);
 expect(preview.css).toContain('@container product-screen');
});
it('publishes separate one-word banking and Business stories while retaining live Twin and exact payment destination',()=>{
 expect(canonicalPublicPath('/in-action/')).toBe('/action/');expect(publicPage('/banking/')?.path).toBe('/banking/');
 const doc=new DOMParser().parseFromString(bankingContent(),'text/html');
 expect(doc.querySelectorAll('[data-product-walkthrough=banking-tour] [data-product-choice]')).toHaveLength(9);expect(doc.querySelector('[data-coop-twin]')).not.toBeNull();
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
 for(const el of doc.querySelectorAll('.product-screen button,.product-screen input,.product-screen a,.product-screen form'))expect(el.hasAttribute('inert')||el.hasAttribute('data-example-action')||el.hasAttribute('data-example-approve')).toBe(true);
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
 document.body.innerHTML=productWalkthrough({example:'overview'});init();const select=(step:string)=>(document.querySelector(`[data-product-choice="${step}"]`)as HTMLButtonElement).click();select('messages');callbacks.at(-1)!([{isIntersecting:true}]);
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

it.each([['market','Market'],['assets','Your assets'],['ledger','Ledger'],['identity','example'],['note-create','Create a note.'],['note-deposit','Deposit a note.'],['send-review','Review payment.'],['send-complete','Payment sent.']])('renders the real %s destination as an example view', (screen,text)=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen={screen}/>),'text/html');
 expect(doc.querySelector('[data-product-example]')?.getAttribute('data-product-example')).toBe(screen);
 expect(doc.body.textContent).toContain(text); expect(doc.querySelector('iframe,script')).toBeNull();
});
it('keeps the native receiving tools styled within every scoped product illustration',()=>{
 expect(preview.css).toContain('.product-screen .payment-tools');
});
it('lets Account, Send, Receive and Note screens form one isolated example navigation loop',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 document.body.innerHTML=productWalkthrough();init();
 const choose=(name:string)=>(document.querySelector(`[data-product-choice="${name}"]`)as HTMLButtonElement).click();
 const action=(name:string)=>{const button=[...document.querySelectorAll<HTMLButtonElement>('[data-product-panel]:not([hidden]) .product-screen button')].find(button=>(button.getAttribute('aria-label')??button.textContent)?.trim()===name);expect(button,name).toBeDefined();button!.click();};
 choose('account');action('Send');expect(document.querySelector('[data-product-panel]:not([hidden]) [data-product-example=send]')).not.toBeNull();
 action('Create note');expect(document.querySelector('[data-product-panel]:not([hidden]) [data-product-example=note-create]')).not.toBeNull();
 action('All send options');action('Close');expect(document.querySelector('[data-product-panel]:not([hidden]) [data-product-example=account]')).not.toBeNull();
 action('Receive');action('Deposit note');expect(document.querySelector('[data-product-panel]:not([hidden]) [data-product-example=note-deposit]')).not.toBeNull();
 action('All receive options');action('Close');expect(document.querySelector('[data-product-panel]:not([hidden]) [data-product-example=account]')).not.toBeNull();
 expect(fetch).not.toHaveBeenCalled();
});
it('reviews and animates an example payment without an account, request or proof issuance',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);document.body.innerHTML=productWalkthrough();init();
 (document.querySelector('[data-product-choice=send]')as HTMLButtonElement).click();
 const active=()=>document.querySelector('[data-product-panel]:not([hidden])')!;
 const button=(text:string)=>[...active().querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent?.trim()===text)!;
 button('Review payment').click();expect(active().textContent).toContain('Review payment.');
 expect(button('Send payment').disabled).toBe(true);const consent=active().querySelector<HTMLInputElement>('input[type=checkbox]')!;consent.click();
 expect(button('Send payment').disabled).toBe(false);button('Send payment').click();vi.advanceTimersByTime(1000);
 expect(active().textContent).toContain('Payment sent.');expect(active().textContent).toContain('Example');expect(fetch).not.toHaveBeenCalled();
});
it('puts Account scrolling on its content while keeping navigation outside that scroll region',()=>{
 const doc=new DOMParser().parseFromString(preview.screens.account,'text/html');const scroll=doc.querySelector('[data-example-scroll]')!;
 expect(scroll.contains(doc.querySelector('.bottom-nav'))).toBe(false);expect(scroll.querySelector('.money-actions')).not.toBeNull();
});

it('opens Market creation and explains it, then returns to Account and entry through identity controls',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=productWalkthrough();init();(document.querySelector('[data-product-choice=account]')as HTMLButtonElement).click();
 const active=()=>document.querySelector('[data-product-panel]:not([hidden])')!;
 const press=(name:string)=>{const node=[...active().querySelectorAll<HTMLButtonElement>('button')].find(button=>(button.getAttribute('aria-label')||button.textContent)?.trim()===name);expect(node,name).toBeDefined();node!.click();};
 press('Market');press('Create an asset');expect(active().querySelector('[data-product-example=create-asset]')).not.toBeNull();expect(active().textContent).toContain('Your next original.');expect(document.querySelector('.product-frame-caption')?.textContent).toContain('Create an Original');
 press('Close');press('Account settings');press('Remove ID from this device');expect(active().querySelector('[data-product-example=entry]')).not.toBeNull();
});
it('carries a rich example funding allocation in the payment record without requiring a live source read',()=>{
 const doc=new DOMParser().parseFromString(preview.screens.record,'text/html');
 expect(doc.body.textContent).toContain('Funding source');expect(doc.body.textContent).toContain('Payment memo');expect(doc.body.textContent).toContain('Design work');
 expect(doc.querySelector('.ledger-funding-sources .ledger-funding-path')).not.toBeNull();
});

it('shows priced and illustrated physical and digital examples without changing their projection-only authority',()=>{
 const doc=new DOMParser().parseFromString(preview.screens.market,'text/html');
 expect(doc.querySelectorAll('.market-rows .asset-row')).toHaveLength(8);expect(doc.querySelectorAll('.market-rows img')).toHaveLength(8);
 expect(doc.body.textContent).not.toContain('Value unavailable');expect(doc.body.textContent).toContain('Wheat harvest');expect(doc.body.textContent).toContain('$320.00');
});

// These secondary controls use the same read-only destination bank as the full tour.
import {twinPageContent} from '../scripts/twin-page.mjs';
import {twinSalesPages} from '../src/content/twin-pages.mjs';
it('names the creation step Asset and links to its existing guide',()=>{
 const doc=new DOMParser().parseFromString(productWalkthrough(),'text/html');
 expect(doc.querySelector('[data-product-choice="create-asset"]')?.textContent).toMatch(/Asset$/);
 expect(doc.querySelector('[data-product-choice="create-asset"]')?.textContent).not.toContain('Create');
 const href=doc.querySelector('[data-product-caption="create-asset"] a')?.getAttribute('href');
 expect(href&&publicPage(href)?.path).toBe('/learn/creating-an-asset/');
});
it('allows the Business hero to navigate out of the messages illustration',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=twinPageContent(twinSalesPages.find(page=>page.key==='in-action')!);init();
 const hero=document.querySelector('[data-product-walkthrough="action-hero"]')!;
 (hero.querySelector('.product-screen [aria-label="Close"]')as HTMLButtonElement).click();
 expect(hero.querySelector('[data-product-example="account"]')).not.toBeNull();
});
it('returns Counter to Receive and keeps a hidden example payment from changing the visible caption',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=productWalkthrough();init();
 const choose=(name:string)=>(document.querySelector(`[data-product-choice="${name}"]`)as HTMLButtonElement).click();
 const active=()=>document.querySelector('[data-product-panel]:not([hidden])')!;
 const press=(name:string)=>(active().querySelector(`[data-example-action="${name}"]`)as HTMLButtonElement).click();
 choose('receive');press('counter');press('receive');expect(active().querySelector('[data-product-example="receive"]')).not.toBeNull();
 choose('send');press('send-review');(active().querySelector('[data-example-approve]')as HTMLInputElement).click();press('send-complete');
 choose('account');const caption=document.querySelector('.product-frame-caption')?.textContent;vi.advanceTimersByTime(1000);
 expect(document.querySelector('.product-frame-caption')?.textContent).toBe(caption);expect(active().querySelector('[data-product-example="account"]')).not.toBeNull();
});

it('keeps destination HTML inert until selected instead of parsing thousands of hidden product nodes on first paint',()=>{
 const doc=new DOMParser().parseFromString(productMoment(),'text/html');
 expect(doc.querySelectorAll('.product-screen')).toHaveLength(1);
 expect(doc.querySelectorAll('template[data-example-view]')).toHaveLength(0);
 const bank=doc.querySelector('template[data-example-views]');expect(bank).not.toBeNull();
 const views=JSON.parse((bank as HTMLTemplateElement).content.textContent!);expect(views['create-asset'].html).toContain('Your next original.');expect(views.market.html).toContain('Wheat harvest');
});

// The carried navigation bundle must reuse the same immutable example destinations.
import {packExampleBanks} from '../scripts/product-preview-bank.mjs';
it('carries shared example views once across public pages without changing their first screen',()=>{
 const pages={one:{content:productMoment({id:'one',example:'agencies'}),head:'one'},two:{content:productMoment({id:'two',example:'freelancers'}),head:'two'}};
 const packed=packExampleBanks(pages),doc=new DOMParser().parseFromString(packed.pages.one.content+packed.shared,'text/html');
 const shared=JSON.parse((doc.querySelector('[data-shared-example-views]')as HTMLTemplateElement).content.textContent!);
 expect(shared.length).toBeLessThanOrEqual(40);
 expect(packed.pages.one.content.length).toBeLessThan(pages.one.content.length/4);expect(packed.pages.one.head).toBe('one');
 expect(doc.querySelector('[data-product-example="messages"]')?.textContent).toContain('remaining $4,800');
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=packed.pages.one.content+packed.shared;init();
 (document.querySelector('.product-screen [aria-label="Close"]')as HTMLButtonElement).click();
 expect(document.querySelector('[data-product-example="account"]')).not.toBeNull();
});
