// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveAssets} from '../src/features/assets/LiveAssets';
import {parsePublicMarket} from '../src/receiz/public-market';
import {retainCurrencyPriceHistory} from '../src/receiz/currency-ledger-view';
import type {HeldDeposit} from '../src/receiz/deposit-source';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('updates owned rows and an open object with supplied live prices without rereading private sources',async()=>{
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'owned',receizId:'owned',title:'Owned moment',ownerUsername:'alice',valueUsd:10}]}}).items[0];
 const listDeposits=vi.fn(async()=>[]),identity={binding:{keyId:'synthetic-owner'},listDeposits} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 const render=(priceUsd:number,changePct:number)=>root.render(<LiveAssets identity={identity} active revision={0} showcase={[{...item,priceUsd,changePct}]} onOpen={()=>{}}/>);
 try{
  await act(async()=>render(10,1));expect(host.querySelector('.market-rows')?.textContent).toContain('$10.00');
  act(()=>(host.querySelector('.market-rows button')as HTMLButtonElement).click());
  expect(host.querySelector('dialog .asset-price')?.textContent).toContain('$10.00');
  await act(async()=>render(12.34,-2));
  expect(host.querySelector('.market-rows .negative')?.textContent).toBe('-2%');
  expect(host.querySelector('dialog .asset-price')?.textContent).toContain('$12.34');
  expect(listDeposits).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());host.remove();}
});


it('shows units and their dollar value from the newest held price without another read', async () => {
 const assetId='a'.repeat(64), at='2026-01-01T00:00:00.000Z';
 const asset:NonNullable<HeldDeposit['nativeAsset']>={
  assetId,symbol:'FIELD',quantityMicro:'12000000',lockedQuantityMicro:'0',supplyMicro:'50000000',
  backingRail:'reserve',backingUsdCents:'0',backingPhiMicro:'0',status:'active',
  sourceKaiUPulse:'2000101',issuedAtKaiUPulse:'2000101',
  currency:{policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'125'},availableQuantityMicro:'38000000',
   liquidityReserveUsdCents:'1500',liquidityReservePhiMicro:'1000000',liquiditySettlementPhiMicro:'0'},
 };
 const position:HeldDeposit={title:'Field credits',digest:'a'.repeat(64),filename:'field.receiz',status:'held-proof',kind:'proof',
  nativeAsset:asset,bytes:new Uint8Array([1]),pulse:'2'};
 const listDeposits=vi.fn(async()=>[]), identity={binding:{keyId:'synthetic-owner'},listDeposits} as unknown as OpenIdentity;
 const onOpen=vi.fn(), host=document.createElement('div'), root=createRoot(host);
 const network=vi.fn();
 vi.stubGlobal('fetch',network);
 const render=(sources:HeldDeposit[])=>root.render(<LiveAssets identity={identity} active revision={0}
   source={{sources,busy:false,error:''}} onOpen={onOpen}/>);
 const balance=()=>host.querySelector('#held-currencies-heading')?.closest('section')?.querySelector('.row-copy span');
 try {
  await act(async()=>render([]));
  expect(host.querySelector('#held-currencies-heading')).toBeNull();
  await act(async()=>render([position]));
  expect(balance()?.textContent).toBe('12 FIELD · $15.00');
  await act(async()=>retainCurrencyPriceHistory({id:'fixture',history:['initial'],artifact:'old'},new Map([
   [assetId+':FIELD',[{at,usdCents:'50',kaiUPulse:'2000100'}]],
  ])));
  expect(balance()?.textContent).toBe('12 FIELD · $15.00');
  await act(async()=>retainCurrencyPriceHistory({id:'fixture',history:['initial','successor'],artifact:'new'},new Map([
   [assetId+':FIELD',[{at,usdCents:'225',kaiUPulse:'2000102'}]],
   ['b'.repeat(64)+':FIELD',[{at,usdCents:'999',kaiUPulse:'2000103'}]],
  ])));
  expect(balance()?.textContent).toBe('12 FIELD · $27.00');
  expect(balance()?.getAttribute('title')).toBe('At $2.25 per FIELD');
  await act(async()=>render([{...position,nativeAsset:{...asset,sourceKaiUPulse:'2000103',
   currency:{...asset.currency!,policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'150'}}}}]));
  expect(balance()?.textContent).toBe('12 FIELD · $18.00');
  await act(async()=>balance()?.closest('button')?.click());
  expect(onOpen).toHaveBeenCalledWith({kind:'asset',assetId});
  expect(listDeposits).not.toHaveBeenCalled();
  expect(network).not.toHaveBeenCalled();
 } finally {
  await act(async()=>root.unmount());
  vi.unstubAllGlobals();
 }
});
