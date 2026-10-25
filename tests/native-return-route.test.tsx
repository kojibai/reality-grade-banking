// @vitest-environment happy-dom
import { act } from 'react';
import { readFileSync } from 'node:fs';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
const fixture = vi.hoisted(() => ({ identity: { binding: { identityOwnerReceizId: 'receiz_device_fixture', artifactOwnerReceizId: 'fixture.receiz.id' }, localHistory: {}, listDeposits: async () => [], pendingCardDeposit: async () => null } }));
vi.mock('../src/receiz/useNativeAccount', () => ({ useNativeAccount: () => ({ identity: fixture.identity, wallet: null, opening: false, busy: false, error: null, observedAt: null, refresh: async () => {}, forget: async () => {} }) }));
vi.mock('../src/features/market/Market', () => ({ Market: ({active}:{active:boolean}) => <span data-market-active={String(active)}/> }));
vi.mock('../src/features/ledger/Ledger', () => ({ Ledger: () => null }));
// Route/modal tests use a local account fixture. Public discovery has its own
// tests and must not make localhost requests while exercising navigation.
vi.mock('../src/receiz/usePublicMarket', () => ({ usePublicMarket: () => ({ catalog: null, status: 'loading', refresh: async () => {} }) }));
vi.mock('../src/features/messages/MessagesPanel',()=>({MessagesPanel:({active,initialBusinessRequest}:{active:boolean;initialBusinessRequest?:{id:string}|null})=><section data-messaging-active={String(active)} data-business-entry={initialBusinessRequest?.id??''}><input aria-label="Retained message draft" defaultValue=""/></section>}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('resumes the retained bank surface after returning from an in-app receipt',async()=>{
 history.replaceState(null,'','/#market');const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(async()=>root.render(<App/>));expect(host.querySelector('[data-market-active]')?.getAttribute('data-market-active')).toBe('true');
 history.pushState({bankReceipt:true},'','/receipt/#r=invalid');await act(async()=>{window.dispatchEvent(new Event('bankeiz:receipt'));window.dispatchEvent(new Event('receiz-bank:surface'));});expect(host.querySelector('[data-market-active]')?.getAttribute('data-market-active')).toBe('false');
 history.replaceState(null,'','/#market');await act(async()=>window.dispatchEvent(new PopStateEvent('popstate')));expect(host.querySelector('[data-market-active]')?.getAttribute('data-market-active')).toBe('true');
 }finally{act(()=>root.unmount());host.remove();history.replaceState(null,'','/');}
});

it('reopens Deposit after admission when returning from card checkout', async () => {
  history.replaceState(null, '', '/#account/deposit');
  const host = document.createElement('div'), root = createRoot(host);
  try {
    await act(async () => root.render(<App />));
    expect(location.hash).toBe('#account/deposit');
    expect(host.querySelector('dialog')?.textContent).toContain('Turn what you own');
  } finally { act(() => root.unmount()); history.replaceState(null, '', '/'); }
});

it('suspends an open bank sheet on public pages and restores its retained draft on return', async () => {
  history.replaceState(null, '', '/#account');
  const host = document.createElement('div'), root = createRoot(host); document.body.append(host);
  try {
    await act(async () => root.render(<App />));
    const opener = host.querySelector<HTMLButtonElement>('button.nav-deposit')!; opener.focus(); act(() => opener.click());
    const dialog = host.querySelector('dialog')!;
    expect(dialog.open).toBe(true); expect(document.body.style.position).toBe('fixed');
    act(() => [...dialog.querySelectorAll('button')].find(button => button.textContent?.includes('Dollars'))!.click());
    act(() => [...dialog.querySelectorAll('button')].find(button => button.textContent === '$250')!.click());
    const draft = dialog.querySelector('input')!; expect(draft.value).toBe('250');
    history.pushState(null, '', '/legal/');
    await act(async () => window.dispatchEvent(new Event('receiz-bank:surface')));
    expect(host.querySelector('dialog')).toBe(dialog); expect(dialog.open).toBe(false);
    expect(document.body.style.position).not.toBe('fixed'); expect(document.documentElement.style.overflow).not.toBe('hidden');
    const publicFocus = document.createElement('button'); document.body.append(publicFocus); publicFocus.focus();
    history.pushState(null, '', '/#account/deposit');
    await act(async () => window.dispatchEvent(new Event('receiz-bank:surface')));
    publicFocus.remove();
    expect(host.querySelector('dialog')).toBe(dialog); expect(dialog.open).toBe(true); expect(draft.isConnected).toBe(true); expect(draft.value).toBe('250');
    expect(document.body.style.position).toBe('fixed');
    history.replaceState(null, '', '/#account'); await act(async () => window.dispatchEvent(new Event('receiz-bank:surface')));
    expect(host.querySelector('dialog')).toBeNull(); expect(document.activeElement).toBe(opener);
  } finally { act(() => root.unmount()); host.remove(); history.replaceState(null, '', '/'); }
});

it('releases the native modal before focusing and scrolling the public guide destination', async () => {
  history.replaceState(null, '', '/#account/balance');
  const host = document.createElement('div'), root = createRoot(host); host.id = 'root'; document.body.append(host);
  const data = document.createElement('script'); data.id = 'receiz-navigation'; data.type = 'application/json';
  data.textContent = JSON.stringify({ pages: { '/learn/reserve-and-settlement/': { head: '<title>Guide</title>', content: '<header class="learn-header">Bankeiz</header><main id="main"><section id="the-receiving-standard">Receiving standard</section></main>' } }, bank: { head: '<title>Bank</title>', styles: [], entry: '/unused.js' } }); document.body.append(data);
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  let focusedAtAnchor: Element | null = null;
  const anchorScroll = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => { focusedAtAnchor = document.activeElement; });
  try {
    await act(async () => root.render(<App />));
    const dialog = host.querySelector('dialog')!; expect(dialog.open).toBe(true);
    const script = '// All public guides' + readFileSync('public/learn/learn.js', 'utf8').split('// All public guides')[1];
    new Function('window', 'document', 'location', 'history', 'scrollTo', 'Event', 'URL', script)(window, document, location, history, scroll, Event, URL);
    await act(async () => (host.querySelector('a[href="/learn/reserve-and-settlement/#the-receiving-standard"]') as HTMLAnchorElement).click());
    expect(location.pathname).toBe('/learn/reserve-and-settlement/'); expect(dialog.open).toBe(false); expect(host.hidden).toBe(true);
    expect(focusedAtAnchor).toBe(document.querySelector('#public-learn-root main'));
    expect(document.body.style.position).not.toBe('fixed');
    // Scroll-lock restoration must finish before the router applies the anchor.
    expect(anchorScroll.mock.invocationCallOrder.at(-1)).toBeGreaterThan(scroll.mock.invocationCallOrder.at(-1)!);
  } finally { act(() => root.unmount()); host.remove(); data.remove(); document.getElementById('public-learn-root')?.remove(); scroll.mockRestore(); anchorScroll.mockRestore(); history.replaceState(null, '', '/'); }
});

