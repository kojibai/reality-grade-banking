import {useState} from 'react';
import {ArrowDownRight,ArrowUpRight} from 'lucide-react';
import type {MarketPositionTrade} from '../../receiz/market-portfolio';
import {formatMoney,formatUnits} from '../../core/money';
import './investments.css';
const money=(value:string|null)=>value===null?'—':formatMoney(value);
export function InvestmentTrades({trades}:{trades:MarketPositionTrade[]}){
 const [shown,setShown]=useState(10);if(!trades.length)return null;
 return <div className="investment-trades"><div className="section-heading"><h3>Your trades</h3><span className="muted small-copy">{trades.length.toLocaleString()}</span></div>{trades.slice(0,shown).map(t=><div className="investment-trade" key={t.id}><span className={'investment-trade-mark '+(t.side==='buy'?'is-buy':'is-sell')}>{t.side==='buy'?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</span><span className="row-copy"><strong>{t.side==='buy'?'Bought':'Sold'} {formatUnits(t.shareQuantityMicro)} shares</strong><span>{new Date(t.executedAt).toLocaleString()}</span></span><span className="price-stack"><strong>{money(t.settlementUsdCents)}</strong><span>{money(t.executionPriceUsdCents)} / share</span></span></div>)}{shown<trades.length&&<button className="text-button" onClick={()=>setShown(n=>n+20)}>More trades</button>}</div>;
}
