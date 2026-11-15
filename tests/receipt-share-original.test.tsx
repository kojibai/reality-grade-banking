// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFile} from 'node:fs/promises';
import {File as NodeFile,Blob as NodeBlob} from 'node:buffer';
import {createHash} from 'node:crypto';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {verifyReceizArtifact} from '@receiz/sdk';
import {ReceiptShare} from '../src/features/receipts/ReceiptShare';
import {Ledger} from '../src/features/ledger/Ledger';
import {ReceiptView} from '../src/features/receipts/ReceiptView';
import {completeLedgerReceipt,openLedgerReceipt,receiptLink,type LedgerReceiptContext} from '../src/receiz/ledger-receipts';
import {receiptDigest} from '../src/receiz/receipt-snapshot';
import {retainProofInspection,type ProofInspection} from '../src/receiz/proof-inspection';
import {createHeldLedgerOriginalReader} from '../src/receiz/held-ledger-original';
import type {PublicRecord} from '../src/receiz/public-network';
const network=vi.hoisted(()=>({records:[] as PublicRecord[]}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:network.records,sources:{},bootstrap:false,capturedAt:null,refresh(){},loadMore(){}})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|null=null;
beforeAll(async()=>{(window as unknown as {snarkjs:unknown}).snarkjs=await import('snarkjs');});
afterEach(()=>{const close=document.querySelector<HTMLButtonElement>('.receipt-share-panel [aria-label="Close"]');if(close)act(()=>close.click());if(root)act(()=>root!.unmount());root=null;network.records=[];document.body.replaceChildren();history.replaceState(null,'','/');vi.restoreAllMocks();vi.unstubAllGlobals();});
const readyUrl='https://bankeiz.com/receipt/'+'a'.repeat(64)+'/';
const record=(sha:string,id:string,authority:PublicRecord['authority']='public-source-projection'):PublicRecord=>({id:'proofs:'+id,sourceId:id,source:'proofs',kind:'proof recorded',title:'Existing sealed Original',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{artifactDigest:sha},details:{},authority});
async function publicOriginal(id:string){
 const bytes=new Uint8Array(await readFile(process.cwd()+'/tests/fixtures/public-transaction-native.png')),sha=createHash('sha256').update(bytes).digest('hex'),verified=await verifyReceizArtifact(bytes);
 if(verified.status!=='verified-artifact'||verified.artifactDigest.value!==sha)throw Error('Genuine canonical PNG required');
 const report={artifactSha256:sha,artifactBytes:bytes.length,verification:verified.verification} as unknown as ProofInspection;
 const entry=retainProofInspection(report,bytes,'receiz_20261107_2109_62E2508A_record.png');return{bytes,entry,record:record(sha,id)};
}
function environment(){
 vi.stubGlobal('File',NodeFile);vi.stubGlobal('Blob',NodeBlob);
 const files:File[]=[],downloads:string[]=[],fetcher=vi.fn(async(_input:unknown,_init?:RequestInit):Promise<Response>=>{throw Error('No network for held Original');});vi.stubGlobal('fetch',fetcher);
 vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{files.push(value as File);return'blob:exact-original';});
 vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download);});
 return{files,downloads,fetcher};
}
async function mount(selected:PublicRecord,originalContext?:Pick<LedgerReceiptContext,'record'|'sourceReader'>,share?:{carriedLink:string}){
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<ReceiptShare {...{receipt:completeLedgerReceipt(selected),originalContext,readyUrl:share?undefined:readyUrl,carriedLink:share?.carriedLink,onClose(){}}}/>));return host;
}
async function download(host:HTMLElement){
 const action=[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent?.includes('Download original'));
 expect(action,'Original must use the canonical file action, not a receipt.json link').toBeDefined();
 await act(async()=>{action!.click();});
}
it('downloads the genuine retained PNG unchanged only after the explicit Original action',async()=>{
 const original=await publicOriginal('share-original-png'),env=environment(),host=await mount(original.record,{record:original.record});
 expect(env.files,'Opening Share must not manufacture a display JSON Original').toHaveLength(0);expect(env.fetcher).not.toHaveBeenCalled();
 await download(host);await vi.waitFor(()=>expect(env.files).toHaveLength(1));
 expect(env.downloads).toEqual(['receiz_20261107_2109_62E2508A_record.png']);expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(original.bytes);
 expect((await verifyReceizArtifact(new Uint8Array(await env.files[0].arrayBuffer()))).status).toBe('verified-artifact');expect(env.fetcher).not.toHaveBeenCalled();
});
it('uses the portable receipt only as the selected locator for an already admitted Original',async()=>{
 const original=await publicOriginal('share-cold-receipt'),env=environment(),host=await mount(original.record);
 await download(host);await vi.waitFor(()=>expect(env.files).toHaveLength(1));expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(original.bytes);expect(env.fetcher).not.toHaveBeenCalled();
});
it('preserves the selected private reader and never opens it while mounting Share',async()=>{
 const env=environment(),cryptoRuntime=await import('snarkjs');(window as unknown as {snarkjs:unknown}).snarkjs=cryptoRuntime;
 const bytes=new Uint8Array(await readFile(process.cwd()+'/tests/fixtures/public-composer-original.receizbundle')),sha=createHash('sha256').update(bytes).digest('hex');
 let open=true;const read=vi.fn(async()=>({bytes,filename:'private-existing.receizbundle'})),reader=createHeldLedgerOriginalReader({assertOpen(){if(!open)throw Error('IDENTITY_CLOSED');},read}),selected=record(sha,'share-private-original','account-source-projection');
 const host=await mount(selected,{record:selected,sourceReader:reader});expect(read).not.toHaveBeenCalled();expect(env.files).toHaveLength(0);
 await download(host);await vi.waitFor(()=>expect(env.files).toHaveLength(1));expect(env.downloads).toEqual(['private-existing.receizbundle']);expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(bytes);expect(env.fetcher).not.toHaveBeenCalled();
 open=false;await download(host);await vi.waitFor(()=>expect(host.textContent).toContain('No display record was substituted'));expect(env.files).toHaveLength(1);
});
it.each(['id','source','kind','authority','artifact'] as const)('refuses a receipt context with a mismatched %s before reading private custody',async mismatch=>{
 const env=environment(),reader=Object.assign(vi.fn(async()=>null),{assertOpen:vi.fn()}),selected=record('c'.repeat(64),'selected','account-source-projection');
 const other={...selected,...(mismatch==='id'?{sourceId:'other'}:mismatch==='source'?{source:'wallet' as const}:mismatch==='kind'?{kind:'different kind'}:mismatch==='authority'?{authority:'public-source-projection' as const}:{evidence:{artifactDigest:'d'.repeat(64)}})};
 const host=await mount(selected,{record:other,sourceReader:reader});await download(host);
 await vi.waitFor(()=>expect(host.textContent).toContain('No display record was substituted'));expect(reader).not.toHaveBeenCalled();expect(env.files).toHaveLength(0);expect(env.fetcher).not.toHaveBeenCalled();
});
it('refuses a missing Original without offering receipt JSON as the proof',async()=>{
 const env=environment(),selected={...record('','missing'),evidence:{}},host=await mount(selected);
 await download(host);await vi.waitFor(()=>expect(host.textContent).toContain('No incomplete proof was downloaded'));expect(env.files).toHaveLength(0);expect(env.downloads).toHaveLength(0);expect(env.fetcher).not.toHaveBeenCalled();
});
it('refuses changed retained bytes through the existing canonical export admission',async()=>{
 const original=await publicOriginal('share-changed-original');original.entry.bytes[original.entry.bytes.length-1]^=1;
 const env=environment(),host=await mount(original.record);await download(host);await vi.waitFor(()=>expect(host.textContent).toContain('No display record was substituted'));expect(env.files).toHaveLength(0);expect(env.fetcher).not.toHaveBeenCalled();
});
it('does not download after Share closes while its selected private source read is pending',async()=>{
 const env=environment(),bytes=new Uint8Array(await readFile(process.cwd()+'/tests/fixtures/public-composer-original.receizbundle')),sha=createHash('sha256').update(bytes).digest('hex');
 let finish!:(value:null)=>void;const read=vi.fn(()=>new Promise<null>(resolve=>{finish=resolve;})),reader=createHeldLedgerOriginalReader({assertOpen(){},read}),selected=record(sha,'share-closed','account-source-projection'),host=await mount(selected,{record:selected,sourceReader:reader});
 await download(host);await vi.waitFor(()=>expect(read).toHaveBeenCalledOnce());act(()=>root!.unmount());root=null;
 await act(async()=>{finish(null);});expect(env.files).toHaveLength(0);expect(env.downloads).toHaveLength(0);expect(env.fetcher).not.toHaveBeenCalled();
});
it.each(['mine','public','receipt'] as const)('carries the exact selected reader from the actual %s entry into Share and its Original action',async entry=>{
 const env=environment(),bytes=new Uint8Array(await readFile(process.cwd()+'/tests/fixtures/public-composer-original.receizbundle')),sha=createHash('sha256').update(bytes).digest('hex');
 const read=vi.fn(async()=>({bytes,filename:'entry-held-original.receizbundle'})),reader=createHeldLedgerOriginalReader({assertOpen(){},read}),selected=record(sha,'share-entry-'+entry,entry==='public'?'public-source-projection':'account-source-projection');
 env.fetcher.mockImplementation(async(input:unknown,init?:RequestInit)=>{
  if(String(input).startsWith('https://receiz.com/api/public/display-snapshots/')&&init?.method==='POST')return Response.json({ok:true,sha256:await receiptDigest(new TextEncoder().encode(String(init.body)))});
  throw Error('Only the existing explicit receipt snapshot may use transport');
 });
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 if(entry==='receipt'){
  vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
  openLedgerReceipt({button:0,preventDefault(){}} as never,receiptLink(selected)!,{record:selected,sourceReader:reader,value:{basis:'unavailable',amountUsdCents:null,pulse:null,considerationUsdCents:null}});
  await act(async()=>root!.render(<ReceiptView onBack={()=>{}}/>));
 }else{
  network.records=entry==='public'?[selected]:[];
  await act(async()=>root!.render(<Ledger initialTab={entry} active={false} sourceReader={reader} personalHistory={entry==='mine'?{records:[selected],available:true,completeAtSealedHead:true}:null}/>));
 }
 expect(read).not.toHaveBeenCalled();
 const share=[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.getAttribute('aria-label')?.startsWith('Share receipt'))!;
 await act(async()=>share.click());await vi.waitFor(()=>expect(document.querySelector('.receipt-share-panel')).not.toBeNull());expect(read).not.toHaveBeenCalled();expect(env.files).toHaveLength(0);
 await download(document.querySelector<HTMLElement>('.receipt-share-panel')!);await vi.waitFor(()=>expect(env.files).toHaveLength(1));
 expect(env.downloads).toEqual(['entry-held-original.receizbundle']);expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(bytes);
 expect(env.fetcher.mock.calls.every(([input])=>String(input).startsWith('https://receiz.com/api/public/display-snapshots/'))).toBe(true);
});

