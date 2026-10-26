// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { OfflineNotes } from '../src/features/notes/OfflineNotes';
import type { OpenIdentity } from '../src/receiz/native-identity';
import { createBankNoteAttestationFetch } from '../src/receiz/note-attestation-transport';
import { unattestedResponse } from './fixtures/note-registration';
import {atNoteStage} from '../src/receiz/note-stage';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const click = (host: HTMLElement, label: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.includes(label))!.click();
test('saving an older Note exports its sealed image without creating or depositing another Note',async()=>{
 const note={noteId:'saved-note',rail:'reserve',amountUsdCents:'200',image:new Uint8Array([1,2])},sealed=new Uint8Array([3,4]),create=vi.fn(),deposit=vi.fn(),exportImage=vi.fn().mockResolvedValue(sealed);
 const identity={offlineNotes:async()=>({savedNotes:async()=>[note],pending:async()=>null,create,deposit,exportImage})}as unknown as OpenIdentity;
 const blobs:Blob[]=[],url=vi.spyOn(URL,'createObjectURL').mockImplementation(value=>{blobs.push(value as Blob);return'blob:note-fixture';}),anchor=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));
  expect(exportImage).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());expect(exportImage).not.toHaveBeenCalled();
  await act(async()=>click(host,'Save note image'));
  expect(exportImage).toHaveBeenCalledExactlyOnceWith(note.image,note.noteId);expect([...new Uint8Array(await blobs.at(-1)!.arrayBuffer())]).toEqual([3,4]);
  expect(create).not.toHaveBeenCalled();expect(deposit).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());url.mockRestore();anchor.mockRestore();}
});
test.each(['create','deposit'] as const)('keeps conformance guidance out of the normal %s flow',async mode=>{
 const identity={offlineNotes:async()=>({savedNotes:async()=>[],pending:async()=>null})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode={mode} onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.querySelector('.note-continuity-details')).toBeNull();}finally{act(()=>root.unmount());}
});
test('explains the offline-creation standard only after that action requires a connection',async()=>{
 const identity={offlineNotes:async()=>({pending:async()=>null,create:async()=>{throw Error('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');}})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.querySelector('.note-continuity-details')).toBeNull();act(()=>click(host,'Review note'));await act(async()=>click(host,'Create funded note'));expect(host.querySelector('[role="alert"]')?.textContent).toBe('Connect to create this Note.');expect(host.querySelector('.note-continuity-details')).not.toBeNull();expect(host.textContent).not.toMatch(/ordinary device|coming soon/i);}finally{act(()=>root.unmount());}
});
test('records an offline incoming deposit immediately without describing it as confirmed global credit',async()=>{
 const value={noteId:'received-fixture',rail:'reserve',amountUsdCents:'200',amountPhiMicro:'1000000'},refresh=vi.fn();
 const identity={offlineNotes:async()=>({inspect:async()=>value,deposit:async()=>({...value,status:'received',proofBytes:new Uint8Array([1])})})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="deposit" onBack={vi.fn()} onRefresh={refresh}/>));const upload=host.querySelector('input[type="file"]')as HTMLInputElement;Object.defineProperty(upload,'files',{value:[{size:1,arrayBuffer:async()=>new Uint8Array([1]).buffer}]});await act(async()=>upload.dispatchEvent(new Event('change',{bubbles:true})));await act(async()=>click(host,'Deposit note'));expect(host.textContent).toContain('Your note is received.');expect(host.textContent).toContain('reconcile');expect(host.textContent).not.toContain('Your note is redeemed.');expect(host.querySelector('.note-continuity-details')).toBeNull();expect(refresh).toHaveBeenCalledOnce();}finally{act(()=>root.unmount());}
});
test('a failed local inventory read blocks review and shows only its bounded stage and exception name',async()=>{
 const create=vi.fn(),failure=new DOMException('private-fixture-data','OperationError');
 const identity={offlineNotes:async()=>({savedNotes:()=>atNoteStage('saved-notes',async()=>{throw failure;}),pending:async()=>null,create})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));
  expect(host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(true);
  act(()=>click(host,'Review note'));expect(create).not.toHaveBeenCalled();expect(host.textContent).toContain('Saved note custody could not be opened');
  expect(host.querySelector('.note-registration-details')?.textContent).toContain('saved-notes · OperationError');expect(host.textContent).not.toContain('private-fixture');
 }finally{act(()=>root.unmount());}
});
test('review stays unavailable while local pending discovery is in flight',async()=>{
 let finish!:(value:unknown)=>void;const create=vi.fn(),identity={offlineNotes:async()=>({savedNotes:async()=>[],pending:()=>new Promise(resolve=>{finish=resolve;}),create})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(true);await act(async()=>finish(null));expect(host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(false);expect(create).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
test('shows the actual browser format in failed registration details without exposing or altering its credential', async () => {
 const origin='https://bankeiz.com',challenge='a'.repeat(43),route='/api/wallet/notes/custody/attestation';
 const request=vi.fn().mockResolvedValueOnce({ok:true,origin,rpId:'bankeiz.com',challengeB64u:challenge,ticket:'never-display-ticket'}).mockRejectedValueOnce(new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED'));
 const transport=createBankNoteAttestationFetch({origin,request}),refresh=vi.fn();
 const identity={offlineNotes:async()=>({pending:async()=>null,create:async()=>{await transport(route);return transport(route,{method:'POST',body:JSON.stringify({challengeB64u:challenge,response:unattestedResponse()})});}})} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try {
  await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={refresh}/>));
  act(()=>click(host,'Review note'));await act(async()=>click(host,'Create funded note'));
  const details=host.querySelector<HTMLDetailsElement>('.note-registration-details');
  expect(details?.textContent).toContain('Attestation formatnone');expect(details?.textContent).toContain('Registration counter0');
  expect(details?.textContent).toContain('Backup eligibleYes');expect(details?.textContent).toContain('registration not qualified');expect(details?.open).toBe(false);
  expect(host.textContent).not.toContain('never-display');expect(host.textContent).not.toContain('Your note is ready.');expect(refresh).not.toHaveBeenCalled();
 } finally {act(()=>root.unmount());}
});
test.each([
 ['OFFLINE_NOTE_PLATFORM_ATTESTATION_ISSUER_UNAVAILABLE', /registration service.*unavailable/i],
 ['OFFLINE_NOTE_CUSTODY_CEREMONY_CANCELLED', /registration was cancelled/i],
 ['OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED', /browser did not provide.*device.*evidence/i],
 ['OFFLINE_NOTE_CUSTODY_BACKUP_CAPABLE', /credential.*sync/i],
 ['OFFLINE_NOTE_CUSTODY_UNSUPPORTED:OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE', /state counter/i],
 ['OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED', /keep.*original proof/i],
 ['RECEIZ_OFFLINE_NOTE_PLATFORM_ATTESTATION_CERTIFICATE_INVALID', /registration proof.*not.*verified/i],
])('preserves the specific registration failure %s without claiming unsupported hardware',async(code,expected)=>{
 const create=vi.fn().mockRejectedValue(new Error(code)),refresh=vi.fn();
 const identity={offlineNotes:async()=>({pending:async()=>null,create})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={refresh}/>));
  act(()=>click(host,'Review note'));await act(async()=>click(host,'Create funded note'));
  expect(host.querySelector('[role="alert"]')?.textContent).toMatch(expected);
  expect(host.textContent).not.toContain('Use a supported device');expect(host.textContent).not.toContain('Your note is ready.');expect(refresh).not.toHaveBeenCalled();
  const details=host.querySelector<HTMLDetailsElement>('.note-registration-details');expect(details?.open).toBe(false);expect(details?.querySelector('code')?.textContent).toBe(code.split(':').at(-1));
 }finally{act(()=>root.unmount());}
});
test('registration support details never serialize credential or account error payloads',async()=>{
 const failure=Object.assign(new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_INVALID\naccess_token=private-fixture-token'),{ticket:'private-fixture-ticket',credential:{rawId:'private-fixture-credential'},accountUserId:'private-fixture-account'});
 const identity={offlineNotes:async()=>({pending:async()=>null,create:async()=>{throw failure;}})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));act(()=>click(host,'Review note'));await act(async()=>click(host,'Create funded note'));expect(host.querySelector('[role="alert"]')).not.toBeNull();expect(host.textContent).not.toContain('private-fixture');expect(host.querySelector('.note-registration-details')).toBeNull();}finally{act(()=>root.unmount());}
});
test('preview and review do not allocate money; explicit create commits the exact amount once', async () => {
  const create = vi.fn(async () => ({ noteId: 'note-fixture', amountUsdCents: '10000', image: new Uint8Array([1, 2]) }));
  const identity = { offlineNotes: async () => ({ pending: async () => null, create }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host), refresh = vi.fn();
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={refresh} />));
    expect(host.textContent).toContain('PREVIEW'); expect(create).not.toHaveBeenCalled();
    act(() => click(host, 'Review note')); expect(create).not.toHaveBeenCalled();
    await act(async () => click(host, 'Create funded note'));
    expect(create).toHaveBeenCalledExactlyOnceWith('10000'); expect(refresh).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Your note is ready.'); expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull();
  } finally { act(() => root.unmount()); }
});
test('an interrupted creation resumes its retained amount and never offers a different new amount', async () => {
  const create = vi.fn().mockRejectedValue(new Error('BANK_NOTE_FUNDING_PENDING'));
  const identity = { offlineNotes: async () => ({ pending: async () => ({ noteId: 'retained', amountUsdCents: '12345' }), create }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.textContent).toContain('Resume your note.'); expect(host.querySelector('input[inputmode="decimal"]')).toBeNull();
    await act(async () => click(host, 'Resume this note'));
    expect(create).toHaveBeenCalledExactlyOnceWith('12345'); expect(host.textContent).toContain('exact attempt stays on this device');
    expect(host.textContent).not.toContain('Your note is ready.');
  } finally { act(() => root.unmount()); }
});
test('a verified cancellation after registration failure removes the stale Resume action while preserving the registration details',async()=>{
 const failure=new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED'),pending=vi.fn().mockResolvedValueOnce({noteId:'unissued',amountUsdCents:'100',canCancel:true}).mockResolvedValue(null);
 const identity={offlineNotes:async()=>({pending,create:async()=>{throw failure;}})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.textContent).toContain('Resume this note');await act(async()=>click(host,'Resume this note'));expect(host.textContent).not.toContain('Resume this note');expect(host.textContent).not.toContain('Discard unissued note');expect(host.querySelector('.note-registration-details')?.textContent).toContain('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED');expect(host.textContent).not.toContain('Your note is ready.');}finally{act(()=>root.unmount());}
});
test('an unreadable pending outcome never removes the retained Resume action',async()=>{
 const pending=vi.fn().mockResolvedValueOnce({noteId:'retained',amountUsdCents:'100',canCancel:true}).mockRejectedValue(new DOMException('private','OperationError'));
 const identity={offlineNotes:async()=>({pending,create:async()=>{throw new Error('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED');}})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));await act(async()=>click(host,'Resume this note'));expect(host.textContent).toContain('Resume this note');expect(host.textContent).not.toContain('private');}finally{act(()=>root.unmount());}
});
test('closing during creation cannot refresh or update another screen', async () => {
  let finish!: (v: unknown) => void;
  const create = vi.fn(() => new Promise(resolve => { finish = resolve; })), refresh = vi.fn();
  const identity = { offlineNotes: async () => ({ pending: async () => null, create }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={refresh} />));
  act(() => click(host, 'Review note')); act(() => click(host, 'Create funded note'));
  await act(async () => {}); act(() => root.unmount());
  await act(async () => finish({ noteId: 'retained', amountUsdCents: '10000', image: new Uint8Array([1]) }));
  expect(refresh).not.toHaveBeenCalled();
});
test('an interrupted transfer offers Resume and never claims ownership already moved', async () => {
  const transfer = vi.fn(async () => ({ noteId: 'pending-transfer', image: new Uint8Array([2]) }));
  const identity = { offlineNotes: async () => ({ pending: async () => null, savedNotes: async () => [{ noteId: 'pending-transfer', amountUsdCents: '200', image: new Uint8Array([1]), transferPending: true, transferred: false }], transfer }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()} />));
    await act(async () => click(host, '$2.00'));
    expect(host.textContent).not.toContain('Your note is transferred.');
    await act(async () => click(host, 'Resume transfer'));
    expect(transfer).toHaveBeenCalledExactlyOnceWith('pending-transfer');
    expect(host.textContent).toContain('Your note is transferred.');
  } finally { act(() => root.unmount()); }
});
test('Settlement note review binds its rail and deposit derives Settlement from verified inspection', async () => {
  const create = vi.fn(async () => ({ noteId: 'settlement-fixture', rail: 'settlement', amountUsdCents: '10000', amountPhiMicro: '50000000', image: new Uint8Array([1]) }));
  const identity = { offlineNotes: async () => ({ pending: async () => null, review:async()=>({rail:'settlement',amountUsdCents:'10000',amountPhiMicro:'50000000'}), create }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.querySelector('select')).toBeNull();
    await act(async () => click(host, 'Review note'));
    expect(host.textContent).toContain('Settlement'); expect(create).not.toHaveBeenCalled();
    await act(async () => click(host, 'Create funded note'));
    expect(create).toHaveBeenCalledExactlyOnceWith('10000');
    expect(host.querySelector('img')?.alt).toContain('Settlement Note');
  } finally { act(() => root.unmount()); }
});
test('recovery after a competing creation restores the pending rail and amount before resuming', async () => {
  const pending = vi.fn().mockResolvedValueOnce(null).mockResolvedValue({ noteId: 'other-tab', rail: 'reserve', amountUsdCents: '12345' });
  const create = vi.fn().mockRejectedValueOnce(new Error('BANK_NOTE_RESUME_EXACT_AMOUNT')).mockResolvedValue({ noteId: 'other-tab', rail: 'reserve', amountUsdCents: '12345', image: new Uint8Array([1]) });
  const identity = { offlineNotes: async () => ({ pending, create }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()} />));
    expect(host.querySelector('select')).toBeNull();
    act(() => click(host, 'Review note'));
    await act(async () => click(host, 'Create funded note'));
    expect(host.querySelector('select')).toBeNull();
    expect(host.textContent).toContain('$123.45');
    await act(async () => click(host, 'Resume this note'));
    expect(create).toHaveBeenLastCalledWith('12345');
    expect(host.textContent).toContain('Your note is ready.');
  } finally { act(() => root.unmount()); }
});
test('Settlement inspection and deposit preserve exact Phi beyond Number precision', async () => {
  const value = { noteId: 'large-exact', rail: 'settlement', amountUsdCents: '100', amountPhiMicro: '9007199254740993' };
  const identity = { offlineNotes: async () => ({ inspect: async () => value, deposit: async () => ({ ...value, proofBytes: new Uint8Array([1]), reserveAfterUsdCents: '0' }) }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="deposit" onBack={vi.fn()} onRefresh={vi.fn()} />));
    const upload = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(upload, 'files', { value: [{ size: 1, arrayBuffer: async () => new Uint8Array([1]).buffer }] });
    await act(async () => upload.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).toContain('9,007,199,254.740993 Φ');
    await act(async () => click(host, 'Deposit note'));
    expect(host.querySelector('.success-amount')?.textContent).toBe('$1.00');
    expect(host.querySelector('.note-value-details')?.textContent).toContain('9,007,199,254.740993 Φ');
  } finally { act(() => root.unmount()); }
});
test.each(['noteId', 'rail', 'amountPhiMicro', 'amountUsdCents'])('does not present a different %s as the reviewed deposited note', async field => {
  const inspected = { noteId: 'reviewed-note', rail: 'settlement', amountUsdCents: '100', amountPhiMicro: '9007199254740993' };
  const result = { ...inspected, [field]: field === 'rail' ? 'reserve' : field === 'noteId' ? 'another-note' : '1', proofBytes: new Uint8Array([1]), reserveAfterUsdCents: '0' };
  const identity = { offlineNotes: async () => ({ inspect: async () => inspected, deposit: async () => result }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host), refresh = vi.fn();
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="deposit" onBack={vi.fn()} onRefresh={refresh} />));
    const upload = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(upload, 'files', { configurable: true, value: [{ size: 1, arrayBuffer: async () => new Uint8Array([1]).buffer }] });
    await act(async () => upload.dispatchEvent(new Event('change', { bubbles: true })));
    await act(async () => click(host, 'Deposit note'));
    expect(host.textContent).not.toContain('Added to Settlement.');
    expect(host.querySelector('.success-amount')).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  } finally { act(() => root.unmount()); }
});
test('choosing a new invalid note clears the earlier deposit review', async () => {
  const inspect = vi.fn().mockResolvedValueOnce({ noteId: 'old-note', rail: 'reserve', amountUsdCents: '100', amountPhiMicro: '10' }).mockRejectedValueOnce(new Error('BANK_NOTE_SOURCE_REQUIRED'));
  const identity = { offlineNotes: async () => ({ inspect }) } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<OfflineNotes identity={identity} mode="deposit" onBack={vi.fn()} onRefresh={vi.fn()} />));
    const upload = host.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(upload, 'files', { configurable: true, value: [{ size: 1, arrayBuffer: async () => new Uint8Array([1]).buffer }] });
    await act(async () => upload.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).toContain('Deposit note');
    Object.defineProperty(upload, 'files', { value: [{ size: 1, arrayBuffer: async () => new Uint8Array([2]).buffer }] });
    await act(async () => upload.dispatchEvent(new Event('change', { bubbles: true })));
    expect(host.textContent).not.toContain('Deposit note');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  } finally { act(() => root.unmount()); }
});

