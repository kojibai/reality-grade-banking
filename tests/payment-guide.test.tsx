// @vitest-environment happy-dom
import {expect,it,vi,afterEach} from 'vitest';
import {readFile} from 'node:fs/promises';
import {checkoutEntryPath} from '../server/checkout-preview-plugin';
import {publicPage} from '../scripts/public-page-metadata.mjs';
import {inertPaymentPreview,paymentGuideContent} from '../scripts/payment-guide.mjs';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{document.body.replaceChildren();dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();});

it('separates the Pay landing document from personal payments and exact card returns',async()=>{
 const routes=JSON.parse(await readFile('vercel.json','utf8')).rewrites;
 for(const path of ['/pay','/pay/']){expect(routes.find((r:any)=>r.source===path)?.destination).toBe('/pay/index.html');expect(checkoutEntryPath(path)).toBeNull();}
 for(const path of ['/pay/:username','/pay/:username/'])expect(routes.find((r:any)=>r.source===path)?.destination).toBe('/pay/checkout.html');
 expect(checkoutEntryPath('/pay/merchant/?amount=12.30')).toBe('/pay/checkout.html');
 expect(checkoutEntryPath('/pay/merchant/?checkoutReturn=1&checkout_id=x&session_id=cs_test_original')).toBe('/pay/checkout.html');
 expect(checkoutEntryPath('/pay/checkout.html')).toBeNull();
 expect(publicPage('/pay/')?.id).toBe('pay');expect(publicPage('/pay/checkout.html')).toBeUndefined();
 const entry=await readFile('pay/checkout.html','utf8');expect(entry).toContain('noindex,nofollow');expect(entry).toContain('/src/checkout/main.tsx');
});

it('animates without playback controls, yields to interaction and removes its timer when leaving the page',async()=>{
 const {capturePaymentExamples}=await import('../src/presentation/PaymentPreview'),raw=await capturePaymentExamples();document.body.innerHTML=paymentGuideContent({screens:Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,inertPaymentPreview(value)])),css:''});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{constructor(public cb:Function){}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}});
 vi.useFakeTimers();const js=await readFile('public/learn/pay.js','utf8');new Function(js.replace('export function init','function init')+';init();')();
 const root=document.querySelector<HTMLElement>('[data-pay-demo]')!;expect(root.querySelector('[data-pay-play]')).toBeNull();
 await vi.advanceTimersByTimeAsync(5000);expect(root.dataset.payCurrent).toBe('review');
 root.querySelector<HTMLButtonElement>('[data-pay-step=amount]')!.click();await vi.advanceTimersByTimeAsync(10000);expect(root.dataset.payCurrent).toBe('amount');
 document.body.replaceChildren();dispatchEvent(new Event('receiz-learn:page'));await vi.advanceTimersByTimeAsync(100);expect(vi.getTimerCount()).toBe(0);
});

it('makes example controls local-only and keeps real checkout links outside the demonstration',()=>{
 const html=inertPaymentPreview('<form action="/danger"><input type="file"><input aria-label="Payment amount" value="75.00"><button type="submit">Continue</button><iframe src="https://receiz.com"></iframe><a href="/pay/merchant/">pay</a><script>fetch("/danger")</script></form>');
 const doc=new DOMParser().parseFromString(html,'text/html');expect(doc.querySelector('form,iframe,script,input[type=file]')).toBeNull();expect(doc.querySelector('button')?.getAttribute('type')).toBe('button');expect(doc.querySelector('button')?.getAttribute('data-pay-action')).toBe('review');expect(doc.querySelector('a')?.getAttribute('href')).toBe('#payment-example');
});

it('lets someone open the native account disclosure without autoplay replacing it',async()=>{
 const {capturePaymentExamples}=await import('../src/presentation/PaymentPreview'),raw=await capturePaymentExamples();document.body.innerHTML=paymentGuideContent({screens:Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,inertPaymentPreview(value)])),css:''});
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{constructor(public cb:Function){}observe(){this.cb([{isIntersecting:true}]);}disconnect(){}});
 vi.useFakeTimers();const js=await readFile('public/learn/pay.js','utf8');new Function(js.replace('export function init','function init')+';init();')();
 const root=document.querySelector<HTMLElement>('[data-pay-demo]')!,details=root.querySelector<HTMLDetailsElement>('.checkout-identity')!;details.querySelector('summary')!.click();expect(details.open).toBe(true);
 await vi.advanceTimersByTimeAsync(10000);expect(root.dataset.payCurrent).toBe('amount');expect(root.querySelector('.checkout-identity')).toBe(details);expect(details.open).toBe(true);
});

