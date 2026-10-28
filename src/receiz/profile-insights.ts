/** Native analytics are observations, not financial or ownership authority. */
export const INSIGHT_RANGES=['24h','7d','30d','90d','1y','3y'] as const;
export type InsightRange=typeof INSIGHT_RANGES[number];
export type InsightCounter=Record<'all'|'d90'|'d30'|'d7'|'d1',number>;
export interface InsightPoint {date:string;views:number;opens:number;streams:number;downloads:number;paidDownloads:number;revenueCents:number;}
export interface InsightOriginal {receizId:string;claim:string;mediaKind:string|null;views:number;opens:number;streams:number;downloads:number;paidDownloads:number;revenueCents:number;uniqueVisitors:number;streamCompletionRate:number|null;totalViewSeconds:number;totalReadSeconds:number;totalListenSeconds:number;lastEventAt:string|null;}
export interface InsightTraffic {key:string;label:string;views:number;opens:number;streams:number;downloads:number;revenueCents:number;uniqueVisitors:number;}
export interface InsightActivity {occurredAt:string;eventName:string;receizId:string|null;source:string|null;amountCents:number|null;currency:string|null;durationSeconds:number|null;actor:'signed-in'|'anonymous';}
export interface ProfileInsightsSnapshot {
 ownerUserId:string;username:string;generatedAt:string;
 eventTotals:{trackedEvents:number;trackedSince:string|null;truncated:boolean;maxEvents:number};
 overview:Record<string,InsightCounter>;timelines:Record<InsightRange,InsightPoint[]>;
 stream:Record<string,number|null>;commerce:Record<string,number|null>;funnel:Record<string,number|null>;
 traffic:{sources:InsightTraffic[];referrers:InsightTraffic[];paths:InsightTraffic[];attributedRevenueCents:number;unattributedRevenueCents:number};
 originals:InsightOriginal[];recentActivity:InsightActivity[];
}
const invalid=()=>{throw Error('PROFILE_INSIGHTS_INVALID');};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:invalid();
const text=(v:unknown,max=1000):string=>typeof v==='string'&&v.length<=max?v:invalid();
const number=(v:unknown):number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Number.MAX_SAFE_INTEGER?v:invalid();
const optionalNumber=(v:unknown):number|null=>v===null?null:number(v);
const optionalText=(v:unknown,max=1000):string|null=>v===null?null:text(v,max);
const stamp=(v:unknown):string=>{const value=text(v,40);return Number.isFinite(Date.parse(value))?value:invalid();};
const list=<T>(v:unknown,max:number,read:(value:Record<string,unknown>)=>T):T[]=>Array.isArray(v)&&v.length<=max?v.map(row=>read(object(row))):invalid();
const numbers=(v:unknown,keys:string[])=>{const row=object(v);return Object.fromEntries(keys.map(key=>[key,optionalNumber(row[key])]));};
export function readProfileInsights(input:unknown,accountUid:string):ProfileInsightsSnapshot {
 const envelope=object(input),v=object(envelope.analytics);if(envelope.ok!==true)invalid();
 if(v.ownerUserId!==accountUid)throw Error('PROFILE_INSIGHTS_OWNER_MISMATCH');
 const username=text(v.username,24);if(!/^[a-z0-9_]{3,24}$/.test(username))invalid();
 const overview=object(v.overview),counters:Record<string,InsightCounter>={};if(Object.keys(overview).length>64)invalid();
 for(const[key,value]of Object.entries(overview)){const row=object(value);counters[key]={all:number(row.all),d90:number(row.d90),d30:number(row.d30),d7:number(row.d7),d1:number(row.d1)};}
 for(const key of ['profileViews','originalViews','originalOpens','uniqueVisitors','streamPlays','downloads','checkoutStarts','checkoutPaid','paidDownloads','revenueCents'])if(!counters[key])invalid();
 const sourceTimelines=object(v.timelines),timelines={} as ProfileInsightsSnapshot['timelines'];
 for(const range of INSIGHT_RANGES){const points=list(sourceTimelines[range],2000,row=>({date:stamp(row.date),views:number(row.views),opens:number(row.opens),streams:number(row.streams),downloads:number(row.downloads),paidDownloads:number(row.paidDownloads),revenueCents:number(row.revenueCents)}));if(points.some((point,index)=>index>0&&Date.parse(point.date)<=Date.parse(points[index-1].date)))invalid();timelines[range]=points;}
 const totals=object(v.eventTotals),traffic=object(v.traffic);
 if(typeof totals.truncated!=='boolean')invalid();
 const trafficRows=(values:unknown)=>list(values,2000,row=>({key:text(row.key,2048),label:text(row.label,2048),views:number(row.views),opens:number(row.opens),streams:number(row.streams),downloads:number(row.downloads),revenueCents:number(row.revenueCents),uniqueVisitors:number(row.uniqueVisitors)}));
 return {ownerUserId:accountUid,username,generatedAt:stamp(v.generatedAt),eventTotals:{trackedEvents:number(totals.trackedEvents),trackedSince:totals.trackedSince===null?null:stamp(totals.trackedSince),truncated:totals.truncated as boolean,maxEvents:number(totals.maxEvents)},overview:counters,timelines,
  stream:numbers(v.stream,['totalListenSeconds','totalListenHours','avgListenSecondsPerPlay','avgListenSecondsPerCompletedPlay','completionRate']),
  commerce:numbers(v.commerce,['lifetimeRevenueCents','last30dRevenueCents','lifetimePaidDownloads','last30dPaidDownloads','checkoutToPaidRate','paidDownloadToStreamPlayRate']),
  funnel:numbers(v.funnel,['viewsToOpenRate','openToPlayRate','playToDownloadRate','checkoutToPaidRate']),
  traffic:{sources:trafficRows(traffic.sources),referrers:trafficRows(traffic.referrers),paths:trafficRows(traffic.paths),attributedRevenueCents:number(traffic.attributedRevenueCents),unattributedRevenueCents:number(traffic.unattributedRevenueCents)},
  originals:list(v.originals,10000,row=>({receizId:text(row.receizId,128),claim:text(row.claim,8192),mediaKind:optionalText(row.mediaKind,40),views:number(row.views),opens:number(row.opens),streams:number(row.streams),downloads:number(row.downloads),paidDownloads:number(row.paidDownloads),revenueCents:number(row.revenueCents),uniqueVisitors:number(row.uniqueVisitors),streamCompletionRate:optionalNumber(row.streamCompletionRate),totalViewSeconds:number(row.totalViewSeconds),totalReadSeconds:number(row.totalReadSeconds),totalListenSeconds:number(row.totalListenSeconds),lastEventAt:row.lastEventAt===null?null:stamp(row.lastEventAt)})),
  recentActivity:list(v.recentActivity,2000,row=>({occurredAt:stamp(row.occurredAt),eventName:text(row.eventName,100),receizId:optionalText(row.receizId,128),source:optionalText(row.source,2048),amountCents:optionalNumber(row.amountCents),currency:optionalText(row.currency,8),durationSeconds:optionalNumber(row.durationSeconds),actor:row.actor==='signed-in'||row.actor==='anonymous'?row.actor:invalid()})),
 };
}
export function createProfileInsights({accountUid,request,assertOpen=()=>{}}:{accountUid:string;request:(path:string)=>Promise<Response>;assertOpen?:()=>void}){
 let held:ProfileInsightsSnapshot|null=null,pending:Promise<ProfileInsightsSnapshot>|null=null;
 return {accountUid,known:()=>{assertOpen();return held;},read(refresh=false):Promise<ProfileInsightsSnapshot>{
  assertOpen();if(pending)return pending;if(held&&!refresh)return Promise.resolve(held);
  const attempt=(async()=>{const response=await request('/api/connect/profile/analytics');assertOpen();if(!response.ok)throw Error('PROFILE_INSIGHTS_UNAVAILABLE');const value=readProfileInsights(await response.json(),accountUid);assertOpen();held=value;return value;})();pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=null;}).catch(()=>{});return attempt;
 }};
}
export type ProfileInsightsSource=ReturnType<typeof createProfileInsights>;
