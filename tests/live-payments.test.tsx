// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi, afterEach } from 'vitest';
import { LiveReceive, LiveSend } from '../src/features/account/LivePayments';
import { readCardReturn } from '../src/features/deposit/CardDepositReturn';
import type { OpenIdentity } from '../src/receiz/native-identity';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.unstubAllGlobals());
it('generates the bank QR and writes only the public request URL to NFC on explicit user action', async () => {
  const write = vi.fn().mockResolvedValue(undefined); vi.stubGlobal('isSecureContext', true); Object.assign(window, { NDEFReader: class { write = write; } });
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveReceive identity={{ binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'test-public-coordinate' } } as OpenIdentity} />));
    expect(host.querySelector('svg[aria-label="Your Receiz Bank payment QR"]')).not.toBeNull(); expect(write).not.toHaveBeenCalled();
    expect(host.querySelector('.payment-link')!.textContent).toBe('https://bank.receiz.com/?to=test-public-coordinate');
    await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Set up NFC tag'))!.click());
    expect(write.mock.calls[0][0]).toEqual({ records: [{ recordType: 'url', data: 'https://bank.receiz.com/?to=test-public-coordinate' }] });
    expect(host.textContent).toContain('Tag ready.');
  } finally { act(() => root.unmount()); delete (window as unknown as { NDEFReader?: unknown }).NDEFReader; }
});
it('a scanned/shared request preloads the in-bank form without auto-executing a transfer', () => {
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<LiveSend wallet={null} initialRequest={{ recipient: 'public-coordinate', amount: '12.30' }} onClose={vi.fn()} />));
    expect((host.querySelector('input[placeholder="Receiz ID or public username"]') as HTMLInputElement).value).toBe('public-coordinate');
    expect(host.textContent).toContain('Review payment'); expect(host.querySelector('a[href*="receiz.com/wallet"]')).toBeNull(); expect(host.textContent).not.toContain('Value sent');
  } finally { act(() => root.unmount()); }
});
it('a provider return is only an exact session signal, never payment proof', () => {
  expect(readCardReturn('?cardReturn=1&session_id=cs_test_12345678')).toBe('cs_test_12345678');
  expect(readCardReturn('?cardReturn=1&session_id=not-a-session')).toBeNull();
  expect(readCardReturn('?cardReturn=1&session_id=cs_test_12345678&session_id=cs_other_12345678')).toBeNull();
});
