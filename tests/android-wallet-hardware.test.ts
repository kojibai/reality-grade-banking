import { afterEach, expect, it, vi } from 'vitest';

const webOrigin = 'https://bankeiz.com';
const appOrigin = 'android-app://bankeiz.com';
const protocol = 'bankeiz.android-wallet.v1';
const ports: MessagePort[] = [];

async function loadBridge(pathname = '/app/android-launch') {
  vi.resetModules();
  let receive: (event: unknown) => void = () => {};
  const page = {
    location: { origin: webOrigin, pathname },
    addEventListener: (_type: string, listener: typeof receive) => { receive = listener; },
    get top() { return page; },
  };
  vi.stubGlobal('window', page);
  const bridge = await import('../src/receiz/android-wallet-hardware');
  function offer(origin = appOrigin, isTrusted = true, source: unknown = null, data = '') {
    const { port1, port2 } = new MessageChannel();
    ports.push(port1, port2);
    receive({ origin, isTrusted, source, data, ports: [port1] });
    return port2;
  }
  return { bridge, offer };
}

afterEach(() => {
  for (const port of ports.splice(0)) port.close();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('adopts the Chrome app port only after the ready message on that port', async () => {
  const { bridge, offer } = await loadBridge();
  const native = offer();
  const setup = bridge.bankAndroidWalletHardwareForSetup();
  expect(bridge.bankAndroidWalletHardware()).toBeNull();
  native.onmessage = event => {
    const request = JSON.parse(event.data);
    expect(request).toMatchObject({schema:protocol,operation:'enroll',slotDigest:'1'.repeat(64)});
    native.postMessage(JSON.stringify({schema:protocol,id:request.id,result:['certificate','issuer']}));
  };
  native.postMessage(JSON.stringify({schema:protocol,operation:'ready'}));
  const hardware = await setup;
  expect(hardware).not.toBeNull();
  await expect(hardware!.enroll('1'.repeat(64))).resolves.toEqual(['certificate','issuer']);
});

it('ignores readiness from any other origin, window or untrusted event', async () => {
  const { bridge, offer } = await loadBridge();
  const hello = JSON.stringify({schema:protocol,operation:'ready'});
  for (const port of [
    offer(webOrigin, true, null, hello), offer('android-app://other.test'),
    offer(appOrigin, false), offer(appOrigin, true, {}), offer('null'),
  ]) port.postMessage(hello);
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(bridge.bankAndroidWalletHardware()).toBeNull();
});

it('waits for native setup in the APK without falling back to browser enrollment', async () => {
  vi.useFakeTimers();
  const { bridge } = await loadBridge();
  const setup = bridge.bankAndroidWalletHardwareForSetup();
  const outcome = expect(setup).rejects.toThrow('BANK_ANDROID_WALLET_BRIDGE_UNAVAILABLE');
  await vi.advanceTimersByTimeAsync(4_000);
  await outcome;
});

it('leaves a normal website launch eligible for the existing browser path', async () => {
  const { bridge } = await loadBridge('/');
  await expect(bridge.bankAndroidWalletHardwareForSetup()).resolves.toBeNull();
});
