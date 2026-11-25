// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';
import { LiveReceive, LiveSend } from '../src/features/account/LivePayments';
import type { OpenIdentity } from '../src/receiz/native-identity';

function click(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') ?? el.textContent?.trim()) === text);
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

test('regular Send keeps a funded review across a connection drop and skips the hosted transfer', async () => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const setOnline = (online: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
  setOnline(true);
  const host = document.createElement('div'), root = createRoot(host);
  const review = {
    recipientLabel: 'recipient.receiz.id', amountUsdCents: '100',
    quote: { amountPhiMicro: '500000', settledUsdCents: '70', ecosystemUsdCents: '30' },
  };
  const wallet = { warm: vi.fn(), outgoing: async () => null, review: vi.fn(async () => review),
    confirm: vi.fn(async () => ({ qr: null, operationId: 'retained' })) };
  const hosted = { status: async () => null, prepare: vi.fn(async () => { throw Error('Hosted transfer requested'); }) };
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, fundedWallet: async () => wallet,
    walletSend: async () => hosted } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null}
      initialRequest={{ recipient: 'recipient', amount: '1.00' }} onClose={() => {}} />));
    await click(host, 'Review payment');
    expect(wallet.review).toHaveBeenCalledOnce();
    expect(hosted.prepare).not.toHaveBeenCalled();
    expect(host.textContent).toContain('Composite balance');
    await act(async () => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await click(host, 'Send payment');
    expect(wallet.confirm).toHaveBeenCalledExactlyOnceWith(review);
    expect(hosted.prepare).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});

test('an online payment without a matching funded recipient uses the existing hosted review', async () => {
  const host = document.createElement('div'), root = createRoot(host);
  const review = {
    recipientLabel: '@recipient', amountUsdCents: '100',
    quote: { amountPhiMicro: '500000', settledUsdCents: '100', ecosystemUsdCents: '0' },
  };
  const wallet = { warm: vi.fn(), outgoing: async () => null,
    review: vi.fn(async () => { throw Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED'); }) };
  const hosted = { status: async () => null, prepare: vi.fn(async () => review), discard: vi.fn() };
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, fundedWallet: async () => wallet,
    walletSend: async () => hosted } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null}
      initialRequest={{ recipient: 'recipient', amount: '1.00' }} onClose={() => {}} />));
    await click(host, 'Review payment');
    expect(wallet.review).toHaveBeenCalledOnce();
    expect(hosted.prepare).toHaveBeenCalledExactlyOnceWith({ recipient: 'recipient', amountUsdCents: '100', note: '' });
    expect(host.textContent).toContain('@recipient');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('an unfunded offline attempt keeps its details and returns to regular Send on reconnect', async () => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  const setOnline = (online: boolean) => Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
  setOnline(false);
  const host = document.createElement('div'), root = createRoot(host);
  const wallet = { warm: vi.fn(), outgoing: async () => null, offer: async () => null,
    review: async () => { throw Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED'); } };
  const hosted = { status: async () => null, discard: vi.fn(), prepare: vi.fn(async () => ({
    recipientLabel: '@recipient', amountUsdCents: '100',
    quote: { amountPhiMicro: '500000', settledUsdCents: '100', ecosystemUsdCents: '0' },
  })) };
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, fundedWallet: async () => wallet,
    walletSend: async () => hosted } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null}
      initialRequest={{ recipient: 'recipient', amount: '1.00' }} onClose={() => {}} />));
    await click(host, 'Review payment');
    expect(host.querySelector('[role="status"]')?.textContent ?? '').toContain('Connect to pay from your balance.');
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(hosted.prepare).not.toHaveBeenCalled();
    await act(async () => { setOnline(true); window.dispatchEvent(new Event('online')); });
    await click(host, 'Review payment');
    expect(hosted.prepare).toHaveBeenCalledExactlyOnceWith({ recipient: 'recipient', amountUsdCents: '100', note: '' });
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});

