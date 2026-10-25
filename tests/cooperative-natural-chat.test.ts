// @vitest-environment happy-dom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cooperativeConversation} from '../scripts/twin-conversation.mjs';
beforeEach(()=>{vi.resetModules();sessionStorage.clear();document.body.innerHTML=cooperativeConversation('together');});
afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
const slot={startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};
const form=()=>document.querySelector('[data-twin-composer]') as HTMLFormElement;
async function say(message:string){const f=form();(f.elements.namedItem('message') as HTMLTextAreaElement).value=message;f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect((f.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));}
it('uses one normal chat, carries the accepted native operation and confirms a real returned calendar event without forms',async()=>{
 const sent:any[]=[];vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});const p=JSON.parse(String(init.body));sent.push(p);return Response.json({ok:true,world:{username:'bjklock'},reply:{message:sent.length===1?'Monday at 9 AM New York time for Alex at alex@example.org. Reply yes to confirm this appointment.':'Your time is confirmed.',source:'upstream',memory:[],...(sent.length===2?{bookingConfirmation:{eventId:'actual-native-event',...slot,attendeeName:'Alex',attendeeEmail:'alex@example.org'}}:{})}});});
 // @ts-expect-error Standalone public ESM.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));
 expect(document.querySelectorAll('form')).toHaveLength(1);expect(document.querySelector('input[name=consent]')).toBeNull();expect(document.querySelector('[data-twin-book-form]')).toBeNull();expect(document.querySelector('[data-twin-times]')).toBeNull();expect(form().textContent).toContain('Sending shares this conversation');
 await say('I’m Alex, alex@example.org. Monday at 9 AM New York time works.');await say('Yes, book it.');
 expect(sent).toHaveLength(2);expect(sent.every(p=>p.action==='message'&&p.consent===true)).toBe(true);expect(sent[1].replyToOperationId).toBe(sent[0].clientOperationId);expect(sent[1].message).toBe('Yes, book it.');expect(document.querySelector('[data-twin-confirmation]')?.textContent).toContain('actual-native-event');expect((form().elements.namedItem('message') as HTMLTextAreaElement).value).toBe('');
});
it('never promotes a model’s booked claim or malformed event to calendar confirmation',async()=>{
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>!init?.body?Response.json({ok:true,world:{username:'bjklock'}}):Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Booked!',source:'upstream',memory:[],bookingConfirmation:{eventId:'',startAt:'invalid',attendeeEmail:'not an email'}}}));
 // @ts-expect-error Standalone public ESM.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));await say('Yes, book it.');expect((document.querySelector('[data-twin-confirmation]') as HTMLElement).hidden).toBe(true);expect(document.querySelector('[data-twin-status]')?.textContent).not.toContain('Your time is confirmed');
});
it('retains the accepted operation pointer through a reload and never takes it from a failed reply',async()=>{
 const sent:any[]=[];vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});const p=JSON.parse(String(init.body));sent.push(p);return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Native review',source:'upstream',memory:[]}});});
 // @ts-expect-error Standalone public ESM.
 let {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));await say('Prepare a time.');const prior=sent[0].clientOperationId;vi.resetModules();document.body.innerHTML=cooperativeConversation('together');
 // @ts-expect-error Standalone public ESM.
 ({mountConversation}=await import('../public/learn/cooperative-twin.js'));mountConversation(document.querySelector('[data-coop-twin]'));await say('Yes, book it.');expect(sent[1].replyToOperationId).toBe(prior);
});
