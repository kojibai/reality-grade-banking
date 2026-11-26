// @vitest-environment happy-dom
import {act, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {CurrencyPlacement} from '../src/features/market/CurrencyPlacement';
import {VenuePricingFields, emptyVenuePricingTerms} from '../src/features/voting/VenuePricingFields';
import {createBankOperations, type BankOperationInput} from '../src/receiz/bank-operations';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {inspectNativeCurrencyServicePricingTerms} from '../native/receiz/app/lib/wallet/bankNotes/nativeCurrencyServicePricing';
import {preparePlacementOffer} from '../src/receiz/native-service-placement';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

const schema='receiz.bank.currency-placement-schedule.v1';
const assetId='a'.repeat(64), assetDigest='b'.repeat(64);
const originalId='44444444-4444-4444-8444-444444444444';
const slot={
  venueId:'community-hall', startKaiUPulse:'18500000000000', endKaiUPulse:'18500100000000',
  quantityMicro:'100000', pulsesPerUnit:'1000', quantityIncrementMicro:'1000',
};
const schedule={schema,assetId,assetDigest,originals:[{id:originalId,title:'Public Original'}],slots:[slot],bookings:[]};
const preview={
  venueId:slot.venueId, startKaiUPulse:slot.startKaiUPulse, endKaiUPulse:'18500001000000',
  quantityMicro:'1000', pulsesPerUnit:slot.pulsesPerUnit, quantityIncrementMicro:'1000',
};
const offer={assetDigest,placement:{
  kind:'reserve-service-placement' as const, charterEvidenceSha256:'c'.repeat(64),
  terms:{
    venueId:slot.venueId,startKaiUPulse:slot.startKaiUPulse,endKaiUPulse:'18500001000000',quantityMicro:'1000',pulsesPerUnit:slot.pulsesPerUnit,
    assetId,originalId,bookingId:'66666666-6666-4666-8666-666666666666',ownerAccountId:'55555555-5555-4555-8555-555555555555',
    originalSourceSha256:'d'.repeat(64),showcaseHeadSha256:'e'.repeat(64),placementSha256:'f'.repeat(64),
    policySha256:'c'.repeat(64),inventorySha256:'d'.repeat(64),slotIndex:'0',holdUntilKaiUPulse:'18500000500000',
  },
}};

function changeInput(input:HTMLInputElement, value:string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
}
function choose(select:HTMLSelectElement, value:string) {
  select.value=value;
  select.dispatchEvent(new Event('change',{bubbles:true}));
}

it('previews a fractional spend immediately and reviews the same interval without signing',async()=>{
  const host=document.createElement('div'), root=createRoot(host);
  let available=schedule;
  const currencyGovernance=vi.fn(async (request:Record<string,unknown>)=>request.action==='list'?available:offer);
  const prepare=vi.fn(async (request:BankOperationInput)=>({
    request:{...request,schema:'bankeiz.operation-request.v1' as const,applicationId:'bankeiz',requestId:'placement',actorReceizId:'owner.receiz.id'},confirmationDigest:'e'.repeat(64),terms:{
      debitUsdCents:'0',debitPhiMicro:'0',creditUsdCents:'0',creditPhiMicro:'0',feeUsdCents:'0',
      quantityMicro:'1000',assetDigest,recipient:null,expiresAtKaiUPulse:18500000500000,
    },
  }));
  const execute=vi.fn(),discard=vi.fn();
  const operations=createBankOperations({
    ownerReceizId:'owner.receiz.id',assertOpen:()=>{},store:{load:async()=>null,saveNew:vi.fn(),replace:vi.fn()},
    assets:{prepare,execute,discard},context:vi.fn(),lock:async operation=>operation(),
  });
  const identity={currencyGovernance,operations:async()=>operations} as unknown as OpenIdentity;
  const reviewButton=()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Review placement booking'));
  try {
    await act(async()=>root.render(<CurrencyPlacement identity={identity} assetId={assetId} symbol="HALL" onRefresh={vi.fn()}/>));
    await act(async()=>{
      const [original,window]=host.querySelectorAll('select');
      choose(original,originalId);
      choose(window,'0');
    });
    const input=host.querySelector<HTMLInputElement>('[aria-label="Credits to spend"]');
    expect(input).not.toBeNull();
    expect(host.textContent).toContain('1000 Kai pulses');
    await act(async()=>changeInput(input!,'.001'));
    expect(host.textContent).toContain('1 Kai pulse');
    expect(host.textContent).toContain('0.001 HALL will be held');
    expect(currencyGovernance).toHaveBeenCalledTimes(1);
    await act(async()=>reviewButton()!.click());
    expect(currencyGovernance).toHaveBeenNthCalledWith(2,{schema,action:'prepare-offer',assetId,originalId,
      venueId:slot.venueId,startKaiUPulse:slot.startKaiUPulse,quantityMicro:'1000'});
    expect(prepare).toHaveBeenCalledWith({kind:'book-currency-service',...offer});
    expect(host.querySelector('.native-operation-review')?.textContent).toContain('1 Kai pulse');
    expect(execute).not.toHaveBeenCalled();

    await act(async()=>changeInput(input!,'.002'));
    expect(discard).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.native-operation-review')).toBeNull();
    expect(host.textContent).toContain('2 Kai pulses');
    expect(currencyGovernance).toHaveBeenCalledTimes(2);
    await act(async()=>changeInput(input!,'.0015'));
    expect(reviewButton()).toBeUndefined();
    expect(host.textContent).toContain('increments of 0.001');
    await act(async()=>changeInput(input!,'.101'));
    expect(reviewButton()).toBeUndefined();
    expect(host.textContent).toContain('0.1 HALL');
    expect(execute).not.toHaveBeenCalled();

    available={...schedule,assetDigest:'f'.repeat(64),slots:[{...slot,pulsesPerUnit:'2000',quantityMicro:'50000'}]};
    await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Refresh availability')!.click());
    expect(currencyGovernance).toHaveBeenCalledTimes(3);
    await act(async()=>choose(host.querySelectorAll('select')[1],'0'));
    const refreshed=host.querySelector<HTMLInputElement>('[aria-label="Credits to spend"]')!;
    await act(async()=>changeInput(refreshed,'.001'));
    expect(host.textContent).toContain('2000 Kai pulses');
    expect(host.textContent).toContain('Placement duration · 2 Kai pulses');
    expect(currencyGovernance).toHaveBeenCalledTimes(3);

    currencyGovernance.mockRejectedValueOnce(new Error('temporarily unavailable'));
    await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Refresh availability')!.click());
    expect(host.textContent).toContain('Could not refresh placement availability.');
    expect(host.textContent).toContain('Public Original');
    await act(async()=>choose(host.querySelectorAll('select')[1],'0'));
    expect(host.textContent).toContain('Placement duration · 2 Kai pulses');
    expect(currencyGovernance).toHaveBeenCalledTimes(4);
  } finally { await act(async()=>root.unmount()); }
});

it('does not expose a previous account’s placement data while the new account loads',async()=>{
  const host=document.createElement('div'),root=createRoot(host);
  const identity={currencyGovernance:async()=>schedule} as unknown as OpenIdentity;
  const next={currencyGovernance:vi.fn(()=>new Promise(()=>{}))} as unknown as OpenIdentity;
  const render=(owner:OpenIdentity)=><CurrencyPlacement identity={owner} assetId={assetId} symbol="HALL" onRefresh={vi.fn()}/>;
  try {
    await act(async()=>root.render(render(identity)));
    expect(host.textContent).toContain('Public Original');
    await act(async()=>root.render(render(next)));
    expect(host.textContent).not.toContain('Public Original');
    expect(host.querySelector('[role="status"][aria-label="Checking available placements"]')).not.toBeNull();
  } finally { await act(async()=>root.unmount()); }
});

it.each([
  ['asset digest', { ...offer, assetDigest:'f'.repeat(64) }],
  ['end', {...offer,placement:{...offer.placement,terms:{...offer.placement.terms,endKaiUPulse:'18500001000001'}}}],
  ['start', {...offer,placement:{...offer.placement,terms:{...offer.placement.terms,startKaiUPulse:'18500000000001'}}}],
  ['venue', {...offer,placement:{...offer.placement,terms:{...offer.placement.terms,venueId:'different-hall'}}}],
  ['credits', {...offer,placement:{...offer.placement,terms:{...offer.placement.terms,quantityMicro:'1001'}}}],
  ['rate', {...offer,placement:{...offer.placement,terms:{...offer.placement.terms,pulsesPerUnit:'1001'}}}],
])('refuses a prepared placement with a different %s', async (_field, response) => {
  const identity={currencyGovernance:async()=>response} as unknown as OpenIdentity;
  await expect(preparePlacementOffer(identity,assetId,originalId,preview,assetDigest)).rejects.toThrow('PLACEMENT_SOURCE_INVALID');
});

it('authors fixed and live placement durations in the existing venue terms',async()=>{
  const host=document.createElement('div'),root=createRoot(host);
  let change=emptyVenuePricingTerms;
  function Editor() {
    const [value,setValue]=useState(emptyVenuePricingTerms);
    return <VenuePricingFields value={value} onChange={next=>{change=next;setValue(next);}}/>;
  }
  const field=(label:string)=>[...host.querySelectorAll('label')].find(item=>item.textContent===label)?.querySelector('input');
  try {
    await act(async()=>root.render(<Editor/>));
    const mode=host.querySelector('select');
    expect(mode?.value).toBe('slots');
    await act(async()=>choose(mode!,'fixed'));
    await act(async()=>changeInput(field('Kai pulses per credit')!,'2000'));
    expect(change).toMatchObject({placementDuration:{pulsesPerUnit:'2000'}});
    await act(async()=>choose(mode!,'live'));
    await act(async()=>{
      changeInput(field('Reference impressions')!,'5000');
      changeInput(field('Minimum Kai pulses per credit')!,'500');
      changeInput(field('Maximum Kai pulses per credit')!,'4000');
    });
    const inspected=inspectNativeCurrencyServicePricingTerms({...change,venues:[
      {id:'community-hall',observerReceizId:'observer.receiz.id',dailyEligibleViewsLimit:'1000'},
    ]});
    expect(inspected.placementDuration).toEqual({pulsesPerUnit:'2000',live:{
      referenceImpressions:'5000',minimumPulsesPerUnit:'500',maximumPulsesPerUnit:'4000',
    }});
    await act(async()=>choose(mode!,'slots'));
    expect(change).toEqual(emptyVenuePricingTerms);
  } finally { await act(async()=>root.unmount()); }
});
