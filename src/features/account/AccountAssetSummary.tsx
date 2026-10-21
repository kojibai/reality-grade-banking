import {useMemo} from 'react';
import {ArrowDownRight,ArrowUpRight,ChevronRight} from 'lucide-react';
import {formatMoney,formatUnits} from '../../core/money';
import type {MarketPortfolio} from '../../receiz/market-portfolio';
import type {PublicMarketItem,PublicMarketCatalog} from '../../receiz/public-market';
import {portfolioItem,positionValue} from '../../receiz/market-portfolio-value';
import {PublicObjectArtwork} from '../market/PublicObjectRow';

export function AccountAssetSummary({portfolio,marketItems,showcase,ready,onAssets}:{portfolio:MarketPortfolio|null;marketItems:PublicMarketItem[];showcase:PublicMarketItem[];ready:boolean;onAssets():void}){
 const recent=useMemo(()=>{
  const purchases=new Map<string,number>();
  for(const trade of portfolio?.trades??[])if(trade.side==='buy')purchases.set(trade.marketItemId,Math.max(purchases.get(trade.marketItemId)??0,Date.parse(trade.executedAt)));
  const purchasedAt=(position:NonNullable<MarketPortfolio>['positions'][number])=>Math.max(Date.parse(position.openedAt),purchases.get(position.marketItemId)??0);
  return [...(portfolio?.positions??[])].filter(position=>BigInt(position.shareQuantityMicro)>0n).sort((a,b)=>purchasedAt(b)-purchasedAt(a)||a.marketItemId.localeCompare(b.marketItemId)).slice(0,3);
 },[portfolio]);
 const catalog=useMemo(()=>({items:marketItems} as PublicMarketCatalog),[marketItems]);
 return <section className="account-assets-summary"><div className="section-heading"><h2>Your assets</h2><button disabled={!ready} onClick={onAssets}>View all</button></div>
  {!!recent.length&&<><h3 className="account-asset-group-label">Investments</h3><div className="rows-surface">{recent.map(position=>{
   const item=portfolioItem(position,catalog),value=positionValue(position,item),change=value.pnlUsdCents===null?null:BigInt(value.pnlUsdCents),units=formatUnits(position.shareQuantityMicro);
   return <button className="asset-row account-investment-row" key={position.id} disabled={!ready} onClick={onAssets}><PublicObjectArtwork artworkUrl={item.artworkUrl}/><span className="row-copy"><strong>{item.title}</strong><span>{units} {units==='1'?'share':'shares'}</span></span><span className="account-investment-value"><strong aria-label="Current holding value">{value.valueUsdCents===null?'—':formatMoney(value.valueUsdCents)}</strong><span title="Change since purchase" className={change===null?'muted':change>0n?'positive':change<0n?'negative':'muted'}>{value.pnlPct===null?'Return unavailable':<>{change!>0n?<ArrowUpRight size={12}/>:change!<0n?<ArrowDownRight size={12}/>:null}{value.pnlPct>0?'+':''}{value.pnlPct.toLocaleString(undefined,{maximumFractionDigits:2})}%</>}</span></span><ChevronRight size={16}/></button>;
  })}</div></>}
  {!!recent.length&&!!showcase.length&&<h3 className="account-asset-group-label account-showcase-label">Public showcase</h3>}
  {!!showcase.length&&<div className="rows-surface">{showcase.slice(0,3).map(item=><button className="asset-row" key={item.id} disabled={!ready} onClick={onAssets}><span className="row-copy"><strong>{item.title}</strong><span>Public showcase</span></span><ChevronRight size={18}/></button>)}</div>}
  {!recent.length&&!showcase.length&&<div className="empty-state">Your saved assets and public collection appear here.</div>}
 </section>;
}
