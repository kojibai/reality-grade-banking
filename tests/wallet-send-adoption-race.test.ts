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
 const code=transformSync(`function harness(deps:any){let knownWallet=deps.initial;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk}=deps;${source.slice(start,end)}return {adopt:adoptConnectedWalletResponse,read:()=>knownWallet,async recorded(response:any){await adoptConnectedWalletResponse(response,'owner',walletRevision);walletRevision++;}};}`,{loader:'ts',target:'es2022'}).code;
 const harness=new Function(code+';return harness;')();
 const wallet=(kai:number,cents:number)=>({userId:'owner',kaiUpulse:String(kai),totalUsdCents:String(cents),reserveUsdCents:String(cents),settlementUsdCents:'0',balancePhiMicro:'0'});
 const api=harness({initial:{wallet:wallet(100,1000),observedAt:'initial'},noteOpen(){},parseSharedWallet:(r:any)=>r.wallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async(r:any)=>{if(r.old)await paused;return null;},reconcileCompositeWalletObservation:()=>null,extendWalletHistory:(_p:any,w:any,t:any)=>({wallet:w,observedAt:t}),prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:()=>({uPulse:'400'})}});
 const old=api.adopt({wallet:wallet(200,900),old:true},'owner',0);await Promise.resolve();await api.recorded({wallet:wallet(300,800)});
 expect(api.read().wallet.totalUsdCents).toBe('800');resume();await old;
 expect(api.read().wallet.kaiUpulse).toBe('300');expect(api.read().wallet.totalUsdCents).toBe('800');
});

it('publishes an admitted Send balance before slow chart work and ignores chart completion after a newer head',async()=>{
 const source=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),start=source.indexOf('  async function adoptConnectedWalletResponse('),end=source.indexOf('  async function refreshLocalValuation()',start);
 let resume!:()=>void,chartStarted=false;const paused=new Promise<void>(resolve=>resume=resolve),wallet=(kai:number,cents:number)=>({userId:'owner',kaiUpulse:String(kai),totalUsdCents:String(cents)});
 const code=transformSync(`function harness(deps:any){let knownWallet=deps.initial;let walletRevision=0;const lifetime={signal:{aborted:false}};const {noteOpen,parseSharedWallet,hasLocalWalletHead,protectedChartFrame,adoptChartResponse,reconcileCompositeWalletObservation,extendWalletHistory,prepareCompositeChart,persistWalletObservation,sdk}=deps;${source.slice(start,end)}return {read:()=>knownWallet,async recorded(response:any){await adoptConnectedWalletResponse(response,'owner',walletRevision,true);walletRevision++;}};}`,{loader:'ts',target:'es2022'}).code;
 const harness=new Function(code+';return harness;')(),api=harness({initial:{wallet:wallet(100,1000)},noteOpen(){},parseSharedWallet:(r:any)=>r.wallet,hasLocalWalletHead:()=>false,protectedChartFrame:()=>false,adoptChartResponse:async(r:any)=>{if(r.slow){chartStarted=true;await paused;return{wallet:r.wallet};}return null;},reconcileCompositeWalletObservation:()=>null,extendWalletHistory:(_p:any,w:any)=>({wallet:w}),prepareCompositeChart:async()=>{},persistWalletObservation:async()=>{},sdk:{receizKaiNow:()=>({uPulse:'400'})}});
 let completed=false;const first=api.recorded({wallet:wallet(200,900),slow:true}).then(()=>{completed=true;});
 try{
  for(let i=0;i<10;i++)await Promise.resolve();expect(completed).toBe(true);expect(api.read().wallet.totalUsdCents).toBe('900');await vi.waitFor(()=>expect(chartStarted).toBe(true));
  await api.recorded({wallet:wallet(300,800)});expect(api.read().wallet.totalUsdCents).toBe('800');
 }finally{resume();await first;for(let i=0;i<10;i++)await Promise.resolve();}
 expect(api.read().wallet.totalUsdCents).toBe('800');
});