test('shows the two funding contributions only for a combined Note without asking the user to select an account',async()=>{
 const funding={rail:'composite',amountUsdCents:'10000',amountPhiMicro:'100000000',fundingParts:{reserve:{amountUsdCents:'2500',amountPhiMicro:'25000000'},settlement:{amountUsdCents:'7500',amountPhiMicro:'75000000'}}};
 const create=vi.fn(async()=>({...funding,noteId:'combined',image:new Uint8Array([1])}));
 const identity={offlineNotes:async()=>({pending:async()=>null,savedNotes:async()=>[],review:async()=>funding,create})}as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.querySelector('select')).toBeNull();await act(async()=>click(host,'Review note'));expect(host.textContent).toContain('$25.00');expect(host.textContent).toContain('$75.00');expect(host.textContent).toContain('Settlement Note');expect(host.querySelector('.detail-list')?.textContent).not.toContain('Reserve');expect(host.querySelector('.detail-list')?.textContent).not.toContain('Settlement');expect(host.querySelector('.note-value-details')?.textContent).toContain('$25.00');expect(host.querySelector('.note-value-details')?.textContent).toContain('$75.00');expect(create).not.toHaveBeenCalled();await act(async()=>click(host,'Create funded note'));expect(create).toHaveBeenCalledExactlyOnceWith('10000');expect(host.querySelector('img')?.alt).toContain('Settlement Note');}finally{act(()=>root.unmount());}
});