it.each(['transfer','native'] as const)('refuses the same digestless row with another %s Original locator before any selected source read',async locator=>{
 const env=environment(),read=vi.fn(async()=>null),reader=Object.assign(read,{assertOpen:vi.fn(),transferOriginal:vi.fn(async()=>null)});
 const selected:PublicRecord=locator==='transfer'?{...record('','same-transfer','account-source-projection'),source:'wallet',kind:'chat_transfer',evidence:{transferId:'f89f5736-4baf-46da-80f4-dc9213fbdff2'}}:{...record('','same-native','account-source-projection'),evidence:{},sourceUrl:'https://receiz.com/v/20261107_2109/62E2508A/15045683?a=62E2508A&ms=1794085740000'};
 const other=locator==='transfer'?{...selected,evidence:{transferId:'67213e66-3949-4704-a9f6-1b7c51528470'}}:{...selected,sourceUrl:selected.sourceUrl!.replace('15045683','15045684')};
 const host=await mount(selected,{record:other,sourceReader:reader});await download(host);
 await vi.waitFor(()=>expect(host.textContent).toContain('No display record was substituted'));expect(read).not.toHaveBeenCalled();expect(reader.transferOriginal).not.toHaveBeenCalled();expect(reader.assertOpen).not.toHaveBeenCalled();expect(env.fetcher).not.toHaveBeenCalled();expect(env.files).toHaveLength(0);
});
it('keeps the carried receipt link copyable after offline short-link failure and successful held Original download',async()=>{
 const original=await publicOriginal('offline-copy-after-original'),env=environment(),writeText=vi.fn(async(_value:string)=>{}),carriedLink=receiptLink(original.record)!;vi.stubGlobal('navigator',{clipboard:{writeText}});
 const host=await mount(original.record,{record:original.record},{carriedLink}),copy=host.querySelector<HTMLButtonElement>('[aria-label="Copy receipt link"]')!;
 await vi.waitFor(()=>expect(copy.textContent).toBe('Copy carried link'));expect(copy.disabled).toBe(false);
 await download(host);await vi.waitFor(()=>expect(env.files).toHaveLength(1));expect(copy.disabled).toBe(false);expect(copy.textContent).toBe('Copy carried link');
 await act(async()=>copy.click());expect(writeText).toHaveBeenCalledOnce();expect(writeText.mock.calls[0][0]).toContain('/receipt/');
 expect(new Uint8Array(await env.files[0].arrayBuffer())).toEqual(original.bytes);
});
