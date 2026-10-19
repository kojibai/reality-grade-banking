// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
import {LedgerFundingTrace} from '../src/features/ledger/LedgerFundingTrace';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {retainOpenedProofInspection} from '../src/receiz/proof-inspection';
const claim='a'.repeat(64),head='b'.repeat(64),contentHash='c'.repeat(64);
const payment=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'send',kind:'chat_transfer',pulse:200,amountUsdCents:'500',valueReceipt:{settledUsdCents:'200',phiUsdCents:'300',fundingSource:'mixed',fundingRule:'settled_first_then_phi'}}]}).records[0];
const card=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'card-transfer',kind:'sports_card_transfer',collectibleId:'rsc_original',claimHash:claim,pulse:200,causalLineage:{empty:false,proofHash:head,sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',fundingSource:'sovereign',acquisitionKind:'purchase',steps:[{id:'proof',kind:'post_work_proof',label:'Source proof',detail:'Sealed original',contentHash,kaiPulse:'100'},{id:'funding',kind:'glyph_economy_value',label:'Proof-native value',detail:'Recorded allocation',sourceId:'credit-one',amountUsdCents:'500',kaiPulse:'110'},{id:'purchase',kind:'pack_purchase',label:'Purchase',detail:'Recorded acquisition',kaiPulse:'120'}]}}]}).records[0];

it('omits a funding section when a payment carries only a balance split, without IO',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{expect(renderToStaticMarkup(<LedgerFundingTrace record={payment()}/>)).toBe('');expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it('keeps the actual proof-object origin and its allocated amount visible',()=>{
 const html=renderToStaticMarkup(<LedgerFundingTrace record={card()}/>);
 expect(html).toContain('Funding source');expect(html).toContain('Proof-native value');expect(html).toContain('credit-one');expect(html).toContain('$5.00');expect(html).toContain('Full causal history');
});
it('names the rails only when both fund the transaction',()=>{
 const single=card();single.valueOperands={...single.valueOperands,settledUsdCents:'0',phiUsdCents:'500'};
 const singleDoc=new DOMParser().parseFromString(renderToStaticMarkup(<LedgerFundingTrace record={single}/>),'text/html');
 expect(singleDoc.querySelector('.ledger-funding-components')?.textContent).toBe('Funding amount$5.00');
 const mixed=card();mixed.valueOperands={...mixed.valueOperands,settledUsdCents:'200',phiUsdCents:'300'};
 const mixedDoc=new DOMParser().parseFromString(renderToStaticMarkup(<LedgerFundingTrace record={mixed}/>),'text/html');
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
  expect(host.textContent).toContain('Proof-native value');expect(host.textContent).toContain('$5.00');expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
