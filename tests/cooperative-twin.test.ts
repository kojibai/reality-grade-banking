// @vitest-environment happy-dom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {togetherPages,togetherContent} from '../scripts/together-page.mjs';
import {cooperativeContent,cooperativePages} from '../scripts/cooperative-page.mjs';
beforeEach(()=>{vi.resetModules();sessionStorage.clear();document.body.innerHTML=cooperativeContent(cooperativePages.find(p=>p.cooperativeKind==='connect'));});
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
const mount=async()=>{
 // @ts-expect-error Public interaction is standalone ESM.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));return mountConversation;
};
const reply={ok:true,world:{username:'bjklock'},reply:{message:'Which supplier needs paying before your buyer pays?',memory:[],bookingSlots:[],bookingConfirmation:null}};
const composer=()=>document.querySelector('[data-twin-composer]') as HTMLFormElement;
const fill=()=>{const f=composer();(f.elements.namedItem('message') as HTMLInputElement).value='Our supplier needs paying before the buyer pays.';(f.elements.namedItem('consent') as HTMLInputElement).checked=true;return f;};

it('does no cold network work and sends one consented native conversation, retaining its exact operation for retry',async()=>{
 let calls=0,resolve!:(r:Response)=>void;const payloads:Record<string,unknown>[]=[];
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});calls++;payloads.push(JSON.parse(String(init.body)));return new Promise<Response>(r=>{resolve=r;});});
 const mounting=await mount();mounting(document.querySelector('[data-coop-twin]'));expect(calls).toBe(0);expect((document.querySelector('[data-twin-booking]') as HTMLElement).hidden).toBe(true);
 const f=fill();f.dispatchEvent(new Event('submit',{cancelable:true}));f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(calls).toBe(1));
 resolve(Response.json({ok:false,error:'RECEIZ_RESULT_UNCONFIRMED'},{status:502}));await vi.waitFor(()=>expect((document.querySelector('[data-twin-retry]') as HTMLElement).hidden).toBe(false));
 expect(document.querySelector('[data-twin-messages]')?.textContent).not.toContain(reply.reply.message);
 (document.querySelector('[data-twin-retry]') as HTMLButtonElement).click();await vi.waitFor(()=>expect(calls).toBe(2));expect(payloads[1]).toEqual(payloads[0]);
 resolve(Response.json(reply));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain(reply.reply.message));
 expect(document.querySelector('[data-twin-status]')?.textContent).not.toContain('booked');
});

it('books an actually selected time inline and requires the native calendar confirmation',async()=>{
 const slot={id:'slot-1',startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};let writes=0;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{
  if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'},availability:{slots:[slot,{startAt:'2026-11-03T14:00:00.000Z',endAt:'2026-11-03T14:30:00.000Z'}],customQuestions:[]}});
  const payload=JSON.parse(String(init.body));if(payload.action==='message')return Response.json(reply);writes++;
  return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Confirmed',bookingConfirmation:{eventId:'native-calendar-1',startAt:slot.startAt,endAt:slot.endAt,attendeeName:'Alex',attendeeEmail:'alex@example.org',title:'Alex appointment'}}});
 });
 await mount();const f=fill();f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain(reply.reply.message));
 (document.querySelector('[data-twin-times]') as HTMLButtonElement).click();await vi.waitFor(()=>expect(document.querySelectorAll('[data-twin-slot]').length).toBe(1));
 const day=document.querySelector('[data-twin-day]') as HTMLSelectElement;expect(day.options).toHaveLength(2);day.value=day.options[1].value;day.dispatchEvent(new Event('change'));expect(document.querySelector('[data-twin-slot]')?.getAttribute('data-twin-slot')).toBe('2026-11-03T14:00:00.000Z');day.value=day.options[0].value;day.dispatchEvent(new Event('change'));
 (document.querySelector('[data-twin-slot]') as HTMLButtonElement).click();const book=document.querySelector('[data-twin-book-form]') as HTMLFormElement;
 (book.elements.namedItem('name') as HTMLInputElement).value='Alex';(book.elements.namedItem('email') as HTMLInputElement).value='alex@example.org';(book.elements.namedItem('confirm') as HTMLInputElement).checked=true;
 book.dispatchEvent(new Event('submit',{cancelable:true}));book.dispatchEvent(new Event('submit',{cancelable:true}));
 await vi.waitFor(()=>expect(document.querySelector('[data-twin-confirmation]')?.textContent).toContain('native-calendar-1'));expect(writes).toBe(1);expect(location.pathname).not.toContain('receiz.com');
});

