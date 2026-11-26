// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,expect,it,vi} from 'vitest';
import {LiveAssetDetail} from '../src/features/assets/LiveAssets';
import {LiveOwnership} from '../src/features/assets/LiveOwnership';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {PublicMarketItem} from '../src/receiz/public-market';
import type {BankOperationInput} from '../src/receiz/bank-operations';

const p=vi.hoisted(()=>({input:undefined as (()=>BankOperationInput)|undefined,inputKey:''}));
vi.mock('../src/features/account/NativeOperation',()=>({NativeOperation:(props:{input:()=>BankOperationInput;inputKey:string;children:unknown})=>{p.input=props.input;p.inputKey=props.inputKey;return props.children;}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const held=(digest:string,head:string,quantity='6000000'):HeldDeposit=>({digest:digest.repeat(64),executionDigest:head.repeat(64),filename:'position.receizbundle',title:'Native units',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'100',nativeAsset:{assetId:'c'.repeat(64),quantityMicro:quantity,lockedQuantityMicro:'0',supplyMicro:'10000000',symbol:'UNIT',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'1000000',status:'active',sourceKaiUPulse:'100000000',issuedAtKaiUPulse:'100000000'}});
beforeEach(()=>{p.input=undefined;p.inputKey='';});
it('uses the stable native ID for public trades so preparation can bind the current accepted head',async()=>{
 const host=document.createElement('div'),root=createRoot(host),identity={listDeposits:async()=>[]} as unknown as OpenIdentity;
 try{for(const mode of ['buy','sell'] as const){await act(async()=>root.render(<LiveOwnership identity={identity} mode={mode} nativeAssetId={'c'.repeat(64)} initialDigest={'d'.repeat(64)} onRefresh={()=>{}}/>));expect(p.input!()).toMatchObject({kind:mode==='buy'?'buy-shares':'sell-share',assetId:'c'.repeat(64)});expect(p.input!()).not.toHaveProperty('assetDigest');}}finally{await act(()=>root.unmount());}
});
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

it('opens Send ownership from held native positions while the shared read is pending',async()=>{
 const heldPosition=held('a','d','1200007');
 heldPosition.nativeAsset!.lockedQuantityMicro='4000000';
 const original={...held('b','f'),nativeAsset:undefined,executionDigest:undefined,title:'Whole proof'};
 const listDeposits=vi.fn(()=>new Promise<readonly HeldDeposit[]>(()=>{}));
 const identity={knownDeposits:()=>[heldPosition,original],listDeposits} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveOwnership identity={identity} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Native units');
  expect(host.textContent).not.toContain('Whole proof');
  const select=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Native units'))!;
  await act(async()=>select.click());
  expect(host.textContent).toContain('1.200007 UNIT available');
  expect(host.textContent).toContain('4 UNIT committed to offers');
  const set=(input:HTMLInputElement,value:string)=>{
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
   input.dispatchEvent(new Event('input',{bubbles:true}));
  };
  const recipient=host.querySelector<HTMLInputElement>('input[placeholder="Receiz ID or public username"]')!;
  await act(async()=>set(recipient,'@buyer'));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='All')!.click());
  expect(p.input!()).toEqual({kind:'send-ownership',assetDigest:'d'.repeat(64),quantityMicro:'1200007',recipient:'@buyer'});
  const amount=host.querySelector<HTMLInputElement>('input[aria-label="Ownership to send"]')!;
  await act(async()=>set(amount,'1.200008'));
  expect(()=>p.input!()).toThrow('Enter a quantity within your available units.');
  expect(listDeposits).toHaveBeenCalledOnce();
 }finally{await act(async()=>root.unmount());}
});

it('sends a known Market share from its amount and recipient form without opening Vault or rereading holdings',async()=>{
 const position={id:'market-position',marketItemId:'asset:market-original',title:'Market Original',shareQuantityMicro:'1500000',lastPriceUsdCents:'250'};
 const review={quantityMicro:'1500000',recipient:'buyer.receiz.id',title:position.title};
 const prepare=vi.fn(async()=>review),execute=vi.fn(async()=>({...review,status:'committed'})),onRefresh=vi.fn();
 const marketPortfolio=vi.fn(),vaults=vi.fn();
 const identity={
  binding:{artifactSha256:'d'.repeat(64)},listDeposits:async()=>[],
  knownMarketPortfolio:()=>({positions:[position]}),marketPortfolio,vaults,
  ownershipShares:async()=>({prepare,execute,pending:async()=>null}),
 } as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 const button=(label:string)=>[...host.querySelectorAll('button')].find(node=>node.textContent===label)!;
 try{
  await act(async()=>root.render(<LiveOwnership identity={identity} onRefresh={onRefresh}/>));
  const selected=[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Market Original'))!;
  expect(selected.textContent).toContain('1.5 Market shares');
  await act(async()=>{selected.click();await vi.dynamicImportSettled();});
  expect(host.querySelector('[aria-label="Shares to send"]')).not.toBeNull();
  const input=host.querySelector<HTMLInputElement>('[role="combobox"]')!;
  await act(async()=>{
   button('All').click();
   Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'@buyer');
   input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  expect(host.textContent).toContain('$3.75');
  await act(async()=>button('Review send').click());
  expect(prepare).toHaveBeenCalledExactlyOnceWith({positionId:position.id,marketItemId:position.marketItemId,quantityMicro:'1500000',recipient:'@buyer'});
  expect(execute).not.toHaveBeenCalled();
  await act(async()=>button('Send shares').click());
  expect(execute).toHaveBeenCalledExactlyOnceWith(review);
  expect(host.textContent).toContain('Shares sent.');
  expect(onRefresh).toHaveBeenCalledOnce();
  expect(vaults).not.toHaveBeenCalled();
  expect(marketPortfolio).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());}
});

it('lists a Showcase-only Original without waiting for a network read and suppresses fully transferred Originals',async()=>{
 const showcase=[
  {id:'public-1',title:'Showcase proof',originalDigest:'b'.repeat(64),admittedOwnerUserId:'owner'},
  {id:'public-2',title:'Transferred proof',originalDigest:'c'.repeat(64),admittedOwnerUserId:'owner'},
  {id:'public-3',title:'A different owner',originalDigest:'d'.repeat(64),admittedOwnerUserId:'someone-else'},
 ] as PublicMarketItem[];
 const listDeposits=vi.fn(async()=>[]),readHeldDeposits=vi.fn(async()=>[]);
 const identity={walletReceivingAddress:()=> 'owner',listDeposits,readHeldDeposits, originalPieces:async()=>({
  list:async()=>[{originalSha256:'c'.repeat(64),ownedBytes:0}],
 })} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 const fetch=vi.spyOn(globalThis,'fetch');
 try {
  await act(async()=>root.render(<LiveOwnership identity={identity} showcase={showcase} onRefresh={()=>{}}/>));
  expect(host.textContent).toContain('Showcase proof');
  expect(host.textContent).not.toContain('Transferred proof');
  expect(host.textContent).not.toContain('A different owner');
  expect(fetch).not.toHaveBeenCalled();
  expect(listDeposits).not.toHaveBeenCalled();
  expect(readHeldDeposits).toHaveBeenCalledOnce();
 } finally {fetch.mockRestore();await act(async()=>root.unmount());}
});
