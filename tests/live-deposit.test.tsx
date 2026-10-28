// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { LiveDeposit } from '../src/features/deposit/LiveDeposit';
import { LiveAssetDetail } from '../src/features/assets/LiveAssets';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('starts blank after reopening and resumes a retained checkout only when explicitly selected', async () => {
  const checkout = { sessionId: 'cs_fixture123456', clientSecret: 'cs_fixture123456_secret_fixture', amountUsdCents: '25000' };
  const begin = vi.fn(), identity = { pendingCardDeposit: async () => checkout, beginCardDeposit: begin } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  const click = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text))!.click();
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    expect(host.querySelector('h1')?.textContent).toBe('Add money toyour account.'); expect(host.textContent).toContain('Choose what you’re adding.'); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Add money'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Resume secure checkout'));
    expect(host.querySelector('iframe')?.getAttribute('src')).toContain('cs_fixture123456');
    act(() => click('All options')); act(() => click('Add money'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull(); expect(begin).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
it('offers one asset deposit path that requires its original proof instead of an intake form', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { await act(async () => root.render(<LiveDeposit identity={{} as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    expect([...host.querySelectorAll('.deposit-options strong')].map(node => node.textContent)).toEqual(['Add money', 'An asset', 'Settlement Note']);
    expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull();
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent?.includes('An asset'))!.click(); await vi.dynamicImportSettled(); });
    expect(host.textContent).toContain('Deposit an asset.');
    expect(host.querySelector('input[type="file"][aria-label="Choose original proof object"]')).not.toBeNull();
    expect(host.querySelector('input[placeholder="Describe what you own"]')).toBeNull();
    expect(host.querySelector('input[type="number"]')).toBeNull();
  } finally { act(() => root.unmount()); }
});
it('opens payment checkout directly without a method selector or an unfunded balance credit', async () => {
  const checkout = { sessionId: 'cs_fixture_cardonly', clientSecret: 'cs_fixture_cardonly_secret_fixture', amountUsdCents: '10000' };
  const create = vi.fn(async () => checkout), refresh = vi.fn(), host = document.createElement('div'), root = createRoot(host);
  const click = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent === text)!.click();
  try { await act(async () => root.render(<LiveDeposit identity={{ beginCardDeposit: create } as unknown as OpenIdentity} onClose={vi.fn()} onRefresh={refresh} />));
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Add money'))!.click());
    expect([...host.querySelectorAll('button')].some(button => ['Card', 'Wire'].includes(button.textContent ?? ''))).toBe(false);
    expect(host.textContent).toContain('Choose how to pay at secure checkout.'); expect(host.textContent).not.toMatch(/card|wire/i); expect(create).not.toHaveBeenCalled();
    act(() => click('$100')); await act(async () => click('Continue'));
    expect(create).toHaveBeenCalledExactlyOnceWith('100', true);
    expect(host.querySelector('iframe')?.getAttribute('src')).toContain(checkout.sessionId);
    expect(refresh).not.toHaveBeenCalled(); expect(host.textContent).not.toContain('Added to your balance');
  } finally { act(() => root.unmount()); }
});
it('opens the existing exact-original review from An asset without accepting an estimate as funding', async () => {
  const review = { digest: 'a'.repeat(64), filename: 'wheat.receiz', title: 'Wheat harvest', owner: 'farmer.receiz.id', size: 100, kind: 'hold' as const };
  const api = { status: async () => null, inspect: vi.fn(async () => review), receive: vi.fn(async () => ({ status: 'held', digest: review.digest, filename: review.filename })), discard: vi.fn() };
  const intake = vi.fn(), card = vi.fn(), refresh = vi.fn();
  const identity = { receivedProof: async () => api, startAssetIntake: intake, beginCardDeposit: card } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={refresh} />));
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent?.includes('An asset'))!.click(); await vi.dynamicImportSettled(); });
    const picker = host.querySelector<HTMLInputElement>('input[aria-label="Choose original proof object"]');
    expect(picker).not.toBeNull();
    const original = new File(['complete original fixture'], review.filename);
    Object.defineProperty(picker!, 'files', { value: [original] });
    await act(async () => picker!.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).toContain('Wheat harvest'); expect(host.textContent).toContain('farmer');
    expect(api.inspect).toHaveBeenCalledExactlyOnceWith(original);
    expect(host.querySelector<HTMLButtonElement>('.primary-button')?.disabled).toBe(true);
    expect(api.receive).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
    act(() => host.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async () => host.querySelector<HTMLButtonElement>('.primary-button')!.click());
    expect(host.textContent).toContain('Your original is held.');
    expect(host.textContent).not.toContain('Added to your balance');
    expect(intake).not.toHaveBeenCalled(); expect(card).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
