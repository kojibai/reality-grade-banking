import {readFileSync} from 'node:fs';
import {transformSync} from 'esbuild';
import {expect,it} from 'vitest';
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
