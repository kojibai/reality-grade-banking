import {expect,it,vi} from 'vitest';
import {createNativeTwin,type NativeTwinMemory} from '../src/receiz/native-twin';
import {buildTwinMindGraph} from '../src/receiz/twin-mind-graph';
import fixture from './fixtures/native-twin-complete-memory.json';

// Captured from the actual Native preparation/runtime/SSE wrapper, with only
// provider and persistence transports isolated. Each reply is 32 prior + 2 new
// messages. Its history pages came from the actual Native conversation reader.
const terminal=(sse:string)=>JSON.parse(sse.split('event: result\ndata: ')[1].split('\n\n')[0]);
const first=fixture.responses[0],next=fixture.responses[1];
const twin=(request:Parameters<typeof createNativeTwin>[0]['request'])=>createNativeTwin({accountUid:fixture.ownerUid,username:fixture.username,assertOpen(){},request});

it.each(['JSON','SSE'])('accepts the complete native 32-message history and current pair over %s',async mode=>{
 const accepted=terminal(first.sse),deltas:string[]=[],request=vi.fn(async()=>mode==='SSE'?new Response(first.sse,{headers:{'content-type':'text/event-stream'}}):Response.json(accepted));
 const reply=await twin(request).ask({...first.question,...(mode==='SSE'?{onDelta:(text:string)=>deltas.push(text)}:{})});
 expect(reply.memory).toHaveLength(34);expect(reply.memory).toEqual(accepted.reply.memory);
 expect(reply.memory.at(-2)?.body).toBe(first.question.message);expect(reply.memory.at(-1)?.body).toBe(reply.message);
 expect(reply.memory.slice(0,32).map(row=>row.body)).toEqual(Array.from({length:32},(_,i)=>`Complete accepted memory ${i+1}.`));
 expect(request).toHaveBeenCalledOnce();if(mode==='SSE')expect(deltas.join('')).toBe(reply.message);
});

it('delivers the existing first text before the complete memory acknowledgement arrives',async()=>{
 const index=first.sse.indexOf('event: result'),encoder=new TextEncoder(),deltas:string[]=[];
 let release!:()=>void,shown!:()=>void;const visible=new Promise<void>(resolve=>{shown=resolve;}),response=new Response(new ReadableStream({start(controller){controller.enqueue(encoder.encode(first.sse.slice(0,index)));release=()=>{controller.enqueue(encoder.encode(first.sse.slice(index)));controller.close();};}}),{headers:{'content-type':'text/event-stream'}});
 let done=false;const pending=twin(async()=>response).ask({...first.question,onDelta:text=>{deltas.push(text);shown();}}).then(reply=>{done=true;return reply;});
 await visible;expect(done).toBe(false);expect(deltas.join('')).toBe(terminal(first.sse).reply.message);
 release();expect((await pending).memory).toHaveLength(34);
});

it('keeps accepted memory on exact retry, the next bounded request, and cold paginated reopen',async()=>{
 const accepted=terminal(first.sse),later=terminal(next.sse);
 const request=vi.fn(async(path:string,init?:RequestInit)=>{
  if(path.includes('/conversations?')){const cursor=new URL(path,'https://bankeiz.com').searchParams.get('cursor');return Response.json(fixture.pages[cursor?1:0]);}
  const body=JSON.parse(String(init?.body));return Response.json(body.requestId===first.question.requestId?accepted:later);
 });
 const warm=twin(request),reply=await warm.ask(first.question),retry=await warm.ask(first.question),successor=await warm.ask(next.question);
 expect(retry).toEqual(reply);expect(successor.memory).toHaveLength(34);expect(successor.memory.slice(0,32)).toEqual(reply.memory.slice(-32));
 const cold=twin(request),held:NativeTwinMemory[]=[];let cursor:string|undefined;
 do{const page=await cold.conversations.read(fixture.threadKey,cursor);held.push(...page.entries);cursor=page.nextCursor??undefined;}while(cursor);
 expect(held).toHaveLength(36);expect(held.slice(0,34)).toEqual(reply.memory);expect(held.slice(-2)).toEqual(successor.memory.slice(-2));
 expect(buildTwinMindGraph({owner:{userId:fixture.ownerUid},memory:{entries:held}}).memory.map(row=>row.body)).toEqual(held.map(row=>row.body));
 expect(fixture.provenance).toMatchObject({recentReads:2,promptWindows:[20,20],appended:4});
 expect(request.mock.calls.filter(([path])=>path.includes('/message'))).toHaveLength(3);
});

it('still refuses excess or malformed native memory and foreign response ownership',async()=>{
 const original=terminal(first.sse);
 for(const alter of [
  (raw:typeof original)=>raw.reply.memory.push({...raw.reply.memory[0],id:'extra-message'}),
  (raw:typeof original)=>{raw.reply.memory[0].id=raw.reply.memory[1].id;},
  (raw:typeof original)=>{raw.reply.memory[0].role='system';},
  (raw:typeof original)=>{raw.reply.memory[0].body='';},
  (raw:typeof original)=>{raw.reply.memory[0].body='x'.repeat(24001);},
  (raw:typeof original)=>{raw.reply.memory[0].createdAt='invalid';},
  (raw:typeof original)=>{raw.reply.cognition.frame.owner.ownerUserId='another-owner';},
 ]){const raw=structuredClone(original);alter(raw);await expect(twin(async()=>Response.json(raw)).ask(first.question)).rejects.toThrow(/BANK_TWIN_(?:MEMORY_INVALID|RESPONSE_OWNER_MISMATCH)/);}
});
