// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CurrencyPlacement} from '../src/features/market/CurrencyPlacement';
import {preparePlacementOffer} from '../src/receiz/native-service-placement';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {Discover} from '../src/public-discover/Discover';
import {publishDiscoveredPublicCatalog} from '../src/receiz/asset-publication-adoption';
import {parsePublicMarket} from '../src/receiz/public-market';
import {createHeldPublicMarketInput} from '../src/receiz/public-market-held-catalog';
import {marketUPulseTime} from '../src/receiz/market-projection/coordinates';

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
 await expect(preparePlacementOffer(identity,assetId,originalId,slot,assetDigest)).rejects.toThrow('PLACEMENT_SOURCE_INVALID');
});

it('takes an active Spotlight reservation and its removal from the existing selected membership',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.createElement('div'),root=createRoot(host);
 const now=vi.spyOn(Date,'now').mockReturnValue(marketUPulseTime(slot.startKaiUPulse)+100);
 const fetcher=vi.fn(()=>Promise.reject(Error('Unexpected request while displaying held membership')));
 vi.stubGlobal('fetch',fetcher);
 const originalSha256='d'.repeat(64);
 const display=[{id:'public-original',receizId:originalId,title:'Public Original',
  profileOriginal:{media:{originalDownloadSha256Hex:originalSha256}}}];
 const catalog=(sequence:string,spotlight:unknown)=>parsePublicMarket({ok:true,transport:{publicOriginals:display,spotlight,
  publicMembership:{version:1,source:'canonical-complete',scope:'whole-market-visible-showcase',isComplete:true,itemCount:1,
   revision:sequence.repeat(64),selection:{provider:'e'.repeat(64),sequence:sequence.padStart(20,'0')}}}});
 const scheduled=catalog('2',[{id:bookingId,venueId:slot.venueId,originalSha256,
  startKaiUPulse:slot.startKaiUPulse,endKaiUPulse:slot.endKaiUPulse,status:'reserved'}]);
 try{
  expect(scheduled.spotlight).toHaveLength(1);
  expect(createHeldPublicMarketInput(scheduled)?.catalog.spotlight).toEqual(scheduled.spotlight);
  await act(async()=>root.render(<Discover seed={scheduled.items} active={false}/>));
  expect(host.querySelector('[aria-label="Spotlight"]')).toBeNull();
  await act(async()=>{expect(publishDiscoveredPublicCatalog(scheduled)).toBe(true);});
  expect(host.querySelector('[aria-label="Spotlight"]')?.textContent).toContain('Public Original');
  const served=host.querySelector('[aria-label="Spotlight"] [data-spotlight-booking]');
  expect(served?.getAttribute('data-spotlight-booking')).toBe(bookingId);
  expect(served?.getAttribute('data-spotlight-original')).toBe(originalSha256);
  expect(host.querySelectorAll('[aria-label="Open Public Original"]')).toHaveLength(1);
  await act(async()=>{expect(publishDiscoveredPublicCatalog(catalog('3',[]))).toBe(true);});
  expect(host.querySelector('[aria-label="Spotlight"]')).toBeNull();
  expect(host.querySelector('[data-spotlight-booking]')).toBeNull();
  expect(host.querySelectorAll('[aria-label="Open Public Original"]')).toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());now.mockRestore();vi.unstubAllGlobals();}
});
