// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import { LiveOwnership } from '../src/features/assets/LiveOwnership';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { BankOperationInput } from '../src/receiz/bank-operations';
import type { AssetComposerDraft } from '../src/receiz/asset-composer';
import type { HeldDeposit } from '../src/receiz/deposit-source';

const review=vi.hoisted(()=>({input:undefined as (()=>BankOperationInput)|undefined,operations:undefined as (()=>Promise<unknown>)|undefined}));
vi.mock('../src/features/account/NativeOperation',()=>({NativeOperation:(props:{input:()=>BankOperationInput;operations?:()=>Promise<unknown>;children:React.ReactNode})=>{
 review.input=props.input;review.operations=props.operations;return props.children;
}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function enter(host:HTMLElement,label:string,value:string) {
 const field=[...host.querySelectorAll('label')].find(element=>element.textContent?.startsWith(label))?.querySelector('input');
 expect(field).toBeDefined();
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);
 field!.dispatchEvent(new Event('input',{bubbles:true}));
}

it('opens currency issue from Add and stages an authored draft with the selected terms',async()=>{
 const host=document.createElement('div'),root=createRoot(host),operations=vi.fn((draft:AssetComposerDraft)=>({draft}));
 const identity={backedAssetPublication:async()=>({operations})} as unknown as OpenIdentity;
 try {
  await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));
  const issue=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Issue a currency'))!;
  await act(async()=>{issue.click();await vi.dynamicImportSettled();});
  await act(async()=>{
   enter(host,'Name','Field credit');
   enter(host,'Currency code','FIELD');
   enter(host,'Supply cap','10');
   enter(host,'Purchase price per unit','0.25');
  });
  const selected=review.input?.();
  expect(selected).toMatchObject({kind:'issue-currency',definition:{name:'Field credit',symbol:'FIELD',units:'10'},policy:{priceUsdCentsPerUnit:'25'}});
  await review.operations?.();
  expect(operations).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({title:'Field credit',definition:expect.objectContaining({units:'10'})}));
 } finally {await act(async()=>root.unmount());}
});

it('uses one available balance when purchasing a public currency by stable asset ID',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 const identity={listDeposits:async()=>[]} as unknown as OpenIdentity, id='a'.repeat(64);
 try {
  await act(async()=>root.render(<LiveOwnership identity={identity} mode="buy" nativeAssetId={id} initialDigest={'b'.repeat(64)}
    publicCurrency={{symbol:'FIELD',priceUsdCentsPerUnit:'25',supplyMicro:'10000000'}} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Purchase whole units at $0.25 each from your available balance.');
  expect(host.querySelector('select')).toBeNull();
  expect(review.input?.()).toEqual({kind:'buy-currency',assetId:id,quantityMicro:'1000000'});
 } finally {await act(async()=>root.unmount());}
});

it('sends whole currency units from the held source while preserving the Market share picker',async()=>{
 const host=document.createElement('div'),root=createRoot(host),assetId='a'.repeat(64),head='b'.repeat(64);
 const held:HeldDeposit={digest:'c'.repeat(64),executionDigest:head,filename:'field.receizbundle',title:'Field credit',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'100',
  nativeAsset:{assetId,quantityMicro:'2000000',lockedQuantityMicro:'0',supplyMicro:'10000000',symbol:'FIELD',backingRail:'reserve',backingUsdCents:'0',backingPhiMicro:'0',status:'active',sourceKaiUPulse:'100000000',issuedAtKaiUPulse:'100000000',
   currency:{policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'25'},availableQuantityMicro:'8000000',liquidityReserveUsdCents:'50',liquidityReservePhiMicro:'200000',liquiditySettlementPhiMicro:'0'}}};
 const marketPortfolio=vi.fn();
 const identity={binding:{artifactSha256:'d'.repeat(64)},knownDeposits:()=>[held],listDeposits:async()=>[held],
  knownMarketPortfolio:()=>({positions:[{id:'position',marketItemId:'asset:held',title:'Held Market share',shareQuantityMicro:'1000000'}]}),marketPortfolio,vaults:async()=>({list:async()=>[]})} as unknown as OpenIdentity;
 const click=(label:string)=>act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(label))!.click());
 try{
  await act(async()=>root.render(<LiveOwnership identity={identity} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Held Market share');
  await click('Currencies');
  expect(host.textContent).not.toContain('Held Market share');
  await click('Field credit');
  const recipient=host.querySelector<HTMLInputElement>('input[placeholder="Receiz ID or public username"]')!;
  const amount=host.querySelector<HTMLInputElement>('input[aria-label="Whole units to send"]')!;
  await act(async()=>{
   const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
   set.call(recipient,'@receiver');recipient.dispatchEvent(new Event('input',{bubbles:true}));
   set.call(amount,'1.5');amount.dispatchEvent(new Event('input',{bubbles:true}));
  });
  expect(()=>review.input?.()).toThrow('Enter a positive whole number of units.');
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='All')!.click());
  expect(review.input?.()).toEqual({kind:'send-ownership',assetDigest:head,quantityMicro:'2000000',recipient:'@receiver'});
  expect(marketPortfolio).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());}
});
