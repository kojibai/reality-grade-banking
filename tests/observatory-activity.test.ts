import {describe, expect, it} from 'vitest';
import type {PublicRecord} from '../src/receiz/public-network';
import {activityWindow,indexActivity,ledgerLink} from '../src/observatory/activity';
const anchor=Date.parse('2026-11-18T16:10:00Z');
function row(id:string, at:number|null):PublicRecord {
  return {id:'actions:'+id,source:'actions',sourceId:id,authority:'public-source-projection',kind:'record',title:id,detail:'',actor:null,time:at===null?null:new Date(at).toISOString(),amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{}};
}
describe('Observatory public activity',()=>{
  it('separates sources, undated records and private account history',()=>{
    const indexed=indexActivity([row('public',anchor),row('undated',null),{...row('private',anchor),authority:'account-source-projection'},{...row('held',anchor),origin:'identity-carried'}]);
    expect(indexed.counts.actions).toBe(2);
    expect(indexed.streams.actions.map(item=>item.record.sourceId)).toEqual(['public']);
    expect(indexed.counts.wallet).toBe(0);
  });
  it('preserves exact UTC interval boundaries, density counts and the paused cutoff as observations arrive',()=>{
    const halfHour=1_800_000,start=anchor-48*halfHour;
    const index=indexActivity([row('first',start),row('prior',start-1),row('second',start+halfHour),row('latest',anchor),row('future',anchor+1)]);
    const plotted=activityWindow(index.streams.actions,'24H',anchor);
    expect(plotted.buckets[0].map(r=>r.sourceId)).toEqual(['first']);
    expect(plotted.buckets[1].map(r=>r.sourceId)).toEqual(['second']);
    expect(plotted.buckets.at(-1)?.map(r=>r.sourceId)).toEqual(['latest']);
    expect(plotted.total).toBe(3);
    expect(plotted.density.reduce((a,b)=>a+b,0)).toBe(plotted.total);
    const shifted=activityWindow(index.streams.actions,'24H',anchor+1);
    expect(shifted.total).toBe(3);
    expect(shifted.buckets.flat().map(r=>r.sourceId)).toEqual(['second','future','latest']);
  });
  it('spans every range through the observation and keeps a future calendar entry outside all time',()=>{
    const first=anchor-420*86400000;
    const records=indexActivity([row('first',first),row('latest',anchor),row('calendar',anchor+14*86400000)]).streams.actions;
    for(const period of ['1H','24H','7D','30D','90D','1Y','All'] as const){
      const frame=activityWindow(records,period,anchor);
      expect(frame.end).toBe(anchor);
      expect(frame.buckets.at(-1)?.[0].sourceId).toBe('latest');
      expect(frame.total).toBe(period==='All'?2:1);
      if(period==='All'){expect(frame.start).toBe(first);expect(frame.buckets[0][0].sourceId).toBe('first');}
    }
  });
  it('opens the exact public Ledger identity through its supported fragment',()=>{
    expect(ledgerLink(row('a/b:c',anchor))).toBe('/ledger/#record=actions%3Aa%2Fb%3Ac');
  });
});
