import { useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Periods, ValueChart, type ChartPeriod } from '../../components/ValueChart';
import { chartDateLabel, chartPeriodBounds, chartPeriodPoints } from '../../core/chart-history';
import { formatMoney, formatUnits } from '../../core/money';
import { PublicDocumentFormatContext } from '../../core/public-document-format';
import { emptyCurrencyPriceHistory, emptyCurrencyTrades, heldCurrencyPriceHistory, heldCurrencyTrades, subscribeCurrencyPriceHistory } from '../../receiz/currency-ledger-view';
import type { PublicCurrencyActivity } from '../../receiz/currency-ledger-view';

export function CurrencyPriceHistory({assetId, symbol, opening, openLedger = false}: {
  assetId: string;
  symbol: string;
  opening?: {priceUsdCentsPerUnit:string; at:string|null};
  openLedger?: boolean;
}) {
  const format = useContext(PublicDocumentFormatContext);
  const [period, setPeriod] = useState<ChartPeriod>('ALL');
  const recorded = useSyncExternalStore(subscribeCurrencyPriceHistory,
    ()=>heldCurrencyPriceHistory(assetId,symbol),emptyCurrencyPriceHistory);
  const trades = useSyncExternalStore(subscribeCurrencyPriceHistory,
    ()=>heldCurrencyTrades(assetId,symbol),emptyCurrencyTrades);
  useEffect(() => {
    if (!openLedger || heldCurrencyPriceHistory(assetId,symbol).length) return;
    let active = true;
    void import('../../receiz/public-ledger-continuity').then(async ledger => {
      if (!active) return;
      const held = await ledger.readHeldPublicLedger();
      if (held && active) await ledger.publicLedgerDisplayRows(held,[]);
      if (active && navigator.onLine !== false && !heldCurrencyPriceHistory(assetId,symbol).length) {
        const current = await ledger.synchronizePublicLedger();
        if (current && active && !heldCurrencyPriceHistory(assetId,symbol).length)
          await ledger.publicLedgerDisplayRows(current,[]);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [assetId,openLedger,symbol]);
  const [side,setSide] = useState<'all'|'buy'|'sell'>('all');
  const [shown,setShown] = useState(8);
  const activity = side==='all' ? trades : trades.filter(trade=>trade.side===side);
  const time = new Intl.DateTimeFormat(format?.locale,{dateStyle:'medium',timeStyle:'medium',timeZone:format?.timeZone});
  const points: readonly {at:string;usdCents:string}[] = recorded.length ? recorded : opening?.at && Number.isFinite(Date.parse(opening.at))
    ? [{at:opening.at,usdCents:opening.priceUsdCentsPerUnit}] : [];
  const latest = points.at(-1)?.usdCents ?? opening?.priceUsdCentsPerUnit;
  if (!latest) return null;
  const visible = chartPeriodPoints(points,period), range = chartPeriodBounds(points,period);
  const previous = range && visible[0] && points[points.indexOf(visible[0])-1];
  const graph = previous && range ? [{...previous,at:new Date(range.start).toISOString()},...visible] : visible;
  return <section aria-label={`${symbol} purchase price`}>
    <div className="asset-price public-asset-price">
      <strong className="asset-price-amount">{formatMoney(latest)}</strong>
      <span>Purchase price per {symbol}</span>
    </div>
    {!points.length ? null : <div className="asset-chart">
      <ValueChart values={graph.map(point=>Number(point.usdCents)/100)}
        times={graph.map(point=>Date.parse(point.at))} timeRange={range} interpolation="step"
        label={`${symbol} purchase price in US dollars`}
        tooltip={index=>({value:formatMoney(graph[index].usdCents),label:chartDateLabel(Date.parse(graph[index].at),period,range,format??undefined)})}/>
      <Periods value={period} onChange={setPeriod}/>
      {range&&<div className="chart-date-range"><span>{chartDateLabel(range.start,period,range,format??undefined)}</span>
        <span>{chartDateLabel(range.end,period,range,format??undefined)}</span></div>}
    </div>}
    {trades.length>0&&<section className="currency-trade-tape" aria-label={`${symbol} recent trades`}>
      <div className="section-heading"><h2>Recent trades</h2></div>
      <div className="segmented" role="group" aria-label="Trade direction">
        {(['all','buy','sell'] as const).map(value=><button type="button" key={value} aria-pressed={side===value}
          className={side===value?'active':''} onClick={()=>{setSide(value);setShown(8);}}>
          {value==='all'?'All':value==='buy'?'Buys':'Sells'}</button>)}
      </div>
      <table>
        <thead><tr><th scope="col">Trade</th><th scope="col">Unit quote</th><th scope="col">Total</th></tr></thead>
        <tbody>{activity.slice(0,shown).map(trade=><tr key={trade.id}>
          <td><strong>{trade.side==='buy'?'Buy':'Sell'} · {formatUnits(trade.quantityMicro)} {symbol}</strong>
            <time dateTime={trade.at} title={`Kai ${trade.kaiUPulse}`}>{time.format(new Date(trade.at))}</time></td>
          <td>{formatMoney(trade.priceUsdCentsPerUnit)}</td>
          <td>{trade.tradeUsdCents===undefined?'—':formatMoney(trade.tradeUsdCents)}</td>
        </tr>)}</tbody>
      </table>
      {!activity.length&&<p className="body-copy small-copy">{side==='buy'?'No buys in the held history.':'No sells in the held history.'}</p>}
      {activity.length>shown&&<button type="button" className="text-button" onClick={()=>setShown(count=>count+8)}>Show older trades</button>}
    </section>}
  </section>;
}

export function currencyActivitySummary(currency: PublicCurrencyActivity) {
  return currency.quantityMicro === undefined ? currency.symbol
    : `${formatUnits(currency.quantityMicro)} ${currency.symbol}`;
}
