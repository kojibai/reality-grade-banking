import {expect,it} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
import {investmentHistoryRows,buildInvestmentHistory} from '../src/receiz/market-projection/investment-history';
import {marketPulseTime,publicSigilQuoteAtPulse} from '../src/receiz/market-projection/project';
const seed={kind:'sigil' as const,claimPulse:14000000,beat:2,stepIndex:3,creatorVerified:true};
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'work',receizId:'work',title:'Light',pulse:String(seed.claimPulse),livePulseSeed:seed}]}}).items[0];
function fixture(){const raw=portfolioFixture();raw.positions=raw.positions.slice(0,1);raw.positions[0].marketItemId=item.id;raw.trades=raw.trades.slice(0,1);raw.trades[0].marketItemId=item.id;raw.trades[0].executedAt=new Date(marketPulseTime(14000100)).toISOString();return parseMarketPortfolio(raw,portfolioUid);}
it('reconstructs only reconciled share quantities and marks their value from the existing bound model',async()=>{
 const p=fixture(),rows=investmentHistoryRows(p,[item],null,14000200)!;expect(rows).toHaveLength(1);const h=(await buildInvestmentHistory(rows,14000200))!;
 const price=Math.round(publicSigilQuoteAtPulse(seed,14000200).priceUsd*100);expect(h.series.ALL.at(-1)?.usdCents).toBe((2500000n*BigInt(price)/1000000n).toString());expect(h.series.ALL[0].pulse).toBe(14000100);
 expect(h.series.ALL.every(point=>Date.parse(point.at)===marketPulseTime(point.pulse))).toBe(true);
});
it('does not invent pre-transfer ownership, pricing or a curve when history cannot explain current shares',async()=>{
 const p=fixture();p.positions[0].shareQuantityMicro='3500000';expect(investmentHistoryRows(p,[item],null,14000200)).toBeNull();p.positions[0].shareQuantityMicro='2500000';expect(investmentHistoryRows(p,[{...item,livePulseSeed:undefined}],null,14000200)).toBeNull();
 const rows=investmentHistoryRows(p,[item],null,14000200)!;expect(await buildInvestmentHistory(rows,14000200,()=>false)).toBeNull();
});
it('waits for the live pulse to catch up without discarding stable operands, then retains prior samples on subsequent ticks',async()=>{
 const p=fixture(),rows=investmentHistoryRows(p,[item],null,14000099)!;expect(rows).toHaveLength(1);expect(await buildInvestmentHistory(rows,14000099)).toBeNull();const first=(await buildInvestmentHistory(rows,14000200))!,next=(await buildInvestmentHistory(rows,14000201,()=>true,async()=>{},first))!;expect(next.series.ALL[20]).toBe(first.series.ALL[20]);expect(next.series.ALL.at(-1)?.pulse).toBe(14000201);
});
