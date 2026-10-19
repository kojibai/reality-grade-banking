import {it,expect} from 'vitest';
import {readCompositeWalletSource,mergeCompositeWalletSources,compositeWalletObservation,advanceCompositeWalletObservation,reconcileCompositeWalletObservation} from '../src/receiz/composite-wallet-source';
import {projectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {hasSettledAccountView} from '../src/receiz/account-view';
import type {SharedWallet} from '../src/receiz/shared-wallet';
const source=():CompositeWalletSource=>({schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',userId:'owner',throughKaiUPulse:'14710000000000',objects:[{id:'a',seed:{kind:'sigil',claimPulse:10825210,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:'10825210000000',toKaiUPulse:null}]}],movements:[],lawfulValues:[]});
function observation(s=source()){const p=projectCompositeWalletAt(s,s.throughKaiUPulse),wallet:SharedWallet={userId:s.userId,totalUsdCents:p.totalUsdCents,settlementUsdCents:p.settlementUsdCents,reserveUsdCents:p.reserveUsdCents,balancePhiMicro:p.balancePhiMicro,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:false,pulse:null,kaiUpulse:null};return{wallet,observedAt:p.at};}
it('admits complete calculated periods from authenticated same-account operands before the visible frame',()=>{const s=source(),v=compositeWalletObservation(observation(s),s);expect(hasSettledAccountView(v)).toBe(true);expect(v?.history?.[0].kaiUPulse).toBe('10825210000000');expect(v?.chartSource).toBe(s);expect(v?.historyBasis?.kind).toBe('portfolio-model-v129');});
it('does not turn a chart source into spending authority or overwrite a local Note successor',()=>{const s=source();expect(compositeWalletObservation({...observation(s),source:'local-note-head',localHeadDigest:'a'.repeat(64)},s)).toBeNull();expect(compositeWalletObservation({...observation(s),wallet:{...observation(s).wallet,userId:'foreign'}},s)).toBeNull();expect(compositeWalletObservation({...observation(s),wallet:{...observation(s).wallet,totalUsdCents:'1'}},s)).toBeNull();});
it('advances only the new endpoint and retains held historical samples on every ordinary pulse',()=>{const s=source(),v=compositeWalletObservation(observation(s),s)!;const next=advanceCompositeWalletObservation(v,'14710001000000')!;expect(next.history!.slice(0,-1)).toEqual(v.history);expect(next.history!.at(-1)?.kaiUPulse).toBe('14710001000000');expect(next.wallet.totalUsdCents).not.toBe(v.wallet.totalUsdCents);expect(hasSettledAccountView(next)).toBe(true);});
it('merges append-only delta rows without accepting a changed old movement or dropping earlier retained movements',()=>{const a=source();a.movements=[{id:'one',kaiUPulse:'11000000000000',direction:'credit',phiMicro:'1',usdCents:'1',reserveSliceUsdCents:'0',profileSeed:false}];const b={...source(),throughKaiUPulse:'14710001000000',movements:[]};expect(mergeCompositeWalletSources(a,b).movements).toEqual(a.movements);expect(()=>mergeCompositeWalletSources(a,{...b,movements:[{...a.movements[0],usdCents:'2'}]})).toThrow();});
it('validates imported retained operands and binds the owner',()=>{expect(readCompositeWalletSource(source(),'other')).toBeNull();expect(readCompositeWalletSource({...source(),throughKaiUPulse:'no'},'owner')).toBeNull();expect(readCompositeWalletSource(source(),'owner')).not.toBeNull();});
it('preserves the complete retained curve when the unchanged authenticated wallet is refreshed',async()=>{
 const {reconcileCompositeWalletObservation}=await import('../src/receiz/composite-wallet-source');const s=source(),v=compositeWalletObservation(observation(s),s)!;
 const next=advanceCompositeWalletObservation(v,'14710001000000')!;
 const shared=reconcileCompositeWalletObservation(v,next.wallet,'14710001000000');expect(shared?.historyBasis?.kind).toBe('portfolio-model-v129');expect(shared?.history?.[0]).toEqual(v.history?.[0]);
 expect(reconcileCompositeWalletObservation(v,{...next.wallet,balancePhiMicro:'1'},'14710001000000')).toBeNull();
});
it('fills only an unseen resume interval while preserving every held historical point',()=>{
 const s=source(),v=compositeWalletObservation(observation(s),s)!,before=structuredClone(v.history);
 const next=advanceCompositeWalletObservation(v,'14710100000000')!;
 expect(next.history!.filter(row=>BigInt(row.kaiUPulse!)<=BigInt(s.throughKaiUPulse))).toEqual(before);
 expect(next.history!.length-before!.length).toBeLessThanOrEqual(104);expect(next.history!.at(-1)?.kaiUPulse).toBe('14710100000000');
});
it('keeps the newer locally calculated endpoint when an unchanged server observation is a few pulses behind',()=>{
 const s=source(),v=compositeWalletObservation(observation(s),s)!,later=advanceCompositeWalletObservation(v,'14710002000000')!;
 expect(reconcileCompositeWalletObservation(later,v.wallet,s.throughKaiUPulse)).toBe(later);
});
it('bounds retained render samples without losing the beginning or settled restore',async()=>{
 const {readWalletObservation}=await import('../src/receiz/wallet-observation'),{BANK_APPLICATION_ID}=await import('../src/receiz/config');
 const s=source(),v=compositeWalletObservation(observation(s),s)!,first=v.history![0],last=v.history!.at(-1)!;
 v.history=Array.from({length:4096},(_,i)=>({...last,kaiUPulse:String(BigInt(first.kaiUPulse!)+(BigInt(last.kaiUPulse!)-BigInt(first.kaiUPulse!))*BigInt(i)/4095n),at:new Date(Date.parse(first.at)+(Date.parse(last.at)-Date.parse(first.at))*i/4095).toISOString()}));
 const next=advanceCompositeWalletObservation(v,'14710001000000')!;expect(next.history!.length).toBeLessThanOrEqual(4096);expect(next.history![0].kaiUPulse).toBe(first.kaiUPulse);
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},restored=readWalletObservation({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,...next},binding);expect(hasSettledAccountView(restored)).toBe(true);
});
it('admits a debit-only delta after merging the retained credit prefix',()=>{const a=source();a.movements=[{id:'credit',kaiUPulse:'11000000000000',direction:'credit',phiMicro:'100',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false}];const delta={...source(),throughKaiUPulse:'14710001000000',movements:[{id:'debit',kaiUPulse:'14710000000001',direction:'debit' as const,phiMicro:'10',usdCents:'10',reserveSliceUsdCents:'0',profileSeed:false}]};const merged=mergeCompositeWalletSources(a,delta);expect(readCompositeWalletSource(merged,'owner')?.movements.length).toBe(2);});
it('preserves each held sample when a later authenticated movement extends the source',()=>{
 const a=source(),previous=compositeWalletObservation(observation(a),a)!;
 const next={...a,throughKaiUPulse:'14710010000000',movements:[{id:'new-credit',kaiUPulse:'14710005000000',direction:'credit' as const,phiMicro:'100',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false}]};
 const value=compositeWalletObservation(observation(next),next,previous)!;
 expect(value.history!.filter(row=>BigInt(row.kaiUPulse!)<=BigInt(a.throughKaiUPulse))).toEqual(previous.history);expect(hasSettledAccountView(value)).toBe(true);
});
it('places a newly synchronized payment at its recorded coordinate inside a locally advanced interval',()=>{
 const a={...source(),objects:[]},initial=compositeWalletObservation(observation(a),a)!,held=advanceCompositeWalletObservation(initial,'14710010000000')!;
 const event='14710005000000',next={...a,throughKaiUPulse:'14710012000000',movements:[{id:'late-credit',kaiUPulse:event,direction:'credit' as const,phiMicro:'100',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false}]};
 const value=compositeWalletObservation(observation(next),next,held)!;
 expect(value.history!.filter(row=>BigInt(row.kaiUPulse!)<BigInt(event)-1n)).toEqual(held.history!.filter(row=>BigInt(row.kaiUPulse!)<BigInt(event)-1n));
 expect(value.history!.find(row=>row.kaiUPulse===String(BigInt(event)-1n))?.totalUsdCents).toBe('0');
 expect(value.history!.find(row=>row.kaiUPulse===event)?.totalUsdCents).toBe('100');
 expect(value.history!.filter(row=>BigInt(row.kaiUPulse!)>=BigInt(event)).every(row=>row.totalUsdCents==='100')).toBe(true);
 expect(held.chartSource!.movements).toEqual([]);
});
it('corrects a stale display observation only in the newly reconciled interval',()=>{
 const a={...source(),objects:[]},initial=compositeWalletObservation(observation(a),a)!,held=advanceCompositeWalletObservation(initial,'14710010000000')!;
 held.history=held.history!.map(row=>row.kaiUPulse==='14710010000000'?{...row,valuation:undefined}:row);
 const next={...a,throughKaiUPulse:'14710012000000',movements:[{id:'late-credit',kaiUPulse:'14710005000000',direction:'credit' as const,phiMicro:'100',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false}]};
 const value=compositeWalletObservation(observation(next),next,held)!;
 expect(value.history!.find(row=>row.kaiUPulse==='14710010000000')?.totalUsdCents).toBe('100');
});
it('includes every newly learned object entry and exit edge inside a locally advanced interval',()=>{
 const a={...source(),objects:[]},initial=compositeWalletObservation(observation(a),a)!,held=advanceCompositeWalletObservation(initial,'14710010000000')!;
 const objects=[2,7].map(n=>({id:String(n),seed:{kind:'sigil' as const,claimPulse:14710000+n,beat:2,stepIndex:3,creatorVerified:true},intervals:[{fromKaiUPulse:String(14710000+n)+'000000',toKaiUPulse:n===7?'14710009000000':null}]}));
 const next={...a,throughKaiUPulse:'14710012000000',objects},value=compositeWalletObservation(observation(next),next,held)!;
 for(const edge of ['14710002000000','14710007000000','14710009000000']){expect(value.history!.some(row=>row.kaiUPulse===edge)).toBe(true);expect(value.history!.some(row=>row.kaiUPulse===(BigInt(edge)-1n).toString())).toBe(true);}
});
