// @vitest-environment happy-dom
import {act} from 'react';
import{createRoot}from'react-dom/client';
import{afterEach,expect,it,vi}from'vitest';
import type{DeviceCustodyEvidence}from'../src/conformance/device-evidence';
const inspect=vi.hoisted(()=>vi.fn());
const readiness=vi.hoisted(()=>vi.fn().mockResolvedValue('ready'));
vi.mock('../src/conformance/device-evidence',()=>({inspectDeviceCustodyEvidence:inspect,deviceCustodyProbeReadiness:readiness}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const report:DeviceCustodyEvidence={schema:'bankeiz.device-custody-inspection.v1',authority:'diagnostics-only',receizVersion:'129.0.0',secureContext:true,webAuthnAvailable:true,realm:{origin:'https://bankeiz.com',rpId:'bankeiz.com'},context:'standalone',platformAuthenticatorAdvertised:true,advertisedExtensions:{prf:true,largeBlob:true},registration:{format:'none',counter:'0',userVerified:true,backupEligible:true,backedUp:true,attachment:'platform',extensions:{prfEnabled:true,prfOutputProvided:false,largeBlobSupported:true,largeBlobReturned:false}},assertions:[{counter:'0',userVerified:true,backupEligible:true,backedUp:true,extensions:{prfEnabled:null,prfOutputProvided:true,largeBlobSupported:null,largeBlobReturned:false}}],rollbackConformance:{status:'refused',code:'OFFLINE_NOTE_CUSTODY_ROLLBACK_CONFORMANCE_FAILED'},attestationVerification:'not-assessed',custodyQualified:false,financialActionsPerformed:0};
afterEach(()=>{inspect.mockReset();readiness.mockReset().mockResolvedValue('ready');});
async function panel(){const mod=await import('../src/conformance/DeviceEvidence').catch(error=>{if(/Failed to load|Cannot find|failed to import/.test(String(error)))return null;throw error;});expect(typeof mod?.DeviceEvidence).toBe('function');return mod!.DeviceEvidence;}
it('requires explicit test-passkey consent and displays the actual device observations without claiming custody qualification',async()=>{
 const Component=await panel(),host=document.createElement('div'),root=createRoot(host),onEvidence=vi.fn();inspect.mockResolvedValue(report);
 try{await act(async()=>root.render(<Component onEvidence={onEvidence}/>));const button=host.querySelector<HTMLButtonElement>('button')!;expect(button.disabled).toBe(true);expect(inspect).not.toHaveBeenCalled();const consent=host.querySelector<HTMLInputElement>('input[type=checkbox]')!;act(()=>consent.click());expect(button.disabled).toBe(false);await act(async()=>button.click());expect(host.textContent).toContain('Counter 0 → 0');expect(host.textContent).toContain('Rollback check refused');expect(host.textContent).toContain('Custody not qualified');expect(onEvidence).toHaveBeenLastCalledWith(report);expect(host.textContent).not.toContain('Offline Notes are ready');}finally{act(()=>root.unmount());}
});
it('cancels the isolated ceremony when its panel closes and never updates the unmounted view',async()=>{
 const Component=await panel(),host=document.createElement('div'),root=createRoot(host),onEvidence=vi.fn();let signal!:AbortSignal,finish!:(value:DeviceCustodyEvidence)=>void;inspect.mockImplementation((input:{signal:AbortSignal})=>{signal=input.signal;return new Promise(resolve=>{finish=resolve;});});
 await act(async()=>root.render(<Component onEvidence={onEvidence}/>));act(()=>host.querySelector<HTMLInputElement>('input')!.click());act(()=>host.querySelector<HTMLButtonElement>('button')!.click());act(()=>root.unmount());expect(signal.aborted).toBe(true);await act(async()=>finish(report));expect(onEvidence).toHaveBeenCalledExactlyOnceWith(null);
});

it('refuses to start a new assertion probe when this origin already holds qualified custody',async()=>{
 readiness.mockResolvedValue('existing-custody');const Component=await panel(),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<Component onEvidence={vi.fn()}/>));act(()=>host.querySelector<HTMLInputElement>('input')!.click());expect(host.querySelector<HTMLButtonElement>('button')!.disabled).toBe(true);expect(host.textContent).toContain('Existing custody is retained');expect(inspect).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
