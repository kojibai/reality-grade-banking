// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {OfflineNotes} from '../src/features/notes/OfflineNotes';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let downloads:Blob[];
beforeEach(()=>{downloads=[];vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{downloads.push(value as Blob);return'blob:note-proof';});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});});
afterEach(()=>vi.restoreAllMocks());
const bytes=new TextEncoder().encode('{"schema":"synthetic.private-native-note","privateOpening":"preserved"}');
const selected=new File(['sdk-selected-exact-file'],'selected.receizbundle',{type:'application/vnd.receiz.bundle+json'});
function identity(sealRecordExport:ReturnType<typeof vi.fn>){
 const deposit=vi.fn(),create=vi.fn(),reconcileReceivedNotes=vi.fn();
 return{value:{sealRecordExport,offlineNotes:async()=>({receivedNotes:async()=>[{status:'received',noteId:'synthetic-note',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000',proofBytes:bytes}],deposit,create,reconcileReceivedNotes})}as unknown as OpenIdentity,deposit,create,reconcileReceivedNotes};
}
const click=(host:HTMLElement,text:string)=>[...host.querySelectorAll('button')].find(value=>value.textContent===text)!.click();
async function fixture(value:OpenIdentity){const host=document.createElement('div'),root=createRoot(host);await act(async()=>root.render(<OfflineNotes identity={value} mode="deposit" onBack={vi.fn()} onRefresh={vi.fn()}/>));await act(async()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());return{host,root,async close(){await act(async()=>root.unmount());}};}
it('captures the held full Note proof only on Save and downloads SDK-selected bytes once',async()=>{
 let finish!:(file:File)=>void;const seal=vi.fn(()=>new Promise<File>(resolve=>{finish=resolve;})),api=identity(seal),f=await fixture(api.value);
 try{expect(seal).not.toHaveBeenCalled();await act(async()=>{click(f.host,'Save deposit proof');click(f.host,'Save deposit proof');});expect(seal).toHaveBeenCalledExactlyOnceWith({bytes,filename:'receiz-note-deposit-synthetic-note.receiz.json',mimeType:'application/octet-stream'});expect(downloads).toHaveLength(0);await act(async()=>finish(selected));expect(new Uint8Array(await downloads[0].arrayBuffer())).toEqual(new Uint8Array(await selected.arrayBuffer()));expect(downloads[0].type).toBe(selected.type);expect(api.deposit).not.toHaveBeenCalled();expect(api.create).not.toHaveBeenCalled();expect(api.reconcileReceivedNotes).not.toHaveBeenCalled();}finally{await f.close();}
});
it('does not offer raw native bytes when capture is unavailable',async()=>{
 const api=identity(vi.fn(async()=>{throw Error('SIGNER_UNAVAILABLE');})),f=await fixture(api.value);
 try{await act(async()=>click(f.host,'Save deposit proof'));expect(downloads).toHaveLength(0);expect(f.host.textContent).toContain('Your note is received.');expect(api.deposit).not.toHaveBeenCalled();}finally{await f.close();}
});
it('does not download an old owner’s late Note capture after the identity changes',async()=>{
 let finish!:(file:File)=>void;const first=identity(vi.fn(()=>new Promise<File>(resolve=>{finish=resolve;}))),second=identity(vi.fn(async()=>selected)),f=await fixture(first.value);
 try{await act(async()=>click(f.host,'Save deposit proof'));await act(async()=>f.root.render(<OfflineNotes identity={second.value} mode="deposit" onBack={vi.fn()} onRefresh={vi.fn()}/>));await act(async()=>finish(selected));expect(downloads).toHaveLength(0);}finally{await f.close();}
});
