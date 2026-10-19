import {useEffect,useState} from 'react';
import { ExternalLink, FileCheck2 } from 'lucide-react';
import { AssetMark } from '../../components/AssetMark';
import {PublicAssetChart} from './PublicAssetChart';
import {usePublicAssetPeriods} from '../../receiz/market-projection/usePublicAssetPeriods';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import {ProofMedia} from '../media/ProofMedia';
import {ProofCaption} from '../media/ProofCaption';
import {fetchPublicCardDetails,type PublicCardDetails} from '../../receiz/public-card-details';

export function PublicAssetDetail({ item, onTrade,readOnly=false }: { item: PublicMarketItem; onTrade?: (mode: 'buy' | 'sell', digest: string) => void;readOnly?:boolean }) {
  const [publicDetails,setPublicDetails]=useState<{source:string;details:PublicCardDetails}|null>(null);
  useEffect(()=>{if(item.category!=='sports'||!item.sourceUrl||item.sealedCopies?.length)return;const controller=new AbortController();void fetchPublicCardDetails(item,controller.signal).then(details=>{if(!controller.signal.aborted)setPublicDetails({source:item.sourceUrl!,details});}).catch(()=>{});return()=>controller.abort();},[item.category,item.assetId,item.sourceUrl,item.sealedCopies]);
  const canReviewTrade=!!onTrade&&!item.id.startsWith('sports:');
  const details=!item.sealedCopies?.length&&publicDetails?.source===item.sourceUrl?publicDetails.details:item;
  const multipleCopies=item.category==='sports'&&(item.circulationCount??1)>1;
  const periods=usePublicAssetPeriods(item);
  const current=periods?.ALL.at(-1),price=current?Number(current.usdCents)/100:item.priceUsd;
  return <><div className="asset-detail-heading"><AssetMark kind="proof" /><div><h1>{item.title}</h1><p>Public source</p></div></div>
    <div className="asset-price">{formatPublicPrice(price)}<span>Market Value</span></div>
    {!periods&&item.changePct !== null && <div className={`price-change ${item.changePct >= 0 ? 'positive' : 'negative'}`}>{item.changePct > 0 ? '+' : ''}{item.changePct}%</div>}
    <PublicAssetChart periods={periods} fallback={item.chart}/>
    {!readOnly&&<div className="dual-actions"><button className="primary-button" disabled={!canReviewTrade} onClick={() => { onTrade?.('buy', item.id); }}>Buy ownership</button><button className="secondary-button" disabled={!canReviewTrade} onClick={() => { onTrade?.('sell', item.id); }}>Take cash</button></div>}
    {item.originalUrl&&item.originalDigest&&<ProofMedia key={[item.originalDigest,item.originalUrl,item.readingUrl??item.verifyUrl].join(':')} title={item.title} source={{kind:"public",url:item.originalUrl,digest:item.originalDigest,...(item.verifyUrl?{postUrl:item.readingUrl??item.verifyUrl,hasLongForm:item.hasLongForm}:{})}}/>}
    <div className="asset-actions asset-source-links">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} strokeWidth={1.5} />Open public source</a>}{item.verifyUrl && <a href={item.verifyUrl} target="_blank" rel="noreferrer"><FileCheck2 size={15} strokeWidth={1.5} />Inspect proof</a>}</div>
    {item.summary&&<ProofCaption caption={item.summary}/>}
    <div className="detail-list"><div><span>Owner</span><strong>{multipleCopies ? 'Varies by copy · open public source' : details.ownerProfileUrl ? <a href={details.ownerProfileUrl} target="_blank" rel="noreferrer">@{details.ownerUsername}</a> : details.ownerDisplayName ?? 'Not supplied by the public source'}</strong></div><div><span>Object</span><strong className="proof-coordinate">{item.assetId}</strong></div><div><span>Sealed</span><strong>{multipleCopies ? 'Varies by copy' : details.sealedAt ? new Date(details.sealedAt).toLocaleString() : 'Not supplied'}</strong></div>{item.pulse && <div><span>☤KAI</span><strong>{item.pulse}</strong></div>}</div>
    {multipleCopies&&item.sealedCopies?.length&&<details className="market-copy-details"><summary>{item.sealedCopies.length.toLocaleString()} sealed copies · owners and times</summary>{item.sealedCopies.map(copy=><div className="detail-list" key={`${copy.collectibleId}:${copy.claimHash}`}><div><span>Owner</span><strong>{copy.ownerProfileUrl?<a href={copy.ownerProfileUrl} target="_blank" rel="noreferrer">@{copy.ownerUsername}</a>:copy.ownerDisplayName??'Not supplied'}</strong></div><div><span>Sealed</span><strong>{new Date(copy.sealedAt).toLocaleString()}</strong></div><div><span>Copy</span><strong className="proof-coordinate">{copy.collectibleId}</strong></div></div>)}</details>}
    <p className="body-copy small-copy">{readOnly?'Values follow the public object’s pricing inputs. Open its original source to inspect the carried evidence.':'Explore public asset values here. Review the current quote, budget or quantity before approving a live Market trade.'}</p>
  </>;
}
