// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductScreen} from '../src/presentation/ProductScreen';
import {dailyMoneyStories} from '../src/content/daily-money-stories.mjs';
import {businessFits} from '../src/content/business-fits.mjs';
import {productMoment,dailyMoneyWalkthrough} from '../scripts/product-walkthrough.mjs';
// @ts-expect-error Public enhancement stays standalone ESM.
import {init} from '../public/learn/product-walkthrough.js';
afterEach(()=>{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();});
it('gives all thirty audiences a complete, distinct money workflow with a practical outcome',()=>{
 for(const fit of businessFits){const story=dailyMoneyStories[fit.slug];expect(story,fit.slug).toBeDefined();expect(story.authorization.length).toBeGreaterThan(20);expect(story.outcomeLabel.length).toBeGreaterThan(8);}
 expect(new Set(businessFits.map(fit=>dailyMoneyStories[fit.slug].outcomeLabel)).size).toBe(30);
});
it('reconciles every displayed account result from its exact incoming and outgoing example payments',()=>{
 for(const story of Object.values(dailyMoneyStories)){
  const change=story.movements.reduce((sum,m)=>sum+(m.direction==='received'?1n:-1n)*BigInt(m.amountUsdCents),0n);
  expect(BigInt(story.remainingBalanceCents)).toBe(BigInt(story.initialBalanceCents)+change);
  expect(BigInt(story.remainingBalanceCents)).toBeGreaterThanOrEqual(0n);
  if(story.budget){expect(BigInt(story.budget.availableCents)-BigInt(story.budget.costCents)-BigInt(story.budget.futureCents)).toBe(BigInt(story.budget.remainingCents));}
 }
});
it.each(['daily-payroll','daily-collect','daily-afford','researchers','collectors'])('shows the full %s result in the native message popover without a live writer',key=>{
 const story=dailyMoneyStories[key],doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="messages" example={key}/>),'text/html');
 expect(doc.querySelector('[data-daily-money]')?.getAttribute('data-daily-money')).toBe(key);
 expect(doc.querySelectorAll('[data-workflow-turn]')).toHaveLength(5);expect(doc.querySelector('[data-money-outcome]')?.getAttribute('aria-label')).toBe(story.outcomeLabel);
 expect(doc.querySelector('iframe,script')).toBeNull();expect(doc.querySelector('[inert]')).not.toBeNull();
 expect(doc.querySelectorAll('.bank-chat-payment')).toHaveLength(story.movements.length);
 if(story.kind==='insight')expect(story.movements).toHaveLength(0);
});
it('plays different daily tasks without leaving chat, and keeps an individual receipt bound to its payment',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);document.body.innerHTML=productMoment({example:'daily-payroll'});init();callbacks[0]([{isIntersecting:true}]);vi.advanceTimersByTime(16000);
 const flow=document.querySelector('[data-daily-money]')!;expect(flow.getAttribute('data-workflow-phase')).toBe('4');expect((flow.querySelector('[data-workflow-pane="chat"]')as HTMLElement).hidden).toBe(false);
 (flow.querySelector('[data-workflow-open="record-1"]')as HTMLButtonElement).click();const record=flow.querySelector('[data-workflow-pane="record-1"]')!;
 expect((record as HTMLElement).hidden).toBe(false);expect(record.textContent).toContain('Rae');expect(record.textContent).toContain('$1,100.00');
 (record.querySelector('a[aria-label="Open full receipt"]')as HTMLAnchorElement).click();expect(flow.isConnected).toBe(true);expect((record as HTMLElement).hidden).toBe(false);expect(fetch).not.toHaveBeenCalled();
});
it('switches daily tasks within one tasteful walkthrough and supports returning to the same result',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=dailyMoneyWalkthrough();init();
 for(const key of ['daily-payroll','daily-collect','daily-afford','daily-payroll']){(document.querySelector(`[data-product-choice="${key}"]`)as HTMLButtonElement).click();expect(document.querySelector('[data-product-panel]:not([hidden]) [data-daily-money]')?.getAttribute('data-daily-money')).toBe(key);}
});

it('preserves paid items, conditional funding and unaccepted proposals in the finished stories',()=>{
 expect(dailyMoneyStories.teams.movements.map(m=>m.amountUsdCents)).toEqual(['12000']);
 expect(dailyMoneyStories['daily-afford'].movements.map(m=>[m.direction,m.amountUsdCents])).toEqual([['received','240000'],['sent','200000']]);
 expect(dailyMoneyStories.coaches.authorization).toContain('only request payment after the client accepts');
 expect(dailyMoneyStories.researchers.movements).toHaveLength(0);expect(dailyMoneyStories.researchers.finalReply).toContain('until an approved change is recorded');
 expect(dailyMoneyStories.founders.movements).toHaveLength(0);expect(dailyMoneyStories.startups.finalReply).toContain('counted once');
});
import {fitContent} from '../scripts/business-fit-pages.mjs';
it('places each audience’s workflow directly after its practical question, before the wider benefits',()=>{
 for(const fit of businessFits){const html=fitContent(fit),question=html.indexOf('id="your-work"'),workflow=html.indexOf('data-product-walkthrough="fit-money-ui"'),benefits=html.indexOf('class="learn-shell fit-outcomes"');expect(question).toBeGreaterThan(-1);expect(workflow).toBeGreaterThan(question);expect(workflow).toBeLessThan(benefits);}
});

it('keeps a receipt open for keyboard readers instead of restarting the story',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 document.body.innerHTML=productMoment({example:'daily-collect'});init();callbacks[0]([{isIntersecting:true}]);vi.advanceTimersByTime(16000);
 const flow=document.querySelector('[data-daily-money]')!,summary=flow.querySelector('.daily-money-receipt summary')!;
 summary.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));(summary as HTMLElement).click();vi.advanceTimersByTime(16000);
 expect(flow.getAttribute('data-workflow-phase')).toBe('4');expect((flow.querySelector('[data-workflow-turn="4"]')as HTMLElement).hidden).toBe(false);
});
it('returns to the selected story’s correct account snapshot before and after its payments',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=dailyMoneyWalkthrough();init();
 const panel=()=>document.querySelector('[data-product-panel]:not([hidden])')!;
 (panel().querySelector('[data-workflow-step="0"]')as HTMLButtonElement).click();(panel().querySelector('button[aria-label="Close"]')as HTMLButtonElement).click();
 expect(panel().querySelector('.balance-amount')?.textContent).toBe('$18,500.00');
 (panel().querySelector('button[aria-label="Open your agent and messages"]')as HTMLButtonElement).click();
 (panel().querySelector('[data-workflow-step="4"]')as HTMLButtonElement).click();(panel().querySelector('button[aria-label="Close"]')as HTMLButtonElement).click();
 expect(panel().querySelector('.balance-amount')?.textContent).toBe('$15,300.00');
 (document.querySelector('[data-product-choice="daily-collect"]')as HTMLButtonElement).click();
 (panel().querySelector('[data-workflow-step="4"]')as HTMLButtonElement).click();(panel().querySelector('button[aria-label="Close"]')as HTMLButtonElement).click();
 expect(panel().querySelector('.balance-amount')?.textContent).toBe('$1,375.00');
});
