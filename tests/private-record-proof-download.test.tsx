// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {BankExecutionRecoveryPanel} from '../src/features/account/BankExecutionRecoveryPanel';
import {WalletSendRecovery} from '../src/features/account/WalletSendOperation';
import type {OpenIdentity} from '../src/receiz/native-identity';

// UI transport boundaries only. The shared export controller has separate
// unchanged-SDK cryptographic tests; no financial primitive is mocked here.
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const NativeURL=URL;
let downloads:Array<{name:string;href:string}>,objects:Blob[];
beforeEach(()=>{
 downloads=[];objects=[];
 vi.stubGlobal('URL',class extends NativeURL{
  static createObjectURL(value:Blob|MediaSource){objects.push(value as Blob);return 'blob:verified-record';}
  static revokeObjectURL(){}
 });
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push({name:this.download,href:this.href});});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const bytes=new TextEncoder().encode('{"schema":"synthetic.private-record","originalSource":"unchanged","privateRecovery":"keep"}');
const file=new File(['synthetic-sdk-output'],'exact-sdk-record.receized.json',{type:'application/json'});
const deferred=<T,>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return{promise,resolve};};
const button=(host:HTMLElement,text:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent===text)!;
function recovery(sealRecordExport:ReturnType<typeof vi.fn>){
 const exportRecovery=vi.fn(async()=>({bytes,filename:'original-recovery.json'})),resolve=vi.fn();
 const identity={sealRecordExport,executionRecovery:()=>({status:async()=>({state:'committed',operationId:'retained-operation',operationKind:'wallet.transfer',planDigest:'a'.repeat(64),hasRecovery:true}),exportRecovery,resolve})}as unknown as OpenIdentity;
 return{identity,exportRecovery,resolve};
}
function wallet(sealRecordExport:ReturnType<typeof vi.fn>){
 const exportRecord=vi.fn(async()=>({bytes,filename:'original-observation.json'})),resolve=vi.fn();
 const identity={sealRecordExport,walletSend:async()=>({status:async()=>({status:'recorded',clientNonce:'retained-nonce',transferId:'retained-transfer'}),exportRecord,resolve})}as unknown as OpenIdentity;
 return{identity,exportRecord,resolve};
}
async function mount(){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);return{host,root,async close(){await act(async()=>root.unmount());host.remove();}};}

it('downloads the SDK-selected recovery file once after capture succeeds, preserving the complete private packet',async()=>{
 const done=deferred<File>(),seal=vi.fn(()=>done.promise),api=recovery(seal),f=await mount();
 try{
  await act(async()=>f.root.render(<BankExecutionRecoveryPanel identity={api.identity}/>));
  await act(async()=>{button(f.host,'Save recovery proof').click();button(f.host,'Save recovery proof')?.click();});
  expect(api.exportRecovery).toHaveBeenCalledOnce();expect(seal).toHaveBeenCalledExactlyOnceWith({bytes,filename:'original-recovery.json',mimeType:'application/json'});expect(downloads).toHaveLength(0);expect(api.resolve).not.toHaveBeenCalled();
  await act(async()=>done.resolve(file));
  expect(objects).toEqual([file]);expect(downloads).toEqual([{name:file.name,href:'blob:verified-record'}]);expect(new TextDecoder().decode(bytes)).toContain('"privateRecovery":"keep"');
 }finally{await f.close();}
});

it('does not download an old owner’s late recovery export after switching identities',async()=>{
 const done=deferred<File>(),first=recovery(vi.fn(()=>done.promise)),second=recovery(vi.fn(async()=>file)),f=await mount();
 try{
  await act(async()=>f.root.render(<BankExecutionRecoveryPanel identity={first.identity}/>));
  await act(async()=>button(f.host,'Save recovery proof').click());
  await act(async()=>f.root.render(<BankExecutionRecoveryPanel identity={second.identity}/>));
  await act(async()=>done.resolve(file));expect(downloads).toHaveLength(0);
  await act(async()=>button(f.host,'Save recovery proof').click());expect(downloads).toHaveLength(1);expect(second.exportRecovery).toHaveBeenCalledOnce();
 }finally{await f.close();}
});

it('captures the held Wallet observation without submitting or resolving another payment',async()=>{
 const seal=vi.fn(async()=>file),api=wallet(seal),f=await mount();
 try{
  await act(async()=>f.root.render(<WalletSendRecovery identity={api.identity}/>));
  await act(async()=>button(f.host,'Save payment record').click());
  expect(api.exportRecord).toHaveBeenCalledOnce();expect(api.resolve).not.toHaveBeenCalled();expect(seal).toHaveBeenCalledExactlyOnceWith({bytes,filename:'original-observation.json',mimeType:'application/json'});
  expect(objects).toEqual([file]);expect(downloads[0].name).toBe(file.name);
 }finally{await f.close();}
});

it('preserves a held record and refuses an unsealed download when SDK capture is unavailable',async()=>{
 const seal=vi.fn(async()=>{throw Error('SIGNER_UNAVAILABLE');}),api=wallet(seal),f=await mount();
 try{
  await act(async()=>f.root.render(<WalletSendRecovery identity={api.identity}/>));
  await act(async()=>button(f.host,'Save payment record').click());
  expect(downloads).toHaveLength(0);expect(f.host.querySelector('[role="status"]')?.textContent).toContain('recorded this payment');expect(f.host.textContent).toContain('original request stays saved');expect(api.resolve).not.toHaveBeenCalled();
 }finally{await f.close();}
});
