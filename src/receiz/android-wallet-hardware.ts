const ORIGIN = 'https://bankeiz.com';
const ANDROID_APP_ORIGIN = 'android-app://bankeiz.com';
const BRIDGE_UNAVAILABLE = 'BANK_ANDROID_WALLET_BRIDGE_UNAVAILABLE';
const PROTOCOL = 'bankeiz.android-wallet.v1';
const NO_HARDWARE = 'BANK_ANDROID_WALLET_HARDWARE_UNAVAILABLE';
const digest = /^[a-f0-9]{64}$/u;
type Pending = {resolve(result: unknown): void; reject(error: Error): void};

let channel: MessagePort | undefined;
let offeredPort: MessagePort | undefined;
const pending = new Map<string, Pending>();
const bridgeReady = new EventTarget();
const androidLaunch = typeof window !== 'undefined' && window.location.origin === ORIGIN
  && window === window.top && window.location.pathname === '/app/android-launch';

if (typeof window !== 'undefined' && window.location.origin === ORIGIN && window === window.top) {
  window.addEventListener('message', event => {
    // Chrome delivers the verified app port in an empty window message. App
    // messages, including its ready announcement, arrive on that port.
    if (!event.isTrusted || event.source !== null || event.origin !== ANDROID_APP_ORIGIN
      || event.data !== '' || event.ports.length !== 1) return;
    offeredPort?.close();
    const port = event.ports[0]!;
    offeredPort = port;
    port.onmessage = reply => {
      if ((port !== channel && port !== offeredPort) || typeof reply.data !== 'string' || reply.data.length > 65_536) return;
      try {
        const body = JSON.parse(reply.data);
        if (body?.schema !== PROTOCOL) return;
        if (port === offeredPort) {
          if (body.operation !== 'ready' || Object.keys(body).length !== 2) return;
          channel?.close();
          for (const request of pending.values()) request.reject(Error(NO_HARDWARE));
          pending.clear();
          offeredPort = undefined;
          channel = port;
          bridgeReady.dispatchEvent(new Event('ready'));
          return;
        }
        if (typeof body.id !== 'string') return;
        const request = pending.get(body.id);
        if (!request) return;
        if (body.error !== undefined) request.reject(Error(NO_HARDWARE));
        else if (Object.hasOwn(body, 'result')) request.resolve(body.result);
      } catch { /* Only a well-formed reply can resolve a request. */ }
    };
  });
}

/** Wait only during an explicit custody setup in the APK or its verified channel. */
export async function bankAndroidWalletHardwareForSetup(signal?: AbortSignal) {
  signal?.throwIfAborted();
  const hardware = bankAndroidWalletHardware();
  if (hardware || (!androidLaunch && !offeredPort)) return hardware;

  await new Promise<void>(resolve => {
    const finish = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', finish);
      bridgeReady.removeEventListener('ready', finish);
      resolve();
    };
    const timeout = setTimeout(finish, 4_000);
    bridgeReady.addEventListener('ready', finish, { once: true });
    signal?.addEventListener('abort', finish, { once: true });
  });
  signal?.throwIfAborted();
  const ready = bankAndroidWalletHardware();
  if (!ready) throw Error(BRIDGE_UNAVAILABLE);
  return ready;
}

export function bankAndroidWalletHardware() {
  if (!channel) return null;
  const port = channel;

  async function request(operation: 'enroll' | 'sign', slotDigest: string, payload?: string) {
    if (!digest.test(slotDigest) || port !== channel || pending.size >= 8) throw Error(NO_HARDWARE);
    const id = crypto.randomUUID();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await new Promise<unknown>((resolve, reject) => {
        timer = setTimeout(() => reject(Error(NO_HARDWARE)), 20_000);
        pending.set(id, { resolve, reject });
        port.postMessage(JSON.stringify({ schema: PROTOCOL, id, operation, slotDigest, ...(payload ? { payload } : {}) }));
      });
    } finally {
      clearTimeout(timer);
      pending.delete(id);
    }
  }

  return {
    async enroll(slotDigest: string): Promise<string[]> {
      const chain = await request('enroll', slotDigest);
      if (!Array.isArray(chain) || chain.length < 2 || chain.length > 6
        || !chain.every(value => typeof value === 'string' && value.length <= 10_923 && /^[A-Za-z0-9_-]+$/u.test(value)))
        throw Error(NO_HARDWARE);
      return chain;
    },
    async sign({ slotDigest, payload }: {slotDigest: string; payload: string}) {
      const result = await request('sign', slotDigest, payload) as {signatureB64u?: unknown} | undefined;
      if (typeof result?.signatureB64u !== 'string' || !/^[A-Za-z0-9_-]{86}$/u.test(result.signatureB64u))
        throw Error(NO_HARDWARE);
      return { signatureB64u: result.signatureB64u };
    },
  };
}
