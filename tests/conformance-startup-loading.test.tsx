// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import type {InstitutionCheckResult,InstitutionReferenceReport} from '../src/conformance/reference';
type ReferenceProps=Parameters<typeof import('../src/conformance/ReferenceChecks').ReferenceChecks>[0];
const trace=vi.hoisted(()=>({referenceLoads:0,referenceMounts:0,runnerLoads:0,run:vi.fn()}));
vi.mock('../src/conformance/ReferenceChecks',async()=>{
 const {useEffect}=await import('react');trace.referenceLoads++;
 return{ReferenceChecks:({results,report,busy}:ReferenceProps)=>{
  useEffect(()=>{trace.referenceMounts++;},[]);
  return <div data-reference-state={JSON.stringify({results:results.length,reported:!!report,busy})}><label>Retained verification note<input/></label></div>;
 }};
});
vi.mock('../src/conformance/institution-reference',()=>{trace.runnerLoads++;return{runInstitutionBrowserChecks:trace.run};});
// These tests exercise the actual page's loading, tab and callback boundaries.
// Presentation neighbours are inert; no SDK verification or custody guard is replaced.
vi.mock('../src/conformance/ConformanceIdentity',()=>({ConformanceIdentity:()=>null}));
vi.mock('../src/conformance/StandardOverview',()=>({StandardOverview:()=> <p>Standard overview</p>}));
vi.mock('../src/conformance/ImplementationAssessment',()=>({ImplementationAssessment:()=>null}));
vi.mock('../src/conformance/ProofInspector',()=>({ProofInspector:()=>null}));
vi.mock('../src/conformance/QualificationMatrix',()=>({QualificationMatrix:()=>null}));
vi.mock('../src/conformance/DeviceEvidence',()=>({DeviceEvidence:()=>null}));
vi.mock('../src/conformance/NoteContinuityStandard',()=>({NoteContinuityStandard:()=>null}));
vi.mock('../src/components/SiteFooter',()=>({SiteFooter:()=>null}));
import ConformanceApp from '../src/conformance/ConformanceApp';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function mount(hash=''){
 history.replaceState(null,'','/conformance/'+hash);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 act(()=>root.render(<ConformanceApp/>));
 return{host,close(){act(()=>root.unmount());host.remove();},tab(name:string){return [...host.querySelectorAll<HTMLButtonElement>('[role=tab]')].find(button=>button.textContent===name)!;}};
}
it('keeps evidence and runner out of Standard startup, then retains the visited verification panel across keyboard tab changes',async()=>{
 const view=mount();
 try{
  expect(trace.referenceLoads).toBe(0);expect(trace.runnerLoads).toBe(0);
  expect(view.tab('Standard').getAttribute('aria-selected')).toBe('true');
  expect(view.host.querySelector('[data-reference-state]')).toBeNull();
  await act(async()=>{view.tab('Standard').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));await vi.dynamicImportSettled();});
  expect(view.host.querySelector('[data-reference-state]')).not.toBeNull();
  expect(view.tab('Verification').getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(view.tab('Verification'));expect(location.hash).toBe('#reference');
  const note=view.host.querySelector<HTMLInputElement>('#panel-reference input')!;note.value='Keep this evidence view';
  const mounts=trace.referenceMounts;
  act(()=>view.tab('Standard').click());expect(view.host.querySelector('#panel-reference')?.hasAttribute('hidden')).toBe(true);
  act(()=>view.tab('Verification').click());expect(view.host.querySelector('#panel-reference input')).toBe(note);
  expect(note.value).toBe('Keep this evidence view');expect(trace.referenceMounts).toBe(mounts);
  expect(trace.referenceLoads).toBe(1);expect(trace.runnerLoads).toBe(0);expect(trace.run).not.toHaveBeenCalled();
 }finally{view.close();}
});
it('opens the existing #reference deep link without starting verification',async()=>{
 const view=mount('#reference');
 try{
  await act(async()=>{await vi.waitFor(()=>expect(view.host.querySelector('[data-reference-state]')).not.toBeNull());});
  expect(view.tab('Verification').getAttribute('aria-selected')).toBe('true');
  expect(view.tab('Verification').getAttribute('aria-controls')).toBe('panel-reference');
  expect(view.host.querySelector('#panel-reference')?.hasAttribute('hidden')).toBe(false);
  expect(trace.runnerLoads).toBe(0);expect(trace.run).not.toHaveBeenCalled();
 }finally{view.close();}
});
it('loads the runner only for Run verification and preserves its progress, result and export callbacks',async()=>{
 let complete!:(report:InstitutionReferenceReport)=>void;
 let start!:(id:InstitutionCheckResult['id'])=>void,result!:(value:InstitutionCheckResult)=>void;
 trace.run.mockImplementation((onStart:typeof start,onResult:typeof result)=>{start=onStart;result=onResult;return new Promise<InstitutionReferenceReport>(resolve=>{complete=resolve;});});
 const view=mount();
 try{
  expect(trace.runnerLoads).toBe(0);
  const run=[...view.host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='Run verification')!;
  await act(async()=>{run.click();await vi.waitFor(()=>expect(trace.run).toHaveBeenCalledTimes(1));});
  expect(trace.runnerLoads).toBe(1);expect(run.disabled).toBe(true);
  const check:InstitutionCheckResult={id:'release',passed:true,durationMs:1,evidence:{scope:'Synthetic UI callback observation only'}};
  act(()=>{start('release');result(check);});
  expect(view.host.querySelector('[data-reference-state]')?.getAttribute('data-reference-state')).toBe(JSON.stringify({results:1,reported:false,busy:true}));
  const report:InstitutionReferenceReport={schema:'receiz.bank.browser-reference-checks.v1',receizVersion:'129',registryDigest:'a'.repeat(64),verifierModuleSha256:'b'.repeat(64),startedAt:'synthetic-start',completedAt:'synthetic-end',checks:[check],localChecksPassed:true,institutionConformance:'not-assessed',creditAuthorized:false,financialActionsPerformed:0,timestampsAreAuthority:false};
  await act(async()=>complete(report));
  expect(run.disabled).toBe(false);
  expect(view.host.querySelector('[data-reference-state]')?.getAttribute('data-reference-state')).toBe(JSON.stringify({results:1,reported:true,busy:false}));
  expect([...view.host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.startsWith('Export evidence'))?.disabled).toBe(false);
  act(()=>view.tab('Standard').click());act(()=>view.tab('Verification').click());
  expect(view.host.querySelector('[data-reference-state]')?.getAttribute('data-reference-state')).toBe(JSON.stringify({results:1,reported:true,busy:false}));
  expect(trace.run).toHaveBeenCalledTimes(1);
 }finally{view.close();}
});
