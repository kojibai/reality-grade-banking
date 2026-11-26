import { useContext, useState, useSyncExternalStore } from 'react';
import { Periods, ValueChart, type ChartPeriod } from '../../components/ValueChart';
import { chartDateLabel, chartPeriodBounds, chartPeriodPoints } from '../../core/chart-history';
import { formatMoney, formatUnits } from '../../core/money';
import { PublicDocumentFormatContext } from '../../core/public-document-format';
import { emptyCurrencyPriceHistory, heldCurrencyPriceHistory, subscribeCurrencyPriceHistory } from '../../receiz/currency-ledger-view';
import type { PublicCurrencyActivity } from '../../receiz/currency-ledger-view';

export function CurrencyPriceHistory({assetId, symbol, opening}: {
  assetId: string;
  symbol: string;
  opening?: {priceUsdCentsPerUnit:string; at:string|null};
}) {
  const format = useContext(PublicDocumentFormatContext);
  const [period, setPeriod] = useState<ChartPeriod>('ALL');
  const recorded = useSyncExternalStore(subscribeCurrencyPriceHistory,
    ()=>heldCurrencyPriceHistory(assetId,symbol),emptyCurrencyPriceHistory);
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
  </section>;
}

export function currencyActivitySummary(currency: PublicCurrencyActivity) {
  return currency.quantityMicro === undefined ? currency.symbol
    : `${formatUnits(currency.quantityMicro)} ${currency.symbol}`;
}
