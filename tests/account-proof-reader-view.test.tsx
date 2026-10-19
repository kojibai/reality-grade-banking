// @vitest-environment happy-dom
/** Simulated verified handles test display choreography only. */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { VerifiedAccountProof } from '../src/receiz/account-proof';
import { AccountProofReader } from '../src/conformance/AccountProofInspector';
import { AccountProofDetails } from '../src/components/AccountProofDetails';
const fixtures = vi.hoisted(() => ({ original: null as unknown, latest: null as unknown }));
vi.mock('../src/receiz/account-proof', async () => ({ ...await vi.importActual('../src/receiz/account-proof'), isVerifiedAccountProof: () => true }));
vi.mock('../src/receiz/account-proof-public', () => ({ readPublicAccountProof: async (_digest: string, latest: boolean) => latest ? fixtures.latest : fixtures.original, verifyAccountProofContinuation: () => {} }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function proof(cents: string): VerifiedAccountProof { return { sourceDigest: cents === '500' ? 'a'.repeat(64) : 'b'.repeat(64), writer: 'simulation.receiz.id', statement: { account: { receizId: 'example.receiz.id' }, checkpoint: { reserveUsdCents: cents, settlementPhiMicro: '1000000', transactionCount: 1, kaiUPulse: '100000000', accountHead: cents }, transactions: [{ sequence: 1, transactionId: 'exact-transaction-id', description: 'Example credit', kind: 'credit', kaiUPulse: '99000000', eventDigest: 'c'.repeat(64), reserveDeltaUsdCents: '500', settlementDeltaPhiMicro: '1000000' }] } } as unknown as VerifiedAccountProof; }
afterEach(() => { window.history.replaceState({}, '', '/'); });
it('lets recipients return to the exact image snapshot after a newer shared source is displayed', async () => {
  fixtures.original = proof('500'); fixtures.latest = proof('1000'); window.history.replaceState({}, '', `/verify/${'a'.repeat(64)}/`);
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<AccountProofReader />));
    expect(host.textContent).toContain('$10.00');
    const original = [...host.querySelectorAll('button')].find(b => b.textContent === 'Original snapshot');
    expect(original).toBeDefined();
    await act(async () => original!.click()); expect(host.textContent).toContain('$5.00'); expect(host.textContent).not.toContain('$10.00');
    const latest = [...host.querySelectorAll('button')].find(b => b.textContent === 'Latest shared source');
    await act(async () => latest!.click()); expect(host.textContent).toContain('$10.00');
  } finally { act(() => root.unmount()); }
});
it('shows exact per-rail movements and native transaction identifiers before disclosure', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<AccountProofDetails proof={proof('500')} />));
    expect(host.textContent).toContain('+$5.00 Reserve'); expect(host.textContent).toContain('+1 Φ Settlement');
    expect(host.textContent).toContain('exact-transaction-id'); expect(host.textContent).toContain('Transaction 1');
  } finally { act(() => root.unmount()); }
});
it('verifies the selected shared source when retained navigation changes its digest',async()=>{
 fixtures.original=proof('500');fixtures.latest=proof('500');
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<AccountProofReader routeDigest={'a'.repeat(64)}/>));
  expect(host.textContent).toContain('$5.00');
  fixtures.original=proof('1000');fixtures.latest=proof('1000');
  await act(async()=>root.render(<AccountProofReader routeDigest={'b'.repeat(64)}/>));
  expect(host.querySelector('.account-proof-facts')?.textContent).toContain('$10.00');expect(host.querySelector('.account-proof-facts')?.textContent).not.toContain('$5.00');
  await act(async()=>root.render(<AccountProofReader routeDigest={null}/>));
  expect(host.textContent).not.toContain('$10.00');expect(host.querySelector('input')).not.toBeNull();
 }finally{act(()=>root.unmount());}
});
