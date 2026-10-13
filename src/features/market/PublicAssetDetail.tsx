import { useEffect, useState } from 'react';
import { ExternalLink, FileCheck2, ShieldCheck } from 'lucide-react';
import { AssetMark } from '../../components/AssetMark';
import { ValueChart } from '../../components/ValueChart';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import { verifyPublicOriginalBytes } from '../../receiz/public-original';

export function PublicAssetDetail({ item }: { item: PublicMarketItem }) {
  const [verification, setVerification] = useState<string | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => { setVerification(null); }, [item.id, item.originalDigest]);
  async function inspect() {
    if (!item.originalUrl || !item.originalDigest || busy) return;
    setBusy(true); setVerification(null);
    try {
      const url = new URL(item.originalUrl);
      const response = await fetch(`/api/bank/public-market/original?path=${encodeURIComponent(url.pathname + url.search)}`, { credentials: 'omit', signal: AbortSignal.timeout(90_000) });
      if (!response.ok) throw new Error('The original is not publicly downloadable. Open its public source to inspect its access terms.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      await verifyPublicOriginalBytes(bytes, item.originalDigest);
      setVerification('Original verified with Receiz v129. The enclosing artifact matches this public source.');
    } catch (cause) { setVerification(cause instanceof Error ? cause.message : 'Original verification is unavailable.'); }
    finally { setBusy(false); }
  }
  return <><div className="asset-detail-heading"><AssetMark kind="proof" /><div><h1>{item.title}</h1><p>Public source</p></div></div>
    <div className="asset-price">{formatPublicPrice(item.priceUsd)}<span>public Market value</span></div>
    {item.changePct !== null && <div className={`price-change ${item.changePct >= 0 ? 'positive' : 'negative'}`}>{item.changePct > 0 ? '+' : ''}{item.changePct}%</div>}
    {item.chart.length > 1 && <ValueChart values={item.chart} label="Public Market value in dollars" />}
    <p className="body-copy asset-description">{item.summary}</p>
    <div className="dual-actions"><button className="primary-button" disabled title="Requires an admitted offer and connected live account">Buy ownership</button><button className="secondary-button" disabled title="Requires your verified ownership">Take cash</button></div>
    <div className="asset-actions">{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={18} />Open public source</a>}{item.verifyUrl && <a href={item.verifyUrl} target="_blank" rel="noreferrer"><FileCheck2 size={18} />Inspect proof</a>}</div>
    <div className="detail-list"><div><span>Object</span><strong className="proof-coordinate">{item.assetId}</strong></div><div><span>Sealed</span><strong>{item.sealedAt ? new Date(item.sealedAt).toLocaleString() : 'Not supplied'}</strong></div>{item.pulse && <div><span>Kai pulse</span><strong>{item.pulse}</strong></div>}<div><span>Account ownership</span><strong>Not claimed</strong></div></div>
    {item.originalUrl && item.originalDigest && <button className="secondary-button" onClick={() => void inspect()} disabled={busy}><ShieldCheck size={18} />{busy ? 'Verifying original…' : 'Verify original here'}</button>}
    {verification && <p className="body-copy" role="status">{verification}</p>}
    <p className="body-copy small-copy">Public values and discovery come from Receiz Market. Trading requires an admitted offer, ownership and payment proof.</p>
  </>;
}
