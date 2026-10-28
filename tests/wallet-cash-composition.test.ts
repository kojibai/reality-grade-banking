import {describe,it,expect} from 'vitest';
import {projectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {mergeCompositeWalletSources} from '../src/receiz/composite-wallet-source';
const basis={schema:'receiz.wallet.cash-plus-originals.v1' as const,phiOffsetMicro:'200000000',usdOffsetCents:'0',fromKaiUPulse:'15000000000000'};
const source=()=>({schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',composition:'cash-plus-originals',cashBasis:basis,cashBasisAccepted:true,userId:'owner',throughKaiUPulse:'15000000000000',objects:[],movements:[{id:'seed',kaiUPulse:'10000000000000',direction:'credit',phiMicro:'1000000000',usdCents:'100',reserveSliceUsdCents:'0',profileSeed:false},{id:'received',kaiUPulse:'11000000000000',direction:'credit',phiMicro:'50000000',usdCents:'10400',reserveSliceUsdCents:'0',profileSeed:false},{id:'spent',kaiUPulse:'12000000000000',direction:'debit',phiMicro:'1000000000',usdCents:'5500',reserveSliceUsdCents:'0',profileSeed:false}],lawfulValues:[]} as unknown as CompositeWalletSource);
describe('cash and Original display composition',()=>{
 it('retains the original cash and its complete recorded USD history without claiming unknown past Phi',()=>{
  const s=source(),now=projectCompositeWalletAt(s,s.throughKaiUPulse),past=projectCompositeWalletAt(s,'14999999999999');
  expect(now.balancePhiMicro).toBe('250000000');expect(now.totalUsdCents).toBe('5000');expect(past.totalUsdCents).toBe('5000');expect(past.balancePhiMicro).toBeUndefined();
 });
 it('uses the existing Original math plus prior cash and the captured Reserve cap without another read',()=>{
  const s=source();s.throughKaiUPulse='14000000000000';s.cashBasis={...basis,phiOffsetMicro:'-25000000',fromKaiUPulse:'13500000000000'};s.cashCapture={accountBalancePhiMicro:'125000000',usdPerPhiMicrocents:'100000000'};s.transport={after:null,cursor:null,capturedKaiUPulse:s.throughKaiUPulse};
  s.movements[1].reserveSliceUsdCents='10400';s.objects=[{id:'original',seed:{kind:'sigil',claimPulse:123456,beat:0,stepIndex:0,chakraDay:null,creatorVerified:false,kaiSignature:null,userPhiKey:null},intervals:[{fromKaiUPulse:'13500000000000',toKaiUPulse:null}]}];
  const point=projectCompositeWalletAt(s,s.throughKaiUPulse);expect(point.balancePhiMicro).toBe('106597793');expect(point.totalUsdCents).toBe('3087601');expect(point.reserveUsdCents).toBe('10400');
 });
 it('adds recorded postbalance evidence without changing a retained monetary original',()=>{
  const full=source(),old={...full,composition:'account-only' as const,cashBasis:undefined,cashBasisAccepted:undefined};
  const next={...full,movements:full.movements.map(row=>({...row,accountPostPhiMicro:'250000000'}))},merged=mergeCompositeWalletSources(old,next);
  expect(merged.movements.map(({accountPostPhiMicro,...row})=>row)).toEqual(full.movements);
  expect(()=>mergeCompositeWalletSources(merged,{...next,movements:next.movements.map(row=>({...row,accountPostPhiMicro:'1'}))})).toThrow();
 });
 it('keeps Reserve after a funded credit even when spending makes the cash residual negative',()=>{
  const s=source();s.throughKaiUPulse='14000000000000';s.cashBasis={...basis,phiOffsetMicro:'0',fromKaiUPulse:'13000000000000'};s.cashCapture={accountBalancePhiMicro:'60000000',usdPerPhiMicrocents:'200000000'};s.transport={after:null,cursor:null,capturedKaiUPulse:s.throughKaiUPulse};
  s.objects=[{id:'original',seed:{kind:'sigil',claimPulse:123456,beat:0,stepIndex:0,chakraDay:null,creatorVerified:false,kaiSignature:null,userPhiKey:null},intervals:[{fromKaiUPulse:'123456000000',toKaiUPulse:null}]}];
  s.movements=[{id:'spent',kaiUPulse:'13500000000000',direction:'debit',phiMicro:'50000000',usdCents:'10000',reserveSliceUsdCents:'0',profileSeed:false,accountPostPhiMicro:'50000000'},{id:'funded',kaiUPulse:'13700000000000',direction:'credit',phiMicro:'10000000',usdCents:'10000',reserveSliceUsdCents:'10000',profileSeed:false,accountPostPhiMicro:'60000000'}];
  expect(projectCompositeWalletAt(s,'13999999999999').reserveUsdCents).toBe('10000');expect(projectCompositeWalletAt(s,s.throughKaiUPulse).reserveUsdCents).toBe('10000');
 });
 it('does not accept a changed retained basis or erase a recorded movement',()=>{
  const s=source();expect(()=>mergeCompositeWalletSources(s,{...s,cashBasis:{...basis,phiOffsetMicro:'1'}} as CompositeWalletSource)).toThrow();
 });
 it('allows an unaccepted earning candidate to return to account-only cash without losing known postbalances',()=>{
  const pending={...source(),cashBasisAccepted:false,movements:source().movements.map(row=>({...row,accountPostPhiMicro:'250000000'}))};
  const next={...pending,composition:'account-only' as const,cashBasis:undefined,cashBasisAccepted:undefined,movements:pending.movements.map(({accountPostPhiMicro,...row})=>row)};
  const merged=mergeCompositeWalletSources(pending,next);
  expect(merged.composition).toBe('account-only');expect(merged.cashBasis).toBeUndefined();expect(merged.movements).toEqual(pending.movements);
  expect(projectCompositeWalletAt(merged,merged.throughKaiUPulse).totalUsdCents).toBe('5000');
 });
});
