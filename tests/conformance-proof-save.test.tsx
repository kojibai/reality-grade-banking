// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {ConformanceEvidenceObject} from '../src/conformance/evidence-object';
const native=vi.hoisted(()=>({seal:vi.fn()}));
vi.mock('../src/conformance/receiz-evidence-seal',()=>({sealConformanceEvidenceObject:native.seal}));
import {ProofObjectSave} from '../src/conformance/ProofObjectSave';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.clearAllMocks());
const object={svg:'retained visual evidence',digest:'a'.repeat(64),report:{implementation:{name:'Examined software'}}} as ConformanceEvidenceObject;
it('requires explicit action and separate signer enrollment consent before sealing',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 native.seal.mockRejectedValueOnce(Object.assign(Error('required'),{code:'CONFORMANCE_ENROLLMENT_REQUIRED'}));
 try{
  act(()=>root.render(<ProofObjectSave object={object}/>));expect(native.seal).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());
  expect(native.seal).toHaveBeenCalledTimes(1);expect(native.seal.mock.calls[0][1].allowEnrollment).toBe(false);
  const enroll=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Enable device signer'))!;expect(enroll).toBeDefined();
  native.seal.mockRejectedValueOnce(Error('synthetic failure'));
  await act(async()=>enroll.click());expect(native.seal.mock.calls[1][1].allowEnrollment).toBe(true);
 }finally{act(()=>root.unmount());}
});
it('retains the returned identity-bound credential without accepting a substituted test report or sealing twice',async()=>{
 const host=document.createElement('div'),root=createRoot(host),onSealed=vi.fn();
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 URL.createObjectURL=()=> 'blob:credential';URL.revokeObjectURL=()=>{};
 const original={bytes:new Uint8Array([1,2]),filename:'credential.png',mimeType:'image/png' as const,object:{...object,digest:'b'.repeat(64),report:{...object.report,credentialHolder:{schema:'receiz.bank.conformance-holder.v1' as const,receizId:'verified-holder'}}}};
 try{
  native.seal.mockResolvedValueOnce(original);act(()=>root.render(<ProofObjectSave object={object} onSealed={onSealed}/>));
  await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());
  expect(onSealed).toHaveBeenCalledWith(original);expect(click).toHaveBeenCalledTimes(1);
  expect(host.querySelector<HTMLAnchorElement>('a[download]')?.getAttribute('href')).toBe('blob:credential');
  await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());expect(native.seal).toHaveBeenCalledTimes(1);expect(click).toHaveBeenCalledTimes(2);
  act(()=>root.unmount());
  const next=createRoot(host);native.seal.mockResolvedValueOnce({...original,object:{...original.object,report:{...original.object.report,implementation:{name:'Other software'}}}});
  act(()=>next.render(<ProofObjectSave object={object} onSealed={onSealed}/>));await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());
  expect(click).toHaveBeenCalledTimes(2);expect(onSealed).toHaveBeenCalledTimes(1);expect(host.textContent).toContain('could not be sealed');act(()=>next.unmount());
 }finally{click.mockRestore();URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
it('keeps identity selection local and passes its exact original without replacing device custody',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 native.seal.mockRejectedValueOnce(Object.assign(Error('required'),{code:'CONFORMANCE_IDENTITY_REQUIRED'}));
 try{
  act(()=>root.render(<ProofObjectSave object={object}/>));await act(async()=>host.querySelector<HTMLButtonElement>('button')!.click());
  const input=host.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input,'files',{value:[new File([new Uint8Array([7,8,9])],'identity.png')],configurable:true});
  act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  native.seal.mockRejectedValueOnce(Error('synthetic failure'));
  const use=[...host.querySelectorAll('button')].find(button=>button.textContent==='Save with this Identity Record')!;
  await act(async()=>use.click());const source=await native.seal.mock.calls[1][1].identitySource();
  expect(Array.from(source.bytes)).toEqual([7,8,9]);expect(source.phrase).toBe('');
 }finally{act(()=>root.unmount());}
});
