import {useEffect,useState} from 'react';
import { ExternalLink, FileCheck2 } from 'lucide-react';
import { AssetMark } from '../../components/AssetMark';
import { ValueChart,Periods,type ChartPeriod } from '../../components/ValueChart';
import {chartChange,chartDateLabel,chartPeriodBounds} from '../../core/chart-history';
import {formatMoney} from '../../core/money';
import {usePublicAssetPeriods} from '../../receiz/market-projection/usePublicAssetPeriods';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import {ProofMedia} from '../media/ProofMedia';
import {ProofCaption} from '../media/ProofCaption';
import {fetchPublicCardDetails,type PublicCardDetails} from '../../receiz/public-card-details';

export function PublicAssetDetail({ item, onTrade }: { item: PublicMarketItem; onTrade?: (mode: 'buy' | 'sell', digest: string) => void }) {
  const [publicDetails,setPublicDetails]=useState<{source:string;details:PublicCardDetails}|null>(null);
  useEffect(()=>{if(item.category!=='sports'||!item.sourceUrl)return;const controller=new AbortController();void fetchPublicCardDetails(item,controller.signal).then(details=>{if(!controller.signal.aborted)setPublicDetails({source:item.sourceUrl!,details});}).catch(()=>{});return()=>controller.abort();},[item.category,item.assetId,item.sourceUrl]);
  const details=publicDetails?.source===item.sourceUrl?publicDetails.details:item;
  const multipleCopies=item.category==='sports'&&(item.circulationCount??1)>1;
  const [period,setPeriod]=useState<ChartPeriod>('ALL'),periods=usePublicAssetPeriods(item),points=periods?.[period],range=points?chartPeriodBounds(points,period):undefined,change=points&&points.length>1?chartChange(points[0].usdCents,points.at(-1)!.usdCents):null;
  const current=periods?.ALL.at(-1),price=current?Number(current.usdCents)/100:item.priceUsd;
  return <><div className="asset-detail-heading"><AssetMark kind="proof" /><div><h1>{item.title}</h1><p>Public source</p></div></div>
    <div className="asset-price">{formatPublicPrice(price)}<span>Market Value</span></div>
    {!points&&item.changePct !== null && <div className={`price-change ${item.changePct >= 0 ? 'positive' : 'negative'}`}>{item.changePct > 0 ? '+' : ''}{item.changePct}%</div>}
    {points?<div className="asset-chart">{change&&<div className={`chart-period-change ${change.trend==='down'?'negative':change.trend==='up'?'positive':'muted'}`}><strong>{BigInt(change.deltaCents)>0n?'+':''}{formatMoney(change.deltaCents)}{change.percent!==null&&` (${change.percent>0?'+':''}${change.percent.toFixed(2)}%)`}</strong><span>projected value</span></div>}<ValueChart key={period} values={points.map(point=>Number(point.usdCents)/100)} times={points.map(point=>Date.parse(point.at))} timeRange={range} color={change?.trend==='down'?'red':change?.trend==='up'?'green':'blue'} label={`Public object projected value · ${period==='ALL'?'All history':period}`} description="Calculated from the retained public object's pricing inputs. This is projected value, not a record of trades or ownership." tooltip={index=>({value:formatMoney(points[index].usdCents),label:`${new Date(points[index].at).toLocaleString()} · Kai ${points[index].pulse.toLocaleString()}`})}/><Periods value={period} onChange={setPeriod}/>{range&&<div className="chart-date-range"><span>{chartDateLabel(range.start,period,range)}</span><span>{chartDateLabel(range.end,period,range)}</span></div>}</div>:item.chart.length>1&&<ValueChart values={item.chart} label="Public Market value in dollars"/>}
    <div className="dual-actions"><button className="primary-button" disabled={!onTrade || !item.originalDigest} onClick={() => { if (item.originalDigest) onTrade?.('buy', item.originalDigest); }}>Buy ownership</button><button className="secondary-button" disabled={!onTrade || !item.originalDigest} onClick={() => { if (item.originalDigest) onTrade?.('sell', item.originalDigest); }}>Take cash</button></div>
    {item.originalUrl&&item.originalDigest&&<ProofMedia key={[item.originalDigest,item.originalUrl,item.readingUrl??item.verifyUrl].join(':')} title={item.title} source={{kind:"public",url:item.originalUrl,digest:item.originalDigest,...(item.verifyUrl?{postUrl:item.readingUrl??item.verifyUrl,hasLongForm:item.hasLongForm}:{})}}/>}
    <div className="asset-actions asset-source-links">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} strokeWidth={1.5} />Open public source</a>}{item.verifyUrl && <a href={item.verifyUrl} target="_blank" rel="noreferrer"><FileCheck2 size={15} strokeWidth={1.5} />Inspect proof</a>}</div>
    {item.summary&&<ProofCaption caption={item.summary}/>}
    <div className="detail-list"><div><span>Owner</span><strong>{multipleCopies ? 'Varies by copy · open public source' : details.ownerProfileUrl ? <a href={details.ownerProfileUrl} target="_blank" rel="noreferrer">@{details.ownerUsername}</a> : details.ownerDisplayName ?? 'Not supplied by the public source'}</strong></div><div><span>Object</span><strong className="proof-coordinate">{item.assetId}</strong></div><div><span>Sealed</span><strong>{multipleCopies ? 'Varies by copy' : details.sealedAt ? new Date(details.sealedAt).toLocaleString() : 'Not supplied'}</strong></div>{item.pulse && <div><span>☤KAI</span><strong>{item.pulse}</strong></div>}</div>
    <p className="body-copy small-copy">Explore public asset values here. Before a trade, its offer, ownership and payment proofs must verify.</p>
  </>;
}
