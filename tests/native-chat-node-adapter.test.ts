import {Readable,Writable} from 'node:stream';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {afterEach,expect,it,vi} from 'vitest';
import {nativeAccountMiddleware} from '../server/native-account';

afterEach(()=>vi.unstubAllGlobals());
const path='/api/bank/native/api/chat/conversations/12345678-1234-4123-8123-123456789abc/messages/stream';
function connection(){
 const request=Object.assign(Readable.from([Buffer.from('{"body":"test only"}')]),{url:path,method:'POST',headers:{host:'127.0.0.1:5419',origin:'http://127.0.0.1:5419','content-type':'application/json',authorization:'Bearer synthetic-only'}}) as IncomingMessage;
 const chunks:Buffer[]=[],release:(()=>void)[]=[];
 const writable=new Writable({highWaterMark:1,write(chunk,_encoding,done){chunks.push(Buffer.from(chunk));release.push(done);}});
 const head=vi.fn();const response=Object.assign(writable,{writeHead:head,setHeader:vi.fn()});Object.defineProperty(response,'headersSent',{get:()=>head.mock.calls.length>0});
 return{request,response:response as unknown as ServerResponse,chunks,release,head};
}
it('streams through the development Node adapter with backpressure before the upstream completes',async()=>{
 let writer!:ReadableStreamDefaultController<Uint8Array>;
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){writer=controller;}}),{headers:{'Content-Type':'text/event-stream'}})));
 const c=connection(),running=nativeAccountMiddleware(c.request,c.response,()=>{throw Error('must handle chat');});
 await vi.waitFor(()=>expect(c.head).toHaveBeenCalled());writer.enqueue(new TextEncoder().encode('data: first\n\n'));await vi.waitFor(()=>expect(c.chunks).toHaveLength(1));
 writer.enqueue(new TextEncoder().encode('data: second\n\n'));expect(c.chunks).toHaveLength(1);c.release.shift()!();await vi.waitFor(()=>expect(c.chunks).toHaveLength(2));
 c.release.shift()!();writer.close();await running;
 expect(Buffer.concat(c.chunks).toString()).toBe('data: first\n\ndata: second\n\n');await vi.waitFor(()=>expect(c.response.writableFinished).toBe(true));
});
it('cancels the upstream when the browser closes a backpressured Node response',async()=>{
 const cancel=vi.fn();let signal:AbortSignal|undefined;
 const upstream=vi.fn<typeof fetch>(async(_url,init)=>{signal=init?.signal??undefined;return new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode('data: first\n\n'));},cancel}),{headers:{'Content-Type':'text/event-stream'}});});vi.stubGlobal('fetch',upstream);
 const c=connection(),running=nativeAccountMiddleware(c.request,c.response,vi.fn());await vi.waitFor(()=>expect(c.chunks).toHaveLength(1));
 c.response.destroy();await running;expect(signal?.aborted).toBe(true);expect(cancel).toHaveBeenCalledOnce();expect(upstream).toHaveBeenCalledOnce();
});
