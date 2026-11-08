// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFile} from 'node:fs/promises';
import {File as NodeFile,Blob as NodeBlob} from 'node:buffer';
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {verifyReceizArtifact} from '@receiz/sdk';
import {Ledger} from '../src/features/ledger/Ledger';
import type {HeldLedgerOriginalReader} from '../src/receiz/held-ledger-original';
import type {PublicRecord} from '../src/receiz/public-network';
const network=vi.hoisted(()=>({records:[] as PublicRecord[]}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:network.records,sources:{},bootstrap:false,capturedAt:null,refresh:()=>{},loadMore:()=>{}})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{network.records=[];vi.restoreAllMocks();vi.unstubAllGlobals();});
it.each(['mine','public'] as const)('downloads the exact retained Original through the actual %s Ledger row without an opening read',async tab=>{
 vi.stubGlobal('File',NodeFile);vi.stubGlobal('Blob',NodeBlob);
 // The DOM test hosts the unchanged installed crypto runtime explicitly; it
 // cannot load browser script URLs. No verifier or proof result is mocked.
 const cryptoRuntime=await import('snarkjs');(window as unknown as {snarkjs:unknown}).snarkjs=cryptoRuntime;
 const bytes=new Uint8Array(await readFile(process.cwd()+'/tests/fixtures/public-composer-original.receizbundle')),digest=createHash('sha256').update(bytes).digest('hex');
 const file=new File([bytes],'asset-content.receized.receizbundle',{type:'application/vnd.receiz.bundle+json'}),reader=vi.fn(async selected=>{expect(selected).toBe(digest);return file;}) as unknown as HeldLedgerOriginalReader;
 const record:PublicRecord={id:`proofs:handoff-${tab}`,sourceId:`handoff-${tab}`,source:'proofs',kind:'proof recorded',title:'Existing sealed Original',detail:'',time:'2026-11-07T13:20:35.856Z',actor:null,amountUsdCents:null,kaiUpulse:null,pulse:'15036873',sourceUrl:null,evidence:{artifactDigest:digest},details:{},authority:tab==='mine'?'account-source-projection':'public-source-projection'};
 network.records=tab==='public'?[record]:[];
 const host=document.createElement('div'),root=createRoot(host),files:File[]=[],fetcher=vi.fn(()=>{throw Error('No network for a held Original');});vi.stubGlobal('fetch',fetcher);
 vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{files.push(value as File);return'blob:downloaded-original';});vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 try{
  await act(async()=>root.render(<Ledger initialTab={tab} active={false} sourceReader={reader} personalHistory={tab==='mine'?{records:[record],available:true,completeAtSealedHead:true}:null}/>));
  expect(reader).not.toHaveBeenCalled();await act(async()=>host.querySelector<HTMLButtonElement>('.ledger-row-main .asset-row')!.click());expect(reader).not.toHaveBeenCalled();
  await act(async()=>{host.querySelector<HTMLButtonElement>('.ledger-inspector-links [aria-label="Download original proof"]')!.click();await vi.waitFor(()=>expect(files).toHaveLength(1));});
  expect(files).toHaveLength(1);expect(files[0].name).toBe('asset-content.receized.receizbundle');expect(new Uint8Array(await files[0].arrayBuffer())).toEqual(bytes);expect(host.textContent).toContain('Retained Original downloaded');
  expect((await verifyReceizArtifact(new Uint8Array(await files[0].arrayBuffer()))).status).toBe('verified-artifact');expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('passes the selected transfer reader to My history instead of refusing before the reader',async()=>{
 const id='f89f5736-4baf-46da-80f4-dc9213fbdff2',record:PublicRecord={id:'wallet:transfer:'+id,sourceId:'transfer:'+id,source:'wallet',kind:'chat_transfer',title:'Money sent',detail:'',time:null,actor:null,amountUsdCents:'10000000',kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{transferId:id},details:{},authority:'account-source-projection'};
 const transferOriginal=vi.fn(async selected=>{expect(selected.sourceId).toBe(record.sourceId);throw Error('SELECTED_READER_REACHED');}),reader=Object.assign(vi.fn(),{transferOriginal}),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<Ledger initialTab="mine" active={false} sourceReader={reader} personalHistory={{records:[record],available:true,completeAtSealedHead:true}}/>));expect(transferOriginal).not.toHaveBeenCalled();await act(async()=>host.querySelector<HTMLButtonElement>('.ledger-row-main .asset-row')!.click());await act(async()=>host.querySelector<HTMLButtonElement>('.ledger-inspector-links [aria-label="Download original proof"]')!.click());expect(transferOriginal).toHaveBeenCalledOnce();expect(host.textContent).not.toContain('not attached');}finally{act(()=>root.unmount());}
});
