// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ inspect: vi.fn() }));
vi.mock('../src/conformance/reference', () => ({ inspectOriginalNote: native.inspect }));
import { ProofInspector } from '../src/conformance/ProofInspector';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('invalidates prior evidence while a second original is being inspected', async () => {
  const host = document.createElement('div'), root = createRoot(host), onState = vi.fn();
  let rejectPending!: (error: Error) => void;
  native.inspect.mockRejectedValueOnce(Error('BANK_COMPLETE_NOTE_IMAGE_REQUIRED')).mockImplementationOnce(() => new Promise((_, reject) => { rejectPending = reject; }));
  try {
    act(() => root.render(<ProofInspector onState={onState} />));
    const choose = async () => {
      const input = host.querySelector('input')!;
      Object.defineProperty(input, 'files', { value: [{ size: 1, arrayBuffer: async () => new Uint8Array([0]).buffer }], configurable: true });
      await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    };
    await choose();
    expect(onState.mock.calls.at(-1)?.[0]).toMatchObject({ busy: false, evidence: { verified: false } });
    await choose();
    expect(onState.mock.calls.at(-1)?.[0]).toEqual({ busy: true, evidence: null });
    expect(host.textContent).toContain('Verifying carried sources');
    await act(async () => rejectPending(Error('BANK_COMPLETE_NOTE_IMAGE_REQUIRED')));
    expect(onState.mock.calls.at(-1)?.[0]).toMatchObject({ busy: false, evidence: { verified: false, creditAuthorized: false } });
  } finally { act(() => root.unmount()); }
});
it('shows complete receipt verification without inventing an amount or current account credit',async()=>{
 const host=document.createElement('div'),root=createRoot(host);
 native.inspect.mockResolvedValueOnce({schema:'bankeiz.original-receipt-inspection.v1',rail:'reserve',noteId:'receipt-note',kind:'credit',carriedChainVerified:true,currentSpendabilityChecked:false,creditAuthorized:false,custodyConsumed:false});
 try{act(()=>root.render(<ProofInspector onState={()=>{}}/>));const input=host.querySelector('input')!;Object.defineProperty(input,'files',{value:[{size:1,arrayBuffer:async()=>new Uint8Array([0]).buffer}],configurable:true});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));expect(host.textContent).toContain('receipt-note');expect(host.textContent).toContain('Receipt source');expect(host.textContent).not.toContain('$undefined');expect(host.textContent).toContain('Current spendability');}finally{act(()=>root.unmount());}
});
