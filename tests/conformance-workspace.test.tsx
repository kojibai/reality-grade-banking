// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
const native=vi.hoisted(()=>({open:vi.fn()}));
vi.mock('../src/conformance/receiz-evidence-seal',()=>({openConformanceEvidenceWorkspace:native.open}));
vi.mock('../src/conformance/ProofObjectSave',()=>({ProofObjectSave:()=> <button>Download original credential</button>}));
import {InstitutionWorkspace} from '../src/conformance/InstitutionWorkspace';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.clearAllMocks());
const credential={bytes:new Uint8Array([7]),filename:'certificate.png',mimeType:'image/png',object:{digest:'a'.repeat(64),svg:'<svg/>',report:{scope:'public-integration-contracts',implementation:{name:'Tested software',buildSha256:'b'.repeat(64)},credentialHolder:{receizId:'holder-123'},cases:[{id:'one',passed:true}],productionQualification:'not-demonstrated'}}};
const choose=(host:HTMLElement)=>{const input=host.querySelector<HTMLInputElement>('input[type=file]')!;Object.defineProperty(input,'files',{value:[new File([new Uint8Array([7])],'certificate.png')],configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));};
it('does not unlock from a public certificate alone or enroll another identity',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<InstitutionWorkspace onNewAssessment={()=>{}}/>));expect(native.open).not.toHaveBeenCalled();native.open.mockRejectedValueOnce(Object.assign(Error('need control'),{code:'CONFORMANCE_IDENTITY_REQUIRED'}));await act(async()=>choose(host));expect(host.textContent).toContain('same Receiz ID');expect(host.textContent).not.toContain('Holder verified');}finally{act(()=>root.unmount());}
});
it('opens the exact holder-bound scope and closes when device identity control is no longer current',async()=>{
 const host=document.createElement('div'),root=createRoot(host),current=vi.fn(async()=>true),again=vi.fn(),create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 URL.createObjectURL=()=> 'blob:credential';URL.revokeObjectURL=()=>{};
 try{native.open.mockResolvedValueOnce({credential,holderReceizId:'holder-123',stillCurrent:current});act(()=>root.render(<InstitutionWorkspace onNewAssessment={again}/>));await act(async()=>choose(host));expect(native.open.mock.calls[0][0]).toEqual(new Uint8Array([7]));expect(host.textContent).toContain('Holder verified');expect(host.textContent).toContain('holder-123');expect(host.textContent).toContain('Public integration contract');expect(host.textContent).toContain('Production receiving qualification is not established');
  const rerun=[...host.querySelectorAll('button')].find(button=>button.textContent==='New assessment')!;await act(async()=>rerun.click());expect(again).toHaveBeenCalledTimes(1);
  current.mockResolvedValueOnce(false);await act(async()=>window.dispatchEvent(new Event('receiz-bank:surface')));expect(host.textContent).not.toContain('Holder verified');expect(host.textContent).toContain('identity changed');
 }finally{act(()=>root.unmount());URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
it('offers the private record only to the current matching holder and keeps the public original separate',async()=>{
 const host=document.createElement('div'),root=createRoot(host),current=vi.fn(async()=>true),save=vi.fn(async()=>{}),create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 URL.createObjectURL=()=> 'blob:credential';URL.revokeObjectURL=()=>{};
 try{native.open.mockResolvedValueOnce({credential,holderReceizId:'holder-123',stillCurrent:current});act(()=>root.render(<InstitutionWorkspace onNewAssessment={()=>{}} onSaveIdentity={save}/>));await act(async()=>choose(host));const button=[...host.querySelectorAll('button')].find(button=>button.textContent==='Save private Identity Record');expect(button).toBeDefined();await act(async()=>button!.click());expect(save).toHaveBeenCalledWith('holder-123');current.mockResolvedValueOnce(false);await act(async()=>button!.click());expect(save).toHaveBeenCalledTimes(1);expect(host.textContent).not.toContain('Holder verified');}finally{act(()=>root.unmount());URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
});
