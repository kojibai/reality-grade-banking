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
    expect(host.textContent).toContain('Choose what you’re depositing.'); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Add money'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull();
    act(() => click('Resume secure checkout'));
    expect(host.querySelector('iframe')?.getAttribute('src')).toContain('cs_fixture123456');
    act(() => click('All deposits')); act(() => click('Add money'));
    expect(host.querySelector('input')?.value).toBe(''); expect(host.querySelector('iframe')).toBeNull(); expect(begin).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); }
});
it('retains the asset, dollars and proof chooser inside the app without a wallet handoff', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveDeposit identity={{} as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.textContent).toContain('Deposit what'); expect(host.textContent).toContain('An asset'); expect(host.textContent).toContain('Add money'); expect(host.textContent).toContain('A proof object');
    expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull(); expect(host.textContent).not.toContain('Demo');
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('An asset'))!.click());
    expect(host.textContent).toContain('Deposit an asset.'); expect(host.querySelector('input[placeholder="Describe what you own"]')).not.toBeNull();
  } finally { act(() => root.unmount()); }
});
it('dollar deposits show native card and wire methods, never credit money from an amount form', () => {
  const create = vi.fn(), host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveDeposit identity={{ beginCardDeposit: create } as unknown as OpenIdentity} onClose={vi.fn()} onRefresh={vi.fn()} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Add money'))!.click());
    expect(host.textContent).toContain('Card'); expect(host.textContent).toContain('Wire'); expect(create).not.toHaveBeenCalled(); expect(host.textContent).not.toContain('Added to your balance');
  } finally { act(() => root.unmount()); }
});
it('shows Receiz shipping instructions and the carried reference after saving a physical request', async () => {
  const identity = { startAssetIntake: async () => ({ kind: 'intake', title: 'Fixture Jordans', intake: { quantity: '1' }, delivery: { schema: 'receiz.bank.delivery-instructions.v1', recipient: 'Receiz', publicAlias: 'receiz', addressLines: ['1270 Ave of the Americas, 7th Fl', 'New York, NY 10020', 'United States'], reference: 'fef806e9-82bd-44a8-9bb4-f6b5afc9aef0' } }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<LiveDeposit identity={identity} onClose={() => {}} onRefresh={() => {}} />));
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('An asset'))!.click());
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Continue'))!.click());
    expect(host.textContent).toContain('1270 Ave of the Americas, 7th Fl');
    expect(host.textContent).toContain('fef806e9-82bd-44a8-9bb4-f6b5afc9aef0');
    expect(host.textContent).toContain('Awaiting verified receipt');
    expect(host.textContent).not.toContain('Added to your balance');
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
    act(() => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('All deposits'))!.click());
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
    act(() => click('Add money')); await act(async () => click('Continue')); act(() => click('All deposits')); act(() => click('Add money'));
    expect(host.textContent).toContain('Resume secure checkout');
    await act(async () => restore([])); expect(host.textContent).toContain('Resume secure checkout');
  } finally { act(() => root.unmount()); }
});
it('a provider return resumes only the exact saved checkout and checks credit without creating another session',async()=>{
 const checkout={sessionId:'cs_fixture123456',clientSecret:'saved-private-fixture',amountUsdCents:'25000'},begin=vi.fn(),check=vi.fn(async()=>({status:'credited'})),consume=vi.fn(),refresh=vi.fn();
 const identity={pendingCardDeposits:async()=>[checkout],beginCardDeposit:begin,checkCardDeposit:check}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={refresh} resumeSessionId={checkout.sessionId} onResumeConsumed={consume}/>));
 expect(check).toHaveBeenCalledExactlyOnceWith(checkout);expect(begin).not.toHaveBeenCalled();expect(consume).toHaveBeenCalledOnce();expect(refresh).toHaveBeenCalledOnce();expect(host.textContent).toContain('Added to your balance.');expect(host.querySelector('iframe')).toBeNull();
 act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='All deposits')!.click());expect(host.textContent).toContain('Choose what you’re depositing.');expect(check).toHaveBeenCalledOnce();
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

it('opens asset creation from the deposit chooser without starting any deposit',async()=>{
 const create=vi.fn(),start=vi.fn(),card=vi.fn(),identity={pendingCardDeposits:async()=>[],startAssetIntake:start,beginCardDeposit:card}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<LiveDeposit identity={identity} onClose={()=>{}} onRefresh={()=>{}} onCreateAsset={create}/>));const link=host.querySelector<HTMLButtonElement>('[aria-label="Create an asset instead"]');expect(link).not.toBeNull();await act(()=>link!.click());expect(create).toHaveBeenCalledOnce();expect(start).not.toHaveBeenCalled();expect(card).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
