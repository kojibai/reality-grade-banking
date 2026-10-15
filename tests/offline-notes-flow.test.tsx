// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { OfflineNotes } from '../src/features/notes/OfflineNotes';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const click = (host: HTMLElement, label: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.includes(label))!.click();
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
