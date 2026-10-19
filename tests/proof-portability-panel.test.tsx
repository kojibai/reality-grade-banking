// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ProofPortabilityPanel } from '../src/features/account/ProofPortabilityPanel';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('verifies a recovery file, previews it, and retains only after explicit approval', async () => {
  const review = { items: [{ kind: 'execution-recovery', digest: 'a'.repeat(64), title: 'Transaction recovery', filename: 'original.json', size: 100, operationId: 'original-attempt', participantCount: 2 }], totalBytes: 100 };
  const inspect = vi.fn(async () => review), retain = vi.fn(async () => ({ added: 1, alreadyHeld: 0 })), list = vi.fn(async () => []);
  const identity = { proofLibrary: async () => ({ inspect, retain, list }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<ProofPortabilityPanel identity={identity} />));
    expect(inspect).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
    const picker = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(picker, 'files', { value: [new File(['original'], 'original.json')] });
    await act(async () => picker.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).toContain('Transaction recovery'); expect(retain).not.toHaveBeenCalled();
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === 'Import verified proofs')!.click());
    expect(retain).toHaveBeenCalledExactlyOnceWith(review); expect(host.textContent).toContain('1 proof imported');
    expect(host.textContent).not.toContain('Payment sent');
  } finally { act(() => root.unmount()); }
});
it.each(['restored','retained'] as const)('reports imported account history as %s without claiming funds moved',async(accountHistory)=>{
 const review={items:[{kind:'account-source',digest:'b'.repeat(64),title:'Verified account history',filename:'account.json',size:100}],totalBytes:100};
 const identity={proofLibrary:async()=>({inspect:async()=>review,retain:async()=>({added:1,alreadyHeld:0,accountHistory}),list:async()=>[]})} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<ProofPortabilityPanel identity={identity}/>));
  const picker=host.querySelector('input[type="file"]') as HTMLInputElement;Object.defineProperty(picker,'files',{value:[new File(['original'],'account.json')]});
  await act(async()=>picker.dispatchEvent(new Event('change',{bubbles:true})));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Import verified proofs')!.click());
  expect(host.textContent).toContain(accountHistory==='restored'?'Verified account history restored.':'Account originals saved as evidence; the current account view is unchanged.');
  expect(host.textContent).not.toContain('Funds restored');
 }finally{act(()=>root.unmount());}
});
