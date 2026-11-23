// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { LiveReceive, LiveSend } from '../src/features/account/LivePayments';
import type { OpenIdentity } from '../src/receiz/native-identity';

function click(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find(el => el.textContent?.trim() === text);
  expect(button, text).toBeDefined();
  return act(async () => button!.click());
}

test('regular Send reviews and confirms the local funded Wallet while offline', async () => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const host = document.createElement('div'), root = createRoot(host);
  const heldReview = {
    recipientLabel: 'recipient.receiz.id', amountUsdCents: '100',
    quote: { amountPhiMicro: '500000', settledUsdCents: '70', ecosystemUsdCents: '30' },
  };
  const wallet = { warm: vi.fn(), outgoing: async () => null, review: vi.fn(async () => heldReview),
    confirm: vi.fn(async () => ({ qr: null, operationId: 'retained' })) };
  const connected = vi.fn();
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, fundedWallet: async () => wallet, walletSend: connected } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null}
      initialRequest={{ recipient: 'recipient', amount: '1.00' }} onClose={() => {}} />));
    await click(host, 'Review payment');
    expect(wallet.review).toHaveBeenCalledWith({ recipient: 'recipient', amountUsdCents: '100', note: '', nearby: false });
    expect(host.textContent).toContain('Composite balance');
    expect(host.textContent).toContain('funded Wallet balance');
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await click(host, 'Send payment');
    expect(wallet.confirm).toHaveBeenCalledWith(heldReview);
    expect(connected).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Wallet will deliver the signed payment when this device reconnects.');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});

test('regular Receive includes the Wallet QR scanner and keeps the existing Note action', async () => {
  const wallet = { warm: vi.fn(), availableReceipt: async () => null };
  const identity = { username: 'recipient', binding: { artifactSha256: 'b'.repeat(64) }, fundedWallet: async () => wallet } as unknown as OpenIdentity;
  const host = document.createElement('div'), root = createRoot(host);
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveReceive identity={identity}/>));
    expect(host.querySelector('[aria-label="Scan QR"]')).not.toBeNull();
    expect(host.querySelector('[aria-label="Your payment QR"]')).not.toBeNull();
    expect(host.textContent).toContain('Deposit note');
    expect(wallet.warm).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('regular Receive displays its held signed address on cold open offline', async () => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const host = document.createElement('div'), root = createRoot(host);
  const prepareReceivingUsername = vi.fn(async () => { throw Error('Offline'); });
  const wallet = { warm: vi.fn(), availableReceipt: async () => null };
  const identity = { binding: { artifactSha256: 'a'.repeat(64), artifactOwnerReceizId: 'receiver.receiz.id' },
    prepareReceivingUsername, fundedWallet: async () => wallet } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveReceive identity={identity}/>));
    expect(host.querySelector('[aria-label="Your payment QR"]')).not.toBeNull();
    expect(host.querySelector('.receiving-coordinate')?.textContent).toBe('receiver.receiz.id');
    expect(prepareReceivingUsername).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});
