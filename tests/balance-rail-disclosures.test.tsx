// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {LiveActions} from '../src/features/account/LiveActions';
import type {SharedWallet} from '../src/receiz/shared-wallet';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());vi.restoreAllMocks();});
const base={userId:'owner',totalUsdCents:'1000',reserveUsdCents:'100',settlementUsdCents:'900',balancePhiMicro:'2100000',reservePhiMicro:'100000',settlementPhiMicro:'2000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:'100000000'};
function view(wallet:SharedWallet|null){
 const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const host=document.createElement('div'),root=createRoot(host);roots.push(root);
 const identity={knownWallet:()=>null} as unknown as OpenIdentity;
 const render=(wallet:SharedWallet|null)=>act(()=>root.render(<LiveActions action={{kind:'balance'}} identity={identity} wallet={wallet} onClose={()=>{}} onForget={async()=>{}} onRefresh={()=>{}}/>));
 render(wallet);return{host,fetch,render,rail:(name:string)=>host.querySelector<HTMLDetailsElement>(`[data-balance-rail="${name}"]`)!};
}
it('preserves dollars and independently reveals exact source Phi at unequal funded rates without IO',async()=>{
 const v=view(base);expect(v.host.querySelector('.balance-sheet-amount')?.textContent).toBe('$10.00');
 const settlement=v.rail('settlement'),reserve=v.rail('reserve');expect(settlement).not.toBeNull();expect(reserve).not.toBeNull();
 expect(settlement.querySelector('summary')?.textContent).toContain('$9.00');expect(reserve.querySelector('summary')?.textContent).toContain('$1.00');
 expect(settlement.open).toBe(false);expect(reserve.open).toBe(false);expect(v.host.querySelector('[data-rail-phi]')).toBeNull();
 await act(async()=>settlement.querySelector('summary')!.click());expect(settlement.open).toBe(true);expect(settlement.querySelector('[data-rail-phi]')?.textContent).toBe('2 Φ');expect(reserve.open).toBe(false);
 await act(async()=>reserve.querySelector('summary')!.click());expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('0.1 Φ');
 await act(async()=>settlement.querySelector('summary')!.click());expect(settlement.open).toBe(false);expect(settlement.querySelector('[data-rail-phi]')).toBeNull();expect(v.fetch).not.toHaveBeenCalled();
});
it.each([
 {name:'funded Reserve with unknown units',reserveUsdCents:'100',settlementUsdCents:'900',reservePhiMicro:null,settlementPhiMicro:'2000000',balancePhiMicro:'2100000',expected:['settlement','reserve']},
 {name:'Reserve only',reserveUsdCents:'100',settlementUsdCents:'0',reservePhiMicro:'100000',settlementPhiMicro:'0',balancePhiMicro:'100000',expected:['reserve']},
 {name:'Settlement only',reserveUsdCents:'0',settlementUsdCents:'900',reservePhiMicro:'0',settlementPhiMicro:'2000000',balancePhiMicro:'2000000',expected:['settlement']},
 {name:'subcent total',reserveUsdCents:'0',settlementUsdCents:'0',reservePhiMicro:'1',settlementPhiMicro:'0',balancePhiMicro:'1',expected:['reserve']},
 {name:'true zero',reserveUsdCents:'0',settlementUsdCents:'0',reservePhiMicro:'0',settlementPhiMicro:'0',balancePhiMicro:'0',expected:['reserve']},
 {name:'subcent Reserve',reserveUsdCents:'0',settlementUsdCents:'900',reservePhiMicro:'1',settlementPhiMicro:'2000000',balancePhiMicro:'2000001',expected:['settlement']},
 {name:'zero-dollar Reserve with unknown units',reserveUsdCents:'0',settlementUsdCents:'900',reservePhiMicro:null,settlementPhiMicro:'2000000',balancePhiMicro:'2100000',expected:['settlement']},
])('shows only established funded rails, preserving $name',async input=>{
 const v=view({...base,...input,totalUsdCents:(BigInt(input.reserveUsdCents)+BigInt(input.settlementUsdCents)).toString()});
 expect([...v.host.querySelectorAll('[data-balance-rail]')].map(row=>row.getAttribute('data-balance-rail'))).toEqual(input.expected);
 const reserve=v.rail('reserve');if(reserve){await act(async()=>reserve.querySelector('summary')!.click());expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe(input.reservePhiMicro===null?'Exact Φ unavailable':input.reservePhiMicro==='1'?'0.000001 Φ':input.reservePhiMicro==='0'?'0 Φ':'0.1 Φ');}
 expect(v.fetch).not.toHaveBeenCalled();
});
it('keeps unknown balances distinct from a verified zero',async()=>{
 const v=view(null);expect(v.host.querySelector('.balance-sheet-amount')?.textContent).toBe('—');
 const reserve=v.rail('reserve');expect(reserve.querySelector('summary')?.textContent).toContain('Unavailable');await act(async()=>reserve.querySelector('summary')!.click());expect(reserve.querySelector('[data-rail-phi]')?.textContent).toBe('Exact Φ unavailable');expect(v.host.textContent).not.toContain('$0.00');expect(v.fetch).not.toHaveBeenCalled();
});
it('keeps an open rail on the same live wallet frame as the dollar header without another read',async()=>{
 const v=view(base),settlement=v.rail('settlement');await act(async()=>settlement.querySelector('summary')!.click());
 v.render({...base,totalUsdCents:'1100',settlementUsdCents:'1000',balancePhiMicro:'2200000',settlementPhiMicro:'2100000'});
 expect(v.host.querySelector('.balance-sheet-amount')?.textContent).toBe('$11.00');expect(settlement.open).toBe(true);expect(settlement.querySelector('summary')?.textContent).toContain('$10.00');expect(settlement.querySelector('[data-rail-phi]')?.textContent).toBe('2.1 Φ');expect(v.fetch).not.toHaveBeenCalled();
});

it('shows the already-carried exact account Phi total when an older frame omits its rail-unit aliases',async()=>{
 const v=view({...base,reservePhiMicro:null,settlementPhiMicro:null}),settlement=v.rail('settlement');
 await act(async()=>settlement.querySelector('summary')!.click());
 expect(settlement.querySelector('[data-rail-phi]')?.textContent).toBe('Account total · 2.1 Φ');
 expect(settlement.querySelector('summary')?.textContent).toContain('$9.00');
 v.render({...base,balancePhiMicro:'2200000',reservePhiMicro:null,settlementPhiMicro:null});
 expect(settlement.querySelector('[data-rail-phi]')?.textContent).toBe('Account total · 2.2 Φ');expect(v.fetch).not.toHaveBeenCalled();
});
