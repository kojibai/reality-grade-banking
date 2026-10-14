// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ReceizCardCheckout } from '../src/features/deposit/ReceizCardCheckout';
(window as unknown as { happyDOM: { settings: { disableIframePageLoading: boolean } } }).happyDOM.settings.disableIframePageLoading = true;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('supplies Safari-compatible Receiz bootstrap only in the iframe fragment and visibly reports a stalled frame', async () => {
  vi.useFakeTimers();
  const host = document.createElement('div'), root = createRoot(host), onCheck = vi.fn();
  try {
    act(() => root.render(<ReceizCardCheckout checkout={{ sessionId: 'cs_test_fixture_1234', clientSecret: 'test-secret', amountUsdCents: '25000' }} onCheck={onCheck} />));
    const url = new URL(host.querySelector('iframe')!.src);
    expect(url.search).toBe(''); expect(new URLSearchParams(url.hash.slice(1)).get('client_secret')).toBe('test-secret');
    expect(host.textContent).toContain('Loading secure');
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(host.textContent).toContain('did not load'); expect(onCheck).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); vi.useRealTimers(); }
});
