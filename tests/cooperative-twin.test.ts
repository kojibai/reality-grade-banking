// @vitest-environment happy-dom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {togetherPages,togetherContent} from '../scripts/together-page.mjs';
import {twinSalesPages,twinPageContent} from '../scripts/twin-page.mjs';
import {cooperativeContent,cooperativePages} from '../scripts/cooperative-page.mjs';
beforeEach(()=>{vi.resetModules();sessionStorage.clear();document.body.innerHTML=cooperativeContent(cooperativePages.find(p=>p.cooperativeKind==='connect'));});
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
const mount=async()=>{
 // @ts-expect-error Public interaction is standalone ESM.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));return mountConversation;
};
const reply={ok:true,world:{username:'bjklock'},reply:{message:'Which supplier needs paying before your buyer pays?',memory:[],bookingSlots:[],bookingConfirmation:null}};
const composer=()=>document.querySelector('[data-twin-composer]') as HTMLFormElement;
const fill=()=>{const f=composer();(f.elements.namedItem('message') as HTMLInputElement).value='Our supplier needs paying before the buyer pays.';return f;};

it('does no cold network work and sends one consented native conversation, retaining its exact operation for retry',async()=>{
 let calls=0,resolve!:(r:Response)=>void;const payloads:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});calls++;payloads.push(JSON.parse(String(init.body)));return new Promise<Response>(r=>{resolve=r;});});
 const mounting=await mount();mounting(document.querySelector('[data-coop-twin]'));expect(calls).toBe(0);expect(document.querySelector('[data-twin-book-form]')).toBeNull();
 const f=fill();f.dispatchEvent(new Event('submit',{cancelable:true}));f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(calls).toBe(1));
 resolve(Response.json({ok:false,error:'RECEIZ_RESULT_UNCONFIRMED'},{status:502}));await vi.waitFor(()=>expect((document.querySelector('[data-twin-retry]') as HTMLElement).hidden).toBe(false));
 expect(document.querySelector('[data-twin-messages]')?.textContent).not.toContain(reply.reply.message);
 (document.querySelector('[data-twin-retry]') as HTMLButtonElement).click();await vi.waitFor(()=>expect(calls).toBe(2));expect(payloads[1]).toEqual(payloads[0]);
 resolve(Response.json(reply));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain(reply.reply.message));
 expect(document.querySelector('[data-twin-status]')?.textContent).not.toContain('booked');
});

it('keeps booking entirely in messages and displays only the native calendar receipt',async()=>{
 let writes=0;const sent:any[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});const payload=JSON.parse(String(init.body));sent.push(payload);writes++;return Response.json({ok:true,world:{username:'bjklock'},reply:{message:writes===1?'I have Monday at 9 AM. Reply yes to confirm this appointment.':'Confirmed',bookingConfirmation:writes===2?{eventId:'native-calendar-1',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z',attendeeName:'Alex',attendeeEmail:'alex@example.org'}:null}});});
 await mount();fill().dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain('Reply yes'));
 expect((document.querySelector('[data-twin-confirmation]') as HTMLElement).hidden).toBe(true);const f=composer();(f.elements.namedItem('message') as HTMLTextAreaElement).value='Yes, book it.';f.dispatchEvent(new Event('submit',{cancelable:true}));f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-confirmation]')?.textContent).toContain('native-calendar-1'));expect(writes).toBe(2);expect(sent[1].replyToOperationId).toBe(sent[0].clientOperationId);expect(sent.every(p=>p.action==='message')).toBe(true);
});

const pending={action:'message',message:'Retained inquiry',consent:true,clientOperationId:'retained-operation-123',quoteExpiresAt:new Date(Date.now()+600000).toISOString()};
it('recovers an actionable exact message after reload and retains its text when the operation expires',async()=>{
 sessionStorage.setItem('bankeiz:cooperative-twin:pending:v1',JSON.stringify(pending));
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>!init?.body?Response.json({ok:true,world:{username:'bjklock'}}):Response.json({ok:false,error:'owned_twin_quote_expired',operationStatus:'quote_expired'},{status:409}));
 await mount();const retry=document.querySelector('[data-twin-retry]') as HTMLButtonElement;
 expect(retry.hidden).toBe(false);expect(document.querySelector('[data-twin-status]')?.textContent).toContain('retained');retry.click();
 await vi.waitFor(()=>expect((composer().querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));
 expect(composer().querySelector('input[type=checkbox]')).toBeNull();expect((composer().elements.namedItem('message') as HTMLTextAreaElement).value).toBe('Retained inquiry');expect(document.querySelector('[data-twin-status]')?.textContent).toContain('new message');
});
it('projects native history once in native order and establishes guest continuity before the first write',async()=>{
 const calls:string[]=[];vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{
  calls.push(init?.body?'write':'continuity');if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});
  return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Native reply',memory:[{id:'prior-user',role:'user',body:'Earlier inquiry'},{id:'prior-agent',role:'assistant',body:'Earlier reply'},{id:'current-user',role:'user',body:'Our supplier needs paying before the buyer pays.'},{id:'current-agent',role:'assistant',body:'Native reply'}]}});
 });
 await mount();fill().dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelectorAll('.coop-twin-message').length).toBe(4));
 expect(calls).toEqual(['continuity','write']);expect(Array.from(document.querySelectorAll('.coop-twin-message p'),n=>n.textContent)).toEqual(['Earlier inquiry','Earlier reply','Our supplier needs paying before the buyer pays.','Native reply']);
});
it('retains a rate-limited conversational request without claiming an appointment',async()=>{
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>!init?.body?Response.json({ok:true,world:{username:'bjklock'}}):Response.json({ok:false,error:'rate_limited'},{status:429}));
 await mount();fill().dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect((document.querySelector('[data-twin-retry]') as HTMLElement).hidden).toBe(false));expect((document.querySelector('[data-twin-confirmation]') as HTMLElement).hidden).toBe(true);expect(sessionStorage.getItem('bankeiz:cooperative-twin:pending:v1')).toContain('Our supplier');
});

const audiencePages=[...togetherPages.map(page=>({...page,kind:'together'})),...twinSalesPages.flatMap(page=>[page,{...page,path:page.path.slice(0,-1)}]).map(page=>({...page,kind:'business'}))];
it.each(audiencePages)('keeps $path in one natural conversation with its page context and accepted-operation continuity',async page=>{
 history.replaceState(null,'',page.path);document.body.innerHTML=page.kind==='together'?togetherContent(page as any):twinPageContent(page as any);const payloads:any[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});const payload=JSON.parse(String(init.body));payloads.push(payload);return Response.json({ok:true,world:{username:'bjklock'},reply:{message:payloads.length===1?'Reply yes to confirm this appointment.':'Native calendar confirmed',bookingConfirmation:payloads.length===2?{eventId:'native-calendar',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z',attendeeEmail:'alex@example.org'}:null}});});
 await mount();expect(payloads).toHaveLength(0);const form=composer();(form.elements.namedItem('message') as HTMLTextAreaElement).value=page.prompt;form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain('Reply yes'));expect(payloads[0].pagePath).toBe(page.path);
 (form.elements.namedItem('message') as HTMLTextAreaElement).value='Yes, book it.';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-confirmation]')?.textContent).toContain('native-calendar'));expect(payloads).toHaveLength(2);expect(payloads[1].replyToOperationId).toBe(payloads[0].clientOperationId);expect(location.pathname).toBe(page.path);expect(document.querySelector('[data-twin-book-form]')).toBeNull();history.replaceState(null,'','/');
});
