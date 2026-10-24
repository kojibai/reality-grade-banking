// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ReceiptView } from '../src/features/receipts/ReceiptView';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import { receiptLink } from '../src/receiz/ledger-receipts';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); root = null; document.body.replaceChildren(); history.replaceState(null, '', '/'); });
function mount(link: string) {
  const url = new URL(link); history.replaceState(null, '', url.pathname + url.search + url.hash);
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(<ReceiptView onBack={() => {}}/>)); return host;
}
it('presents a proof receipt as a display projection with its carried source value', () => {
  const proof = parsePublicNetworkPage('proofs', { ok: true, transport: { publicOriginals: [{ id: 'profile:artist:proof', receizId: 'proof', title: 'Sealed work', pulse: '120', valueUsd: 42.25, canonicalHref: '/artist/verified/proof' }] } }).records[0];
  const host = mount(receiptLink(proof)!);
  expect(host.querySelector('.receipt-value h1')?.textContent).toBe('$42.25');
  expect(host.textContent).toContain('Proof receipt');
  expect(host.textContent).toContain('Source record');
  expect(host.textContent).toContain('not independently verified');
});
it('opens the lossless compact packet and offers Share beside Copy with the same carried inspection',async()=>{
 const {compactReceiptLink}=await import('../src/receiz/receipt-sharing'),{vi}=await import('vitest');
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'share',kind:'chat_transfer',amountUsdCents:'12500',entryHash:'b'.repeat(64)}]}).records[0];
 const host=mount(compactReceiptLink(receiptLink(row)!)),share=vi.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'share',{value:share,configurable:true});
 try{
  expect(host.querySelector('.receipt-value h1')?.textContent).toBe('$125.00');
  const buttons=host.querySelectorAll('.receipt-header-actions button');expect(buttons).toHaveLength(2);expect(buttons[0].getAttribute('aria-label')).toBe('Copy receipt link');
  const {receiptDigest}=await import('../src/receiz/receipt-snapshot');vi.stubGlobal('fetch',vi.fn(async(_url,init)=>Response.json({ok:true,sha256:await receiptDigest(new TextEncoder().encode(String(init.body)))})));
  await act(async()=>{(buttons[1] as HTMLButtonElement).click();});
  await vi.waitFor(async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10));});expect(document.querySelector<HTMLButtonElement>('.receipt-share-panel [aria-label="Share receipt"]')?.disabled).toBe(false);});
  expect(share).not.toHaveBeenCalled();
  act(()=>document.querySelector<HTMLButtonElement>('.receipt-share-panel [aria-label="Share receipt"]')!.click());expect(share).toHaveBeenCalledOnce();expect(share.mock.calls[0][0].url).toMatch(/\/receipt\/[a-f0-9]{64}\/$/);
  act(()=>document.querySelector<HTMLButtonElement>('.receipt-share-panel [aria-label="Close"]')!.click());
  act(()=>{const details=host.querySelector<HTMLDetailsElement>('details.receipt-inspection')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(host.textContent).toContain('b'.repeat(64));
 }finally{delete (navigator as unknown as Record<string,unknown>).share;vi.unstubAllGlobals();}
});
it('keeps transfer card value separate from consideration on the receipt', () => {
  const row = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'card', kind: 'sports_card_transfer', pulse: 120, amountUsdCents: '100', cardValueUsdCents: '9900' }] }).records[0];
  const host = mount(receiptLink(row)!);
  expect(host.querySelector('.receipt-value h1')?.textContent).toBe('$99.00');
  expect(host.textContent).toContain('Card value at transfer');
  expect(host.textContent).toContain('Consideration');
  expect(host.textContent).toContain('$1.00');
});
it('carries My history sale details and realized return into a compact shared receipt without a lookup',async()=>{
 const {compactReceiptLink}=await import('../src/receiz/receipt-sharing'),{vi}=await import('vitest');
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'sale',kind:'wallet_ledger_entry',ledgerEntryKind:'market_sell',amountUsdCents:'12500',assetTrade:{side:'sell',title:'The original',marketItemId:'profile:artist:work',shareQuantityMicro:'2500000',priceUsdCents:'5000',settlementUsdCents:'12500',feeUsdCents:'0',realizedCostBasisUsdCents:'10000'}}]}).records[0];
 const record={...row,authority:'account-source-projection' as const},fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const host=mount(compactReceiptLink(receiptLink(record)!));
  act(()=>{const details=host.querySelector<HTMLDetailsElement>('details.receipt-inspection')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
  const trade=host.querySelector('.ledger-trade-details')!;expect(trade.textContent).toContain('The original');expect(trade.textContent).toContain('2.5');expect(trade.textContent).toContain('+$25.00');expect(trade.textContent).toContain('+25.00%');expect(trade.textContent).toContain('Cost basis');expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});

