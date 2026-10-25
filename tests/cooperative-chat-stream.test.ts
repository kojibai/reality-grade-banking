// @vitest-environment happy-dom
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {cooperativeConversation} from '../scripts/twin-conversation.mjs';
const encoder=new TextEncoder(),frame=(v:unknown)=>encoder.encode('data: '+JSON.stringify(v)+'\r\n\r\n');
beforeEach(()=>{vi.resetModules();sessionStorage.clear();document.body.innerHTML=cooperativeConversation('together');});afterEach(()=>{vi.unstubAllGlobals();document.body.innerHTML='';});
it('shows the user and typing bubble immediately, streams real chunks into the same node, and leaves a normal composer after the first turn',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>,payload:any;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});payload=JSON.parse(String(init.body));expect(new Headers(init.headers).get('Accept')).toBe('text/event-stream');return new Response(new ReadableStream({start(c){controller=c;}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));
 const form=document.querySelector('[data-twin-composer]') as HTMLFormElement,draft=form.elements.namedItem('message') as HTMLTextAreaElement;
 draft.value='Can this help my business?';form.dispatchEvent(new Event('submit',{cancelable:true}));
 expect(document.querySelector('[data-twin-messages]')?.textContent).toContain(draft.value||'Can this help my business?');expect(document.querySelector('[data-twin-typing]')).not.toBeNull();expect((document.querySelector('.coop-twin-suggestions') as HTMLElement).hidden).toBe(true);
 await vi.waitFor(()=>expect(payload).toBeDefined());const id=payload.clientOperationId;
 controller.enqueue(frame({type:'reply_start',messageId:id}));const bytes=frame({type:'reply_delta',messageId:id,delta:'Let’s connect your context 🧠'});const split=bytes.findIndex((v,i)=>v===240&&bytes[i+1]===159)+2;controller.enqueue(bytes.slice(0,split));controller.enqueue(bytes.slice(split));
 await vi.waitFor(()=>expect(document.querySelector('.coop-twin-reply p')?.textContent).toBe('Let’s connect your context 🧠'));const node=document.querySelector('.coop-twin-reply');
 draft.value='My next question';draft.dispatchEvent(new Event('input'));controller.enqueue(frame({type:'reply_delta',messageId:id,delta:' and your customers.'}));await vi.waitFor(()=>expect(node?.textContent).toContain('customers'));expect(document.querySelector('.coop-twin-reply')).toBe(node);expect(draft.value).toBe('My next question');
 controller.enqueue(frame({type:'reply_done',world:{username:'bjklock'},reply:{message:'Let’s connect your context 🧠 and your customers.',source:'upstream',proof:{sourcePrimitive:'receiz.subject.proof_brain.v1',subjectId:'subject-1'},memory:[]}}));controller.enqueue(frame({type:'done'}));controller.close();
 await vi.waitFor(()=>expect(document.querySelector('[data-twin-messages]')?.getAttribute('aria-busy')).toBe('false'));expect(document.querySelector('.coop-twin-reply')).toBe(node);expect(sessionStorage.getItem('bankeiz:cooperative-twin:pending:v1')).toBeNull();expect(draft.value).toBe('My next question');expect(document.querySelector('[data-twin-typing]')).toBeNull();
});
it('updates only the active reply during tokens while settled history, controls and the typed draft remain untouched',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>,payload:any,turn=0;
 const history=Array.from({length:120},(_,i)=>({id:'settled-'+i,role:i%2?'assistant':'user',body:'Retained native message '+i}));
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});payload=JSON.parse(String(init.body));if(++turn===1)return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Settled answer',source:'upstream',memory:[...history,{id:'native-user',role:'user',body:payload.message},{id:payload.clientOperationId,role:'assistant',body:'Settled answer'}]}});return new Response(new ReadableStream({start(c){controller=c;}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));
 const form=document.querySelector('[data-twin-composer]') as HTMLFormElement,draft=form.elements.namedItem('message') as HTMLTextAreaElement,log=document.querySelector('[data-twin-messages]') as HTMLElement;
 draft.value='First question';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(log.getAttribute('aria-busy')).toBe('false'));
 const earlier=Array.from(log.children),oldReply=document.querySelector('.coop-twin-reply');expect(earlier).toHaveLength(122);
 draft.value='Continue the conversation';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(controller).toBeDefined());const active=log.lastElementChild as HTMLElement;
 draft.value='My next question is still being edited';draft.dispatchEvent(new Event('input'));draft.focus();draft.setSelectionRange(3,12,'backward');
 const changes:MutationRecord[]=[],observer=new MutationObserver(records=>changes.push(...records));for(const node of [...earlier,form,document.querySelector('[data-twin-confirmation]')!])observer.observe(node,{attributes:true,childList:true,characterData:true,subtree:true});
 try{
  for(const [delta,expected] of [['The next','The next'],[' native answer.','The next native answer.']]){controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta}));await vi.waitFor(()=>expect(active.querySelector('p')?.textContent).toBe(expected));}
  expect(active.dataset.twinState).toBe('streaming');expect(active.querySelector('[data-twin-typing]')).toBeNull();expect(document.querySelector('.coop-twin-reply')).toBe(oldReply);
  expect([...changes,...observer.takeRecords()]).toHaveLength(0);expect(draft.value).toBe('My next question is still being edited');expect([draft.selectionStart,draft.selectionEnd,draft.selectionDirection]).toEqual([3,12,'backward']);expect(document.activeElement).toBe(draft);
 }finally{observer.disconnect();controller.enqueue(frame({type:'reply_done',world:{username:'bjklock'},reply:{message:'The next native answer.',source:'upstream',memory:[]}}));controller.close();}
 await vi.waitFor(()=>expect(log.getAttribute('aria-busy')).toBe('false'));
});
it('projects the active reply into newly mounted views and repairs a missing keyed row on the next real token',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>,payload:any;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});payload=JSON.parse(String(init.body));return new Response(new ReadableStream({start(c){controller=c;}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');const first=document.querySelector('[data-coop-twin]') as HTMLElement;mountConversation(first);
 const form=first.querySelector('[data-twin-composer]') as HTMLFormElement;(form.elements.namedItem('message') as HTMLTextAreaElement).value='Keep this conversation here';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(payload).toBeDefined());
 controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta:'The carried context'}));await vi.waitFor(()=>expect(first.querySelector('.coop-twin-reply p')?.textContent).toBe('The carried context'));
 const host=document.createElement('div');host.innerHTML=cooperativeConversation('together');document.body.append(host);const second=host.querySelector('[data-coop-twin]') as HTMLElement;mountConversation(second);expect(second.querySelector('.coop-twin-reply p')?.textContent).toBe('The carried context');
 const active=first.querySelector('.coop-twin-reply')!;active.remove();controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta:' stays connected.'}));await vi.waitFor(()=>expect(first.querySelector('.coop-twin-reply p')?.textContent).toBe('The carried context stays connected.'));expect(first.querySelector('.coop-twin-reply')).toBe(active);expect(second.querySelector('.coop-twin-reply p')?.textContent).toBe('The carried context stays connected.');
 first.remove();controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta:' Continue here.'}));await vi.waitFor(()=>expect(second.querySelector('.coop-twin-reply p')?.textContent).toBe('The carried context stays connected. Continue here.'));
 controller.enqueue(frame({type:'reply_done',world:{username:'bjklock'},reply:{message:'The carried context stays connected. Continue here.',source:'upstream',memory:[]}}));controller.close();await vi.waitFor(()=>expect(second.querySelector('[data-twin-messages]')?.getAttribute('aria-busy')).toBe('false'));
});
it('follows an explicit Enter send once, then respects the reader scrolling up during the reply',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>,payload:any;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});payload=JSON.parse(String(init.body));return new Response(new ReadableStream({start(c){controller=c;}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));
 const log=document.querySelector('[data-twin-messages]') as HTMLElement,form=document.querySelector('[data-twin-composer]') as HTMLFormElement,draft=form.elements.namedItem('message') as HTMLTextAreaElement;
 Object.defineProperties(log,{scrollHeight:{value:2000},clientHeight:{value:100}});log.scrollTop=0;
 draft.value='Continue from what we discussed';draft.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 expect(document.querySelector('[data-twin-typing]')).not.toBeNull();expect(log.scrollTop).toBe(2000);
 await vi.waitFor(()=>expect(payload).toBeDefined());log.scrollTop=0;
 controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta:'Our earlier context stays connected.'}));
 await vi.waitFor(()=>expect(document.querySelector('.coop-twin-reply p')?.textContent).toBe('Our earlier context stays connected.'));expect(log.scrollTop).toBe(0);
 log.scrollTop=1850;controller.enqueue(frame({type:'reply_delta',messageId:payload.clientOperationId,delta:' Here is the next step.'}));
 await vi.waitFor(()=>expect(document.querySelector('.coop-twin-reply p')?.textContent).toContain('next step'));expect(log.scrollTop).toBe(2000);
 controller.enqueue(frame({type:'reply_done',world:{username:'bjklock'},reply:{message:'Our earlier context stays connected. Here is the next step.',source:'upstream',memory:[]}}));controller.close();
 await vi.waitFor(()=>expect(log.getAttribute('aria-busy')).toBe('false'));
});
it('retains the exact native operation when a partial reply disconnects; retry never creates a second operation',async()=>{
 const operations:any[]=[];vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});const p=JSON.parse(String(init.body));operations.push(p);return new Response(new ReadableStream({start(c){c.enqueue(frame({type:'reply_delta',messageId:p.clientOperationId,delta:'A partial thought'}));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));const form=document.querySelector('[data-twin-composer]') as HTMLFormElement;(form.elements.namedItem('message') as HTMLTextAreaElement).value='Help me understand';form.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect((document.querySelector('[data-twin-retry]') as HTMLElement).hidden).toBe(false));expect(document.querySelector('.coop-twin-reply')?.getAttribute('data-twin-state')).toBe('interrupted');expect(sessionStorage.getItem('bankeiz:cooperative-twin:pending:v1')).not.toBeNull();const log=document.querySelector('[data-twin-messages]') as HTMLElement;Object.defineProperties(log,{scrollHeight:{value:2000},clientHeight:{value:100}});log.scrollTop=0;(document.querySelector('[data-twin-retry]') as HTMLButtonElement).click();expect(log.scrollTop).toBe(2000);await vi.waitFor(()=>expect(operations).toHaveLength(2));expect(operations[1]).toEqual(operations[0]);
});
it('accepts the native final receipt immediately even while the connection remains open and renders only native supported actions',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>,payload:any;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});payload=JSON.parse(String(init.body));return new Response(new ReadableStream({start(c){controller=c;}}),{headers:{'Content-Type':'text/event-stream'}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));const f=document.querySelector('[data-twin-composer]') as HTMLFormElement;(f.elements.namedItem('message') as HTMLTextAreaElement).value='What can we do next?';f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect(payload).toBeDefined());
 controller.enqueue(frame({type:'reply_done',world:{username:'bjklock'},assistantMessage:{id:payload.clientOperationId},reply:{message:'Here are the supported next steps.',source:'upstream',actions:[{kind:'pay',label:'Open payment',href:'/wallet?send_to=bjklock'},{kind:'schedule',label:'See times',href:'/calendar/bjklock'},{kind:'profile',label:'Invalid',href:'javascript:alert(1)'}],memory:[{id:'native-user',role:'user',body:payload.message},{id:payload.clientOperationId,role:'assistant',body:'Here are the supported next steps.'}]}}));
 await vi.waitFor(()=>expect((f.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));expect(document.querySelectorAll('.coop-twin-message')).toHaveLength(2);expect(document.querySelector('.coop-twin-actions a')?.getAttribute('href')).toBe('https://receiz.com/wallet?send_to=bjklock');expect(document.querySelector('.coop-twin-actions')?.textContent).not.toContain('Invalid');expect(document.querySelector('[data-twin-book-form]')).toBeNull();
});
it('retains the settled history prefix, native receipts and earlier actions when native memory returns a recent window',async()=>{
 const history:{id:string;role:string;body:string}[]=[];let turn=0;
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>{if(!init?.body)return Response.json({ok:true,world:{username:'bjklock'}});turn++;const payload=JSON.parse(String(init.body));history.push({id:'user-'+turn,role:'user',body:payload.message},{id:payload.clientOperationId,role:'assistant',body:'Answer '+turn});return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Answer '+turn,source:'upstream',proof:{subjectId:'native-subject'},actions:turn===1?[{kind:'pay',label:'Open payment',href:'/wallet?send_to=bjklock'}]:[],memory:history.slice(-10)}});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));
 for(let i=1;i<=6;i++){const f=document.querySelector('[data-twin-composer]') as HTMLFormElement;(f.elements.namedItem('message') as HTMLTextAreaElement).value='Question '+i;f.dispatchEvent(new Event('submit',{cancelable:true}));await vi.waitFor(()=>expect((f.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false));}
 expect(Array.from(document.querySelectorAll('.coop-twin-message p'),n=>n.textContent)).toEqual(history.map(row=>row.body));document.body.innerHTML=cooperativeConversation('together');mountConversation(document.querySelector('[data-coop-twin]'));expect(document.querySelector('.coop-twin-reply')?.getAttribute('data-twin-source')).toBe('upstream');expect(document.querySelector('.coop-twin-actions a')?.getAttribute('href')).toContain('send_to=bjklock');
});
it('warms one continuity bootstrap on composer focus and sends only on the explicit message',async()=>{
 let ready!:(value:Response)=>void;const calls:string[]=[];
 vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{calls.push(init?.body?'message':url);if(init?.body)return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Native response',source:'upstream',memory:[]}});return new Promise<Response>(resolve=>{ready=resolve;});});
 // @ts-expect-error Public standalone module.
 const {mountConversation}=await import('../public/learn/cooperative-twin.js');mountConversation(document.querySelector('[data-coop-twin]'));const form=document.querySelector('[data-twin-composer]') as HTMLFormElement,draft=form.elements.namedItem('message') as HTMLTextAreaElement;
 expect(calls).toEqual([]);draft.focus();draft.value='Let’s talk';form.dispatchEvent(new Event('submit',{cancelable:true}));expect(calls).toEqual(['/api/cooperatives']);ready(Response.json({ok:true,world:{username:'bjklock'}}));await vi.waitFor(()=>expect(calls).toEqual(['/api/cooperatives','message']));
});
