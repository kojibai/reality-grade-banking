import {performance} from 'node:perf_hooks';
import {expect} from 'vitest';
import {createWalletSend} from '../../src/receiz/wallet-send';
import {createMarketTrade} from '../../src/receiz/market-trade';
import {syntheticWalletRecord} from './wallet-send';
import {syntheticMarketQuote,syntheticMarketRecord,marketFixtureUid} from './market-trade';

// Adapter mechanics only: no credential, financial proof, account or live request.
export type TimingKind='send'|'buy'|'sell';
export type TimingStage={stage:string;durationMs:number;requests:number};
export type TimingOptions={requestDelayMs?:number;displayDelayMs?:number;response?:'complete'|'incomplete'|'lost'};
export async function measureExecution(kind:TimingKind,options:TimingOptions={}){
 const stages:TimingStage[]=[],events:string[]=[],uid=marketFixtureUid;
 let state:any=null,original:any,financialDispatches=0,outcomeGets=0;
 const stage=async<T,>(name:string,requests:number,work:()=>Promise<T>)=>{const start=performance.now();try{return await work();}finally{stages.push({stage:name,durationMs:performance.now()-start,requests});}};
 const delay=(ms=0)=>ms?new Promise<void>(resolve=>setTimeout(resolve,ms)):Promise.resolve();
 const transport=async<T,>(name:string,work:()=>T)=>stage(name,1,async()=>{await delay(options.requestDelayMs);return work();});
 const dispatch=async(body:any)=>transport('financial-dispatch',()=>{
  financialDispatches++;expect(state.current.status).toBe('unknown');expect(state.current.body).toEqual(body);
  original=kind==='send'?syntheticWalletRecord(body,uid):syntheticMarketRecord(body,uid);
  if(options.response==='lost')throw Error('synthetic response loss');
  return options.response==='incomplete'?{ok:true}:original;
 });
 const request=async(path:string,input:any):Promise<any>=>{
  if(input.method==='POST'&&path==='/api/connect/market/shares/trade')return dispatch(input.body);
  if(path.startsWith('/api/chat/conversations'))return transport('conversation',()=>({ok:true,conversation:{id:'10000000-0000-4000-8000-000000000003'}}));
  if(path.includes('amountUsd=')&&kind==='send')return transport('review',()=>({ok:true,senderUserId:uid,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'1000',ecosystemUsdCents:'0',fundingRule:'settled_first_then_phi'}}));
  if(path.startsWith('/api/connect/market/shares/quote?'))return transport('review',()=>syntheticMarketQuote(new URLSearchParams(path.split('?')[1]),uid));
  return transport('outcome-read',()=>{outcomeGets++;return original??{ok:true,found:false};});
 };
 let displayFinished=Promise.resolve();
 const onRecorded=async()=>{expect(state.current.status).toBe('recorded');events.push('published');stages.push({stage:'local-publication',durationMs:0,requests:0});};
 const afterRecorded=async()=>{displayFinished=stage('optional-display',0,()=>delay(options.displayDelayMs));await displayFinished;events.push('display-finished');};
 const deps={ownerReceizId:'synthetic.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T,>(work:()=>Promise<T>)=>work(),store:{read:async()=>state,write:async(next:any,previous:unknown)=>stage(next.current.status==='recorded'?'terminal-retention':'request-retention',0,async()=>{expect(state).toEqual(previous);state=structuredClone(next);events.push(next.current.status);})},connect:async()=>({accountUid:uid,client:{request,connect:{transfer:dispatch}}}),onRecorded,afterRecorded};
 const initStart=performance.now(),api=kind==='send'?createWalletSend(deps):createMarketTrade(deps),initializationMs=performance.now()-initStart;
 const reviewStart=performance.now();
 const review=kind==='send'?await (api as ReturnType<typeof createWalletSend>).prepare({recipient:'10000000-0000-4000-8000-000000000002',amountUsdCents:'1000'}):await (api as ReturnType<typeof createMarketTrade>).prepare({marketItemId:'asset:one',side:kind, ...(kind==='buy'?{amountUsdCents:'1000'}:{shareQuantityMicro:'1250000'})});
 const reviewMs=performance.now()-reviewStart,start=performance.now();
 const result=await (api.execute as (r:any,d:string)=>Promise<{status:string}>)(review,review.digest),completionMs=performance.now()-start;
 events.push('success');expect(result.status).toBe('recorded');await displayFinished;
 return{kind,syntheticTransport:true as const,requestDelayMs:options.requestDelayMs??0,displayDelayMs:options.displayDelayMs??0,initializationMs,reviewMs,completionMs,stages,financialDispatches,outcomeGets,retainedBeforeSuccess:events.indexOf('recorded')<events.indexOf('success'),publishedBeforeSuccess:events.indexOf('published')<events.indexOf('success'),retained:state.current.record,original};
}
