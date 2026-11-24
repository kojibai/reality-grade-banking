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
    .mockRejectedValueOnce(Error('BANK_WALLET_FUNDED_TRANSPORT_UNAVAILABLE'));
  const wallet = {
    offlineBalance: async () => ({ availableUsdCents: '0', movingBackUsdCents: null }),
    prepareOffline,
  };
  const identity = { fundedWallet: async () => wallet } as unknown as OpenIdentity;
  document.body.append(host);
  try {
    await act(async () => root.render(<FundedWalletBalance identity={identity} onRefresh={() => {}}/>));
    await click(host, 'Enable more funds offline');
    const input = host.querySelector<HTMLInputElement>('input[aria-label="Amount to enable offline"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(input, '100');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(host, 'Enable offline');
    expect(host.querySelector('.wallet-balance-notice [role="status"]')?.textContent).toContain('Device attestation was missing');
    expect(host.querySelector('.wallet-balance-notice details')?.textContent).toContain('Direct WebAuthn attestation');
    expect(host.querySelector('.wallet-balance-notice code')?.textContent).toBe('OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED');
    expect(host.querySelector('.error-message')).toBeNull();
    await click(host, 'Enable offline');
    expect(host.querySelector('.wallet-balance-notice [role="status"]')?.textContent).toContain('account service');
    expect(host.querySelector('.wallet-balance-notice details')).toBeNull();
    expect(host.querySelector('.wallet-balance-notice a')?.getAttribute('href')).toBe('/help/');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
