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