test.each([
  { entry: 'typed' },
  { entry: 'scanned' },
])('creates a nearby payment QR offline for a $entry recipient', async ({ entry }) => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const host = document.createElement('div'), root = createRoot(host);
  const accountUid = '10000000-0000-4000-8000-000000000001';
  const recipientUserId = '10000000-0000-4000-8000-000000000002';
  const wallet = {
    warm: vi.fn(), outgoing: async () => null, offer: async () => null,
    review: async () => { throw Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED'); },
  };
  const review = { recipientLabel: 'coffee.receiz.id', amountUsdCents: '100', confirmationDigest: 'review', nearby: true };
  const deferred = {
    prepare: vi.fn(async () => review),
    approve: vi.fn(async () => ({ payment: { recipientUserId, amountUsdCents: '100' } })),
    resume: vi.fn(async () => {}),
  };
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const identity = {
    binding: { artifactSha256: 'a'.repeat(64) },
    fundedWallet: async () => wallet, deferredWalletSend: async () => deferred,
    knownMessagingDisplay: () => ({
      accountUid, inbox: [{
        updatedAt: '2026-11-24T12:00:00Z',
        members: [{ kind: 'user', userId: recipientUserId, username: 'coffee' }],
      }],
    }),
  } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null} onClose={() => {}}
      initialRequest={{ recipient: 'coffee.receiz.id', amount: '1.00', ...(entry === 'scanned' ? { nearbyRecipient: recipientUserId } : {}) }} />));
    await click(host, 'Create a payment QR');
    expect(deferred.prepare).toHaveBeenCalledExactlyOnceWith(
      { recipient: recipientUserId, amountUsdCents: '100', note: '', nearby: true },
      'coffee.receiz.id', true,
    );
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await click(host, 'Send payment');
    expect(deferred.approve).toHaveBeenCalledExactlyOnceWith(review, 'review');
    await act(async () => vi.waitFor(() => expect(deferred.resume).toHaveBeenCalledOnce()));
    expect(host.querySelector('canvas[aria-label="Wallet payment QR"]')?.getAttribute('data-frame')).toBe('0');
  } finally {
    await act(async () => root.unmount());
    canvas.mockRestore();
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});

test('the regular Send screen keeps an approved distant payment while offline', async () => {
  const prior = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  const host = document.createElement('div'), root = createRoot(host);
  const userId = '10000000-0000-4000-8000-000000000002';
  const wallet = { warm: vi.fn(), outgoing: async () => null, offer: async () => null,
    review: async () => { throw Error('BANK_WALLET_FUNDED_RECIPIENT_REQUIRED'); } };
  const review = { recipientLabel: 'Merchant', amountUsdCents: '100', confirmationDigest: 'review' };
  const deferred = { prepare: vi.fn(async () => review), approve: vi.fn(), resume: vi.fn(async () => {}) };
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, fundedWallet: async () => wallet,
    deferredWalletSend: async () => deferred } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<LiveSend identity={identity} wallet={null}
      initialRequest={{ recipient: userId, amount: '1.00' }} onClose={() => {}} />));
    await click(host, 'Send when I reconnect');
    expect(deferred.prepare).toHaveBeenCalledExactlyOnceWith({ recipient: userId, amountUsdCents: '100', note: '', nearby: false }, userId);
    expect(host.textContent).toContain('Wallet will use your balance when you reconnect.');
    await act(async () => host.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
    await click(host, 'Send payment');
    expect(deferred.approve).toHaveBeenCalledExactlyOnceWith(review, 'review');
    expect(host.textContent).toContain('Payment saved.');
    await click(host, 'Send another payment');
    expect(host.textContent).toContain('Create a payment QR');
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
    const paymentQr=host.querySelector('[aria-label="Your payment QR"]')!;
    const nearby=host.querySelector('.receive-nearby')!;
    const paymentLink=host.querySelector('.receive-payment-link')!;
    expect(paymentQr.compareDocumentPosition(nearby)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(paymentLink.nextElementSibling).toBe(nearby);
    expect(host.querySelector('[aria-label="Scan QR"]')).toBeNull();
    await click(host,'Receive nearby');
    expect(nearby.querySelector('[aria-label="Scan QR"]')).not.toBeNull();
    expect(nearby.querySelector('[aria-label="Use QR image"]')).not.toBeNull();
    expect(nearby.textContent).toContain('sender’s payment QR');
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
    expect(host.querySelector('.receive-nearby-toggle')?.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('.receive-nearby [aria-label="Scan QR"]')).not.toBeNull();
    expect(prepareReceivingUsername).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (prior) Object.defineProperty(navigator, 'onLine', prior);
    else Reflect.deleteProperty(navigator, 'onLine');
  }
});