test('locks the amount throughout a deferred review and confirms only the reviewed amount',async()=>{
 let finish!:(value:unknown)=>void;const review=vi.fn(()=>new Promise(resolve=>{finish=resolve;})),create=vi.fn(async()=>({noteId:'fixed',rail:'reserve',amountUsdCents:'10000',image:new Uint8Array([1])}));
 const identity={offlineNotes:async()=>({pending:async()=>null,review,create})}as unknown as OpenIdentity;const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));act(()=>click(host,'Review note'));const input=host.querySelector('input')!;expect(input.disabled).toBe(true);
 await act(async()=>{input.value='200';input.dispatchEvent(new Event('input',{bubbles:true}));finish({rail:'reserve',amountUsdCents:'10000'});});
 expect(host.querySelector('.detail-list')?.textContent).toContain('$100.00');await act(async()=>click(host,'Create funded note'));expect(create).toHaveBeenCalledExactlyOnceWith('10000');expect(review).toHaveBeenCalledExactlyOnceWith('10000');
 }finally{act(()=>root.unmount());}
});
test.each(['pending','confirmed'] as const)('labels a self-deposit %s original truthfully and never offers it as an addressed handover',async selfDeposit=>{
 const transfer=vi.fn(),note={noteId:'self-note',rail:'reserve',amountUsdCents:'200',image:new Uint8Array([1,2]),selfDeposit,transferred:false,transferPending:false,consumption:'connection-required'};
 const identity={offlineNotes:async()=>({savedNotes:async()=>[note],pending:async()=>null,transfer})}as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<OfflineNotes identity={identity} mode="create" onBack={vi.fn()} onRefresh={vi.fn()}/>));expect(host.textContent).toContain(selfDeposit==='pending'?'Deposit pending · original kept':'Deposited · original kept');await act(async()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());expect(host.textContent).not.toContain('Your note is addressed.');expect(host.textContent).not.toContain('Save this updated image and send it');expect(host.textContent).toContain(selfDeposit==='pending'?'Your deposit is pending.':'Your note is deposited.');expect(host.querySelector<HTMLInputElement>('input[type="file"]')?.disabled).toBe(true);expect(transfer).not.toHaveBeenCalled();if(selfDeposit==='pending'){note.selfDeposit='confirmed';await act(async()=>dispatchEvent(new Event('bankeiz:account-observation')));expect(host.textContent).toContain('Your note is deposited.');}}finally{act(()=>root.unmount());}
});
