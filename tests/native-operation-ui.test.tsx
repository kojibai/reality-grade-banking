// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { NativeOperation } from '../src/features/account/NativeOperation';
import type { OpenIdentity } from '../src/receiz/native-identity';
import {ReceizHttpError} from '@receiz/sdk';
const fixtures = vi.hoisted(() => ({ held: new WeakSet<object>() }));
// UI choreography only; actual native forgery refusal has a separate test.
vi.mock('../src/receiz/bank-operations', async importOriginal => ({ ...await importOriginal<object>(), isBankOperationReview: (value: object) => fixtures.held.has(value) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const operation = { kind: 'exchange' as const, rail: 'reserve' as const, amountUsdCents: '500', assetDigest: 'a'.repeat(64) };
function review() { const value = { confirmationDigest: 'c'.repeat(64), request: operation, terms: { debitUsdCents: '500', debitPhiMicro: '1000000', creditUsdCents: '0', creditPhiMicro: '0', feeUsdCents: '0', quantityMicro: '1000000', recipient: null, assetDigest: 'a'.repeat(64), expiresAtKaiUPulse: 123456 } }; fixtures.held.add(value); return value; }
it('shows the actual bounded prepare failure without response credentials or a success claim',async()=>{
 const prepare=vi.fn().mockRejectedValue(new ReceizHttpError(503,{error:'native_payment_unavailable',ticket:'private-ticket',accountUserId:'private-account'})),execute=vi.fn();
 const identity={operations:async()=>({prepare,execute,discard:vi.fn()})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<NativeOperation identity={identity} input={()=>operation} inputKey="failure" title="Payment" confirmLabel="Send payment" onRefresh={vi.fn()}><p>Input</p></NativeOperation>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Review payment'))!.click());
 expect(host.textContent).toContain('payment service');const details=host.querySelector<HTMLDetailsElement>('.transaction-failure-details');expect(details?.open).toBe(false);expect(details?.textContent).toContain('native_payment_unavailable');expect(details?.textContent).toContain('HTTP 503');expect(host.textContent).not.toContain('private-');expect(execute).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Transaction complete.');
 }finally{act(()=>root.unmount());}
});
it('prepares only on click, requires exact approval, and submits once on a double click', async () => {
  const prepared = review(), prepare = vi.fn(async () => prepared), execute = vi.fn(async () => ({ status: 'unknown', operationId: 'original-attempt' })), discard = vi.fn();
  const identity = { operations: async () => ({ prepare, execute, discard }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<NativeOperation identity={identity} input={() => operation} inputKey="one" title="Exchange" confirmLabel="Confirm exchange" onRefresh={vi.fn()}><p>Input</p></NativeOperation>));
    expect(prepare).not.toHaveBeenCalled();
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Review exchange'))!.click());
    const submit = [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Confirm exchange'))!;
    expect(submit.disabled).toBe(true); expect(execute).not.toHaveBeenCalled();
    act(() => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
    await act(async () => { submit.click(); submit.click(); });
    expect(execute).toHaveBeenCalledTimes(1); expect(execute).toHaveBeenCalledWith(prepared, prepared.confirmationDigest);
    expect(host.textContent).toContain('Confirming your transaction.'); expect(host.textContent).not.toContain('Transaction complete.');
  } finally { act(() => root.unmount()); }
});
it('discards a late prepared response after the form changes and does not display it', async () => {
  let respond!: (value: ReturnType<typeof review>) => void;
  const prepare = vi.fn(() => new Promise(resolve => { respond = resolve; })), discard = vi.fn(), execute = vi.fn();
  const identity = { operations: async () => ({ prepare, execute, discard }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host), render = (key: string) => root.render(<NativeOperation identity={identity} input={() => operation} inputKey={key} title="Exchange" confirmLabel="Confirm exchange" onRefresh={vi.fn()}><p>Input {key}</p></NativeOperation>);
  try {
    await act(async () => render('one')); await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Review exchange'))!.click());
    await act(async () => render('two')); const prepared = review(); await act(async () => respond(prepared));
    expect(discard).toHaveBeenCalledWith(prepared); expect(host.textContent).toContain('Input two'); expect(host.textContent).not.toContain('Review exchange.'); expect(execute).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
