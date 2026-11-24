const ORIGIN = 'https://bankeiz.com';
const PROTOCOL = 'bankeiz.android-wallet.v1';
const NO_HARDWARE = 'BANK_ANDROID_WALLET_HARDWARE_UNAVAILABLE';
const digest = /^[a-f0-9]{64}$/u;
type Pending = {resolve(result: unknown): void; reject(error: Error): void};

let channel: MessagePort | undefined;
const pending = new Map<string, Pending>();

if (typeof window !== 'undefined' && window.location.origin === ORIGIN && window === window.top) {
  window.addEventListener('message', event => {
    if (!event.isTrusted || event.source !== null || event.origin !== ORIGIN
      || event.ports.length !== 1 || typeof event.data !== 'string' || event.data.length > 255) return;
    try {
      const hello = JSON.parse(event.data);
      if (hello?.schema !== PROTOCOL || hello.operation !== 'ready') return;
    } catch { return; }
    channel?.close();
    for (const request of pending.values()) request.reject(Error(NO_HARDWARE));
    pending.clear();
    const port = event.ports[0]!;
    channel = port;
    port.onmessage = reply => {
      if (port !== channel || typeof reply.data !== 'string' || reply.data.length > 65_536) return;
      try {
        const body = JSON.parse(reply.data);
        if (body?.schema !== PROTOCOL || typeof body.id !== 'string') return;
        const request = pending.get(body.id);
        if (!request) return;
        if (body.error !== undefined) request.reject(Error(NO_HARDWARE));
        else if (Object.hasOwn(body, 'result')) request.resolve(body.result);
      } catch { /* Only a well-formed reply can resolve a request. */ }
    };
  });
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
