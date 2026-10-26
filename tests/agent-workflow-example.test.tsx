// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductScreen} from '../src/presentation/ProductScreen';
import {workflowContacts,workflowEvent,workflowPayment} from '../src/presentation/AgentWorkflowExample';
import {readMessagePayment} from '../src/receiz/message-payment';
import {productMoment} from '../scripts/product-walkthrough.mjs';
// @ts-expect-error Public enhancement remains a standalone page-only module.
import {init} from '../public/learn/product-walkthrough.js';
afterEach(()=>{document.body.innerHTML='';window.dispatchEvent(new Event('receiz-learn:page'));vi.useRealTimers();vi.unstubAllGlobals();});
it('shows the complete discovery, contact, booking and received-payment story using native product views',()=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<ProductScreen screen="messages" example="agent-workflow"/>),'text/html');
 expect(doc.querySelector('[data-agent-workflow]')).not.toBeNull();expect(doc.querySelectorAll('[data-workflow-step]')).toHaveLength(5);
 expect(doc.querySelectorAll('.organizer-person-row')).toHaveLength(3);expect(doc.querySelector('.organizer-agenda-row')?.textContent).toContain('Mia');
 expect(doc.querySelector('.bank-chat-payment')?.textContent).toContain('$300.00');expect(doc.querySelector('[data-workflow-pane="record"]')?.textContent).toContain('Store setup deposit');
 expect(doc.querySelector('iframe,script')).toBeNull();expect(doc.querySelector('[inert]')).not.toBeNull();
});
it('keeps the discovered person, saved contact, appointment and received payment bound to the same sample relationship',()=>{
 const mia=workflowContacts[0];expect(workflowEvent.attendees).toContain(mia.email);expect(workflowEvent.metadata.contactId).toBe(mia.id);
 const payment=readMessagePayment(workflowPayment,'00000000-0000-4000-8000-000000000001');
 expect(payment?.direction).toBe('received');expect(payment?.amountUsdCents).toBe('30000');expect(payment?.senderUserId).toBe(mia.linkedUserId);
 expect(mia.email).toMatch(/@example\.invalid$/);
});
it('animates every stage locally, opens the native contact and calendar panes, and lets readers return to the conversation',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));
 const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);document.body.innerHTML=productMoment({example:'agent-workflow'});init();callbacks[0]([{isIntersecting:true}]);
 const flow=document.querySelector('[data-agent-workflow]')!;
 expect(flow.getAttribute('data-workflow-phase')).toBe('0');vi.advanceTimersByTime(6500);expect(flow.getAttribute('data-workflow-phase')).toBe('2');
 expect((flow.querySelector('[data-workflow-pane="contacts"]')as HTMLElement).hidden).toBe(false);
 vi.advanceTimersByTime(4500);expect(flow.getAttribute('data-workflow-phase')).toBe('3');expect((flow.querySelector('[data-workflow-pane="calendar"]')as HTMLElement).hidden).toBe(false);
 vi.advanceTimersByTime(5000);expect(flow.getAttribute('data-workflow-phase')).toBe('4');expect((flow.querySelector('[data-workflow-turn="4"]')as HTMLElement).hidden).toBe(false);
 (flow.querySelector('[data-workflow-open="person"]')as HTMLButtonElement).click();expect((flow.querySelector('[data-workflow-pane="person"]')as HTMLElement).hidden).toBe(false);
 (flow.querySelector('[data-workflow-pane="person"] [data-workflow-open="chat"]')as HTMLButtonElement).click();expect((flow.querySelector('[data-workflow-pane="chat"]')as HTMLElement).hidden).toBe(false);
 (flow.querySelector('[data-workflow-open="contacts"]')as HTMLButtonElement).click();(flow.querySelector('[aria-label="Jordan Brooks"]')as HTMLButtonElement).click();expect((flow.querySelector('[data-workflow-pane="person-1"]')as HTMLElement).hidden).toBe(false);
 (flow.querySelector('[data-workflow-open="record"]')as HTMLButtonElement).click();(flow.querySelector('a[aria-label="Open full receipt"]')as HTMLAnchorElement).click();expect(flow.isConnected).toBe(true);expect(flow.querySelector('[data-workflow-pane="record"]')?.textContent).toContain('$300.00');
 expect(fetch).not.toHaveBeenCalled();window.dispatchEvent(new Event('receiz-learn:page'));vi.advanceTimersByTime(60000);expect(fetch).not.toHaveBeenCalled();
});

it('holds the exact contact result while someone reads instead of advancing or revealing future payments',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}));const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
 vi.stubGlobal('IntersectionObserver',class{constructor(fn:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(fn);}observe(){}disconnect(){}});
 document.body.innerHTML=productMoment({example:'agent-workflow'});init();callbacks[0]([{isIntersecting:true}]);vi.advanceTimersByTime(6500);
 const flow=document.querySelector('[data-agent-workflow]')!,pane=flow.querySelector('[data-workflow-pane="contacts"]')!;
 pane.querySelector('.organizer-scroll')!.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true}));vi.advanceTimersByTime(20000);
 expect(flow.getAttribute('data-workflow-phase')).toBe('2');expect((pane as HTMLElement).hidden).toBe(false);expect((flow.querySelector('[data-workflow-turn="4"]')as HTMLElement).hidden).toBe(true);
 callbacks[0]([{isIntersecting:false}]);callbacks[0]([{isIntersecting:true}]);expect((pane as HTMLElement).hidden).toBe(false);
});
it('lets reduced-motion readers select Ask again after inspecting another step',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}));vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 document.body.innerHTML=productMoment({example:'agent-workflow'});init();const flow=document.querySelector('[data-agent-workflow]')!;
 (flow.querySelector('[data-workflow-step="1"]')as HTMLButtonElement).click();(flow.querySelector('[data-workflow-step="0"]')as HTMLButtonElement).click();
 expect(flow.getAttribute('data-workflow-phase')).toBe('0');expect((flow.querySelector('[data-workflow-turn="4"]')as HTMLElement).hidden).toBe(true);
});

// @ts-expect-error Static public guide renderer.
import {learnArticle} from '../scripts/learn-template.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
it.each(['messages','get-paid'])('boots the workflow on cold %s guide entry through the existing enhancement root',slug=>{
 const page=learningPages.find(item=>item.slug===slug)!,doc=new DOMParser().parseFromString(learnArticle(page,learningPages,(value:string)=>value),'text/html');
 expect(doc.querySelector('[data-coop] [data-agent-workflow]')).not.toBeNull();
});
