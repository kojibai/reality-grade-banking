import {expect,it} from 'vitest';
import {hasSettledAccountView} from '../src/receiz/account-view';
import type {WalletObservation} from '../src/receiz/wallet-observation';
const fixture=():WalletObservation=>({wallet:{userId:'owner',totalUsdCents:'1000',reserveUsdCents:'1000',settlementUsdCents:'0',balancePhiMicro:'1000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'10',kaiUpulse:'10000000'},observedAt:'2026-10-18T12:00:00Z',history:[{userId:'owner',at:'2024-05-10T06:45:41.888Z',kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'},{userId:'owner',at:'2026-10-18T12:00:00Z',kaiUPulse:'10000000',totalUsdCents:'1000',reserveUsdCents:'1000',settlementUsdCents:'0'}]});
it('requires a complete source basis rather than treating login observations as account history',()=>{
 const known=fixture();expect(hasSettledAccountView(known)).toBe(false);
 known.historyBasis={schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'10000000'};
 expect(hasSettledAccountView(known)).toBe(true);
 known.wallet.kaiUpulse='10000001';expect(hasSettledAccountView(known)).toBe(false);
});
it('does not settle a foreign, truncated or stale chart beside a balance',()=>{
 const known=fixture();known.historyBasis={schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'10000000'};
 known.history![0].userId='foreign';expect(hasSettledAccountView(known)).toBe(false);
 known.history!.shift();expect(hasSettledAccountView(known)).toBe(false);
});
it('treats the actual signed empty genesis as complete without inventing earlier activity',()=>{
 const known=fixture();known.source='account-genesis';known.wallet={...known.wallet,totalUsdCents:'0',reserveUsdCents:'0',balancePhiMicro:'0'};known.history=known.history!.slice(0,1);
 expect(hasSettledAccountView(known)).toBe(true);
});

it('does not call an old valuation grid complete after a later repricing-only observation',()=>{
 const value=fixture();value.historyBasis={schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'10000000'};
 value.history!.push({...value.history!.at(-1)!,kaiUPulse:'20000000'});
 expect(hasSettledAccountView(value)).toBe(false);
});