it.each([
 ['public','note_mint'],['public','note_claim'],
 ['private','note_mint'],['private','note_claim'],
] as const)('carries the %s %s funding history into the standalone receipt without a lookup',async(view,kind)=>{
 const {parsePrivateHistoryPage}=await import('../src/receiz/private-history');
 const {compactReceiptLink}=await import('../src/receiz/receipt-sharing');
 const noteId='10000000-0000-4000-8000-000000000001',objectId='20000000-0000-4000-8000-000000000001',digest='d'.repeat(64);
 const debit={kind:'debit',id:'creation'},credit={kind:'credit',id:'deposit'},note={kind:'note',id:noteId};
 // The compatibility response roots both the exact allocation debit and its
 // Note. Deposits extend that same Note rather than starting new provenance.
 const fundingContexts={schema:'receiz.wallet.funding-context.v1',roots:{'debit:creation':debit,['note:'+noteId]:note,'credit:deposit':credit},nodes:{
  'debit:creation':{ref:debit,amountUsdCents:'200',amountPhiMicro:'400',parents:[{kind:'proof-basis',id:'origin'}],source:'bank_connected_note_allocate',originalDigest:digest},
  ['note:'+noteId]:{ref:note,amountUsdCents:'200',amountPhiMicro:'400',parents:[debit],originalDigest:digest},
  'credit:deposit':{ref:credit,amountUsdCents:'200',amountPhiMicro:'400',parents:[note],source:'bank_connected_note_redeem',originalDigest:'e'.repeat(64)},
  'proof-basis:origin':{ref:{kind:'proof-basis',id:'origin'},parents:[],objectIds:[objectId]},
 }};
 const id=kind==='note_mint'?'creation':'deposit';
 const event={id:view==='private'?'wallet_ledger:'+id:id,kind:view==='private'?'wallet_ledger_entry':kind,ledgerEntryKind:kind,noteId,amountUsdCents:'200',amountPhiMicro:'400'};
 const packet={ok:true,accountUserId:'account',events:[event],fundingContexts,nextCursor:null};
 const row=view==='private'?parsePrivateHistoryPage(packet,'account').records[0]:parsePublicNetworkPage('wallet',packet).records[0];
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const host=mount(compactReceiptLink(receiptLink(row)!));
  const provenance=host.querySelector('.receipt-provenance')!;
  expect(provenance.textContent).toContain('Funding source');
  act(()=>{const details=provenance.querySelector<HTMLDetailsElement>('details.ledger-funding-full')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(provenance.textContent).toContain(objectId);
  expect(provenance.textContent).toContain(digest);
  expect(provenance.textContent).toContain('Full funding history');
  expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});

it('does not invent a valuation coordinate or repeat an unavailable amount',()=>{
 const row=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'proof-no-value',receizId:'proof-no-value',title:'Sealed work',pulse:'120'}]}}).records[0];
 const host=mount(receiptLink(row)!);expect(host.querySelector('.receipt-value h1')?.textContent).toBe('Recorded');expect(host.textContent).toContain('Value not supplied');expect(host.textContent).not.toContain('Value at ☤KAI');
});

