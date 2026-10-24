// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
import {LedgerFundingTrace} from '../src/features/ledger/LedgerFundingTrace';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {retainOpenedProofInspection} from '../src/receiz/proof-inspection';
import {calculateWalletFundingAttributions} from '../src/receiz/ledger-wallet-fifo';
import {indexLedgerRelations} from '../src/receiz/ledger-economy';
const claim='a'.repeat(64),head='b'.repeat(64),contentHash='c'.repeat(64);
const payment=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'send',kind:'chat_transfer',pulse:200,amountUsdCents:'500',valueReceipt:{settledUsdCents:'200',phiUsdCents:'300',fundingSource:'mixed',fundingRule:'settled_first_then_phi'}}]}).records[0];
const card=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'card-transfer',kind:'sports_card_transfer',collectibleId:'rsc_original',claimHash:claim,pulse:200,causalLineage:{empty:false,proofHash:head,sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',fundingSource:'sovereign',acquisitionKind:'purchase',steps:[{id:'proof',kind:'post_work_proof',label:'Source proof',detail:'Sealed original',contentHash,kaiPulse:'100'},{id:'funding',kind:'glyph_economy_value',label:'Proof-native value',detail:'Recorded allocation',sourceId:'credit-one',amountUsdCents:'500',kaiPulse:'110'},{id:'purchase',kind:'pack_purchase',label:'Purchase',detail:'Recorded acquisition',kaiPulse:'120'}]}}]}).records[0];

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function openSources(host:HTMLElement){act(()=>{const details=host.querySelector<HTMLDetailsElement>('details.ledger-funding-sources')!;details.open=true;details.dispatchEvent(new Event('toggle'));});}
function expandedSources(element:React.ReactNode){const host=document.createElement('div'),root=createRoot(host);try{act(()=>root.render(element));if(host.querySelector('details.ledger-funding-sources'))openSources(host);return host.innerHTML;}finally{act(()=>root.unmount());}}

it('omits a funding section when a payment carries only a balance split, without IO',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{expect(renderToStaticMarkup(<LedgerFundingTrace record={payment()}/>)).toBe('');expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('keeps the actual proof-object origin and its allocated amount visible',()=>{
 const html=expandedSources(<LedgerFundingTrace record={card()}/>);
 expect(html).toContain('Funding source');expect(html).toContain('Proof-native value');expect(html).toContain('credit-one');expect(html).toContain('$5.00');expect(html).toContain('Full causal history');
});
it('shows the carried Note funding original and its exact digest without reopening the source',()=>{
 const noteId='note:public-note',digest='d'.repeat(64),record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'note_mint:public-event',kind:'note_mint',noteId,amountUsdCents:'200',amountPhiMicro:'1000000'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',root:{kind:'note',id:noteId},nodes:{['note:'+noteId]:{ref:{kind:'note',id:noteId},parents:[{kind:'proof-basis',id:'allocation:original'}],amountUsdCents:'200',amountPhiMicro:'1000000'},'proof-basis:allocation:original':{ref:{kind:'proof-basis',id:'allocation:original'},parents:[],originalDigest:digest}}}}).records[0];
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const html=expandedSources(<LedgerFundingTrace record={record}/>);expect(html).toContain('Funding source');expect(html).toContain('Funding original');expect(html).toContain(digest);expect(html).toContain('Full funding history');expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('binds a native credit cohort to its own pulse and opens members lazily without IO',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const record=card(),lineage=record.details!.causalLineage as Record<string,unknown>;
 (lineage.steps as Record<string,unknown>[])[1].occurredAt='2026-05-02T00:00:00Z';
 const cohort={rule:'receiz-profile-rollup-v1-owned-and-received',basis:'reconstructed-membership',creditSourceId:'credit-one',computedAt:'2026-05-01T00:00:00Z',amountPhiMicro:'1000',members:[{objectId:'origin',title:'Exact originating original',pulse:'111',createdAt:'2026-04-01T00:00:00Z',verifyUrl:'https://receiz.com/v/moment/origin/111',basis:'owned'}]};
 record.details={...record.details,fundingCohorts:[cohort]};
 expect(renderToStaticMarkup(<LedgerFundingTrace record={record}/>)).not.toContain('Underlying proof objects');
 const linked={...record,details:{...record.details,fundingLinks:[{sourceId:'credit-one',source:'profile_rollup_seed',creditPhiMicro:'1000',amountUsdCents:'500',offsetUsdCents:'0',creditAmountUsdCents:'500',occurredAt:'2026-05-02T00:00:00Z'}]}};
 expect(renderToStaticMarkup(<LedgerFundingTrace record={linked}/>)).not.toContain('Underlying proof objects');
 cohort.members[0]={...cohort.members[0],pulse:'100',verifyUrl:'https://receiz.com/v/moment/origin/100'};
 const valid={...record,details:{...record.details,fundingCohorts:[{...cohort,members:[...cohort.members]}]}};
 const html=expandedSources(<LedgerFundingTrace record={valid}/>);
 expect(html).toContain('Underlying proof objects');expect(html).not.toContain('Exact originating original');
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  await act(async()=>root.render(<LedgerFundingTrace record={valid}/>));openSources(host);
  await act(async()=>{const details=host.querySelector('.ledger-funding-basis') as HTMLDetailsElement;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(host.querySelector('.ledger-funding-basis a')?.getAttribute('href')).toBe('https://receiz.com/v/moment/origin/100');
  expect(host.textContent).toContain('Exact originating original');expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
it('names the rails only when both fund the transaction',()=>{
 const single=card();single.valueOperands={...single.valueOperands,settledUsdCents:'0',phiUsdCents:'500'};
 const singleDoc=new DOMParser().parseFromString(expandedSources(<LedgerFundingTrace record={single}/>),'text/html');
 expect(singleDoc.querySelector('.ledger-funding-components')?.textContent).toBe('Funding amount$5.00');
 const mixed=card();mixed.valueOperands={...mixed.valueOperands,settledUsdCents:'200',phiUsdCents:'300'};
 const mixedDoc=new DOMParser().parseFromString(expandedSources(<LedgerFundingTrace record={mixed}/>),'text/html');
 expect(mixedDoc.querySelector('.ledger-funding-components')?.textContent).toBe('Reserve$2.00Settlement$3.00');
});
it('presents a carried acquisition chain as history without an empty funding-source claim',()=>{
 const record=card(),lineage=record.details!.causalLineage as Record<string,unknown>;
 const partial={...record,details:{...record.details,causalLineage:{...lineage,steps:(lineage.steps as Record<string,unknown>[]).slice(2)} as never}};
 const html=renderToStaticMarkup(<LedgerFundingTrace record={partial}/>);
 expect(html).toContain('Causal history');expect(html).not.toContain('Funding source');expect(html).not.toContain('upstream funding events are not included');expect(html).not.toContain('no source-by-source');
});
it('shows a newly available, canonically opened original through the shared reader without fetching',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const digest='d'.repeat(64),record={...card(),details:undefined,evidence:{artifactDigest:digest}},host=document.createElement('div'),root=createRoot(host),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  await act(async()=>root.render(<LedgerFundingTrace record={record}/>));expect(host.textContent).toBe('');
  // The SDK open has already succeeded. This UI observer must reuse its
  // digest-bound source, not rerun verification or request another original.
  const opened={sealedArtifact:{artifactSha256:digest},verification:{ok:true,integrity:{ok:true},bundle:{}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify({collectibleId:'rsc_original',claimHash:claim,causalLineage:card().details!.causalLineage})),mimeType:'application/json',filename:'original.json',sha256:'e'.repeat(64)}} as unknown as ReceizOpenedArtifact;
  await act(async()=>{retainOpenedProofInspection(opened,new Uint8Array([1]),'original.png',digest);});
  openSources(host);expect(host.textContent).toContain('Proof-native value');expect(host.textContent).toContain('$5.00');expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
it('shows the exact named object from the loaded index and separates only actual mixed funding',()=>{
 const source=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'profile:owner:proof',receizId:'proof',title:'The originating proof object',pulse:'100'}]}}).records[0];
 for(const reserve of ['0','200']){
  const rows=[{id:'proof-credit',user_id:'owner',direction:'credit',entry_kind:'market_sell',amount_usd_cents:'500',amount_phi_micro:'500',created_at:'2026-05-01T00:00:00Z',kai_upulse:'100000000',metadata:{source:'market_trade',marketItemId:'profile:owner:proof'}},{id:'reserve-credit',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_usd_cents:'200',amount_phi_micro:'200',created_at:'2026-05-02T00:00:00Z',kai_upulse:'110000000',metadata:{source:'stripe_checkout_wallet_deposit'}},{id:'debit',user_id:'owner',direction:'debit',entry_kind:'payment',amount_usd_cents:'500',amount_phi_micro:'500',created_at:'2026-05-03T00:00:00Z',kai_upulse:'120000000',metadata:{settledUsdCents:reserve}}];
  const attribution=calculateWalletFundingAttributions(rows,'owner',true).get('debit')!;
  const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'debit',kind:'payment',amountUsdCents:'500',kaiUpulse:'120000000',createdAt:'2026-05-03T00:00:00Z',fundingAttribution:attribution}]}).records[0];
  const html=expandedSources(<LedgerFundingTrace record={record} relations={indexLedgerRelations([record,source])}/>),doc=new DOMParser().parseFromString(html,'text/html');
  expect(doc.querySelector('.ledger-funding-object a')?.textContent).toContain('The originating proof object');
  expect(doc.querySelectorAll('.ledger-funding-rail')).toHaveLength(reserve==='0'?0:2);
  expect(doc.querySelector('.ledger-funding-components')?.textContent).toBe(reserve==='0'?'Funding amount$5.00':undefined);
 }
});

it('keeps funding sources and full history as independent compact disclosures until opened',()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  act(()=>root.render(<LedgerFundingTrace record={card()}/>));
  const sources=host.querySelector<HTMLDetailsElement>('details.ledger-funding-sources')!,history=host.querySelector<HTMLDetailsElement>('details.ledger-funding-full')!;
  expect(sources).not.toBeNull();expect(history).not.toBeNull();expect(sources.parentElement).toBe(history.parentElement);
  expect(sources.open).toBe(false);expect(history.open).toBe(false);expect(host.querySelector('.ledger-funding-path')).toBeNull();expect(host.querySelector('.ledger-funding-hash')).toBeNull();
  act(()=>{sources.open=true;sources.dispatchEvent(new Event('toggle'));});
  expect(sources.textContent).toContain('credit-one');expect(history.open).toBe(false);expect(history.querySelector('ol')).toBeNull();
  act(()=>{history.open=true;history.dispatchEvent(new Event('toggle'));});
  expect(history.textContent).toContain('Recorded acquisition');expect(sources.open).toBe(true);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
