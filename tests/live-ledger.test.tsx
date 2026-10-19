// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Ledger } from '../src/features/ledger/Ledger';
import { BankContext } from '../src/core/useBank';
import { createDemoState } from '../src/core/demo';
import { parsePublicNetworkPage } from '../src/receiz/public-network';
import { PublicLedgerApp } from '../src/public-ledger/PublicLedgerApp';
import type { PersonalHistory } from '../src/receiz/personal-history';
import type {PublicLedgerFileReview} from '../src/receiz/public-ledger-proof';
const network = vi.hoisted(() => ({ state: {} as Record<string, unknown>, controls:{} as Record<string,unknown> }));
vi.mock('../src/receiz/usePublicNetwork', () => ({ usePublicNetwork: () => network.state }));
vi.mock('../src/features/ledger/useLedgerValueSource', () => ({ useLedgerValueSource: () => null }));
vi.mock('../src/public-ledger/LedgerProofControls', () => ({ LedgerProofControls: (props:Record<string,unknown>) => {network.controls=props;return <button>Memory Crystal</button>;} }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(() => { for (const root of roots.splice(0)) act(() => root.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals(); });
function mount(personalHistory?: PersonalHistory) {
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root);
  act(() => root.render(<BankContext.Provider value={{ state: createDemoState(), commit: vi.fn(), open: vi.fn(), close: vi.fn(), navigate: vi.fn(), saveRule: vi.fn(), updateIdentity: vi.fn(), resetDemo: vi.fn() }}><Ledger personalHistory={personalHistory}/></BankContext.Provider>)); return host;
}
function feed(count = 100) { return { records: parsePublicNetworkPage('actions', { ok: true, actions: Array.from({ length: count }, (_, i) => ({ id: String(i), actionKind: 'record', summary: `Public source ${i}`, pulse: i + 1 })), nextCursor: null }).records, sources: {}, bootstrap: false, refresh: vi.fn(), loadMore: vi.fn(), capturedAt: null }; }
it('opens the public activity feed without simulated bank receipts', () => {
  network.state = feed(); const host = mount(); expect(host.textContent).toContain('Public source'); expect(host.textContent).not.toContain('Demo social ledger'); expect(host.textContent).not.toContain('Design archive');expect(host.textContent).not.toContain('Memory Crystal');
});
it('offers the same compact proof receipt controls on public and personal ledger rows', () => {
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'profile:artist:proof',receizId:'proof',title:'Sealed proof',valueUsd:42.25}]}}).records[0];
 network.state={...feed(0),records:[record]};
 const host=mount({available:true,completeAtSealedHead:true,records:[record]});
 expect(host.querySelector('a[aria-label="Open receipt: Sealed proof"]')).not.toBeNull();
 expect(host.querySelector('button[aria-label="Copy receipt link: Sealed proof"]')).not.toBeNull();
 expect(host.querySelector('.ledger-value strong')?.textContent).toBe('$42.25');
 act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='My history')!.click());
 expect(host.querySelectorAll('.ledger-receipt-actions')).toHaveLength(1);
 expect(host.querySelector('a[aria-label="Open receipt: Sealed proof"]')).not.toBeNull();
});
it('shows proof value and receipt icons on the standalone public ledger', () => {
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'profile:artist:proof',receizId:'proof',title:'Sealed proof',valueUsd:42.25}]}}).records[0];
 network.state={...feed(0),records:[record]};
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);
 act(()=>root.render(<PublicLedgerApp/>));
 expect(host.querySelector('.public-ledger-amount strong')?.textContent).toBe('$42.25');
 expect(host.querySelector('.public-ledger-receipts a')?.getAttribute('href')).toContain('/receipt/#r=');
 expect(host.querySelector('button[aria-label="Copy receipt: Sealed proof"]')).not.toBeNull();
 expect(host.textContent).toContain('Memory Crystal');
});
it('passes all held rows to local save and opens frozen captured prices without refreshing live data',()=>{
 network.state=feed(100);const host=document.createElement('div'),root=createRoot(host);roots.push(root);
 act(()=>root.render(<PublicLedgerApp/>));
 act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Proofs')!.click());
 expect(host.querySelectorAll('.public-ledger-row')).toHaveLength(0);
 expect((network.controls.ledger as {records:unknown[]}).records).toHaveLength(100);
 const record=(network.state.records as ReturnType<typeof parsePublicNetworkPage>['records'])[0],review={kind:'archive',format:'crystal',artifactSha256:'a'.repeat(64),filename:'test-only.png',byteLength:1,ownerReceizId:null,kaiPulse:'99',sourceMimeType:'image/png',financialAdmission:false,archive:{records:[record],capturedAt:null,coverage:[],dataSha256:'a'.repeat(64),displayValues:[{id:record.id,value:{amountUsdCents:'12345',basis:'source-value',pulse:record.pulse,considerationUsdCents:null},currentValue:null,valuation:null}]}} as PublicLedgerFileReview;
 act(()=>(network.controls.onOpenArchive as (review:PublicLedgerFileReview)=>void)(review));
 expect(host.textContent).toContain('Captured Ledger · 1 sealed records');expect(host.querySelector('.public-ledger-amount strong')?.textContent).toBe('$123.45');
 expect(host.querySelector<HTMLButtonElement>('button[aria-label="Refresh public activity"]')!.disabled).toBe(true);expect(network.state.refresh).not.toHaveBeenCalled();
});
it('keeps an unopened identity personal history separate from the public feed and demo', () => {
  network.state = feed(); const host = mount(); act(() => [...host.querySelectorAll('button')].find(button => button.textContent === 'My history')!.click());
  expect(host.textContent).toContain('Open your account'); expect(host.textContent).not.toContain('Public source 99'); expect(host.textContent).not.toContain('Demo receipt');
});
it('appends visible rows automatically before the list end', () => {
  let reveal: ((items: { isIntersecting: boolean }[]) => void) | undefined;
  vi.stubGlobal('IntersectionObserver', class { constructor(callback: typeof reveal) { reveal = callback; } observe() {} disconnect() {} });
  network.state = feed(); const host = mount(); expect(host.querySelectorAll('.ledger-event')).toHaveLength(50);
  act(() => reveal!([{ isIntersecting: true }])); expect(host.querySelectorAll('.ledger-event')).toHaveLength(100);
});
it('filters public transfers and offers only compact receipt open and copy controls',async()=>{
 network.state={...feed(0),records:[...parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer',kind:'chat_transfer',summary:'Payment sent',pulse:14692714,amountUsdCents:'1200'},{id:'deposit',kind:'reserve_credit',summary:'Reserve deposit',amountUsdCents:'2000'}]}).records,...parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',actionKind:'record',summary:'Recorded action'}]}).records]};
 const copy=vi.fn().mockResolvedValue(undefined);vi.stubGlobal('navigator',{clipboard:{writeText:copy}});
 const host=mount();expect(host.querySelectorAll('.ledger-receipt-actions')).toHaveLength(3);
 act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent==='Transfers')!.click());
 expect(host.querySelectorAll('.ledger-event')).toHaveLength(1);expect(host.textContent).not.toContain('Reserve deposit');expect(host.textContent).not.toContain('Recorded action');
 const icons=host.querySelector('.ledger-receipt-actions')!;expect(icons.querySelector('a')?.getAttribute('href')).toContain('https://bankeiz.com/receipt/#r=');
 await act(async()=>icons.querySelector('button')!.click());expect(copy).toHaveBeenCalledOnce();expect(copy.mock.calls[0][0]).toContain('/receipt/#r=');
});
it('presents one payment with its exact delegated execution beneath it in both Ledger views',async()=>{
 const wallet=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer',kind:'chat_transfer',transferId:'same-payment',amountUsdCents:'100'}]}).records;
 const actions=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',actionKind:'wallet.transfer.connect',transferId:'same-payment',amountUsdCents:'100',entryHash:'a'.repeat(64)}]}).records;
 const originals=[...actions,...wallet],fetch=vi.fn();vi.stubGlobal('fetch',fetch);network.state={...feed(0),records:originals};
 for(const publicPage of [false,true]){
  const host=publicPage?document.createElement('div'):mount();
  if(publicPage){const root=createRoot(host);roots.push(root);act(()=>root.render(<PublicLedgerApp/>));}
  expect(host.querySelectorAll(publicPage?'.public-ledger-row':'.ledger-event')).toHaveLength(1);
  expect(host.textContent).toContain('Value transfer');expect(host.textContent).not.toContain('Delegated wallet transfer');
  expect(host.querySelectorAll('.ledger-value strong')).toHaveLength(1);expect(host.querySelector('.ledger-payment-execution')).toBeNull();
  await act(async()=>host.querySelector<HTMLButtonElement>(publicPage?'.public-ledger-event':'.asset-row')!.click());
  expect(host.textContent).toContain('Delegated wallet transfer');expect(host.textContent).toContain('Same payment · execution record');
  expect(host.querySelector('.ledger-payment-execution .ledger-inspector')).toBeNull();
  await act(async()=>{const details=host.querySelector('.ledger-payment-execution') as HTMLDetailsElement;details.open=true;details.dispatchEvent(new Event('toggle'));});
  expect(host.querySelector('.ledger-payment-execution .ledger-inspector')?.textContent).toContain('Referenced transfer amount');
  expect(host.querySelector('.ledger-payment-explanation')?.textContent).toContain('same payment');
 }
 expect(network.state.records).toBe(originals);expect(fetch).not.toHaveBeenCalled();
});
