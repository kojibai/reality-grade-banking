import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {expect,it} from 'vitest';
import {projectCompositeWalletAt,inspectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {inspectBalanceOriginal} from '../src/receiz/balance-calculation';
it('records representative live aggregate and one-open-Original costs without a timing gate',()=>{
 const rows=[];
 for(const count of [1,250,500]){const source:CompositeWalletSource={schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',earningMembershipPolicy:'public-pbi-original-v1',userId:'benchmark-display',throughKaiUPulse:'14860000000000',objects:Array.from({length:count},(_,i)=>({id:`original-${i}`,seed:{kind:'sigil',claimPulse:14800000+i,beat:i%36,stepIndex:i%44,creatorVerified:false},intervals:[{fromKaiUPulse:'14859900000000',toKaiUPulse:null}]})),movements:[],lawfulValues:[]};
  const start=performance.now(),point=projectCompositeWalletAt(source,source.throughKaiUPulse),aggregate=performance.now(),trace=inspectCompositeWalletAt(source,source.throughKaiUPulse),cached=performance.now(),one=inspectBalanceOriginal(trace.objects[0]),end=performance.now();
  expect(trace.point).toBe(point);expect(inspectCompositeWalletAt(source,source.throughKaiUPulse)).toBe(trace);expect(one.calculation.length).toBeGreaterThan(10);rows.push({originals:count,aggregateMs:+(aggregate-start).toFixed(3),sameFrameReadMs:+(cached-aggregate).toFixed(3),oneFullOriginalMs:+(end-cached).toFixed(3)});
 }if(process.env.BANK_BALANCE_BENCH_LOG)writeFileSync(process.env.BANK_BALANCE_BENCH_LOG,JSON.stringify(rows,null,2));
});
