import {useEffect,useRef,useState} from 'react';
import {Check} from 'lucide-react';
import {InlineOpening} from '../../components/InlineOpening';
import {createDeliveryTimeHistory,type AssetDeliveryTiming} from './asset-progress-estimate';
import './asset-delivery-progress.css';

const history=createDeliveryTimeHistory();
function duration(ms:number){
 if(ms<60_000)return {amount:Math.max(1,ms<10_000?Math.ceil(ms/1000):Math.ceil(ms/5000)*5),unit:'s'};
 if(ms<3_600_000)return {amount:Math.ceil(ms/60_000),unit:' min'};
 return {amount:Math.ceil(ms/3_600_000),unit:' hr'};
}
function remainingRange(minMs:number,maxMs:number){
 const min=duration(minMs),max=duration(maxMs);
 if(minMs<=0||min.amount===max.amount&&min.unit===max.unit)return `${max.amount}${max.unit}`;
 return min.unit===max.unit?`${min.amount}–${max.amount}${max.unit}`:`${min.amount}${min.unit}–${max.amount}${max.unit}`;
}

/** Display-only waiting time. Only the owner's exact delivery result confirms
 * completion. A result mount is never used as an actual delivery start. */
export function AssetDeliveryProgress({signed,active=true,confirmed=false,failed=false,timing}:{signed:boolean;active?:boolean;confirmed?:boolean;failed?:boolean;timing?:AssetDeliveryTiming}){
 const [nowMs,setNowMs]=useState(()=>performance.now()),[screenStartedAt,setScreenStartedAt]=useState(nowMs);
 const measurement=useRef<({key:string}&ReturnType<typeof history.begin>)|null>(null);
 const timingKey=timing?JSON.stringify([timing.attemptId,timing.sourceDigest,timing.phase,timing.sizeBytes,timing.startedAtMs]):null;
 useEffect(()=>{
  if(!active||confirmed)return;
  const started=performance.now();setScreenStartedAt(started);setNowMs(started);
  const interval=window.setInterval(()=>setNowMs(performance.now()),1000);
  return ()=>window.clearInterval(interval);
 },[active,confirmed]);
 useEffect(()=>{
  const now=performance.now();
  if(measurement.current?.key!==timingKey){measurement.current?.finish('closed',now);measurement.current=null;}
  if(failed||confirmed||!active){measurement.current?.finish(failed?'rejected':confirmed?'published':'pending',now);measurement.current=null;}
  else if(timing&&!measurement.current)measurement.current={key:timingKey!,...history.begin(timing)};
 },[timingKey,active,confirmed,failed]);
 useEffect(()=>()=>{
  measurement.current?.finish('closed',performance.now());measurement.current=null;
 },[]);
 if(!active||confirmed)return null;
 const actualStart=timing&&Number.isFinite(timing.startedAtMs)&&timing.startedAtMs>=0&&timing.startedAtMs<=nowMs?timing.startedAtMs:null;
 const seconds=Math.max(0,Math.floor((nowMs-(actualStart??screenStartedAt))/1000));
 const minutes=Math.floor(seconds/60),clock=seconds>=3600?`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`:`${minutes}:${String(seconds%60).padStart(2,'0')}`;
 const estimate=timing&&!failed?history.estimate(timing,nowMs):null;
 const remaining=estimate?.kind==='estimate'?`About ${remainingRange(estimate.remainingMinMs,estimate.remainingMaxMs)} remaining`:estimate?.kind==='slower'?'Taking longer than recent deliveries…':'Measuring delivery time…';
 return <section className="asset-seal-progress asset-delivery-progress" aria-label="Public delivery progress">
  <p className="asset-delivery-progress-saved"><Check size={15} aria-hidden="true"/>{signed?'Original and signature saved':'Original sealed and saved'}</p>
  <div className="asset-delivery-progress-heading"><InlineOpening label="Delivering your Original"/><strong>Delivering your Original</strong></div>
  <div className="asset-delivery-progress-bar" role="progressbar" aria-label="Public delivery" aria-valuetext={`Waiting for public confirmation. ${remaining}`}><span/></div>
  <div className="asset-delivery-progress-time"><span><span role="timer" aria-live="off" aria-label={actualStart===null?'Elapsed wait on this screen':'Elapsed delivery time'}>Waiting {clock}</span><small>{actualStart===null?'on this screen':'this delivery'}</small></span><span className="asset-delivery-progress-estimate">{remaining}{estimate&&<small>{estimate.sampleCount} confirmed deliveries on this device</small>}</span></div>
 </section>;
}
