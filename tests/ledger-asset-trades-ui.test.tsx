// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {parsePublicNetworkPage,PUBLIC_SOURCES} from '../src/receiz/public-network';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
const held=vi.hoisted(()=>({records:[] as ReturnType<typeof parsePublicNetworkPage>['records']}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:held.records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',complete:true,busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh:()=>{},loadMore:()=>{}})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows trade amounts, asset names and shares under Transactions with the same bank mark as Explore',()=>{
 held.records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'buy',actionKind:'market.share.buy',assetTrade:{side:'buy',title:'Blue Horizon',shareQuantityMicro:'2500000',priceUsdCents:'4000',settlementUsdCents:'10100',feeUsdCents:'100'}},{id:'sell',actionKind:'market.share.sell',assetTrade:{side:'sell',title:'A photograph',shareQuantityMicro:'1000000',settlementUsdCents:'12500',realizedCostBasisUsdCents:'10000'}}]}).records;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  act(()=>root.render(<PublicLedgerApp active={false}/>));
  expect(host.querySelector('.public-ledger-brand svg')).not.toBeNull();
  act(()=>[...host.querySelectorAll<HTMLButtonElement>('nav[aria-label="Activity type"] button')].find(b=>b.textContent==='Transactions')!.click());
  const rows=[...host.querySelectorAll('.public-ledger-row')];expect(rows).toHaveLength(2);
  expect(rows[0].textContent).toContain('Asset Purchase');expect(rows[0].textContent).toContain('Blue Horizon');expect(rows[0].textContent).toContain('2.5 shares');
  expect(rows[0].querySelector('.ledger-value strong')?.textContent).toBe('$101.00');
  expect(rows[1].querySelector('.ledger-trade-return')?.textContent).toContain('+$25.00');expect(rows[1].querySelector('.ledger-trade-return')?.textContent).toContain('+25.00%');
  act(()=>rows[0].querySelector<HTMLButtonElement>('.public-ledger-event')!.click());
  const details=rows[0].querySelector('.ledger-trade-details')!;
  expect(details.textContent).toContain('Price per share');expect(details.textContent).toContain('$40.00');expect(details.textContent).toContain('Fees');expect(details.textContent).toContain('$1.00');
  expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
it('labels a sale loss as realized and does not claim a return for missing purchase history',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'sale',kind:'wallet_ledger_entry',ledgerEntryKind:'market_sell',amountUsdCents:'7500',assetTrade:{side:'sell',title:'The original',shareQuantityMicro:'1000000',settlementUsdCents:'7500',realizedCostBasisUsdCents:'10000'}}]}).records[0];
 const host=document.createElement('div'),root=createRoot(host);
 try{
  act(()=>root.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
  const details=host.querySelector('.ledger-trade-details')!;expect(details?.textContent).toContain('Realized loss');expect(details.textContent).toContain('−$25.00');expect(details.textContent).toContain('−25.00%');
  const thin={...record,details:{...record.details,assetTrade:{side:'sell',title:'The original',settlementUsdCents:'7500'}}};
  act(()=>root.render(<LedgerInspector record={thin} value={ledgerValueForRecord(thin)}/>));
  expect(host.querySelector('.ledger-trade-details')?.textContent).toContain('Cost basis not carried');
  expect(host.querySelector('.ledger-trade-return')).toBeNull();
 }finally{act(()=>root.unmount());}
});
