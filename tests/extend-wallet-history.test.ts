import {expect,it,vi} from 'vitest';
import * as historyModel from '../src/receiz/historical-wallet';
import {extendWalletHistory} from '../src/receiz/extend-wallet-history';
import {projectHistoricalWallet,historicalWalletUsdRate} from '../src/receiz/historical-wallet';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {walletPointTime} from '../src/receiz/wallet-series';
import {createWalletQuoteHold,isWalletQuoteHeld} from '../src/receiz/wallet-observation';
import type {WalletObservation} from '../src/receiz/wallet-observation';
const start='1000000000000',end='2000000000000',now='3000000000000';
function source():WalletObservation{
 const history=projectHistoricalWallet({userId:'owner',transactions:[{kaiUPulse:start,reserveDeltaUsdCents:'100',settlementDeltaPhiMicro:'2000000'}],endKaiUPulse:end}),last=history.at(-1)!;
 return{walletScope:'native-full',wallet:{userId:'owner',totalUsdCents:last.totalUsdCents,reserveUsdCents:'100',settlementUsdCents:last.settlementUsdCents,balancePhiMicro:'2000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'1000000',kaiUpulse:start},observedAt:walletPointTime(end),history,historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:start,endKaiUPulse:end,settlementPhiMicro:'2000000',balancePhiMicro:'2000000',reserveUsdCents:'100'}};
}
it('extends the actual admitted holding prefix through a same-head wallet read with distinct sampled periods',()=>{
 const prior=source(),settlement=quoteReceizDisplayUsdV122('2000000',historicalWalletUsdRate(now));
 const wallet={...prior.wallet,settlementUsdCents:settlement,totalUsdCents:(100n+BigInt(settlement)).toString()};
 const next=extendWalletHistory(prior,wallet,walletPointTime(now),now);
 expect(next.historyBasis).toMatchObject({startKaiUPulse:start,endKaiUPulse:now});expect(next.history![0].kaiUPulse).toBe(start);
 expect(next.history!.filter(point=>BigInt(point.kaiUPulse!)>BigInt(end)).length).toBeGreaterThan(100);
 expect(next.history!.at(-1)).toMatchObject({kaiUPulse:now,totalUsdCents:wallet.totalUsdCents});
 expect(next.walletScope).toBe('native-full');
});
it('retains every old point and appends only the latest point on an ordinary pulse advance',()=>{
 const prior=source(),nextKai=(BigInt(end)+1000000n).toString(),calculate=vi.spyOn(historyModel,'projectHistoricalWallet');
 try{
  const next=extendWalletHistory(prior,prior.wallet,walletPointTime(nextKai),nextKai);
  expect(calculate).not.toHaveBeenCalled();expect(next.history).toHaveLength(prior.history!.length+1);
  expect(next.history!.slice(0,-1)).toEqual(prior.history);expect(next.historyBasis?.endKaiUPulse).toBe(nextKai);
 }finally{calculate.mockRestore();}
});
it.each(['head','units','reserve','foreign','uncovered'])('cannot infer missing financial movements for changed %s',kind=>{
 const prior=source(),wallet={...prior.wallet};
 if(kind==='head')wallet.kaiUpulse=now;if(kind==='units')wallet.balancePhiMicro='3000000';if(kind==='reserve')wallet.reserveUsdCents='200';if(kind==='foreign')wallet.userId='foreign';if(kind==='uncovered')prior.historyBasis=undefined;
 const next=extendWalletHistory(prior,wallet,walletPointTime(now),now);
 expect(next.historyBasis).toBeUndefined();expect(next.history!.at(-1)?.totalUsdCents).toBe(wallet.totalUsdCents);
 expect(next.walletScope).toBeUndefined();
 expect(next.wallet).toBe(wallet);
});

it('retains the held old tuple across protected refreshes without blocking a genuinely advanced head',()=>{
 const prior=source();prior.quoteHold=createWalletQuoteHold(prior.wallet);
 const same=extendWalletHistory(prior,prior.wallet,walletPointTime(now),now);
 expect(isWalletQuoteHeld(same)).toBe(true);
 const advanced=extendWalletHistory(same,{...prior.wallet,kaiUpulse:now,pulse:'3000000'},walletPointTime(now),now);
 expect(advanced.quoteHold).toEqual(prior.quoteHold);expect(isWalletQuoteHeld(advanced)).toBe(false);
});

it('does not carry a previous alias quote hold into an independently bound account UID',()=>{
 const prior=source();prior.quoteHold=createWalletQuoteHold(prior.wallet);
 const next=extendWalletHistory(prior,{...prior.wallet,userId:'placed-owner'},walletPointTime(now),now);
 expect(next.wallet.userId).toBe('placed-owner');expect(next.quoteHold).toBeUndefined();
});
