// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CurrencyPlacement} from '../src/features/market/CurrencyPlacement';
import {preparePlacementOffer} from '../src/receiz/native-service-placement';
import type {OpenIdentity} from '../src/receiz/native-identity';

vi.mock('../src/features/account/NativeOperation',()=>({NativeOperation:({children,input,onResult,reviewDetails}: {
 children:React.ReactNode;input():Promise<unknown>;onResult(result:{status:string}):void;reviewDetails:React.ReactNode;
})=><>{children}{reviewDetails}<button onClick={()=>void input().then(()=>onResult({status:'committed'}))}>Review service</button></>}));

const assetId='a'.repeat(64),assetDigest='b'.repeat(64),originalId='44444444-4444-4444-8444-444444444444';
const bookingId='66666666-6666-4666-8666-666666666666',ownerAccountId='55555555-5555-4555-8555-555555555555';
const slot={venueId:'bankeiz-discover',startKaiUPulse:'18500000000000',endKaiUPulse:'18517491270421',quantityMicro:'100000000'};
const placement={kind:'reserve-service-placement',charterEvidenceSha256:'c'.repeat(64),terms:{...slot,bookingId,originalId,
 assetId,ownerAccountId,originalSourceSha256:'d'.repeat(64),showcaseHeadSha256:'e'.repeat(64),placementSha256:'f'.repeat(64),
 policySha256:'c'.repeat(64),inventorySha256:'d'.repeat(64),slotIndex:'0',holdUntilKaiUPulse:'18502000000000'}};
const schedule={schema:'receiz.bank.currency-placement-schedule.v1',assetId,assetDigest,originals:[{id:originalId,title:'Public Original'}],slots:[slot],bookings:[]};

it('loads the schedule on entry to the booking panel and reviews the exact Original, time and credits',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.createElement('div'),root=createRoot(host);
 const currencyGovernance=vi.fn(async (request:Record<string,unknown>)=>request.action==='list'?schedule:{assetDigest,placement});
 const identity={currencyGovernance} as unknown as OpenIdentity;
 try{
  expect(currencyGovernance).not.toHaveBeenCalled();
  await act(async()=>root.render(<CurrencyPlacement identity={identity} assetId={assetId} symbol="SPT" onRefresh={()=>{}}/>));
  expect(currencyGovernance).toHaveBeenCalledOnce();
  await act(async()=>{
   const [original,window]=host.querySelectorAll('select');
   original.value=originalId;original.dispatchEvent(new Event('change',{bubbles:true}));
   window.value='0';window.dispatchEvent(new Event('change',{bubbles:true}));
  });
  expect(host.textContent).toContain('100 SPT');
  expect(host.textContent).toContain('Public Original');
  await act(async()=>host.querySelector('button')!.click());
  expect(currencyGovernance).toHaveBeenNthCalledWith(2,{schema:schedule.schema,assetId,action:'prepare-offer',originalId,
    venueId:slot.venueId,startKaiUPulse:slot.startKaiUPulse});
  expect(host.textContent).toContain('Your placement is reserved.');
 }finally{await act(async()=>root.unmount());}
});

it('refuses an offer that changes the selected credits before opening native review',async()=>{
 const identity={currencyGovernance:async()=>({assetDigest,placement:{...placement,terms:{...placement.terms,quantityMicro:'101000000'}}})} as unknown as OpenIdentity;
 await expect(preparePlacementOffer(identity,assetId,originalId,slot)).rejects.toThrow('PLACEMENT_SOURCE_INVALID');
});