it('lets a visitor change the amount and click through the real review to the completed screen without data or payment calls',async()=>{
 const {capturePaymentExamples}=await import('../src/presentation/PaymentPreview'),raw=await capturePaymentExamples(),screens=Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,inertPaymentPreview(value)]));
 document.body.innerHTML=paymentGuideContent({screens,css:''});
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 vi.stubGlobal('fetch',vi.fn(()=>{throw Error('DEMO_HAS_NO_TRANSPORT');}));
 const js=await readFile('public/learn/pay.js','utf8');new Function(js.replace('export function init','function init')+';init();')();
 const root=document.querySelector<HTMLElement>('[data-pay-demo]')!,amount=root.querySelector<HTMLInputElement>('[data-pay-amount]')!;amount.value='42.18';amount.dispatchEvent(new Event('input',{bubbles:true}));
 const click=(selector:string)=>root.querySelector<HTMLButtonElement>(selector)!.click();
 click('[data-pay-action=review]');expect(root.dataset.payCurrent).toBe('review');expect(root.querySelector('.checkout-review-amount')?.textContent).toBe('$42.18');
 click('[data-pay-action=card]');expect(root.dataset.payCurrent).toBe('card');expect(root.querySelector('[data-pay-total]')?.textContent).toBe('$42.18');expect(root.querySelector('input')).toBeNull();
 click('[data-pay-action=complete]');expect(root.dataset.payCurrent).toBe('complete');expect(root.querySelector('.checkout-paid-amount')?.textContent).toBe('$42.18');
 click('.checkout-complete [data-pay-action=explain]');expect(root.querySelector('.pay-demo-tip')?.textContent).toContain('This example saves no files');
 click('[data-pay-step=amount]');expect(root.dataset.payCurrent).toBe('amount');expect(root.querySelector<HTMLInputElement>('[data-pay-amount]')?.value).toBe('42.18');
 const tiny=root.querySelector<HTMLInputElement>('[data-pay-amount]')!;tiny.value='0.01';click('[data-pay-action=review]');
 expect(root.querySelector('.checkout-review-amount')?.textContent).toBe('$0.01');
 const cardRow=[...root.querySelectorAll('dl>div')].find(row=>row.querySelector('dt')?.textContent==='Card payment');expect(cardRow?.querySelector('dd')?.textContent).toBe('$0.50');expect(root.textContent).toContain('$0.49 stays in your balance.');
 click('[data-pay-step=amount]');
 amount.value='0';const next=root.querySelector<HTMLInputElement>('[data-pay-amount]')!;next.value='0';click('[data-pay-action=review]');expect(root.dataset.payCurrent).toBe('amount');expect(next.getAttribute('aria-invalid')).toBe('true');
 expect(fetch).not.toHaveBeenCalled();expect(root.querySelector('iframe,form,input[type=file]')).toBeNull();
 for(const link of root.querySelectorAll('a')){expect(link.getAttribute('href')).toBe('#payment-example');expect(link.getAttribute('data-pay-action')).toBe('explain');}
 document.body.replaceChildren();dispatchEvent(new Event('receiz-learn:page'));
});

it('captures the real checkout workflow without using an account, transport or financial original',async()=>{
 const {capturePaymentExamples}=await import('../src/presentation/PaymentPreview');
 const screens=await capturePaymentExamples();
 const parse=(key:keyof typeof screens)=>new DOMParser().parseFromString(screens[key],'text/html');
 expect(parse('amount').querySelector('[aria-label="Payment amount"]')?.getAttribute('value')).toBe('75.00');
 expect(parse('review').body.textContent).toContain('Review payment');expect(parse('review').body.textContent).toContain('Card payment');
 expect(parse('complete').body.textContent).toContain('Payment complete.');expect(parse('complete').body.textContent).toContain('Save Identity Record');
 expect(parse('complete').querySelector('.checkout-open-bank')?.getAttribute('href')).toBe('/');
 for(const html of Object.values(screens)){expect(html).not.toMatch(/<iframe|client_secret|cs_test_|https:\/\/receiz.com/);expect(html).toContain('mayaexample');}
});
