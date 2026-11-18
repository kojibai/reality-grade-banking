// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {existsSync} from 'node:fs';
import {ReceivingPreparation} from '../src/conformance/ReceivingPreparation';
import {ImplementationAssessment} from '../src/conformance/ImplementationAssessment';
let host:HTMLDivElement,root:Root;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();vi.restoreAllMocks();});
function render(onScope=vi.fn()){
 host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root.render(<ReceivingPreparation onScope={onScope}/>));return onScope;
}
const button=(text:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent===text)!;
it('prepares a receiver before credentials using held requirements and actual implementation links, without opening services',()=>{
 const fetch=vi.spyOn(globalThis,'fetch'),persist=vi.spyOn(Storage.prototype,'setItem');render();
 expect(host.querySelector('h3')?.textContent).toBe('Prepare to receive the money.');
 expect(host.textContent).toContain('Choose the receiving capability');expect(host.querySelector('input[type=file]')).toBeNull();
 expect(fetch).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();
 for(const anchor of host.querySelectorAll<HTMLAnchorElement>('a[href]')){
  const url=new URL(anchor.href);if(url.hostname==='github.com'){const relative=url.pathname.split('/blob/main/')[1]?.split('#')[0];expect(relative,anchor.href).toBeTruthy();expect(existsSync(relative!),anchor.href).toBe(true);}
 }
 expect(host.textContent).toContain('Public integration contract');expect(host.textContent).toContain('Operational receiving evidence');
});
it('starts with one Receive standard and carries only the chosen capability on explicit continuation',()=>{
 const fetch=vi.spyOn(globalThis,'fetch'),persist=vi.spyOn(Storage.prototype,'setItem'),read=vi.spyOn(Storage.prototype,'getItem');
 const onScope=render();expect(host.querySelector('select')).toBeNull();act(()=>button('Notes').click());
 expect(onScope).not.toHaveBeenCalled();act(()=>button('Use this assessment scope').click());
 expect(onScope).toHaveBeenCalledOnce();expect(onScope.mock.calls[0][0]).toEqual({capabilities:['notes','value','ownership','recovery','history']});
 expect(host.querySelector('[data-preparation-requirements]')?.textContent).toContain('Receiver-specific live assessment');
 expect(fetch).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();
});
it('cannot replace the selected scope while an assessment or source read is active',()=>{
 const onScope=render();
 act(()=>root.render(<ReceivingPreparation onScope={onScope} disabled/>));
 const apply=button('Use this assessment scope');expect(apply.disabled).toBe(true);
 act(()=>apply.click());expect(onScope).not.toHaveBeenCalled();
 act(()=>root.render(<ReceivingPreparation onScope={onScope}/>));
 act(()=>apply.click());expect(onScope).toHaveBeenCalledOnce();
});
it('preserves the explicit technical rail scope underneath when preparation changes capability',()=>{
 const fetch=vi.spyOn(globalThis,'fetch'),persist=vi.spyOn(Storage.prototype,'setItem'),read=vi.spyOn(Storage.prototype,'getItem');
 render();act(()=>root.render(<ImplementationAssessment onEvidence={vi.fn()}/>));
 const railScope=[...host.querySelectorAll('fieldset')].find(field=>field.querySelector('legend')?.textContent==='Rails to assess')!;
 const rails=[...railScope.querySelectorAll<HTMLInputElement>('input')];expect(rails).toHaveLength(3);
 expect(rails.map(input=>input.checked)).toEqual([true,false,false]);
 for(const input of rails)act(()=>input.click());
 expect(rails.map(input=>input.checked)).toEqual([false,true,true]);
 act(()=>button('Notes').click());act(()=>button('Use this assessment scope').click());
 expect(rails.map(input=>input.checked)).toEqual([false,true,true]);
 expect(host.querySelector('.receiving-preparation select')).toBeNull();
 expect(host.querySelectorAll('.assessment-scope input:checked')).toHaveLength(7);
 expect(host.textContent).toContain('Missing proof fails the assessment');
 expect(fetch).not.toHaveBeenCalled();expect(persist).not.toHaveBeenCalled();expect(read).not.toHaveBeenCalled();
});
it('saves the selected environment and real local commands as preparation notes, without claiming a result',async()=>{
 let captured:Blob|undefined;vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{captured=blob as Blob;return'blob:preparation';});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 render();act(()=>button('Merchant checkout').click());
 const environment=host.querySelector<HTMLInputElement>('[aria-label="Receiving environment"]')!;
 act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(environment,'Merchant site · isolated acceptance environment');environment.dispatchEvent(new Event('input',{bubbles:true}));});
 act(()=>button('Save preparation notes').click());const text=await captured!.text();
 expect(text).toContain('Merchant checkout');expect(text).toContain('Merchant site · isolated acceptance environment');expect(text).toContain('npm run receiver:check');expect(text).toContain('--adapter /absolute/path/to/your-adapter');expect(text).toContain('conformance-independent-assessment.template.json');
 expect(text).not.toMatch(/^Rail:/m);
 expect(text).not.toMatch(/assessmentPassed.*true|conforming-for-assessed-capability|institutionConformance.*conforming/);
});