const pending={action:'message',message:'Retained inquiry',consent:true,clientOperationId:'retained-operation-123',quoteExpiresAt:new Date(Date.now()+600000).toISOString()};
it('recovers an actionable exact message after reload and retains its text when the operation expires',async()=>{
 sessionStorage.setItem('bankeiz:cooperative-twin:pending:v1',JSON.stringify(pending));
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>!init?.body?Response.json({ok:true,world:{username:'bjklock'}}):Response.json({ok:false,error:'owned_twin_quote_expired',operationStatus:'quote_expired'},{status:409}));
 await mount();const retry=document.querySelector('[data-twin-retry]') as HTMLButtonElement;
 expect(retry.hidden).toBe(false);expect(document.querySelector('[data-twin-status]')?.textContent).toContain('retained');retry.click();
 await vi.waitFor(()=>expect((composer().querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));
 expect((composer().elements.namedItem('consent') as HTMLInputElement).checked).toBe(true);expect((composer().elements.namedItem('message') as HTMLTextAreaElement).value).toBe('Retained inquiry');expect(document.querySelector('[data-twin-status]')?.textContent).toContain('new message');
});
it('projects native history once in native order and establishes guest continuity before the first write',async()=>{
 const calls:string[]=[];vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{
  calls.push(init?.body?'write':'continuity');if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});
  return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Native reply',memory:[{id:'prior-user',role:'user',body:'Earlier inquiry'},{id:'prior-agent',role:'assistant',body:'Earlier reply'},{id:'current-user',role:'user',body:'Our supplier needs paying before the buyer pays.'},{id:'current-agent',role:'assistant',body:'Native reply'}]}});
 });
 await mount();fill().dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelectorAll('.coop-twin-message').length).toBe(4));
 expect(calls).toEqual(['continuity','write']);expect(Array.from(document.querySelectorAll('.coop-twin-message p'),n=>n.textContent)).toEqual(['Earlier inquiry','Earlier reply','Our supplier needs paying before the buyer pays.','Native reply']);
});
it('releases an explicitly refused booking while retaining the selected time and contact details',async()=>{
 const slot={startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>!init?.body?Response.json({ok:true,world:{username:'bjklock'},availability:{slots:[slot],customQuestions:[]}}):Response.json({ok:false,error:'rate_limited'},{status:429}));
 await mount();fill();(document.querySelector('[data-twin-times]') as HTMLButtonElement).click();await vi.waitFor(()=>expect(document.querySelector('[data-twin-slot]')).not.toBeNull());(document.querySelector('[data-twin-slot]') as HTMLButtonElement).click();
 const book=document.querySelector('[data-twin-book-form]') as HTMLFormElement;(book.elements.namedItem('name') as HTMLInputElement).value='Alex';(book.elements.namedItem('email') as HTMLInputElement).value='alex@example.org';(book.elements.namedItem('confirm') as HTMLInputElement).checked=true;book.dispatchEvent(new Event('submit',{cancelable:true}));
 await vi.waitFor(()=>expect((book.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));expect((book.elements.namedItem('email') as HTMLInputElement).value).toBe('alex@example.org');expect((document.querySelector('[data-twin-confirmation]') as HTMLElement).hidden).toBe(true);
});

it.each(togetherPages)('keeps $path on the same native Twin and confirmed calendar path without a handoff',async page=>{
 history.replaceState(null,'',page.path);document.body.innerHTML=togetherContent(page);const payloads:Record<string,unknown>[]=[],slot={startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'},availability:{slots:[slot],customQuestions:[]}});const payload=JSON.parse(String(init.body));payloads.push(payload);return Response.json(payload.action==='message'?reply:{ok:true,world:{username:'bjklock'},reply:{message:'Native calendar confirmed',bookingConfirmation:{eventId:'together-calendar',startAt:slot.startAt,endAt:slot.endAt,attendeeEmail:'alex@example.org'}}});});
 await mount();expect(payloads).toHaveLength(0);const form=composer();(form.elements.namedItem('message') as HTMLTextAreaElement).value=page.prompt;(form.elements.namedItem('consent') as HTMLInputElement).checked=true;form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.textContent).toContain(reply.reply.message));expect(payloads[0].pagePath).toBe(page.path);
 (document.querySelector('[data-twin-times]') as HTMLButtonElement).click();await vi.waitFor(()=>expect(document.querySelector('[data-twin-slot]')).not.toBeNull());(document.querySelector('[data-twin-slot]') as HTMLButtonElement).click();const book=document.querySelector('[data-twin-book-form]') as HTMLFormElement;
 (book.elements.namedItem('name') as HTMLInputElement).value='Alex';(book.elements.namedItem('email') as HTMLInputElement).value='alex@example.org';(book.elements.namedItem('confirm') as HTMLInputElement).checked=true;book.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(document.querySelector('[data-twin-confirmation]')?.textContent).toContain('together-calendar'));expect(payloads).toHaveLength(2);expect(payloads[1].notes).toContain('Together · Proof-native economy inquiry from '+page.path);expect(location.pathname).toBe(page.path);history.replaceState(null,'','/');
});
