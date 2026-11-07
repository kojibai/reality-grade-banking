import type {AssetCreationProgress} from '../../receiz/asset-publication';

/** Estimates sealing only. Preparing, saving and public confirmation have no
 * measured ratio; a display clock must never advance that ratio itself. */
export function createSealTimeEstimator(){
 let samples:{atMs:number;ratio:number}[]=[];
 const reset=()=>{samples=[];};
 return {
  reset,
  update(progress:AssetCreationProgress|null,atMs:number){
   const ratio=progress?.ratio;
   if(progress?.stage!=='sealing'||!Number.isFinite(atMs)||atMs<0||typeof ratio!=='number'||!Number.isFinite(ratio)||ratio<0||ratio>=1){reset();return;}
   const previous=samples.at(-1);
   if(previous&&(atMs<=previous.atMs||atMs-previous.atMs>5000||ratio<previous.ratio))reset();
   else if(previous&&ratio===previous.ratio)return;
   samples=[...samples.filter(sample=>atMs-sample.atMs<=15_000),{atMs,ratio}].slice(-24);
  },
  remainingMs(nowMs:number):number|null{
   const latest=samples.at(-1);
   if(!latest||samples.length<3||!Number.isFinite(nowMs)||nowMs<latest.atMs||nowMs-latest.atMs>5000||latest.atMs-samples[0].atMs<1000||latest.ratio-samples[0].ratio<.01)return null;
   // The median of pairwise rates tolerates an uneven callback without turning
   // its most recent tiny time interval into a false near-zero deadline.
   const rates:number[]=[];
   for(let left=0;left<samples.length-1;left++)for(let right=left+1;right<samples.length;right++){
    const elapsed=samples[right].atMs-samples[left].atMs;
    if(elapsed>=250)rates.push((samples[right].ratio-samples[left].ratio)/elapsed);
   }
   rates.sort((a,b)=>a-b);
   if(!rates.length)return null;
   const middle=Math.floor(rates.length/2),rate=rates.length%2?rates[middle]:(rates[middle-1]+rates[middle])/2;
   const remaining=(1-latest.ratio)/rate;
   return Number.isFinite(remaining)&&remaining>0?remaining:null;
  }
 };
}

/** `startedAtMs` is performance.now() captured at the real attempt's start by
 * its owner. Mounting or reopening a result must never invent this coordinate. */
export type AssetDeliveryTiming={attemptId:string;sourceDigest:string;phase:'source'|'signature';sizeBytes:number;startedAtMs:number};
type DeliveryEstimate={kind:'estimate';remainingMinMs:number;remainingMaxMs:number;sampleCount:number}|{kind:'slower';sampleCount:number};
type DeliverySample=AssetDeliveryTiming&{durationMs:number;finishedAtMs:number};
const validAttempt=(attempt:AssetDeliveryTiming)=>!!attempt.attemptId&&/^[a-f0-9]{64}$/.test(attempt.sourceDigest)&&(attempt.phase==='source'||attempt.phase==='signature')&&Number.isSafeInteger(attempt.sizeBytes)&&attempt.sizeBytes>0&&Number.isFinite(attempt.startedAtMs)&&attempt.startedAtMs>=0;
const sizeGroup=(bytes:number)=>Math.floor(Math.log2(bytes));

/** Session-only, local display evidence. It neither publishes nor stores account
 * state, and a missing measurement never delays an available Original. */
export function createDeliveryTimeHistory(){
 const samples:DeliverySample[]=[],recorded=new Set<string>();
 return {
  begin(input:AssetDeliveryTiming){
   const attempt={...input};let finished=false;
   return {finish(status:'published'|'pending'|'rejected'|'closed',finishedAtMs:number){
    if(finished)return;finished=true;
    const key=JSON.stringify([attempt.sourceDigest,attempt.phase,attempt.attemptId]),durationMs=finishedAtMs-attempt.startedAtMs;
    if(status!=='published'||!validAttempt(attempt)||!Number.isFinite(finishedAtMs)||!Number.isFinite(durationMs)||durationMs<=0||recorded.has(key))return;
    recorded.add(key);if(recorded.size>128)recorded.delete(recorded.values().next().value!);
    samples.push({...attempt,durationMs,finishedAtMs});if(samples.length>40)samples.shift();
   }};
  },
  estimate(attempt:AssetDeliveryTiming,nowMs:number):DeliveryEstimate|null{
   if(!validAttempt(attempt)||!Number.isFinite(nowMs)||nowMs<attempt.startedAtMs)return null;
   const matching=samples.filter(sample=>sample.phase===attempt.phase&&sizeGroup(sample.sizeBytes)===sizeGroup(attempt.sizeBytes)&&nowMs>=sample.finishedAtMs&&nowMs-sample.finishedAtMs<=30*60_000);
   if(matching.length<3)return null;
   const elapsed=nowMs-attempt.startedAtMs,max=Math.max(...matching.map(sample=>sample.durationMs));
   if(elapsed>=max)return {kind:'slower',sampleCount:matching.length};
   return {kind:'estimate',remainingMinMs:Math.max(0,Math.min(...matching.map(sample=>sample.durationMs))-elapsed),remainingMaxMs:max-elapsed,sampleCount:matching.length};
  }
 };
}