test('the balance controls add and move back chosen amounts while leaving the rest offline', async () => {
  const { FundedWalletBalance } = await import('../src/features/account/FundedWalletPayments');
  const host = document.createElement('div'), root = createRoot(host);
  let cents = 2000n;
  const wallet = {
    offlineBalance: async () => ({ availableUsdCents: String(cents), movingBackUsdCents: null }),
    prepareOffline: vi.fn(async (amount: string) => { cents += BigInt(amount); }),
    moveBack: vi.fn(async (amount: string) => { cents -= BigInt(amount); return { status: 'published' }; }),
  };
  const identity = { fundedWallet: async () => wallet } as unknown as OpenIdentity;
  const refresh = vi.fn();
  const setAmount = async (label: string, value: string) => {
    const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  document.body.append(host);
  try {
    await act(async () => root.render(<FundedWalletBalance identity={identity} onRefresh={refresh}/>));
    expect(host.querySelector('[aria-label="Offline cash"]')?.textContent).toContain('Offline cash');
    expect(host.textContent).toContain('$20.00');
    await click(host, 'Enable more funds offline');
    await setAmount('Amount to enable offline', '10.00');
    await click(host, 'Enable offline');
    expect(wallet.prepareOffline).toHaveBeenCalledExactlyOnceWith('1000');
    expect(host.textContent).toContain('$30.00');
    await click(host, 'Move back');
    await setAmount('Amount to move back', '5.00');
    await click(host, 'Move back funds');
    expect(wallet.moveBack).toHaveBeenCalledExactlyOnceWith('500');
    expect(host.textContent).toContain('$25.00');
    expect(host.textContent).toContain('Funds moved back.');
    expect(refresh).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('offline setup explains a specific device refusal and keeps service issues distinct', async () => {
  const { FundedWalletBalance } = await import('../src/features/account/FundedWalletPayments');
  const host = document.createElement('div'), root = createRoot(host);
  const prepareOffline = vi.fn()
    .mockRejectedValueOnce({ payload: { error: 'OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED' } })
    .mockRejectedValueOnce(Error('Unsupported Receiz bank transport.'))
    .mockRejectedValueOnce({ payload: { error: 'android_wallet_enrollment_unavailable' } })
    .mockRejectedValueOnce(Error('Unexpected setup error'));
  const wallet = {
    offlineBalance: async () => ({ availableUsdCents: '0', movingBackUsdCents: null }),
    prepareOffline,
  };
  const identity = { fundedWallet: async () => wallet, nearbyWalletReceive:vi.fn() } as unknown as OpenIdentity;
  const onSendNearby=vi.fn();
  document.body.append(host);
  try {
    await act(async () => root.render(<FundedWalletBalance identity={identity} onRefresh={() => {}} onSendNearby={onSendNearby}/>));
    await click(host, 'Enable more funds offline');
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Amount to enable offline"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, '100');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(host, 'Enable offline');
    expect(host.querySelector('.wallet-balance-notice [role="status"]')?.textContent).toContain('Pay nearby with your balance');
    expect(host.querySelector('.wallet-balance-notice [role="status"]')?.textContent).toContain('connect to confirm');
    await click(host,'Send nearby');
    expect(onSendNearby).toHaveBeenCalledOnce();
    expect(host.querySelector('.wallet-balance-notice details a')?.getAttribute('href')).toBe('/conformance/#device-evidence');
    expect(host.querySelector('.wallet-balance-notice details')?.textContent).toContain('Direct WebAuthn attestation');
    expect(host.querySelector('.wallet-balance-notice code')?.textContent).toBe('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED');
    expect(host.querySelector('.error-message')).toBeNull();
    for (const explanation of ['request didn’t reach Receiz', 'Android enrollment service is temporarily unavailable', 'Offline Cash setup is incomplete']) {
      await click(host, 'Enable offline');
      expect(host.querySelector('.wallet-balance-notice [role="status"]')?.textContent).toContain('Pay nearby with your balance');
      expect(host.querySelector('.wallet-balance-notice details')?.textContent).toContain(explanation);
      expect(host.querySelector('.wallet-balance-notice a[href="/help/"]')).toBeNull();
      expect(host.querySelector('.wallet-balance-notice details')?.textContent).not.toContain('device provider');
      await click(host, 'Send nearby');
    }
    expect(onSendNearby).toHaveBeenCalledTimes(4);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
