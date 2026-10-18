import { ExternalLink, FileCheck2 } from 'lucide-react';
import { AssetMark } from '../../components/AssetMark';
import { ValueChart } from '../../components/ValueChart';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import {ProofMedia} from '../media/ProofMedia';

export function PublicAssetDetail({ item, onTrade }: { item: PublicMarketItem; onTrade?: (mode: 'buy' | 'sell', digest: string) => void }) {
  return <><div className="asset-detail-heading"><AssetMark kind="proof" /><div><h1>{item.title}</h1><p>Public source</p></div></div>
    {item.originalUrl&&item.originalDigest&&<ProofMedia key={item.originalDigest} title={item.title} source={{kind:"public",url:item.originalUrl,digest:item.originalDigest}}/>}
    <div className="asset-price">{formatPublicPrice(item.priceUsd)}<span>public Market value</span></div>
    {item.changePct !== null && <div className={`price-change ${item.changePct >= 0 ? 'positive' : 'negative'}`}>{item.changePct > 0 ? '+' : ''}{item.changePct}%</div>}
    {item.chart.length > 1 && <ValueChart values={item.chart} label="Public Market value in dollars" />}
    <p className="body-copy asset-description">{item.summary}</p>
    <div className="dual-actions"><button className="primary-button" disabled={!onTrade || !item.originalDigest} onClick={() => { if (item.originalDigest) onTrade?.('buy', item.originalDigest); }}>Buy ownership</button><button className="secondary-button" disabled={!onTrade || !item.originalDigest} onClick={() => { if (item.originalDigest) onTrade?.('sell', item.originalDigest); }}>Take cash</button></div>
    <div className="asset-actions">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} />Open public source</a>}{item.verifyUrl && <a href={item.verifyUrl} target="_blank" rel="noreferrer"><FileCheck2 size={18} />Inspect proof</a>}</div>
    <div className="detail-list"><div><span>Owner</span><strong>{item.ownerProfileUrl ? <a href={item.ownerProfileUrl} target="_blank" rel="noreferrer">@{item.ownerUsername}</a> : item.ownerDisplayName ?? 'Not supplied by the public source'}</strong></div><div><span>Object</span><strong className="proof-coordinate">{item.assetId}</strong></div><div><span>Sealed</span><strong>{item.sealedAt ? new Date(item.sealedAt).toLocaleString() : 'Not supplied'}</strong></div>{item.pulse && <div><span>☤KAI</span><strong>{item.pulse}</strong></div>}</div>
    <p className="body-copy small-copy">Explore public asset values here. Before a trade, its offer, ownership and payment proofs must verify.</p>
  </>;
}
