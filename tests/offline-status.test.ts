import { expect, it, vi } from 'vitest';

it('requires a cache inventory response, rather than an active registration alone', async () => {
  const { readOfflineReadiness } = await import('../src/pwa/offline-status');
  const worker = { postMessage: (_value: unknown, ports: MessagePort[]) => ports[0].postMessage({ schema: 'bankeiz.offline-status.v1', build: 'a'.repeat(24), ready: false, required: 10, cached: 9 }) };
  const container = { controller: worker, getRegistration: async () => ({ active: worker }) };
  expect(await readOfflineReadiness(container as unknown as ServiceWorkerContainer)).toBe('Offline resources incomplete');
});
it('reports ready only for a consistent complete response and rejects inconsistent claims', async () => {
  const { readOfflineReadiness } = await import('../src/pwa/offline-status');
  let cached = 10;
  const worker = { postMessage: (_value: unknown, ports: MessagePort[]) => ports[0].postMessage({ schema: 'bankeiz.offline-status.v1', build: 'b'.repeat(24), ready: true, required: 10, cached }) };
  const container = { controller: worker } as unknown as ServiceWorkerContainer;
  expect(await readOfflineReadiness(container)).toBe('Ready for offline use');
  cached = 9; expect(await readOfflineReadiness(container)).toBe('Offline resources incomplete');
});
it('handles an unsupported or not-yet-active worker without hanging', async () => {
  const { readOfflineReadiness } = await import('../src/pwa/offline-status');
  expect(await readOfflineReadiness(undefined)).toBe('Not supported in this browser');
  expect(await readOfflineReadiness({ controller: null, getRegistration: async () => undefined } as unknown as ServiceWorkerContainer)).toBe('Preparing offline resources');
});
it('times out an older worker without presenting a false ready result', async () => {
  const { readOfflineReadiness } = await import('../src/pwa/offline-status');
  vi.useFakeTimers();
  try {
    const result = readOfflineReadiness({ controller: { postMessage: () => {} } } as unknown as ServiceWorkerContainer);
    await vi.runAllTimersAsync(); expect(await result).toBe('Offline resources not confirmed');
  } finally { vi.useRealTimers(); }
});
