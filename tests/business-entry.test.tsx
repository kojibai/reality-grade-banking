// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {useBusinessEntry,BUSINESS_ENTRY_HASH} from '../src/features/messages/useBusinessEntry';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>history.replaceState(null,'','/'));
const owner={binding:{identityOwnerReceizId:'one'}} as OpenIdentity;
function fixture(){
 const create=vi.fn(async(_consent:boolean)=>{});
 const state:{identity:OpenIdentity|null;opening:boolean;busy:boolean;error:string|null;create:typeof create}={identity:null,opening:true,busy:false,error:null,create};
 let result!:ReturnType<typeof useBusinessEntry>;
 function Harness(){result=useBusinessEntry(state,location.pathname==='/');return null;}
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 return {state,create,get result(){return result;},render:()=>act(async()=>root.render(<Harness/>)),event:()=>act(async()=>dispatchEvent(new Event('receiz-bank:surface'))),close:()=>{act(()=>root.unmount());host.remove();}};
}
it('waits for restore, creates once only for the explicit Business intent, and binds the assistant request to that identity',async()=>{
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{await f.render();expect(f.create).not.toHaveBeenCalled();f.state.opening=false;await f.render();expect(f.create).toHaveBeenCalledExactlyOnceWith(true);await f.render();expect(f.create).toHaveBeenCalledOnce();f.state.identity=owner;await f.render();expect(f.result.request?.owner).toBe(owner);const id=f.result.request!.id;await act(()=>f.result.consume(id));expect(location.hash).toBe('#account/messages');expect(f.result.request).toBeNull();await f.event();expect(f.create).toHaveBeenCalledOnce();}finally{f.close();}
});
it('reuses an existing identity and never creates after a restore error',async()=>{
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{f.state.opening=false;f.state.error='Selected identity source unavailable';await f.render();expect(f.create).not.toHaveBeenCalled();expect(f.result.request).toBeNull();f.state.identity=owner;f.state.error=null;await f.render();expect(f.result.request?.owner).toBe(owner);expect(f.create).not.toHaveBeenCalled();}finally{f.close();}
});
it('does not create on ordinary Enter or a hidden public page and cancels a bound request when its owner changes',async()=>{
 history.replaceState(null,'','/#account');const f=fixture();
 try{f.state.opening=false;await f.render();expect(f.create).not.toHaveBeenCalled();history.replaceState(null,'','/business/'+BUSINESS_ENTRY_HASH);await f.event();await f.render();expect(f.create).not.toHaveBeenCalled();history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);f.state.identity=owner;await f.event();await f.render();expect(f.result.request?.owner).toBe(owner);f.state.identity={binding:{identityOwnerReceizId:'two'}} as OpenIdentity;await f.render();expect(f.result.request).toBeNull();expect(f.create).not.toHaveBeenCalled();}finally{f.close();}
});
it('cancels an unconsumed opening intent when the user navigates away',async()=>{
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{f.state.identity=owner;f.state.opening=false;await f.render();expect(f.result.request).not.toBeNull();history.replaceState(null,'','/business/');await f.event();await f.render();expect(f.result.request).toBeNull();}finally{f.close();}
});
