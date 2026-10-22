// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {ContractTestbench} from '../src/conformance/ContractTestbench';
import {referenceContractAdapter,runContractAssessment} from '../src/conformance/contract';
import {openConformanceEvidenceObject} from '../src/conformance/evidence-object';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('retains the original external checker provenance when saving an imported JSON report',async()=>{
 const report=await runContractAssessment(referenceContractAdapter,{name:'External adapter',buildSha256:'a'.repeat(64)},'original-provenance-retained');
 const original={...report,checkerIdentity:{scope:'external-cli',sourceTreeSha256:'b'.repeat(64)},originalEvidenceReferences:['reference-one']};
 const host=document.createElement('div'),root=createRoot(host),evidence=vi.fn();
 const previousCreate=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;let preview:Blob|undefined;
 URL.createObjectURL=blob=>{preview=blob as Blob;return 'blob:test-evidence-preview';};URL.revokeObjectURL=()=>{};
 try{
  act(()=>root.render(<ContractTestbench onEvidence={evidence}/>));
  const input=host.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input,'files',{value:[new File([JSON.stringify(original)],'report.json',{type:'application/json'})],configurable:true});
  await act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));await vi.waitFor(()=>expect(evidence.mock.calls.some(([value])=>value)).toBe(true));});
  expect(preview).toBeDefined();const opened=await openConformanceEvidenceObject(await preview!.text());
  expect(opened.report).toMatchObject({checkerIdentity:original.checkerIdentity,originalEvidenceReferences:original.originalEvidenceReferences});
 }finally{act(()=>root.unmount());URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;}
});
