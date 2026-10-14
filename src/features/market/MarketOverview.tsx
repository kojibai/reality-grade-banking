import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { ValueChart } from '../../components/ValueChart';
import { formatMoney } from '../../core/money';
import { publicMarketCapitalization, type MarketCapPoint } from '../../receiz/market-capitalization';
import type { PublicMarketCatalog } from '../../receiz/public-market';
const KEY = 'receiz-bank-public-capitalization-v1';
function restore(): MarketCapPoint[] { try { const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(saved) ? saved.slice(-512).filter(point => typeof point.at === 'string' && Number.isFinite(Date.parse(point.at)) && typeof point.usdCents === 'string' && /^\d{1,40}$/.test(point.usdCents) && Number.isSafeInteger(point.count) && point.count > 0) : []; } catch { return []; } }
export function MarketOverview({ catalog, quoteStatus, onExplore }: { catalog: PublicMarketCatalog | null; quoteStatus: string; onExplore: () => void }) {
  const cap = useMemo(() => publicMarketCapitalization(catalog), [catalog]), [points, setPoints] = useState(restore), [info, setInfo] = useState(false);
  useEffect(() => {
    if (!catalog || !cap.complete || !cap.count || quoteStatus !== 'fresh') return;
    setPoints(previous => { const at = new Date().toISOString(), last = previous.at(-1); if (last && Date.parse(at) - Date.parse(last.at) < 30_000) return previous; const next = [...previous, { at, usdCents: cap.usdCents, count: cap.count }].slice(-512); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Public history storage is optional. */ } return next; });
  }, [catalog, cap, quoteStatus]);
  const current = useMemo(() => ({ at: new Date().toISOString(), usdCents: cap.usdCents, count: cap.count }), [cap]);
  const last = points.at(-1);
  const display = !catalog || !cap.valued ? [] : !cap.complete || !points.length ? [current] : last?.usdCents === cap.usdCents && last.count === cap.count ? points : [...points, current];
  return <div className="market-overview"><div className="market-overview-heading"><span>{cap.complete ? 'Total market capitalization' : 'Public market value'}</span><button className="icon-button" aria-label="About market capitalization" aria-expanded={info} onClick={() => setInfo(!info)}><Info size={17} /></button></div><strong className="market-cap-amount">{catalog && cap.valued ? formatMoney(cap.usdCents) : '—'}</strong><p className="market-cap-subtitle">{cap.count.toLocaleString()} public proof objects{!cap.complete && cap.count ? ` · ${cap.valued.toLocaleString()} valued` : ''}</p>
    {info && <p className="market-cap-explanation">The sum of Receiz’s latest public valuations, once per asset. This is indicative asset value; it does not measure cash backing or executable sale proceeds. The chart records complete market observations, without inventing a past price series.</p>}
    <ValueChart values={display.map(point => Number(point.usdCents) / 100)} label="Total public market value in dollars" tooltip={index => ({ value: formatMoney(display[index].usdCents), label: `${new Date(display[index].at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${display[index].count.toLocaleString()} objects` })} />
    <button className="market-view-assets" onClick={onExplore}>View assets<ArrowRight size={16} /></button>
  </div>;
}
