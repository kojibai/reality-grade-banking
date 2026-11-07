import {describe,expect,it} from 'vitest';
import {createDeliveryTimeHistory,createSealTimeEstimator,type AssetDeliveryTiming} from '../src/features/assets/asset-progress-estimate';

describe('measured sealing time',()=>{
 it('uses real progress samples to estimate only the remaining sealing work',()=>{
  const meter=createSealTimeEstimator();
  meter.update({stage:'sealing',ratio:0},0);
  meter.update({stage:'sealing',ratio:.1},1000);
  expect(meter.remainingMs(1000)).toBeNull();
  meter.update({stage:'sealing',ratio:.2},2000);
  meter.update({stage:'sealing',ratio:.3},3000);
  expect(meter.remainingMs(3000)).toBeCloseTo(7000);
  // A display clock must not invent additional sealed work.
  expect(meter.remainingMs(3500)).toBeCloseTo(7000);
  meter.update({stage:'saving'},3600);
  expect(meter.remainingMs(3600)).toBeNull();
 });

 it('resists a single uneven progress callback and withdraws a stale estimate',()=>{
  const meter=createSealTimeEstimator();
  for(const [atMs,ratio] of [[0,.1],[1000,.2],[2000,.201],[3000,.4],[4000,.5]])meter.update({stage:'sealing',ratio},atMs);
  expect(meter.remainingMs(4000)).toBeCloseTo(5000);
  expect(meter.remainingMs(9001)).toBeNull();
  meter.update({stage:'sealing',ratio:.51},10_000);
  expect(meter.remainingMs(10_000)).toBeNull();
 });

 it('does not reuse samples across retries, stages or invalid progress',()=>{
  const meter=createSealTimeEstimator();
  for(const [atMs,ratio] of [[0,0],[1000,.1],[2000,.2],[3000,.3]])meter.update({stage:'sealing',ratio},atMs);
  expect(meter.remainingMs(3000)).not.toBeNull();
  meter.update({stage:'sealing',ratio:.01},4000);
  expect(meter.remainingMs(4000)).toBeNull();
  meter.update({stage:'preparing'},5000);
  meter.update({stage:'sealing',ratio:.5},6000);
  expect(meter.remainingMs(6000)).toBeNull();
  for(const ratio of [NaN,Infinity,-.1,1.1,1]){
   meter.update({stage:'sealing',ratio},7000);
   expect(meter.remainingMs(7000)).toBeNull();
  }
  meter.reset();expect(meter.remainingMs(8000)).toBeNull();
 });
});

const attempt=(attemptId:string,startedAtMs=0,extra:Partial<AssetDeliveryTiming>={}):AssetDeliveryTiming=>({attemptId,sourceDigest:'a'.repeat(64),phase:'source',sizeBytes:4096,startedAtMs,...extra});
describe('confirmed delivery timing',()=>{
 it('needs three actual confirmations and estimates only the matching phase and size group',()=>{
  const history=createDeliveryTimeHistory();
  expect(history.estimate(attempt('current'),0)).toBeNull();
  history.begin(attempt('one')).finish('published',10_000);
  history.begin(attempt('two',50_000)).finish('published',70_000);
  expect(history.estimate(attempt('current',100_000),100_000)).toBeNull();
  history.begin(attempt('three',100_000)).finish('published',130_000);
  expect(history.estimate(attempt('current',195_000),200_000)).toEqual({kind:'estimate',remainingMinMs:5000,remainingMaxMs:25_000,sampleCount:3});
  expect(history.estimate(attempt('signature',195_000,{phase:'signature'}),200_000)).toBeNull();
  expect(history.estimate(attempt('larger',195_000,{sizeBytes:8192}),200_000)).toBeNull();
  expect(history.estimate(attempt('unknown',195_000,{sizeBytes:0}),200_000)).toBeNull();
 });

 it('never trains on pending, rejected, closed or duplicate attempts',()=>{
  const history=createDeliveryTimeHistory();
  for(const [index,status] of (['pending','rejected','closed'] as const).entries()){
   const measurement=history.begin(attempt(String(index)));
   measurement.finish(status,10_000);
   measurement.finish('published',20_000);
  }
  const measured=attempt('confirmed');
  history.begin(measured).finish('published',10_000);
  history.begin(measured).finish('published',20_000);
  history.begin(measured).finish('published',30_000);
  expect(history.estimate(attempt('current',50_000),50_000)).toBeNull();
  // A real retry has its own start and identity, even for the same Original.
  history.begin(attempt('retry-one',50_000)).finish('published',70_000);
  history.begin(attempt('retry-two',100_000)).finish('published',130_000);
  expect(history.estimate(attempt('current',140_000),140_000)?.sampleCount).toBe(3);
 });

 it('reports an overrun without reaching zero or claiming delivery is complete',()=>{
  const history=createDeliveryTimeHistory();
  for(const [index,duration] of [10_000,20_000,30_000].entries())history.begin(attempt(String(index))).finish('published',duration);
  expect(history.estimate(attempt('current',100_000),135_000)).toEqual({kind:'slower',sampleCount:3});
 });

 it('refuses invalid or old timing evidence',()=>{
  const history=createDeliveryTimeHistory();
  for(const [index,duration] of [0,-1,NaN,Infinity].entries())history.begin(attempt(String(index))).finish('published',duration);
  expect(history.estimate(attempt('current'),1000)).toBeNull();
  for(const [index,duration] of [10_000,20_000,30_000].entries())history.begin(attempt(`valid-${index}`)).finish('published',duration);
  expect(history.estimate(attempt('future',100_000),90_000)).toBeNull();
  expect(history.estimate(attempt('current',4_000_000),4_000_000)).toBeNull();
 });
});
