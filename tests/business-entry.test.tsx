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
it('waits for restore, creates once only for the explicit Business intent, and binds the agent request to that identity',async()=>{
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
it('does not recreate a cancelled Business intent from a delayed surface event after the identity changes',async()=>{
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{f.state.opening=false;f.state.identity=owner;await f.render();expect(f.result.request?.owner).toBe(owner);f.state.identity={binding:{identityOwnerReceizId:'replacement'}} as OpenIdentity;await f.render();await f.event();expect(f.result.request).toBeNull();expect(f.create).not.toHaveBeenCalled();}finally{f.close();}
});

it('carries the retained originating audience task on a cold explicit Business entry',async()=>{
 const start={title:'Get the revision ready.',question:'Help me revise this client campaign.',hint:'Bring the brief and latest feedback.'};
 const source=document.createElement('div');source.id='public-learn-root';source.hidden=true;const main=document.createElement('main');main.dataset.businessStart=JSON.stringify(start);source.append(main);document.body.append(source);
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{f.state.opening=false;f.state.identity=owner;await f.render();expect(f.result.request?.start).toEqual(start);expect(f.create).not.toHaveBeenCalled();}finally{f.close();source.remove();}
});
it('captures the task only from the unmodified explicit CTA on the currently selected public audience page',async()=>{
 history.replaceState(null,'','/business/for/agencies/');const f=fixture();
 const source=document.createElement('div');source.id='public-learn-root';const main=document.createElement('main');const start={title:'A client-ready revision.',question:'What should change in this feedback?',hint:'Bring the approved brief.'};main.dataset.businessStart=JSON.stringify(start);const link=document.createElement('a');link.href='/'+BUSINESS_ENTRY_HASH;link.dataset.businessCheckout='';link.textContent='Get Business';main.append(link);source.append(main);document.body.append(source);
 const stop=(event:Event)=>event.preventDefault();link.addEventListener('click',stop);
 try{f.state.opening=false;f.state.identity=owner;await f.render();await act(async()=>link.click());history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);await f.event();expect(f.result.request?.start).toEqual(start);expect(f.create).not.toHaveBeenCalled();}finally{f.close();source.remove();}
});
it('uses the explicit audience task when a generic route event was observed just before its click',async()=>{
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture(),start={title:'Finish the proposal.',question:'Help me draft this proposal.',hint:'Bring the client brief.'};
 const source=document.createElement('div');source.id='public-learn-root';const main=document.createElement('main');main.dataset.businessStart=JSON.stringify(start);const link=document.createElement('a');link.href='/'+BUSINESS_ENTRY_HASH;link.dataset.businessCheckout='';main.append(link);source.append(main);
 try{f.state.opening=false;f.state.identity=owner;await f.render();document.body.append(source);link.addEventListener('click',e=>e.preventDefault());await act(async()=>link.click());await f.event();expect(f.result.request?.start).toEqual(start);}finally{f.close();source.remove();}
});

it.each(['{invalid',JSON.stringify({title:'x',question:'x'.repeat(601),hint:'x'}),JSON.stringify({title:'',question:'x',hint:'x'})])('uses the default task for malformed or unbounded public editorial text',async(raw)=>{
 const source=document.createElement('div');source.id='public-learn-root';const main=document.createElement('main');main.dataset.businessStart=raw;source.append(main);document.body.append(source);
 history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);const f=fixture();
 try{f.state.opening=false;f.state.identity=owner;await f.render();expect(f.result.request?.start.title).toBe('Get the next piece of work off your list.');expect(f.create).not.toHaveBeenCalled();}finally{f.close();source.remove();}
});
it('does not retain audience context from a hidden page click after navigating to another public page',async()=>{
 history.replaceState(null,'','/business/for/agencies/');const f=fixture();
 const source=document.createElement('div');source.id='public-learn-root';source.hidden=true;const main=document.createElement('main');main.dataset.businessStart=JSON.stringify({title:'Hidden task',question:'Hidden question',hint:'Hidden hint'});const link=document.createElement('a');link.href='/'+BUSINESS_ENTRY_HASH;link.dataset.businessCheckout='';link.addEventListener('click',e=>e.preventDefault());main.append(link);source.append(main);document.body.append(source);
 try{f.state.opening=false;f.state.identity=owner;await f.render();await act(async()=>link.click());source.remove();history.replaceState(null,'','/business/');await f.event();history.replaceState(null,'','/'+BUSINESS_ENTRY_HASH);await f.event();expect(f.result.request?.start.title).toBe('Get the next piece of work off your list.');}finally{f.close();source.remove();}
});
