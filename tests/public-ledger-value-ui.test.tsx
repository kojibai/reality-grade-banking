// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {parsePublicNetworkPage,PUBLIC_SOURCES} from '../src/receiz/public-network';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {indexLedgerValues,ledgerValueForRecord} from '../src/receiz/ledger-value';
import {ledgerCurrentAssetValue,ledgerValuationContext} from '../src/receiz/ledger-economy';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import {ledgerAssetPeriods} from '../src/receiz/ledger-asset-history';
const held=vi.hoisted(()=>({ledger:{} as Record<string,unknown>,values:null as unknown}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>held.ledger}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>held.values}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
it('opens an object from its amount and shows the existing Market chart and an inline change without another request',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const source=parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'))),row=source.valueRows[0];
 held.values=indexLedgerValues(source);
 const records=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:row.marketItem!.id,receizId:row.seed,title:'A sealed moment',pulse:String(row.marketItem!.livePulseSeed!.claimPulse),valueUsd:12077.03}]}}).records;
 held.ledger={records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',complete:true,busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh:()=>{},loadMore:()=>{}};
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicLedgerApp/>));
  const amount=host.querySelector<HTMLButtonElement>('.public-ledger-amount-toggle');
  expect(amount).not.toBeNull();expect(amount!.getAttribute('aria-expanded')).toBe('false');
  expect(amount!.querySelector('.ledger-value-change')?.textContent).toContain('%');
  expect(amount!.querySelector('svg.public-ledger-chevron')).not.toBeNull();
  await act(async()=>amount!.click());
  expect(amount!.getAttribute('aria-expanded')).toBe('true');
  const chart=host.querySelector('.ledger-asset-chart svg[role="img"]');
  expect(chart?.getAttribute('aria-label')).toContain('Public object projected value');
  expect(chart?.getAttribute('data-range-end')).not.toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  await act(async()=>amount!.click());expect(host.querySelector('.ledger-inspector')).toBeNull();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
it('keeps a public proof’s carried Market operands when that object is absent from the priced index',()=>{
 const source=parseMarketCapSource(JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'))),row=source.valueRows[0],seed=row.marketItem!.livePulseSeed!;
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:row.marketItem!.id,receizId:row.seed,title:'A carried proof',pulse:String(seed.claimPulse),livePulseSeed:seed,valueUsd:12077.03}]}}).records[0];
 const values=indexLedgerValues({...source,valueRows:[]});
 const periods=ledgerAssetPeriods(record,values);
 expect(periods?.ALL.at(-1)).toMatchObject({pulse:14647306,usdCents:'1477588'});
 expect(ledgerAssetPeriods(record,values)).toBe(periods);
 expect(ledgerValueForRecord(record,values)).toMatchObject({amountUsdCents:'1477588',basis:'intrinsic-model'});
 expect(ledgerValuationContext(record,values)?.seed).toMatchObject({claimPulse:11131738,beat:15,stepIndex:0});
 const portable={...record,valueOperands:readReceiptLink(receiptLink(record)!).valueOperands};
 expect(ledgerAssetPeriods(portable,values)?.ALL.at(-1)?.usdCents).toBe('1477588');
 const transfer={...record,source:'actions' as const,sourceId:'transfer',kind:'proof_transfer',pulse:'12000000'};
 expect(ledgerValueForRecord(transfer,values)).toMatchObject({amountUsdCents:'1160227',pulse:'12000000'});
 expect(ledgerCurrentAssetValue(transfer,values)).toMatchObject({amountUsdCents:'1477588',pulse:'14647306'});
 const conflicting={...record,valueOperands:{...record.valueOperands,assetId:'different'}};
 expect(ledgerAssetPeriods(conflicting,values)).toBeNull();
 expect(ledgerValueForRecord(conflicting,values).basis).not.toBe('intrinsic-model');
});
