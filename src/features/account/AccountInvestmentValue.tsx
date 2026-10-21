import {useMemo} from 'react';
import {ChevronRight} from 'lucide-react';
import {formatMoney} from '../../core/money';
import {portfolioValue} from '../../receiz/market-portfolio-value';
import type {MarketPortfolio} from '../../receiz/market-portfolio';
import type {PublicMarketItem} from '../../receiz/public-market';
import './account-investment-value.css';
/** Same owned positions and quotes as Assets. No subscription or network read. */
export function AccountInvestmentValue({portfolio,items,ready,onOpen}:{portfolio:MarketPortfolio|null;items:PublicMarketItem[];ready:boolean;onOpen():void}){
 const total=useMemo(()=>portfolio?portfolioValue(portfolio,items):null,[portfolio,items]);
 const complete=portfolio?.complete!==false,delta=complete&&total?.pnlUsdCents!==null&&total?.pnlUsdCents!==undefined?BigInt(total.pnlUsdCents):null;
 const direction=delta===null||delta===0n?'muted':delta>0n?'positive':'negative';
 return <button disabled={!ready} className="growth-panel account-investment-total" onClick={onOpen} aria-label="View investments">
  <span className="account-investment-total-copy"><span className="muted">Investments</span><strong>{total?.valueUsdCents===null||total?.valueUsdCents===undefined?'—':formatMoney(total.valueUsdCents)}</strong><small className="muted">{!complete?'Confirmed holdings · updating total':total?.costBasisUsdCents!==null&&total?.costBasisUsdCents!==undefined?`Invested ${formatMoney(total.costBasisUsdCents)}`:portfolio?'Invested amount unavailable':'Your owned shares'}</small></span>
  {delta!==null&&<span className={`settlement-day-change ${direction}`} title="Unrealized return on currently held investments"><strong>{delta<0n?'↘':delta>0n?'↗':'→'} {total?.pnlPct===null?'—':`${total!.pnlPct!>0?'+':''}${total!.pnlPct!.toLocaleString(undefined,{maximumFractionDigits:2})}%`}</strong><small>{delta>0n?'+':''}{formatMoney(String(delta))} · Total return</small></span>}
  <ChevronRight size={20}/>
 </button>;
}
