import {afterEach,expect,it,vi} from 'vitest';
import bankApi from '../api/index';
import {nativeRequestPath} from '../server/native-account';
import {nativeFetch} from '../src/receiz/native-transport';
import {readFileSync} from 'node:fs';

afterEach(()=>vi.unstubAllGlobals());
const id='12345678-1234-4123-8123-123456789abc',call='23456789-2345-4234-8234-23456789abcd',root=`/api/chat/conversations/${id}`;
const native=(path:string)=>`/api/bank/native${path}`,origin='https://bank.example';
const request=(path:string,method='GET',body?:string,signal?:AbortSignal)=>new Request(origin+native(path),{method,body,signal,headers:{Origin:origin,Authorization:'Bearer synthetic-chat-grant',Cookie:'never-forward','Content-Type':'application/json'}});
it('allows only existing chat methods and bounded UUID and pagination coordinates',()=>{
 const routes:[string,string][]=[['/api/chat/conversations','GET'],['/api/chat/conversations','POST'],['/api/chat/ai','GET'],['/api/chat/calls/ice','GET'],[root+'/messages?limit=120&before=2026-10-19T12%3A00%3A00.000Z','GET'],[root+'/messages','POST'],[root+'/messages/stream','POST'],[root+'/typing','POST'],[root+'/typing/stream','GET'],[root+'/ai','GET'],[root+'/ai','PATCH'],[root+'/calls','GET'],[root+'/calls','POST'],[root+'/calls/'+call,'GET'],[root+'/calls/'+call,'PATCH'],[root+'/calls/'+call+'/participants','POST'],[root+'/calls/'+call+'/participants','DELETE'],[root+'/calls/'+call+'/signals?since=2026-10-19T12%3A00%3A00.000Z&limit=240','GET'],[root+'/calls/'+call+'/signals','POST'],[root+'/calls/'+call+'/sfu/session','GET']];
 for(const [path,method]of routes)expect(nativeRequestPath(native(path),method),path+' '+method).toBe(path);
 for(const [path,method]of [[root+'/typing?userId=another','POST'],[root+'/typing/stream?userId=another','GET'],[root+'/typing/stream','POST'],[root+'/typing','GET'],[root+'/messages?owner=another','GET'],[root+'/messages?limit=120&limit=121','GET'],[root+'/messages?limit=301','GET'],[root+'/messages?before=invalid','GET'],[root+'/messages/stream?url=https://other.invalid','POST'],[root+'/calls/'+call+'/signals?limit=601','GET'],[root+'/calls/'+call+'/signals?since=invalid','GET'],[root+'/calls/'+call+'/participants?userId=another','POST'],[root+'/messages','DELETE'],[root+'/ai','POST'],['/api/chat/conversations/not-a-uuid/messages','GET']] as [string,string][])expect(nativeRequestPath(native(path),method),path+' '+method).toBeNull();
});
it('delivers an AI event through the production entry before its upstream response finishes',async()=>{
 let writer!:ReadableStreamDefaultController<Uint8Array>;const body=new ReadableStream<Uint8Array>({start(controller){writer=controller;}});
 const upstream=vi.fn<typeof fetch>(async()=>new Response(body,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Set-Cookie':'never-return'}}));vi.stubGlobal('fetch',upstream);
 const pending=bankApi.fetch(request(root+'/messages/stream','POST','{"body":"synthetic test"}'));
 const response=await Promise.race([pending,new Promise<null>(resolve=>setTimeout(()=>resolve(null),100))]);
 try{
  expect(response?.status).toBe(200);expect(response?.headers.get('content-type')).toContain('text/event-stream');expect(response?.headers.get('set-cookie')).toBeNull();
  const reader=response!.body!.getReader(),first='data: {"type":"ai_delta","delta":"Hello"}\n\n';writer.enqueue(new TextEncoder().encode(first));
  expect(new TextDecoder().decode((await reader.read()).value)).toBe(first);
  writer.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));writer.close();expect(new TextDecoder().decode((await reader.read()).value)).toContain('done');expect((await reader.read()).done).toBe(true);
  expect(upstream).toHaveBeenCalledOnce();const sent=upstream.mock.calls[0][1]!;expect(sent.credentials).toBe('omit');expect(sent.redirect).toBe('error');expect(new Headers(sent.headers).has('cookie')).toBe(false);expect(new Headers(sent.headers).get('accept')).toBe('text/event-stream');
 }finally{if(!response)writer.close();}
});
it('forwards exact PATCH bodies and upstream authorization refusals without a new session',async()=>{
 const upstream=vi.fn<typeof fetch>(async()=>Response.json({error:'insufficient_scope'},{status:403,headers:{'WWW-Authenticate':'Bearer error="insufficient_scope"','Set-Cookie':'never-return'}}));vi.stubGlobal('fetch',upstream);
 const exact=' { "action": "end" }\n',response=await bankApi.fetch(request(root+'/calls/'+call,'PATCH',exact));
 expect(response.status).toBe(403);expect(await response.json()).toEqual({error:'insufficient_scope'});expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('www-authenticate')).toContain('insufficient_scope');expect(upstream.mock.calls[0][1]?.body).toBe(exact);
});
it('cancels the upstream AI stream when the reader cancels without resending the message',async()=>{
 const cancel=vi.fn();let signal:AbortSignal|undefined;
 const upstream=vi.fn<typeof fetch>(async(_url,init)=>{signal=init?.signal??undefined;return new Response(new ReadableStream<Uint8Array>({cancel}),{headers:{'Content-Type':'text/event-stream'}});});vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(request(root+'/messages/stream','POST','{}'));
 expect(response.status).toBe(200);await response.body!.cancel();await vi.waitFor(()=>expect(cancel).toHaveBeenCalled());expect(signal?.aborted).toBe(true);expect(upstream).toHaveBeenCalledOnce();
});
it('does not disguise a failed stream as a completed message or retry it',async()=>{
 let writer!:ReadableStreamDefaultController<Uint8Array>;
 const upstream=vi.fn<typeof fetch>(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){writer=controller;}}),{headers:{'Content-Type':'text/event-stream'}}));vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(request(root+'/messages/stream','POST','{}'));expect(response.status).toBe(200);
 const reader=response.body!.getReader();writer.enqueue(new TextEncoder().encode('data: {"type":"user_message"}\n\n'));expect(new TextDecoder().decode((await reader.read()).value)).toContain('user_message');
 writer.error(Error('synthetic disconnect'));await expect(reader.read()).rejects.toThrow('synthetic disconnect');expect(upstream).toHaveBeenCalledOnce();
});
it('aborts an unfinished request body before any upstream message submission',async()=>{
 const stopped=vi.fn(),upstream=vi.fn();vi.stubGlobal('fetch',upstream);const abort=new AbortController();
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('{'));},cancel:stopped});
 const incoming=new Request(origin+native(root+'/messages/stream'),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body,signal:abort.signal,duplex:'half'} as RequestInit);
 const pending=bankApi.fetch(incoming);abort.abort(Error('synthetic user closed'));
 const response=await Promise.race([pending,new Promise<null>(resolve=>setTimeout(()=>resolve(null),100))]);
 expect(response?.status).toBe(503);expect(upstream).not.toHaveBeenCalled();expect(stopped).toHaveBeenCalled();
});
it('refuses an oversized AI stream and cancels it without fake completion',async()=>{
 const cancel=vi.fn();const upstream=vi.fn<typeof fetch>(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(32*1024*1024+1));},cancel}),{headers:{'Content-Type':'text/event-stream'}}));vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(request(root+'/messages/stream','POST','{}'));expect(response.status).toBe(200);
 await expect(response.body!.getReader().read()).rejects.toThrow('capacity');await vi.waitFor(()=>expect(cancel).toHaveBeenCalled());expect(upstream).toHaveBeenCalledOnce();
});
it('gives native chat streaming a consistent deadline within the deployment budget',async()=>{
 const deadlines=vi.spyOn(AbortSignal,'timeout');vi.stubGlobal('fetch',vi.fn(async()=>new Response('{}')));
 try{
  await nativeFetch('https://receiz.com'+root+'/messages/stream',{method:'POST',body:'{}'});
  expect(deadlines).toHaveBeenLastCalledWith(110_000);
  const deployment=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
  expect(deployment.functions['api/index.ts'].maxDuration*1000).toBeGreaterThanOrEqual(120_000);
  await nativeFetch('https://receiz.com/api/connect/wallet/me');expect(deadlines).toHaveBeenLastCalledWith(60_000);
 }finally{deadlines.mockRestore();}
});
it('keeps complete native binary originals in bounded response chunks with unchanged bytes',async()=>{
 const original=new Uint8Array(5*1024*1024).map((_,index)=>index%251);vi.stubGlobal('fetch',vi.fn(async()=>new Response(original,{headers:{'Content-Type':'application/octet-stream'}})));
 const form=new FormData();form.set('artifact',new File([new Uint8Array([1])],'synthetic.receizbundle'));
 const response=await bankApi.fetch(new Request(origin+native('/api/receiz/ownership/bearer-claim'),{method:'POST',headers:{Origin:origin},body:form}));
 expect(response.status).toBe(200);const reader=response.body!.getReader(),parts:Uint8Array[]=[];
 for(;;){const part=await reader.read();if(part.done)break;expect(part.value.length).toBeLessThanOrEqual(64*1024);parts.push(part.value);}
 expect(Buffer.concat(parts).equals(Buffer.from(original))).toBe(true);
});
it('allows only the existing owner Twin JSON route and preserves its metered request once',async()=>{
 const path='/api/developers/twin/mira/message';expect(nativeRequestPath(native(path),'POST')).toBe(path);expect(nativeRequestPath(native(path),'GET')).toBeNull();expect(nativeRequestPath(native(path+'?owner=another'),'POST')).toBeNull();
 const upstream=vi.fn<typeof fetch>(async()=>Response.json({ok:false,error:'business_entitlement_required'},{status:402}));vi.stubGlobal('fetch',upstream);const response=await bankApi.fetch(request(path,'POST','{"message":"Synthetic question"}'));expect(response.status).toBe(402);expect(upstream).toHaveBeenCalledOnce();
});

