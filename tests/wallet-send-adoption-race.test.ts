import {currentWalletObservation} from '../src/receiz/current-wallet-valuation';
import {keepsWalletCashComposition} from '../src/receiz/wallet-cash-basis';
import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {expect,it,vi} from 'vitest';
// Execute the actual adoption helper with chart/persistence service seams. The
// paused chart models a slow dynamic module or projection worker after HTTP.
it('a pre-Send account read cannot replace a newer recorded Send after chart preparation resumes',async()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8');
 const start=source.indexOf('  async function adoptConnectedWalletResponse('),end=source.indexOf('  async function refreshLocalValuation()',start);
 expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
 let resume!:()=>void;const paused=new Promise<void>(resolve=>{resume=resolve;});
 const code=transformSync(`function harness(deps:any){let knownWallet=deps.initial;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk,currentWalletObservation,keepsWalletCashComposition}=deps;${source.slice(start,end)}return {adopt:adoptConnectedWalletResponse,read:()=>knownWallet,async recorded(response:any){await adoptConnectedWalletResponse(response,'owner',walletRevision);walletRevision++;}};}`,{loader:'ts',target:'es2022'}).code;
 const harness=new Function(code+';return harness;')();
 const wallet=(kai:number,cents:number)=>({userId:'owner',kaiUpulse:String(kai),totalUsdCents:String(cents),reserveUsdCents:String(cents),settlementUsdCents:'0',balancePhiMicro:'0'});
 const api=harness({keepsWalletCashComposition,currentWalletObservation,initial:{wallet:wallet(100,1000),observedAt:'initial'},noteOpen(){},parseSharedWallet:(r:any)=>r.wallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async(r:any)=>{if(r.old)await paused;return null;},reconcileCompositeWalletObservation:()=>null,extendWalletHistory:(_p:any,w:any,t:any)=>({wallet:w,observedAt:t}),prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:()=>({uPulse:'400'})}});
 const old=api.adopt({wallet:wallet(200,900),old:true},'owner',0);await Promise.resolve();await api.recorded({wallet:wallet(300,800)});
 expect(api.read().wallet.totalUsdCents).toBe('800');resume();await old;
 expect(api.read().wallet.kaiUpulse).toBe('300');expect(api.read().wallet.totalUsdCents).toBe('800');
});