it('retains the opened messaging session and unsent draft through close and browser back',async()=>{
 history.replaceState(null,'','/#account');const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{await act(async()=>root.render(<App/>));expect(host.querySelector('[data-messaging-active]')).toBeNull();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open your agent and messages"]')!.click());const input=host.querySelector<HTMLInputElement>('[aria-label="Retained message draft"]')!;expect(input).not.toBeNull();input.value='Keep this unsent question';history.replaceState(null,'','/#account');await act(async()=>dispatchEvent(new PopStateEvent('popstate')));expect(host.querySelector('[data-messaging-active]')?.getAttribute('data-messaging-active')).toBe('false');await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open your agent and messages"]')!.click());expect(host.querySelector('[aria-label="Retained message draft"]')).toBe(input);expect(input.value).toBe('Keep this unsent question');}
 finally{act(()=>root.unmount());host.remove();history.replaceState(null,'','/');}
});

it('composes Get Business with the retained account and opens the assistant request without the standalone upgrade sheet',async()=>{
 history.replaceState(null,'','/business/');const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{
  await act(async()=>root.render(<App/>));
  history.pushState(null,'','/#account/messages/business');
  await act(async()=>dispatchEvent(new Event('receiz-bank:surface')));
  expect(host.querySelector('[data-messaging-active]')?.getAttribute('data-messaging-active')).toBe('true');
  expect(host.querySelector('[data-business-entry]')?.getAttribute('data-business-entry')).toBeTruthy();
  expect(host.querySelector('.bank-twin-upgrade')).toBeNull();
 }finally{act(()=>root.unmount());host.remove();history.replaceState(null,'','/');}
});
