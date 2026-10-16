export type OfflineReadiness = 'Ready for offline use' | 'Preparing offline resources' | 'Offline resources incomplete' | 'Offline resources not confirmed' | 'Not supported in this browser';

/** Public resource availability only. This never reads custody or qualifies a
 * proof, a balance, a device, or any financial operation. */
export async function readOfflineReadiness(container: ServiceWorkerContainer | undefined): Promise<OfflineReadiness> {
  if (!container) return 'Not supported in this browser';
  try {
    const worker = container.controller ?? (await container.getRegistration())?.active;
    if (!worker) return 'Preparing offline resources';
    return await new Promise<OfflineReadiness>(resolve => {
      const channel = new MessageChannel();
      const finish = (status: OfflineReadiness) => { clearTimeout(timer); channel.port1.close(); channel.port2.close(); resolve(status); };
      const timer = setTimeout(() => finish('Offline resources not confirmed'), 3500);
      channel.port1.onmessage = event => {
        const value = event.data;
        if (!value || value.schema !== 'bankeiz.offline-status.v1' || !/^[a-f0-9]{24}$/.test(value.build) || !Number.isSafeInteger(value.required) || value.required <= 0 || value.required > 10000 || !Number.isSafeInteger(value.cached) || value.cached < 0 || value.cached > value.required) { finish('Offline resources not confirmed'); return; }
        finish(value.ready === true && value.cached === value.required ? 'Ready for offline use' : 'Offline resources incomplete');
      };
      channel.port1.onmessageerror = () => finish('Offline resources not confirmed');
      try { worker.postMessage({ type: 'BANK_OFFLINE_STATUS', version: 1 }, [channel.port2]); }
      catch { finish('Offline resources not confirmed'); }
    });
  } catch { return 'Offline resources not confirmed'; }
}
