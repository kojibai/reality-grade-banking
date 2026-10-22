// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import type {OpenIdentity} from '../src/receiz/native-identity';
const flow=vi.hoisted(()=>({publish:null as null|((identity:OpenIdentity|null)=>void),saveFor:null as null|((holder:string)=>Promise<void>),save:vi.fn()}));
vi.mock('../src/conformance/ConformanceIdentity',()=>({ConformanceIdentity:({onIdentity}:{onIdentity:(identity:OpenIdentity|null)=>void})=>{flow.publish=onIdentity;return null;}}));
vi.mock('../src/conformance/ImplementationAssessment',()=>({ImplementationAssessment:({onSaveIdentity}:{onSaveIdentity:(holder:string)=>Promise<void>})=>{flow.saveFor=onSaveIdentity;return null;}}));
vi.mock('../src/checkout/CheckoutIdentity',()=>({saveIdentityRecord:flow.save}));
vi.mock('../src/conformance/DeviceEvidence',()=>({DeviceEvidence:()=>null}));
vi.mock('../src/conformance/ProofInspector',()=>({ProofInspector:()=>null}));
import ConformanceApp from '../src/conformance/ConformanceApp';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('exports the existing private record only for the currently admitted workspace holder',async()=>{
 const host=document.createElement('div'),root=createRoot(host),identity={binding:{artifactOwnerReceizId:'holder.receiz.id'}} as OpenIdentity;
 try{
  act(()=>root.render(<ConformanceApp/>));
  await expect(flow.saveFor!('holder.receiz.id')).rejects.toThrow('CONFORMANCE_HOLDER_MISMATCH');
  flow.publish!(identity);
  await expect(flow.saveFor!('foreign.receiz.id')).rejects.toThrow('CONFORMANCE_HOLDER_MISMATCH');
  await flow.saveFor!('holder.receiz.id');expect(flow.save).toHaveBeenCalledExactlyOnceWith(identity);
  flow.publish!(null);
  await expect(flow.saveFor!('holder.receiz.id')).rejects.toThrow('CONFORMANCE_HOLDER_MISMATCH');
  expect(flow.save).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());}
});
