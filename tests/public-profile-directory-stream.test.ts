import {expect,it,vi,afterEach} from 'vitest';
import {createPublicProfileDirectoryStream} from '../src/receiz/public-profile-directory-stream';
const uid='00000000-0000-4000-8000-000000000001';
const card={userId:uid,username:'alice',displayName:'Alice',avatarUrl:null,isPrivate:false,createdAt:'2026-11-14T10:00:00Z',updatedAt:null};
afterEach(()=>vi.restoreAllMocks());
it('applies a streamed creation before any polling deadline and keeps reading the established stream',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>;const changes:unknown[]=[];const encoder=new TextEncoder(),refresh=vi.fn();
 const request=vi.fn<typeof fetch>(async()=>new Response(new ReadableStream<Uint8Array>({start(value){controller=value;}}),{headers:{'content-type':'text/event-stream'}}));
 const stream=createPublicProfileDirectoryStream({fetch:request,receive:async value=>{changes.push(value);},refresh});
 controller.enqueue(encoder.encode('data: '+JSON.stringify({type:'ready'})+'\n\n'));await vi.waitFor(()=>expect(refresh).toHaveBeenCalledOnce());
 controller.enqueue(encoder.encode('data: '+JSON.stringify({type:'profile',card})+'\n\n'));await vi.waitFor(()=>expect(changes).toHaveLength(1));
 expect(changes[0]).toMatchObject({profile:{userId:uid,username:'alice'},unavailableDecorators:['profile-details']});expect(request).toHaveBeenCalledOnce();stream.close();
});
it('rejects private cards and accepts only exact withdrawal bindings without clearing other profiles',async()=>{
 let controller!:ReadableStreamDefaultController<Uint8Array>;const changes:unknown[]=[],encoder=new TextEncoder();
 const stream=createPublicProfileDirectoryStream({fetch:async()=>new Response(new ReadableStream<Uint8Array>({start(value){controller=value;}}),{headers:{'content-type':'text/event-stream'}}),receive:async value=>{changes.push(value);},refresh:()=>{}});
 controller.enqueue(encoder.encode('data: '+JSON.stringify({type:'profile',card:{...card,isPrivate:true}})+'\n\n'+'data: '+JSON.stringify({type:'withdraw',profile:{userId:uid,username:'alice'}})+'\n\n'));
 await vi.waitFor(()=>expect(changes).toHaveLength(1));expect(changes[0]).toEqual({profile:{userId:uid,username:'alice'},viewer:{canView:false}});stream.close();
});
it('closing the last observer cancels its request and prevents a later queued event from publishing',async()=>{
 let signal:AbortSignal|undefined,cancelled=false;const received=vi.fn();
 const stream=createPublicProfileDirectoryStream({fetch:async(_url,options)=>{signal=options?.signal??undefined;return new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'content-type':'text/event-stream'}});},receive:received,refresh:()=>{}});
 await new Promise(done=>setTimeout(done,0));stream.close();await new Promise(done=>setTimeout(done,0));expect(signal?.aborted).toBe(true);expect(cancelled).toBe(true);expect(received).not.toHaveBeenCalled();
});
