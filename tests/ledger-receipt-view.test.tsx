// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import { ReceiptView } from '../src/features/receipts/ReceiptView';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import { receiptLink } from '../src/receiz/ledger-receipts';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); root = null; document.body.replaceChildren(); history.replaceState(null, '', '/'); });
function mount(link: string) {
  const url = new URL(link); history.replaceState(null, '', url.pathname + url.hash);
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
it('keeps transfer card value separate from consideration on the receipt', () => {
  const row = parsePublicNetworkPage('wallet', { ok: true, events: [{ id: 'card', kind: 'sports_card_transfer', pulse: 120, amountUsdCents: '100', cardValueUsdCents: '9900' }] }).records[0];
  const host = mount(receiptLink(row)!);
  expect(host.querySelector('.receipt-value h1')?.textContent).toBe('$99.00');
  expect(host.textContent).toContain('Card value at transfer');
  expect(host.textContent).toContain('Consideration');
  expect(host.textContent).toContain('$1.00');
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
  expect(host.querySelector('.receipt-provenance .ledger-funding-full')?.textContent).toContain('2 moments');expect(host.textContent).toContain('PRIVATE_LOCAL_CONTEXT');expect(fetch).not.toHaveBeenCalled();
  act(()=>root!.unmount());root=null;expect(readLocalReceiptContext(link)).toBeNull();
 }finally{vi.unstubAllGlobals();}
});