it('relays peer typing GET events immediately and cancels the exact stream without buffering or cookies',async()=>{
 let sink!:ReadableStreamDefaultController<Uint8Array>;const cancel=vi.fn(),upstream=vi.fn<typeof fetch>(async()=>new Response(new ReadableStream<Uint8Array>({start(c){sink=c;},cancel}),{headers:{'content-type':'text/event-stream','set-cookie':'never-return'}}));vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(request(root+'/typing/stream'));expect(response.headers.get('content-type')).toContain('text/event-stream');expect(response.headers.get('set-cookie')).toBeNull();const reader=response.body!.getReader();sink.enqueue(new TextEncoder().encode('data: {"type":"ready"}\n\n'));expect(new TextDecoder().decode((await reader.read()).value)).toContain('ready');await reader.cancel();await vi.waitFor(()=>expect(cancel).toHaveBeenCalledTimes(1));expect(upstream).toHaveBeenCalledTimes(1);
});

it('relays notification registration and withdrawal under the same bearer without cookies or arbitrary paths',async()=>{
 const path='/api/chat/notifications/push';
 for(const method of ['GET','POST','DELETE'])expect(nativeRequestPath(native(path),method)).toBe(path);
 expect(nativeRequestPath(native(path+'?owner=another'),'POST')).toBeNull();
 expect(nativeRequestPath(native(path),'PATCH')).toBeNull();
 const upstream=vi.fn<typeof fetch>(async()=>Response.json({ok:true}));vi.stubGlobal('fetch',upstream);
 const body=JSON.stringify({endpoint:'https://push.example/opaque-device-token'});
 const response=await bankApi.fetch(request(path,'DELETE',body));expect(response.status).toBe(200);expect(upstream.mock.calls[0][1]?.body).toBe(body);expect(new Headers(upstream.mock.calls[0][1]?.headers).has('cookie')).toBe(false);
});
