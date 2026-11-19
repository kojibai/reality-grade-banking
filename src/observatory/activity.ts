import {ledgerAssetTrade,ledgerAssetTradeSide,type LedgerAssetTrade} from '../receiz/ledger-asset-trade';
import {PUBLIC_SOURCES, type PublicRecord, type PublicSource} from '../receiz/public-network';
import {marketPulseTime} from '../receiz/market-projection/coordinates';
import {readLedgerCausalLineage, type LedgerCausalStep} from '../receiz/ledger-causal-source';
import {ledgerProofHistorySteps} from '../receiz/ledger-proof-history';

export const sourceNames: Record<PublicSource, string> = {
  actions: 'Actions', wallet: 'Wallet records', graph: 'Proof graph', proofs: 'Showcase',
};
export const periods = ['1H', '24H', '7D', '30D', '90D', '1Y', 'All'] as const;
export type Period = typeof periods[number];
const hour = 3_600_000;
const windows: Record<Exclude<Period,'All'>, [number, number]> = {'1H':[60,60_000], '24H': [48, hour / 2], '7D': [56, 3 * hour], '30D': [60, 12 * hour], '90D': [90, 24 * hour], '1Y': [73, 5 * 24 * hour]};
export type TimedRecord = {time: number; record: PublicRecord};

export function activityTime(record:PublicRecord){
  const calendar=Date.parse(record.time??'');
  if(Number.isFinite(calendar))return calendar;
  // Only the carried event coordinate dates the asset claim or the transfer.
  if(record.source==='graph'&&(record.kind==='market-asset'||record.kind==='card-transfer')&&record.pulse&&/^\d{1,10}$/.test(record.pulse)){
    return marketPulseTime(Number(record.pulse));
  }
  return NaN;
}

export type MarketExecution={record:PublicRecord;time:number;side:'buy'|'sell';trade:LedgerAssetTrade|null};
function marketExecution(record:PublicRecord,time:number):MarketExecution|null {
  if(record.source!=='actions')return null;
  const side=ledgerAssetTradeSide(record);
  return side?{record,time,side,trade:ledgerAssetTrade(record)}:null;
}
function compareExecutions(a:MarketExecution,b:MarketExecution) {
  return a.time-b.time||Number(a.record.details?.seq??0)-Number(b.record.details?.seq??0)||a.record.id.localeCompare(b.record.id);
}
export function indexActivity(records: readonly PublicRecord[]) {
  const streams = Object.fromEntries(PUBLIC_SOURCES.map(source => [source, []])) as unknown as Record<PublicSource, TimedRecord[]>;
  const executions:MarketExecution[]=[];
  const counts = {actions: 0, wallet: 0, graph: 0, proofs: 0};
  for (const record of records) {
    if (record.authority !== 'public-source-projection' || record.origin) continue;
    counts[record.source]++;
    const time = activityTime(record);
    if (Number.isFinite(time)) {
      streams[record.source].push({time, record});
      const execution=marketExecution(record,time);
      if(execution)executions.push(execution);
    }
  }
  for (const source of PUBLIC_SOURCES) streams[source].sort((a, b) => a.time - b.time);
  return {streams, counts, executions:executions.sort(compareExecutions)};
}

export function periodBounds(first: number | undefined, period: Period, anchor: number) {
  const [count, fixedWidth] = period === 'All' ? [60, 0] : windows[period];
  const end = anchor;
  const start = period === 'All' ? Math.min(first ?? end, end) : end - count * fixedWidth;
  return {start,end,count};
}

export function activityWindow(records: readonly TimedRecord[], period: Period, anchor: number) {
  const {start,end,count} = periodBounds(records[0]?.time,period,anchor);
  const width = Math.max((end - start) / count, 1);
  const buckets = Array.from({length: count}, () => [] as PublicRecord[]);
  const density = Array<number>(count * 4).fill(0);
  const histories: {record: PublicRecord; bucket: number}[] = [];
  let total = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    const {time, record} = records[i];
    if (time < start) break;
    if (time > anchor) continue;
    const offset = (time - start) / width;
    const bucket = Math.min(count - 1, Math.floor(offset));
    buckets[bucket].push(record);
    if (record.details?.causalLineage || record.details?.proofHistory) histories.push({record,bucket});
    density[Math.min(density.length - 1, Math.floor(offset * 4))]++;
    total++;
  }
  return {buckets, density, start, end, width, total, histories};
}

export function carriedActivityHistories(histories: ReturnType<typeof activityWindow>['histories'], bucket: number | null) {
  const result: {record: PublicRecord; steps: readonly LedgerCausalStep[]; missingParentHashes?: readonly string[]}[] = [];
  for (const entry of histories) {
    if (bucket !== null && entry.bucket !== bucket) continue;
    const {record}=entry;
    const lineage=record.details?.causalLineage && readLedgerCausalLineage(record.details.causalLineage);
    const steps=lineage ? lineage.steps : ledgerProofHistorySteps(record);
    if (steps?.length) result.push({record,steps,missingParentHashes:lineage ? lineage.missingParentHashes : undefined});
  }
  return result;
}

/** Sample the cumulative count at fixed UTC instants, including both endpoints. */
export function cumulativeActions(times: readonly number[], start: number, end: number) {
  let index=0;
  while(index<times.length && times[index]<start)index++;
  const before=index;
  const points=Array.from({length:97},(_,i)=>{
    const at=i===96?end:start+(end-start)*i/96;
    while(index<times.length && times[index]<=at)index++;
    return {at,count:index};
  });
  return {points,total:index,added:index-before};
}

export function ledgerLink(record: PublicRecord) {
  return '/ledger/#record=' + encodeURIComponent(record.source + ':' + record.sourceId);
}
