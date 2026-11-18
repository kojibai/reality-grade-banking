import {useEffect, useState} from 'react';
import observation from './network-activity.json';

export type AppDay = [string, number, number, number, number, number, number, number];
export type AppContribution = {name:string; registered:string; active:boolean; identities:number; firstIdentities:number; days:AppDay[]};
export type TrafficObservation = {
  schema:string; observedAt:string; identities:number; unattributedPublications:number; apps:AppContribution[];
  days:{day:string;routes:Record<string,number>}[];
};
const endpoint='https://yggkbnvikufnncormsrm.supabase.co/functions/v1/receiz-network-activity';
const key='bankeiz.observatory.network-activity.v1';
const dayPattern=/^\d{4}-\d{2}-\d{2}$/;
const count=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>=0;
function object(v:unknown):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v);}
function day(v:unknown):v is string{return typeof v==='string'&&dayPattern.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;}
export function isTrafficObservation(v:unknown):v is TrafficObservation{
  if(!object(v)||v.schema!=='receiz.public-network-activity.v1'||typeof v.observedAt!=='string'||!Number.isFinite(Date.parse(v.observedAt))||!count(v.identities)||!count(v.unattributedPublications)||!Array.isArray(v.days)||!Array.isArray(v.apps))return false;
  let previous='';
  for(const row of v.days){
    if(!object(row)||!day(row.day)||row.day<=previous||!object(row.routes)||!Object.entries(row.routes).every(([route,n])=>(route==='Other routes'||/^\/[a-zA-Z0-9_:/-]{0,200}$/.test(route))&&count(n)))return false;
    previous=row.day;
  }
  return v.apps.every(app=>object(app)&&typeof app.name==='string'&&app.name.length>0&&app.name.length<=46&&day(app.registered)&&typeof app.active==='boolean'&&count(app.identities)&&count(app.firstIdentities)&&Array.isArray(app.days)&&app.days.every(row=>Array.isArray(row)&&row.length===8&&day(row[0])&&row.slice(1).every(count)));
}
if(!isTrafficObservation(observation))throw Error('Invalid packaged traffic observation');
export const shippedTraffic:TrafficObservation=observation;

export function useNetworkTraffic(){
  const [data,setData]=useState(shippedTraffic);
  useEffect(()=>{
    let current=shippedTraffic, pending=false;
    const control=new AbortController();
    function accept(value:unknown){
      if(!isTrafficObservation(value)||Date.parse(value.observedAt)<=Date.parse(current.observedAt))return false;
      // Most minute refreshes only advance the observation time. Keep open app
      // details and the chart inputs stable when their data is identical.
      current={...value,days:JSON.stringify(value.days)===JSON.stringify(current.days)?current.days:value.days,
        apps:value.apps.map((app,i)=>JSON.stringify(app)===JSON.stringify(current.apps[i])?current.apps[i]:app)};
      setData(current);
      return true;
    }
    try{const saved=localStorage.getItem(key);if(saved)accept(JSON.parse(saved));}catch{/* Storage can be unavailable. */}
    async function refresh(){
      if(pending||document.hidden||!navigator.onLine)return;
      pending=true;
      try{
        const r=await fetch(endpoint,{credentials:'omit',referrerPolicy:'no-referrer',signal:control.signal});
        if(r.ok){
          const next:unknown=await r.json();
          if(!control.signal.aborted&&accept(next))localStorage.setItem(key,JSON.stringify(current));
        }
      }catch{/* The last complete observation stays visible. */}finally{pending=false;}
    }
    void refresh();
    const timer=window.setInterval(refresh,60000);
    document.addEventListener('visibilitychange',refresh);window.addEventListener('online',refresh);
    return()=>{control.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('online',refresh);};
  },[]);
  return data;
}
