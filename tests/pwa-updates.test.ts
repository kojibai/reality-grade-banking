import {expect,it,vi} from 'vitest';
import {registerBankWorker} from '../src/pwa/updates';

function setup(){
 const visible=new EventTarget() as EventTarget&{visibilityState:string};visible.visibilityState='visible';
 const page=new EventTarget();let now=0,online=true,checks=0,finish:(()=>void)|undefined;
 const registration={update:()=>{checks++;return new Promise<void>(resolve=>{finish=resolve;});}};
 const register=vi.fn(async()=>registration);
 const stop=registerBankWorker({register}, {page,document:visible,online:()=>online,now:()=>now,warn:vi.fn()});
 return{visible,page,register,stop,checks:()=>checks,advance:()=>{now+=61_000;},offline:()=>{online=false;},online:()=>{online=true;},finish:()=>finish?.()};
}
it('checks for a new public build on foreground return without overlapping or repeating the registration check',async()=>{
 const f=setup();await Promise.resolve();
 expect(f.register).toHaveBeenCalledWith('/sw.js',{updateViaCache:'none'});
 f.page.dispatchEvent(new Event('pageshow'));expect(f.checks()).toBe(0);
 f.advance();f.visible.visibilityState='hidden';f.visible.dispatchEvent(new Event('visibilitychange'));expect(f.checks()).toBe(0);
 f.visible.visibilityState='visible';f.visible.dispatchEvent(new Event('visibilitychange'));expect(f.checks()).toBe(1);
 f.advance();f.page.dispatchEvent(new Event('pageshow'));expect(f.checks()).toBe(1);
 f.finish();await Promise.resolve();await Promise.resolve();
 f.page.dispatchEvent(new Event('pageshow'));expect(f.checks()).toBe(2);f.stop();
});
it('leaves offline launches alone and releases foreground listeners on teardown',async()=>{
 const f=setup();await Promise.resolve();f.advance();f.offline();f.page.dispatchEvent(new Event('online'));expect(f.checks()).toBe(0);
 f.online();f.page.dispatchEvent(new Event('online'));expect(f.checks()).toBe(1);f.finish();await Promise.resolve();await Promise.resolve();
 f.stop();f.advance();f.page.dispatchEvent(new Event('pageshow'));f.visible.dispatchEvent(new Event('visibilitychange'));expect(f.checks()).toBe(1);
});
it('keeps registration failure optional and never takes over an existing app session',async()=>{
 const warn=vi.fn(),page=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'visible'});
 const stop=registerBankWorker({controller:{},register:async()=>{throw Error('offline');}}, {page,document,online:()=>true,now:()=>0,warn});
 await Promise.resolve();await Promise.resolve();expect(warn).not.toHaveBeenCalled();stop();
});
it('can discover updates after an offline registration failure without reinstalling the app',async()=>{
 const page=new EventTarget(),document=Object.assign(new EventTarget(),{visibilityState:'visible'});let now=0,attempts=0,checks=0;
 const register=async()=>{if(++attempts===1)throw Error('offline');return{update:async()=>{checks++;}};};
 const stop=registerBankWorker({controller:{},register},{page,document,online:()=>true,now:()=>now,warn:vi.fn()});
 await new Promise(resolve=>setImmediate(resolve));now=61_000;page.dispatchEvent(new Event('online'));
 await new Promise(resolve=>setImmediate(resolve));expect(attempts).toBe(2);
 now=122_000;document.dispatchEvent(new Event('visibilitychange'));await new Promise(resolve=>setImmediate(resolve));expect(checks).toBe(1);stop();
});