it('makes every carried receipt field inspectable while retaining the compact default view',()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',summary:'Alex paid Sam',pulse:120,amountUsdCents:'100',amountPhiMicro:'500000',entryHash:'a'.repeat(64),sender:{displayName:'Alex'},recipient:{displayName:'Sam'}}]}).records[0];
 const host=mount(receiptLink(row)!);
 expect(host.querySelector('details.receipt-inspection')).not.toBeNull();
 expect(host.querySelector('details.receipt-inspection')?.hasAttribute('open')).toBe(false);
 expect(host.querySelector('.ledger-inspector')).toBeNull();
 act(()=>{const details=host.querySelector<HTMLDetailsElement>('details.receipt-inspection')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
 act(()=>{const details=host.querySelector<HTMLDetailsElement>('.ledger-exact-json')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
 expect(host.textContent).toContain('Alex paid Sam');expect(host.textContent).toContain('a'.repeat(64));expect(host.textContent).toContain('500000');
});

it('keeps the in-app account source chain on its receipt without serializing private context into the shared link',async()=>{
 const {openLedgerReceipt,readLocalReceiptContext}=await import('../src/receiz/ledger-receipts');
 const {StrictMode}=await import('react');
 const {vi}=await import('vitest');const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const hash='a'.repeat(64),record={...parsePublicNetworkPage('wallet',{ok:true,events:[{id:'private-card',kind:'sports_card_transfer',pulse:120,collectibleId:'rsc_1234567890abcdef',claimHash:hash,cardValueUsdCents:'9900',causalLineage:{sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',proofHash:hash,steps:[{id:'free',kind:'free_claim',label:'Free claim',detail:'Local carried origin',kaiPulse:'100'},{id:'transfer',kind:'transfer',label:'Ownership transfer',detail:'No consideration',kaiPulse:'120'}]}}]}).records[0],authority:'account-source-projection' as const,origin:'private-account' as const,detail:'PRIVATE_LOCAL_CONTEXT'};
  const link=receiptLink(record)!;expect(link).not.toContain('PRIVATE_LOCAL_CONTEXT');
  openLedgerReceipt({button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){}} as never,link,{record,value:{basis:'card-snapshot',amountUsdCents:'9900',pulse:'120',considerationUsdCents:null}});
  const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<StrictMode><ReceiptView onBack={()=>{}}/></StrictMode>));
  expect(host.querySelector('.receipt-provenance .ledger-funding-full')?.textContent).toContain('2 moments');
  act(()=>{const details=host.querySelector<HTMLDetailsElement>('details.receipt-inspection')!;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(host.textContent).toContain('PRIVATE_LOCAL_CONTEXT');expect(fetch).not.toHaveBeenCalled();
  act(()=>root!.unmount());root=null;expect(readLocalReceiptContext(link)).toBeNull();
 }finally{vi.unstubAllGlobals();}
});
it('keeps the linked execution inside the one payment receipt from already loaded context',async()=>{
 const {openLedgerReceipt}=await import('../src/receiz/ledger-receipts'),{indexLedgerRelations}=await import('../src/receiz/ledger-economy'),{ledgerValueForRecord}=await import('../src/receiz/ledger-value');
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'movement',kind:'chat_transfer',transferId:'same-payment',amountUsdCents:'100'}]}).records[0];
 const execution=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'execution',actionKind:'wallet.transfer.connect',transferId:'same-payment',amountUsdCents:'100'}]}).records[0];
 const link=receiptLink(record)!;
 openLedgerReceipt({button:0,preventDefault(){}} as never,link,{record,value:ledgerValueForRecord(record),relations:indexLedgerRelations([record,execution])});
 const host=mount(link);expect(host.querySelector('.receipt-value p')?.textContent).toBe('Money Transfer');
 expect(host.querySelector('.ledger-payment-execution summary')?.textContent).toContain('Same payment · execution record');expect(host.querySelector('.ledger-payment-execution .ledger-inspector')).toBeNull();
});
it('uses the complete short-route initial data on its first render without a second fetch',async()=>{
 const {completeLedgerReceipt}=await import('../src/receiz/ledger-receipts');
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'seeded-receipt',kind:'chat_transfer',amountUsdCents:'2700'}]}).records[0],receipt=completeLedgerReceipt(row),digest='a'.repeat(64);
 const seed=document.createElement('script');seed.id='receipt-snapshot';seed.type='application/json';seed.setAttribute('data-digest',digest);seed.textContent=JSON.stringify(receipt);document.head.append(seed);
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const host=mount('https://bankeiz.com/receipt/'+digest+'/');expect(host.querySelector('.receipt-value h1')?.textContent).toBe('$27.00');expect(fetch).not.toHaveBeenCalled();}finally{seed.remove();vi.unstubAllGlobals();}
});
