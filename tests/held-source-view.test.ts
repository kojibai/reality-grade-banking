import {expect,it} from 'vitest';
import {createHeldSourceView} from '../src/receiz/held-source-view';
it('shares one held snapshot between surfaces and coalesces a source update during a read',async()=>{
 let calls=0,finish!:(value:readonly string[])=>void;
 const view=createHeldSourceView({assertOpen(){},read:async()=>{calls++;return calls===1?new Promise<readonly string[]>(resolve=>finish=resolve):['current'];}});
 const first=view.read(),second=view.read();expect(second).toBe(first);expect(view.known()).toBeNull();
 view.invalidate();finish(['old']);expect(await first).toEqual(['current']);expect(calls).toBe(2);
 expect(await view.read()).toBe(view.known());expect(calls).toBe(2);
 view.invalidate();expect(view.known()).toEqual(['current']);
});
it('retains the settled snapshot after a failed update and refuses adoption after the identity closes',async()=>{
 let closed=false,fail=false,finish!:(value:readonly string[])=>void;
 const view=createHeldSourceView({assertOpen(){if(closed)throw Error('closed');},read:async()=>{if(fail)throw Error('unavailable');return ['held'];}});
 const initial=await view.read();view.invalidate();fail=true;await expect(view.read()).rejects.toThrow('unavailable');expect(view.known()).toBe(initial);
 const other=createHeldSourceView({assertOpen(){if(closed)throw Error('closed');},read:()=>new Promise<readonly string[]>(resolve=>finish=resolve)}),pending=other.read();closed=true;finish(['late']);await expect(pending).rejects.toThrow('closed');expect(other.known()).toBeNull();
});
it('accepts a valid empty successor and keeps separate identity lifetimes isolated',async()=>{
 let owner='A',rows:readonly string[]=['held'];
 const first=createHeldSourceView({assertOpen(){if(owner!=='A')throw Error('IDENTITY_CHANGED');},read:async()=>rows});
 expect(await first.read()).toEqual(['held']);rows=[];first.invalidate();const removed=await first.read();expect(removed).toEqual([]);expect(first.known()).toBe(removed);
 owner='B';const other=createHeldSourceView({assertOpen(){if(owner!=='B')throw Error('IDENTITY_CHANGED');},read:async()=>['other']});
 await expect(first.read()).rejects.toThrow('IDENTITY_CHANGED');expect(first.known()).toBe(removed);expect(await other.read()).toEqual(['other']);expect(other.known()).not.toBe(first.known());
});
