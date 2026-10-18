import {expect,it} from 'vitest';
import {historicalWalletUsdRate,projectHistoricalWallet} from '../src/receiz/historical-wallet';
import type {AccountProofTransaction} from '../src/receiz/account-proof-statement';

const row=(sequence:number,kai:string,reserve:string,phi:string,kind='payment-received'):AccountProofTransaction=>({sequence,transactionId:`tx${sequence}`,eventDigest:String(sequence).padStart(64,'0'),previousEventDigest:String(sequence-1).padStart(64,'0'),kaiUPulse:kai,kind,description:'Accepted source activity',reserveDeltaUsdCents:reserve,settlementDeltaPhiMicro:phi,balanceDeltaPhiMicro:phi});
it.each([['0','4429539340'],['1000000','4739393994'],['13959986000000','10334803184'],['14692714000000','9079009810']])('uses the existing wallet pricing law at %s, independently of the checkpoint rate', (kai,rate)=>{
 expect(historicalWalletUsdRate(kai)).toBe(rate);
});
it('replays real holdings from the first sealed activity and values each point at its own coordinate',()=>{
 const transactions=[row(1,'0','0','0','account-created'),row(2,'1000000','1000','0','deposit'),row(3,'2000000','0','1000000'),row(4,'4000000','0','-250000')];
 const history=projectHistoricalWallet({transactions,userId:'account',endKaiUPulse:'10000000'});
 expect(history[0]).toMatchObject({kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0',valuation:'deterministic-v129'});
 const acquired=history.find(point=>point.kaiUPulse==='2000000')!;
 expect(acquired.reserveUsdCents).toBe('1000');expect(acquired.settlementUsdCents).toBe('5024');expect(acquired.totalUsdCents).toBe('6024');
 const end=history.at(-1)!;
 expect(end.kaiUPulse).toBe('10000000');expect(end.reserveUsdCents).toBe('1000');expect(end.settlementUsdCents).toBe('3069');
 expect(history.every(point=>BigInt(point.totalUsdCents)===BigInt(point.reserveUsdCents)+BigInt(point.settlementUsdCents))).toBe(true);
});
it('never applies a later accepted balance to a backdated identity activity',()=>{
 const transactions=[row(1,'2000000','1000','0','deposit'),row(2,'1000000','0','0','account-opened')];
 const history=projectHistoricalWallet({transactions,userId:'account',endKaiUPulse:'3000000'});
 expect(history[0]).toMatchObject({kaiUPulse:'1000000',reserveUsdCents:'0'});
 expect(history.find(point=>point.kaiUPulse==='2000000')?.reserveUsdCents).toBe('1000');
});
it('keeps each chart period populated from the same complete source without inventing activity',()=>{
 const transactions=[row(1,'1000000','0','0','account-created'),row(2,'2000000','0','1000000')];
 const input={transactions,userId:'account',endKaiUPulse:'15000000000000'};
 const history=projectHistoricalWallet(input);
 expect(history).toEqual(projectHistoricalWallet(input));expect(history.length).toBeLessThanOrEqual(4096);
 expect(history[0].kaiUPulse).toBe('1000000');
 const end=Date.parse(history.at(-1)!.at);
 for(const days of [1,7,31,93,366])expect(history.filter(point=>Date.parse(point.at)>=end-days*86400000).length).toBeGreaterThan(40);
 expect(transactions).toHaveLength(2);
});
it('refuses impossible movement history and invalid evaluation coordinates',()=>{
 expect(()=>historicalWalletUsdRate('-1')).toThrow();
 expect(()=>projectHistoricalWallet({transactions:[row(1,'2000000','0','-1')],userId:'account',endKaiUPulse:'3000000'})).toThrow();
 expect(()=>projectHistoricalWallet({transactions:[row(1,'4000000','0','1')],userId:'account',endKaiUPulse:'3000000'})).toThrow();
});