it('retains the carried delivery destination in Assets with its actual artifact owner', async () => {
  const identity = { binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id' }, listDeposits: async () => [{ digest: 'fixture', title: 'Fixture Jordans', kind: 'intake', delivery: { recipient: 'Receiz', addressLines: ['Saved destination, preserved'], reference: 'fef806e9-82bd-44a8-9bb4-f6b5afc9aef0' } }] } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveAssetDetail identity={identity} digest="fixture" />));
    expect(host.textContent).toContain('Saved destination, preserved');
    expect(host.textContent).toContain('fixture.receiz.id');
    expect(host.textContent).not.toContain('receiz_device_fixture');
    expect(host.textContent).toContain('Awaiting verified receipt');
    expect([...host.querySelectorAll('button')].find(button => button.textContent === 'Sell a share')?.disabled).toBe(true);
  } finally { act(() => root.unmount()); }
});
it.each(['credited', 'expired', 'unpaid'])('returns to a new amount after a confirmed terminal %s checkout', async status => {
  const checkout = { sessionId: 'cs_fixture123456', clientSecret: 'cs_fixture123456_secret_fixture', amountUsdCents: '25000' };
  const identity = { pendingCardDeposit: async () => checkout, checkCardDeposit: async () => ({ status }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Add money'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Resume secure checkout'))!.click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Check deposit status'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('All options'))!.click());
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Add money'))!.click());
    expect(host.querySelector('iframe')).toBeNull(); expect(host.textContent).toContain('Add to your balance.');
  } finally { act(() => root.unmount()); }
});
it('a delayed initial resume list cannot erase a checkout created while the read was pending', async () => {
  let restore!: (value: unknown[]) => void;
  const checkout = { sessionId: 'cs_fixture_new123', clientSecret: 'private-test-only', amountUsdCents: '10000' };
  const identity = { pendingCardDeposits: () => new Promise(resolve => { restore = resolve; }), beginCardDeposit: async () => checkout } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host), click = (text: string) => [...host.querySelectorAll('button')].find(button => button.textContent?.includes(text))!.click();
  try {
    await act(async () => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => click('Add money')); await act(async () => click('Continue')); act(() => click('All options')); act(() => click('Add money'));
    expect(host.textContent).toContain('Resume secure checkout');
    await act(async () => restore([])); expect(host.textContent).toContain('Resume secure checkout');
  } finally { act(() => root.unmount()); }
});
it('a provider return resumes only the exact saved checkout and checks credit without creating another session',async()=>{
 const checkout={sessionId:'cs_fixture123456',clientSecret:'saved-private-fixture',amountUsdCents:'25000'},begin=vi.fn(),check=vi.fn(async()=>({status:'credited'})),consume=vi.fn(),refresh=vi.fn();
 const identity={pendingCardDeposits:async()=>[checkout],beginCardDeposit:begin,checkCardDeposit:check}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={refresh} resumeSessionId={checkout.sessionId} onResumeConsumed={consume}/>));
 expect(check).toHaveBeenCalledExactlyOnceWith(checkout);expect(begin).not.toHaveBeenCalled();expect(consume).toHaveBeenCalledOnce();expect(refresh).toHaveBeenCalledOnce();expect(host.textContent).toContain('Added to your balance.');expect(host.querySelector('iframe')).toBeNull();
 act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='All options')!.click());expect(host.textContent).toContain('Choose what you’re adding.');expect(check).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('does not check a foreign or unknown returned checkout, nor replace it with a new charge',async()=>{
 const begin=vi.fn(),check=vi.fn(),identity={pendingCardDeposits:async()=>[],beginCardDeposit:begin,checkCardDeposit:check}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}} resumeSessionId="cs_unknown123456"/>));expect(host.textContent).toContain('not saved under the open ID');expect(begin).not.toHaveBeenCalled();expect(check).not.toHaveBeenCalled();expect(host.querySelector('iframe')).toBeNull();}finally{act(()=>root.unmount());}
});
it('a paid checkout awaiting credit stays recoverable and does not reopen a payment form',async()=>{
 const checkout={sessionId:'cs_fixture123456',clientSecret:'saved-private-fixture',amountUsdCents:'25000'},refresh=vi.fn(),identity={pendingCardDeposits:async()=>[checkout],checkCardDeposit:async()=>({status:'settling'})}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={refresh} resumeSessionId={checkout.sessionId}/>));expect(host.textContent).toContain('Account credit is pending');expect(host.querySelector('iframe')).toBeNull();expect(refresh).not.toHaveBeenCalled();expect([...host.querySelectorAll('button')].some(button=>button.textContent==='Check deposit status')).toBe(true);}finally{act(()=>root.unmount());}
});
it('cancels only the selected unfinished checkout without opening or creating a payment',async()=>{
 const one={sessionId:'cs_fixture_cancelone',clientSecret:'private-one',amountUsdCents:'1000'},two={sessionId:'cs_fixture_canceltwo',clientSecret:'private-two',amountUsdCents:'2500'},cancel=vi.fn(async()=>({status:'expired'}));
 const identity={pendingCardDeposits:async()=>[one,two],cancelCardDeposit:cancel,beginCardDeposit:vi.fn()}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Add money'))!.click());const remove=host.querySelector<HTMLButtonElement>('[aria-label="Cancel $10.00 checkout"]');expect(remove).not.toBeNull();await act(async()=>remove!.click());expect(cancel).toHaveBeenCalledExactlyOnceWith(one);expect(host.textContent).not.toContain('$10.00');expect(host.textContent).toContain('$25.00');expect(host.querySelector('iframe')).toBeNull();expect(identity.beginCardDeposit).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
it.each(['open','settling'])('retains an unfinished checkout when cancellation returns %s',async status=>{
 const checkout={sessionId:'cs_fixture_cancelpending',clientSecret:'private-only',amountUsdCents:'1000'},identity={pendingCardDeposits:async()=>[checkout],cancelCardDeposit:async()=>({status})}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Add money'))!.click());const remove=host.querySelector<HTMLButtonElement>('[aria-label="Cancel $10.00 checkout"]');expect(remove).not.toBeNull();await act(async()=>remove!.click());expect(host.textContent).toContain('$10.00');expect(host.textContent).not.toContain('cancelled');}finally{act(()=>root.unmount());}
});
it('resumes a known processing cancellation into status recovery without reopening the card form',async()=>{
 const checkout={sessionId:'cs_fixture_processing',clientSecret:'private-only',amountUsdCents:'1000'},check=vi.fn(async()=>({status:'settling'})),identity={pendingCardDeposits:async()=>[checkout],cancelCardDeposit:async()=>({status:'settling'}),checkCardDeposit:check}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Add money'))!.click());await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Cancel $10.00 checkout"]')!.click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Check payment status'))!.click());expect(host.querySelector('iframe')).toBeNull();expect(host.textContent).toContain('Account credit is pending');await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Check deposit status')!.click());expect(check).toHaveBeenCalledExactlyOnceWith(checkout);}finally{act(()=>root.unmount());}
});

it.each([false, true])('opens Create an asset inside the unified asset path (native receiving: %s)', async native => {
 const create=vi.fn(),start=vi.fn(),card=vi.fn(),identity={pendingCardDeposits:async()=>[],startAssetIntake:start,beginCardDeposit:card,...(native?{receivedProof:async()=>({status:async()=>null})}:{})}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}} onCreateAsset={create}/>));
  await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('An asset'))!.click());
  const link=host.querySelector<HTMLButtonElement>('[aria-label="Create an asset instead"]');
  expect(host.textContent).toContain('Don’t have a proof object?'); expect(link).not.toBeNull();
  await act(()=>link!.click()); expect(create).toHaveBeenCalledOnce(); expect(start).not.toHaveBeenCalled(); expect(card).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
