import { useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
  const [metric, setMetric] = useState<'price'|'volume'>('price');
  const recorded = useSyncExternalStore(subscribeCurrencyPriceHistory,
    ()=>heldCurrencyPriceHistory(assetId,symbol),emptyCurrencyPriceHistory);
  const trades = useSyncExternalStore(subscribeCurrencyPriceHistory,
    ()=>heldCurrencyTrades(assetId,symbol),emptyCurrencyTrades);
  const volume = useMemo(() => {
    const chronological = [...trades].reverse();
    const visible = chartPeriodPoints(chronological,period);
    let bought = 0n, sold = 0n, tradedValue = 0n, completeValue = true;
    const points = visible.map(trade => {
      if (trade.side === 'buy') bought += BigInt(trade.quantityMicro);
      else sold += BigInt(trade.quantityMicro);
      if (trade.tradeUsdCents === undefined) completeValue = false;
      else tradedValue += BigInt(trade.tradeUsdCents);
      return {at:trade.at,unitsMicro:(bought+sold).toString()};
    });
    return {points, range:chartPeriodBounds(chronological,period), bought, sold, tradedValue, completeValue};
  },[trades,period]);
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
  const showVolume = metric === 'volume' && volume.points.length > 0;
  const displayedRange = showVolume ? volume.range : range;
  const pointDate = (at:string) => chartDateLabel(Date.parse(at),period,displayedRange,format??undefined);
  return <section aria-label={`${symbol} purchase price`}>
    <div className="asset-price public-asset-price">
      <strong className="asset-price-amount">{formatMoney(latest)}</strong>
      <span>Purchase price per {symbol}</span>
    </div>
    {!points.length ? null : <div className="asset-chart">
      {trades.length>0&&<div className="segmented currency-chart-metrics" role="group" aria-label="Currency chart">
        <button type="button" className={!showVolume?'active':''} aria-pressed={!showVolume} onClick={()=>setMetric('price')}>Price</button>
        <button type="button" className={showVolume?'active':''} aria-pressed={showVolume} onClick={()=>setMetric('volume')}>Volume</button>
      </div>}
      {showVolume?<ValueChart key="volume" values={volume.points.map(point=>Number(point.unitsMicro)/1_000_000)}
        times={volume.points.map(point=>Date.parse(point.at))} timeRange={displayedRange} interpolation="step" color="green"
        label={`${symbol} cumulative volume`}
        tooltip={index=>({value:`${formatUnits(volume.points[index].unitsMicro)} ${symbol} traded`,label:pointDate(volume.points[index].at)})}/>
      :<ValueChart key="price" values={graph.map(point=>Number(point.usdCents)/100)}
        times={graph.map(point=>Date.parse(point.at))} timeRange={range} interpolation="step"
        label={`${symbol} purchase price in US dollars`}
        tooltip={index=>({value:formatMoney(graph[index].usdCents),label:pointDate(graph[index].at)})}/>}
      <Periods value={period} onChange={setPeriod}/>
      {displayedRange&&<div className="chart-date-range"><span>{pointDate(new Date(displayedRange.start).toISOString())}</span>
        <span>{pointDate(new Date(displayedRange.end).toISOString())}</span></div>}
    </div>}
    {volume.points.length>0&&<dl className="currency-market-stats" aria-label={`${symbol} market activity`}>
      <div><dt>Bought</dt><dd>{formatUnits(volume.bought.toString())} {symbol}</dd></div>
      <div><dt>Sold</dt><dd>{formatUnits(volume.sold.toString())} {symbol}</dd></div>
      {volume.completeValue&&<div><dt>Traded value</dt><dd>{formatMoney(volume.tradedValue.toString())}</dd></div>}
    </dl>}
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
