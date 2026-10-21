import {useSyncExternalStore} from 'react';
import {readOpenPortfolio,subscribeOpenPortfolio} from '../../receiz/market-portfolio-presentation';
import type {PublicMarketItem} from '../../receiz/public-market';
import {positionValue} from '../../receiz/market-portfolio-value';
import {formatMoney,formatUnits} from '../../core/money';
import {InvestmentTrades} from './InvestmentTrades';
/** Account-private detail appended only from the already open account. Public
 * page rendering performs no position read and carries no account data. */
export function OpenInvestment({item}:{item:PublicMarketItem}){
 const open=useSyncExternalStore(subscribeOpenPortfolio,readOpenPortfolio,()=>null),portfolio=open?.portfolio;if(!portfolio)return null;
 const matches=portfolio.positions.filter(p=>p.assetId===item.assetId),position=portfolio.positions.find(p=>p.marketItemId===item.id)??(matches.length===1?matches[0]:null),trades=portfolio.trades.filter(t=>t.marketItemId===(position?.marketItemId??item.id));if(!position&&!trades.length)return null;
 const value=position?positionValue(position,item):null;
 return <section className="asset-private-investment" aria-label="Your investment">{position&&<><div className="section-heading"><h3>Your investment</h3></div><div className="detail-list"><div><span>Your shares</span><strong>{formatUnits(position.shareQuantityMicro)}</strong></div><div><span>Current value</span><strong>{value?.valueUsdCents===null?'—':formatMoney(value!.valueUsdCents!)}</strong></div>{value?.pnlUsdCents!==null&&<div><span>Unrealized return</span><strong className={BigInt(value!.pnlUsdCents!)>=0n?'positive':'negative'}>{BigInt(value!.pnlUsdCents!)>0n?'+':''}{formatMoney(value!.pnlUsdCents!)}{value?.pnlPct!==null&&` (${value?.pnlPct.toFixed(2)}%)`}</strong></div>}</div></>}<InvestmentTrades trades={trades}/></section>;
}