it('publishes an admitted Send balance before slow chart work and ignores chart completion after a newer head',async()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),start=source.indexOf('  async function adoptConnectedWalletResponse('),end=source.indexOf('  async function refreshLocalValuation()',start);
 let resume!:()=>void,chartStarted=false;const paused=new Promise<void>(resolve=>resume=resolve),wallet=(kai:number,cents:number)=>({userId:'owner',kaiUpulse:String(kai),totalUsdCents:String(cents)});
 const code=transformSync(`function harness(deps:any){let knownWallet=deps.initial;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk,currentWalletObservation,keepsWalletCashComposition}=deps;${source.slice(start,end)}return {read:()=>knownWallet,async recorded(response:any){await adoptConnectedWalletResponse(response,'owner',walletRevision,true);walletRevision++;}};}`,{loader:'ts',target:'es2022'}).code;
 const harness=new Function(code+';return harness;')(),api=harness({keepsWalletCashComposition,currentWalletObservation,initial:{wallet:wallet(100,1000)},noteOpen(){},parseSharedWallet:(r:any)=>r.wallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async(r:any)=>{if(r.slow){chartStarted=true;await paused;return{wallet:r.wallet};}return null;},reconcileCompositeWalletObservation:()=>null,extendWalletHistory:(_p:any,w:any)=>({wallet:w}),prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:()=>({uPulse:'400'})}});
 let completed=false;const first=api.recorded({wallet:wallet(200,900),slow:true}).then(()=>{completed=true;});
 try{
  for(let i=0;i<10;i++)await Promise.resolve();expect(completed).toBe(true);expect(api.read().wallet.totalUsdCents).toBe('900');await vi.waitFor(()=>expect(chartStarted).toBe(true));
  await api.recorded({wallet:wallet(300,800)});expect(api.read().wallet.totalUsdCents).toBe('800');
 }finally{resume();await first;for(let i=0;i<10;i++)await Promise.resolve();}
 expect(api.read().wallet.totalUsdCents).toBe('800');
});
it('evaluates one optional current candidate at one existing clock sample, and adds no clock/helper call to legacy adoption',async()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),start=source.indexOf('  async function adoptConnectedWalletResponse('),end=source.indexOf('  async function refreshLocalValuation()',start);
 const code=transformSync(`function harness(deps:any){let knownWallet=null;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk,currentWalletObservation,keepsWalletCashComposition}=deps;${source.slice(start,end)}return {adopt:adoptConnectedWalletResponse,read:()=>knownWallet};}`,{loader:'ts',target:'es2022'}).code,harness=new Function(code+';return harness;')();
 const packet=JSON.parse(readFileSync(new URL('./fixtures/current-balance/mixed.json',import.meta.url),'utf8')),{parseSharedWallet}=await import('../src/receiz/shared-wallet');
 const clock=vi.fn(()=>({uPulse:String(BigInt(packet.wallet.currentBalanceSource.computedPulse+1)*1_000_000n)})),inspect=vi.fn(currentWalletObservation),extend=vi.fn((_p:any,w:any)=>({wallet:w}));
 const deps={keepsWalletCashComposition,noteOpen(){},parseSharedWallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async()=>null,reconcileCompositeWalletObservation:()=>null,extendWalletHistory:extend,prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:clock},currentWalletObservation:inspect};
 const api=harness(deps),returned=await api.adopt(packet,packet.wallet.userId,0);expect(returned).toBe(api.read().wallet);expect(inspect).toHaveBeenCalledTimes(1);expect(clock).toHaveBeenCalledTimes(1);expect(extend).not.toHaveBeenCalled();
 inspect.mockClear();clock.mockClear();const legacy=harness({...deps,parseSharedWallet:(r:any)=>r.wallet});await legacy.adopt({wallet:{userId:'owner',totalUsdCents:'0'}},'owner',0);expect(inspect).not.toHaveBeenCalled();expect(clock).toHaveBeenCalledTimes(1);
 inspect.mockClear();clock.mockClear();const invalid=harness(deps);await invalid.adopt({...packet,wallet:{...packet.wallet,currentBalanceSource:{...packet.wallet.currentBalanceSource,artifactBaseUsdCents:'1'}}},packet.wallet.userId,0);expect(inspect).toHaveBeenCalledTimes(1);expect(clock).toHaveBeenCalledTimes(1);
});
it('keeps accepted cash context without holding a completed financial result behind a missing calculation packet',async()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),start=source.indexOf('  async function adoptConnectedWalletResponse('),end=source.indexOf('  async function refreshLocalValuation()',start);
 const code=transformSync(`function harness(deps:any){let knownWallet=deps.initial;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk,currentWalletObservation,keepsWalletCashComposition}=deps;${source.slice(start,end)}return {adopt:adoptConnectedWalletResponse,read:()=>knownWallet};}`,{loader:'ts',target:'es2022'}).code,harness=new Function(code+';return harness;')();
 const packet=JSON.parse(readFileSync(new URL('./fixtures/current-balance/public.json',import.meta.url),'utf8')),{parseSharedWallet}=await import('../src/receiz/shared-wallet'),wallet=parseSharedWallet(packet,packet.wallet.userId),basis={schema:'receiz.wallet.cash-plus-originals.v1' as const,phiOffsetMicro:'0',usdOffsetCents:'0',fromKaiUPulse:String(BigInt(wallet.currentBalanceSource!.computedPulse)*1000000n)};
 const initial={wallet:{...wallet,kaiUpulse:'100',currentBalanceSource:{...wallet.currentBalanceSource!,cashBasis:basis,cashBasisAccepted:true}},observedAt:'initial'};
 const deps={initial,keepsWalletCashComposition,currentWalletObservation,noteOpen(){},parseSharedWallet:(r:any)=>r.wallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async()=>null,reconcileCompositeWalletObservation:()=>null,extendWalletHistory:(_p:any,w:any)=>({wallet:w}),prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:()=>({uPulse:String(BigInt(basis.fromKaiUPulse)+1000000n)})}};const api=harness(deps);
 const stale={wallet:{...wallet,kaiUpulse:'100',currentBalanceSource:undefined}};
 await api.adopt(stale,wallet.userId,0);expect(api.read()).toBe(initial);
 const completed={wallet:{...wallet,kaiUpulse:'101',currentBalanceSource:undefined}};
 await api.adopt(completed,wallet.userId,0,true);
 expect(api.read().wallet.totalUsdCents).toBe(wallet.totalUsdCents);expect(api.read().wallet.kaiUpulse).toBe('101');expect(api.read().wallet.currentBalanceSource).toEqual({...initial.wallet.currentBalanceSource,historicalContextOnly:true});
 expect(currentWalletObservation(api.read().wallet)).toBeNull();
 const pending=harness({...deps,initial:{...initial,wallet:{...initial.wallet,currentBalanceSource:{...initial.wallet.currentBalanceSource,cashBasisAccepted:false}}}});
 await pending.adopt({wallet:{...wallet,kaiUpulse:'100',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0',balancePhiMicro:'0',currentBalanceSource:undefined}},wallet.userId,0);
 expect(pending.read().wallet.totalUsdCents).toBe('0');expect(pending.read().wallet.currentBalanceSource).toBeUndefined();
});
