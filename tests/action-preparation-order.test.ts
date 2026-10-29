import {afterEach,expect,it,vi} from 'vitest';
import {createCheckoutNotes} from '../src/receiz/checkout-notes';
import {createBusinessChat} from '../src/receiz/business-chat';
const code=vi.hoisted(()=>{let release!:()=>void;return{started:false,ready:new Promise<void>(resolve=>release=resolve),release:()=>release()};});
vi.mock('../src/receiz/organizer-twin',async original=>{code.started=true;await code.ready;return original();});
const deferred=<T,>()=>{let resolve!:(v:T)=>void;return{promise:new Promise<T>(r=>resolve=r),resolve};};
afterEach(()=>vi.restoreAllMocks());
it('prepares organizer code and the existing owner API together before dispatching the same action',async()=>{
 const gate=deferred<any>(),organizer=vi.fn(()=>gate.promise),events=vi.fn(async()=>[]),chat=createBusinessChat({accountUid:'owner',assertOpen(){},organizer,profile:async()=>({}) as never,setup:async()=>({}) as never,dns:async()=>({}) as never});
 const result=chat.execute('organizer-overlap',[{tool:'business_read_calendar',args:{start:'2026-10-29T00:00:00Z',end:'2026-10-30T00:00:00Z'}}]);
 try{await vi.waitFor(()=>expect(code.started).toBe(true));expect(organizer).toHaveBeenCalledOnce();expect(events).not.toHaveBeenCalled();}finally{code.release();gate.resolve({accountUid:'owner',events});await result;}
 expect((await result)[0].status).toBe('accepted');expect(events).toHaveBeenCalledExactlyOnceWith({start:'2026-10-29T00:00:00Z',end:'2026-10-30T00:00:00Z'});
});
it('refuses a foreign organizer before executing the selected action',async()=>{
 code.release(); const events=vi.fn(),chat=createBusinessChat({accountUid:'owner',assertOpen(){},organizer:async()=>({accountUid:'other',events}) as never,profile:async()=>({}) as never,setup:async()=>({}) as never,dns:async()=>({}) as never});const result=await chat.execute('foreign-organizer',[{tool:'business_read_calendar',args:{start:'2026-10-29T00:00:00Z',end:'2026-10-30T00:00:00Z'}}]);expect(result[0].status).toBe('refused');expect(events).not.toHaveBeenCalled();
});
it('reads the selected Note bytes beside API preparation, before any inspection or deposit',async()=>{
 const bytes=deferred<ArrayBuffer>(),api=deferred<any>(),offlineNotes=vi.fn(()=>api.promise),inspect=vi.fn(async()=>{throw Error('CONTROLLED_INSPECTION_BOUNDARY');}),deposit=vi.fn(),file=new File([new Uint8Array([1])],'note.png'),reading=vi.spyOn(file,'arrayBuffer').mockReturnValue(bytes.promise);
 const adapter=createCheckoutNotes({identity:{offlineNotes} as never,storeSource:vi.fn(),restoreSource:vi.fn(),assertCurrent(){}}),outcome=adapter.inspect(file).catch(e=>e);
 try{expect(reading).toHaveBeenCalledOnce();expect(offlineNotes).toHaveBeenCalledOnce();expect(inspect).not.toHaveBeenCalled();expect(deposit).not.toHaveBeenCalled();}finally{bytes.resolve(new Uint8Array([1]).buffer);api.resolve({inspect,deposit});await outcome;}
 expect((await outcome).message).toBe('CONTROLLED_INSPECTION_BOUNDARY');expect(inspect).toHaveBeenCalledExactlyOnceWith(new Uint8Array([1]));expect(deposit).not.toHaveBeenCalled();
});
it('does not inspect a Note if the owner closes while independent preparations finish',async()=>{
 const bytes=deferred<ArrayBuffer>(),file=new File(['x'],'note.png');vi.spyOn(file,'arrayBuffer').mockReturnValue(bytes.promise);let open=true;const inspect=vi.fn(),adapter=createCheckoutNotes({identity:{offlineNotes:async()=>({inspect})} as never,storeSource:vi.fn(),restoreSource:vi.fn(),assertCurrent(){if(!open)throw Error('OWNER_CLOSED');}}),outcome=adapter.inspect(file).catch(e=>e);open=false;bytes.resolve(new Uint8Array([1]).buffer);expect((await outcome).message).toBe('OWNER_CLOSED');expect(inspect).not.toHaveBeenCalled();
});

it('does not dispatch an organizer action after its Identity closes during preparation',async()=>{
 code.release(); const gate=deferred<any>(),events=vi.fn(async()=>[]);let open=true;const chat=createBusinessChat({accountUid:'owner',assertOpen(){if(!open)throw Error('OWNER_CLOSED');},organizer:()=>gate.promise,profile:async()=>({}) as never,setup:async()=>({}) as never,dns:async()=>({}) as never});
 const result=chat.execute('closed-organizer',[{tool:'business_read_calendar',args:{start:'2026-10-29T00:00:00Z',end:'2026-10-30T00:00:00Z'}}]),outcome=result.catch(e=>e);open=false;gate.resolve({accountUid:'owner',events});expect((await outcome).message).toBe('OWNER_CLOSED');expect(events).not.toHaveBeenCalled();
});
