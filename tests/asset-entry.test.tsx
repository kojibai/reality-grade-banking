// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import {useAssetEntry} from '../src/features/assets/useAssetEntry';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});afterEach(()=>history.replaceState(null,'','/'));
function fixture(){const create=vi.fn(async(_consent:boolean)=>{});const state={identity:null as OpenIdentity|null,opening:true,busy:false,error:null as string|null,create};function Harness(){useAssetEntry(state,location.pathname==='/');return null;}const host=document.createElement('div'),root=createRoot(host);return{state,create,render:()=>act(async()=>root.render(<Harness/>)),event:()=>act(async()=>dispatchEvent(new Event('receiz-bank:surface'))),close:()=>act(()=>root.unmount())};}
it('waits for retained account restoration then opens once and preserves the Create asset destination',async()=>{
 history.replaceState(null,'','/#account/currency');const f=fixture();try{await f.render();expect(f.create).not.toHaveBeenCalled();f.state.opening=false;await f.render();expect(f.create).toHaveBeenCalledExactlyOnceWith(true);await f.render();await f.event();expect(f.create).toHaveBeenCalledOnce();expect(location.hash).toBe('#account/currency');}finally{f.close();}
});
it('uses the saved account and does not replace an unavailable or removed identity',async()=>{
 history.replaceState(null,'','/#account/currency');const f=fixture();try{f.state.opening=false;f.state.error='SOURCE_UNAVAILABLE';await f.render();expect(f.create).not.toHaveBeenCalled();f.state.error=null;f.state.identity={binding:{identityOwnerReceizId:'existing'}} as OpenIdentity;await f.render();expect(f.create).not.toHaveBeenCalled();f.state.identity=null;await f.render();expect(f.create).not.toHaveBeenCalled();}finally{f.close();}
});
it('ordinary account entry and a public page cannot auto-create an account',async()=>{
 const f=fixture();try{f.state.opening=false;await f.render();expect(f.create).not.toHaveBeenCalled();history.replaceState(null,'','/learn/earn-from-originals/#account/currency');await f.event();expect(f.create).not.toHaveBeenCalled();history.replaceState(null,'','/#account/currency');await f.event();expect(f.create).toHaveBeenCalledOnce();}finally{f.close();}
});
it('cancels the creation intent if someone leaves while saved-account restoration is pending',async()=>{
 history.replaceState(null,'','/#account/currency');const f=fixture();try{await f.render();history.replaceState(null,'','/#account');await f.event();f.state.opening=false;await f.render();expect(f.create).not.toHaveBeenCalled();}finally{f.close();}
});
