import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {expect,it,vi} from 'vitest';
import {cooperativeConversationPlugin} from '../server/cooperative-conversation-plugin';
const browserFetch=globalThis.fetch;
async function preview(){
 let middleware!:(req:IncomingMessage,res:ServerResponse,next:()=>void)=>Promise<void>;
 (cooperativeConversationPlugin().configurePreviewServer as (server:unknown)=>void)({middlewares:{use(fn:typeof middleware){middleware=fn;}}});
 const server=createServer((req,res)=>{void middleware(req,res,()=>{res.statusCode=404;res.end();});});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as {port:number};return{origin:'http://127.0.0.1:'+address.port,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
it('preserves the actual preview availability query through the native calendar bridge',async()=>{
 const urls:string[]=[],slot={startAt:'2026-11-02T14:00:00.000Z',endAt:'2026-11-02T14:30:00.000Z'};
 vi.stubGlobal('fetch',async(url:string)=>{urls.push(String(url));return Response.json(String(url).includes('/calendar/')?{ok:true,slots:[slot],customQuestions:[]}:{ok:true,world:{username:'bjklock'}});});
 const server=await preview();try{const res=await browserFetch(server.origin+'/api/cooperatives?availability=1',{headers:{Cookie:'receiz_world_visitor=guest_preview_123'}});expect(res.status).toBe(200);expect((await res.json()).availability.slots).toEqual([slot]);expect(urls.some(url=>url.endsWith('/api/calendar/embed/bjklock'))).toBe(true);}finally{await server.close();vi.unstubAllGlobals();}
});
it('flushes native text over real local HTTP before the upstream response completes',async()=>{
 const encoder=new TextEncoder();let native!:ReadableStreamDefaultController<Uint8Array>;
 vi.stubGlobal('fetch',async()=>new Response(new ReadableStream<Uint8Array>({start(c){native=c;c.enqueue(encoder.encode('data: '+JSON.stringify({type:'reply_start',messageId:'preview-stream-123'})+'\n\n'));}}),{headers:{'Content-Type':'text/event-stream'}}));
 const server=await preview();try{
  const response=await browserFetch(server.origin+'/api/cooperatives',{method:'POST',headers:{Origin:server.origin,'Content-Type':'application/json',Accept:'text/event-stream',Cookie:'receiz_world_visitor=guest_preview_123'},body:JSON.stringify({action:'message',consent:true,message:'A real HTTP stream',clientOperationId:'preview-stream-123',quoteExpiresAt:new Date(Date.now()+600000).toISOString()})});
  const reader=response.body!.getReader();expect(new TextDecoder().decode((await reader.read()).value)).toContain('reply_start');
  native.enqueue(encoder.encode('data: '+JSON.stringify({type:'reply_delta',messageId:'preview-stream-123',delta:'Already on screen'})+'\n\n'));expect(new TextDecoder().decode((await reader.read()).value)).toContain('Already on screen');
  native.enqueue(encoder.encode('data: '+JSON.stringify({type:'reply_done',world:{username:'bjklock'},reply:{message:'Already on screen'}})+'\n\n'));native.close();while(!(await reader.read()).done){};
 }finally{await server.close();vi.unstubAllGlobals();}
});
