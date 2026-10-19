import {afterEach,expect,it,vi} from 'vitest';
import {createPeerTyping} from '../src/receiz/peer-typing';
const id='11111111-1111-4111-8111-111111111111',owner='22222222-2222-4222-8222-222222222222',peer='33333333-3333-4333-8333-333333333333';
afterEach(()=>vi.useRealTimers());
function fixture(){
 let sink!:ReadableStreamDefaultController<Uint8Array>;const cancel=vi.fn(),changes=vi.fn();
 const request=vi.fn(async(path:string,_init?:RequestInit)=>path.endsWith('/stream')?new Response(new ReadableStream<Uint8Array>({start(c){sink=c;},cancel}),{headers:{'content-type':'text/event-stream'}}):Response.json({ok:true}));
 const controller=createPeerTyping({request,conversationId:id,accountUid:owner,onPeers:changes});
 const emit=(event:unknown)=>sink.enqueue(new TextEncoder().encode('data: '+JSON.stringify(event)+'\n\n'));
 return{controller,request,changes,cancel,emit};
}
it('receives real peer events, ignores self/foreign events, and expires them without polling',async()=>{
 vi.useFakeTimers();const f=fixture();try{await vi.advanceTimersByTimeAsync(0);f.emit({type:'ready'});f.emit({type:'typing',conversationId:id,userId:owner,clientId:owner,sequence:1,active:true,expiresInMs:6000});f.emit({type:'typing',conversationId:peer,userId:peer,clientId:peer,sequence:1,active:true,expiresInMs:6000});f.emit({type:'typing',conversationId:id,userId:peer,clientId:peer,sequence:1,active:true,expiresInMs:6000});await vi.advanceTimersByTimeAsync(0);expect(f.changes).toHaveBeenLastCalledWith([peer]);await vi.advanceTimersByTimeAsync(6001);expect(f.changes).toHaveBeenLastCalledWith([]);expect(f.request).toHaveBeenCalledTimes(1);}finally{f.controller.close();}
});
it('publishes only activity transitions and input-driven renewals, never the draft or a polling timer',async()=>{
 vi.useFakeTimers();const f=fixture();try{await vi.advanceTimersByTimeAsync(0);f.emit({type:'ready'});await vi.advanceTimersByTimeAsync(0);f.controller.update(true);for(let i=0;i<10;i++)f.controller.update(true);await vi.advanceTimersByTimeAsync(0);expect(f.request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(1);await vi.advanceTimersByTimeAsync(2000);const posts=f.request.mock.calls.filter(([,init])=>init?.method==='POST');expect(posts).toHaveLength(2);expect(posts.map(([,init])=>JSON.parse(init!.body as string).active)).toEqual([true,false]);expect(Object.keys(JSON.parse(posts[0][1]!.body as string)).sort()).toEqual(['active','clientId','sequence']);expect(f.request.mock.calls.filter(([path])=>path.endsWith('/stream'))).toHaveLength(1);}finally{f.controller.close();}
});
it('handles out-of-order stops and multiple devices without resurrecting an old typing signal',async()=>{
 vi.useFakeTimers();const f=fixture();try{await vi.advanceTimersByTimeAsync(0);const event={type:'typing',conversationId:id,userId:peer,clientId:peer,sequence:2,active:false,expiresInMs:0};f.emit(event);f.emit({...event,sequence:1,active:true,expiresInMs:6000});await vi.advanceTimersByTimeAsync(0);expect(f.changes).not.toHaveBeenCalledWith([peer]);f.emit({...event,sequence:3,active:true,expiresInMs:6000});await vi.advanceTimersByTimeAsync(0);expect(f.changes).toHaveBeenLastCalledWith([peer]);f.controller.close();await vi.advanceTimersByTimeAsync(0);expect(f.cancel).toHaveBeenCalled();expect(f.changes).toHaveBeenLastCalledWith([]);}finally{f.controller.close();}
});
it('does not retry unsupported or forbidden endpoints and never affects message transport',async()=>{
 vi.useFakeTimers();const request=vi.fn(async()=>Response.json({ok:false},{status:403})),changes=vi.fn(),controller=createPeerTyping({request,conversationId:id,accountUid:owner,onPeers:changes});await vi.advanceTimersByTimeAsync(60000);controller.update(true);await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);controller.close();
});

it('renews only on new input and keeps separate peer devices active until each stops',async()=>{
 vi.useFakeTimers();const f=fixture();try{await vi.advanceTimersByTimeAsync(0);f.emit({type:'ready'});await vi.advanceTimersByTimeAsync(0);f.controller.update(true);for(let i=0;i<31;i++){await vi.advanceTimersByTimeAsync(100);f.controller.update(true);}await vi.advanceTimersByTimeAsync(0);expect(f.request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(2);
 const active={type:'typing',conversationId:id,userId:peer,clientId:peer,sequence:1,active:true,expiresInMs:6000};f.emit(active);f.emit({...active,clientId:owner});await vi.advanceTimersByTimeAsync(0);f.emit({...active,active:false,expiresInMs:0,sequence:2});await vi.advanceTimersByTimeAsync(0);expect(f.changes).toHaveBeenLastCalledWith([peer]);f.emit({...active,clientId:owner,active:false,expiresInMs:0,sequence:2});await vi.advanceTimersByTimeAsync(0);expect(f.changes).toHaveBeenLastCalledWith([]);await vi.advanceTimersByTimeAsync(1801);expect(f.request.mock.calls.filter(([,init])=>init?.method==='POST')).toHaveLength(3);
 }finally{f.controller.close();}
});

it('bounds reconnects for a provider that repeatedly closes after readiness instead of creating a read loop',async()=>{
 vi.useFakeTimers();const request=vi.fn(async()=>new Response('data: {"type":"ready"}\n\n',{headers:{'content-type':'text/event-stream'}}));const controller=createPeerTyping({request,conversationId:id,accountUid:owner,onPeers:vi.fn()});try{await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(4);await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(4);}finally{controller.close();}
});
