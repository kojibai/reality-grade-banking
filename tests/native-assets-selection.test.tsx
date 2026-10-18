// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,expect,it,vi} from 'vitest';
import {LiveAssetDetail} from '../src/features/assets/LiveAssets';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {BankOperationInput} from '../src/receiz/bank-operations';

const p=vi.hoisted(()=>({input:undefined as (()=>BankOperationInput)|undefined,inputKey:''}));
vi.mock('../src/features/account/NativeOperation',()=>({NativeOperation:(props:{input:()=>BankOperationInput;inputKey:string;children:unknown})=>{p.input=props.input;p.inputKey=props.inputKey;return props.children;}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const held=(digest:string,head:string,quantity='6000000'):HeldDeposit=>({digest:digest.repeat(64),executionDigest:head.repeat(64),filename:'position.receizbundle',title:'Native units',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'100',nativeAsset:{assetId:'c'.repeat(64),quantityMicro:quantity,lockedQuantityMicro:'0',supplyMicro:'10000000',symbol:'UNIT',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'1000000',status:'active',sourceKaiUPulse:'100000000',issuedAtKaiUPulse:'100000000'}});
beforeEach(()=>{p.input=undefined;p.inputKey='';});
async function renderDetail(run:(host:HTMLDivElement,set:(source:HeldDeposit)=>Promise<void>)=>Promise<void>){
 let source=held('a','d');const host=document.createElement('div'),root=createRoot(host),identity={binding:{artifactOwnerReceizId:'sender.receiz.id'},listDeposits:async()=>[source]} as unknown as OpenIdentity;
 try{await act(async()=>root.render(<LiveAssetDetail identity={identity} digest={source.nativeAsset!.assetId}/>));await run(host,async next=>{source=next;await act(async()=>{dispatchEvent(new Event('bankeiz:asset-sources'));});});}finally{await act(async()=>root.unmount());}
}
it('keeps an open asset selected by native asset ID when a refreshed certificate changes its digest',async()=>{
 await renderDetail(async(host,set)=>{
  expect(host.textContent).toContain('6 UNIT');await set(held('b','e','5000000'));
  expect(host.textContent).toContain('5 UNIT');expect(host.textContent).not.toContain('This original source is not held');
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Send ownership')!.click();});
  const input=p.input!();expect(input).toMatchObject({kind:'send-ownership',assetDigest:'e'.repeat(64)});
 });
});
it('keeps the ownership modal mapped to the latest exact execution source after certificate refresh',async()=>{
 await renderDetail(async(host,set)=>{
  await act(async()=>{[...host.querySelectorAll('button')].find(button=>button.textContent==='Send ownership')!.click();});
  expect(p.input!()).toMatchObject({assetDigest:'d'.repeat(64)});const beforeKey=p.inputKey;await set(held('b','e','5000000'));
  expect(p.input!()).toMatchObject({assetDigest:'e'.repeat(64)});
  expect(p.inputKey).not.toBe(beforeKey);
 });
});
