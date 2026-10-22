// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
vi.mock('../src/conformance/DeviceEvidence',()=>({DeviceEvidence:()=>null}));
vi.mock('../src/conformance/ProofInspector',()=>({ProofInspector:()=>null}));
import ConformanceApp from '../src/conformance/ConformanceApp';
import {StandardOverview} from '../src/conformance/StandardOverview';
import {ImplementationAssessment} from '../src/conformance/ImplementationAssessment';
it('opens the institutional standard first and exposes external self-assessment with keyboard tabs',()=>{
 history.replaceState(null,'','/conformance/');const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{act(()=>root.render(<ConformanceApp/>));expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('Standard');expect(host.textContent).toContain('Reality-Grade Banking standard.');const assess=[...host.querySelectorAll('button')].find(b=>b.textContent==='Assess your implementation');expect(assess).toBeDefined();act(()=>assess!.click());expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('Assess implementation');expect(host.querySelector('input[type=file][accept*="json"]')).not.toBeNull();const selected=host.querySelector('[role=tab][aria-selected=true]')!;act(()=>selected.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));expect(host.querySelector('[role=tab][aria-selected=true]')?.textContent).toBe('Proof inspector');}finally{act(()=>root.unmount());host.remove();}
});
it('lists substantive capabilities with implementation and test drilldowns instead of leading with loader diagnostics',()=>{
 const host=document.createElement('div'),root=createRoot(host);try{act(()=>root.render(<StandardOverview onAssess={()=>{}}/>));for(const text of ['Value, denomination and backing','Assets, shares and offers','Atomic execution and recovery','Three Note types. Two execution profiles.'])expect(host.textContent).toContain(text);expect(host.querySelector('a[href*="native-asset.ts"]')).not.toBeNull();expect(host.querySelector('a[href*="native-asset.test.ts"]')).not.toBeNull();}finally{act(()=>root.unmount());}
});
it('requires an adapter report and exact selected scope before assessment can run',()=>{
 const host=document.createElement('div'),root=createRoot(host);try{act(()=>root.render(<ImplementationAssessment onEvidence={()=>{}}/>));const run=[...host.querySelectorAll('button')].find(b=>b.textContent==='Review receiving evidence') as HTMLButtonElement;expect(run.disabled).toBe(true);expect(host.querySelectorAll('input[type=checkbox]')).toHaveLength(10);expect(host.textContent).toContain('sends no customer evidence to a server');}finally{act(()=>root.unmount());}
});
it('keeps the newest report when an earlier file finishes reading late',async()=>{
 const host=document.createElement('div'),root=createRoot(host),evidence=vi.fn();
 let oldRead!:(value:string)=>void;
 const old=new File(['old'],'old.json',{type:'application/json'}),fresh=new File(['fresh'],'fresh.json',{type:'application/json'});
 Object.defineProperty(old,'text',{value:()=>new Promise<string>(resolve=>{oldRead=resolve;})});
 Object.defineProperty(fresh,'text',{value:async()=>JSON.stringify({implementation:{name:'newest report'}})});
 try{
  act(()=>root.render(<ImplementationAssessment onEvidence={evidence}/>));
  const input=[...host.querySelectorAll('label')].find(label=>label.textContent?.startsWith('Adapter report JSON'))!.querySelector('input')!;
  const choose=(file:File)=>{Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));};
  act(()=>choose(old));await act(async()=>choose(fresh));
  await act(async()=>oldRead(JSON.stringify({implementation:{name:'stale report'}})));
  const run=[...host.querySelectorAll('button')].find(button=>button.textContent==='Review receiving evidence')!;
  await act(async()=>{run.click();await vi.waitFor(()=>expect(evidence.mock.calls.some(([value])=>value)).toBe(true));});
  expect(evidence.mock.calls.filter(([report])=>report).at(-1)?.[0].implementation.name).toBe('newest report');
 }finally{act(()=>root.unmount());}
});
it('waits for the current original-source read before reviewing evidence',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 let finish!:(value:ArrayBuffer)=>void;
 const report=new File(['{}'],'report.json',{type:'application/json'}),source=new File(['source'],'original.png');
 Object.defineProperty(source,'arrayBuffer',{value:()=>new Promise<ArrayBuffer>(resolve=>{finish=resolve;})});
 try{
  act(()=>root.render(<ImplementationAssessment onEvidence={()=>{}}/>));
  const choose=(name:string,file:File)=>{const input=[...host.querySelectorAll('label')].find(label=>label.textContent?.startsWith(name))!.querySelector('input')!;Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));};
  await act(async()=>choose('Adapter report JSON',report));
  const run=[...host.querySelectorAll('button')].find(button=>button.textContent==='Review receiving evidence')!;
  expect(run.disabled).toBe(false);act(()=>choose('Original evidence files',source));expect(run.disabled).toBe(true);
  await act(async()=>finish(new Uint8Array([1,2]).buffer));expect(run.disabled).toBe(false);
 }finally{act(()=>root.unmount());}
});
