import {governancePath} from './governance-links';
import {governanceCursorKey} from './governance-cursor';
import {loadReceiz} from './client';
import {BANK_APPLICATION_ID,BANK_PUBLIC_ORIGIN} from './config';
import {nativeFetch} from './native-transport';
import {publicProfileDirectoryUid} from './public-profile-directory-contract';
import {governanceNamespace,governanceSchema,readGovernanceTerms,openGovernanceOriginal,requireGovernanceOriginal,type GovernanceDocument,type GovernanceOriginal} from './governance-documents';
import type {ReceizAppStateRecordInput,PublicProofTransportRecord} from '@receiz/sdk';

export type GovernanceRow=Readonly<{digest:string;document:GovernanceDocument;pulse:string;profileUid:string|null;publisherUids?:readonly string[]}>;
const family='bankeiz-public-governance-v1';
const prefix='/vote/original/';
const records=new Map<string,GovernanceRow>(),originals=new Map<string,GovernanceOriginal>();
const listeners=new Set<()=>void>();
let view:readonly GovernanceRow[]=[],restore:Promise<void>|undefined,refresh:Promise<void>|undefined;
export const governanceRows=()=>view;
export const subscribeGovernance=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
function changed(){view=Array.from(records.values()).sort((a,b)=>Number(b.pulse)-Number(a.pulse)||a.digest.localeCompare(b.digest));for(const fn of listeners)fn();}
/** A public profile link is a display projection. The verified Original owns authorship. */
export function governanceRowOnProfile(row:GovernanceRow,profile:{uid:string;username?:string}){
  if(row.document.accountUid)return row.profileUid===profile.uid&&row.document.accountUid===profile.uid;
  return Boolean(profile.username&&row.document.author===profile.username+'.receiz.id'&&row.publisherUids?.includes(profile.uid));
}
function withPublisher(row:GovernanceRow,publisher:unknown):GovernanceRow{
  if(!publicProfileDirectoryUid(publisher))return row;
  if(row.document.accountUid){
    return publisher===row.document.accountUid&&row.profileUid!==publisher?{...row,profileUid:publisher}:row;
  }
  if(row.publisherUids?.includes(publisher))return row;
  return {...row,publisherUids:[...(row.publisherUids??[]),publisher]};
}
function cache(){return typeof caches==='undefined'?Promise.resolve(null):caches.open(family);}
const locationFor=(digest:string)=>new URL(prefix+digest,location.origin).href;
async function retain(original:GovernanceOriginal,publisher:unknown){
  requireGovernanceOriginal(original);
  const {digest,document,pulse}=original,prior=records.get(digest);
  const row=withPublisher({digest,document,pulse,profileUid:prior?.profileUid??null,publisherUids:prior?.publisherUids},publisher);
  originals.set(digest,original);records.set(digest,row);changed();
  // A failed public cache write leaves the existing owner-held Original intact.
  try{const held=await cache();if(!held)return;
  await held.put(locationFor(digest),new Response(original.file,{headers:{'content-type':original.file.type,'x-vote-filename':encodeURIComponent(original.file.name)}}));
  await held.put(locationFor(row.digest)+'/view',new Response(JSON.stringify(row),{headers:{'content-type':'application/json'}}));
  }catch{/* The verified source stays in memory when local storage is full. */}
}
function savedProjection(value:unknown,digest:string):GovernanceRow|null{
  const row=value as GovernanceRow|null,doc=row?.document;
  if(!row||row.digest!==digest||!doc||doc.schema!==governanceSchema||doc.visibility!=='public'||
    typeof doc.author!=='string'||!doc.author||typeof row.pulse!=='string'||!/^\d{1,16}$/.test(row.pulse)||!Number.isSafeInteger(Number(row.pulse))||
    row.profileUid!==null&&(typeof row.profileUid!=='string'||row.profileUid!==doc.accountUid))return null;
  const publisherUids=doc.accountUid===null&&Array.isArray(row.publisherUids)?row.publisherUids.filter(publicProfileDirectoryUid):undefined;
  return {...row,publisherUids,document:{...doc,terms:readGovernanceTerms(doc.terms)}};
}
export function restoreGovernanceDirectory(){
  return restore??=(async()=>{
    const held=await cache();if(!held)return;
    const keys=await held.keys();
    for(const key of keys){
      const path=new URL(key.url).pathname,match=/^\/vote\/original\/([a-f0-9]{64})\/view$/.exec(path);if(!match||records.has(match[1]))continue;
      const response=await held.match(key);if(!response)continue;
      try{
        const row=savedProjection(await response.json(),match[1]);
        if(row&&!records.has(row.digest))records.set(row.digest,row);
      }catch{/* A broken display copy can be repaired from its source. */}
    }
    changed();
  })().catch(e=>{restore=undefined;throw e;});
}
export async function heldGovernanceOriginal(digest:string):Promise<GovernanceOriginal>{
  const known=originals.get(digest);if(known)return requireGovernanceOriginal(known);
  if(!/^[a-f0-9]{64}$/.test(digest))throw Error('Invalid Original reference.');
  const held=await cache(),response=await held?.match(locationFor(digest));
  if(!response)throw Error('The complete Original is unavailable on this device.');
  const file=new File([await response.blob()],decodeURIComponent(response.headers.get('x-vote-filename')||'governance.json'),{type:response.headers.get('content-type')||'application/json'});
  const original=await openGovernanceOriginal(file);if(original.digest!==digest)throw Error('The Original does not match the selected record.');
  originals.set(digest,original);return original;
}
export async function publicationRecord(original:GovernanceOriginal):Promise<ReceizAppStateRecordInput>{
  requireGovernanceOriginal(original);const sdk=await loadReceiz();
  if(original.file.size>1024*1024)throw Error('This Original exceeds the public document transport capacity. Save the exact file.');
  return {schema:governanceSchema,namespace:governanceNamespace,sourceUrl:BANK_PUBLIC_ORIGIN+governancePath(original.document.terms.kind,original.digest),id:'bankeiz-voting-'+original.digest,state:'published',externalCreatorId:original.document.author,
    title:original.document.terms.kind==='charter'?original.document.terms.rules.name:original.document.terms.kind==='proposal'?original.document.terms.title:original.document.terms.kind,
    data:{digest:original.digest,filename:original.file.name,mime:original.file.type,source:sdk.receizBase64UrlEncode(new Uint8Array(await original.file.arrayBuffer()))}};
}
export async function openGovernanceTransportSource(data:Record<string,unknown>){
  const sdk=await loadReceiz();
  if(typeof data.source!=='string'||data.source.length>1400000||typeof data.filename!=='string'||! /^[\w.-]{1,200}$/.test(data.filename)||typeof data.mime!=='string')throw Error('Invalid public Original transport.');
  const bytes=sdk.receizBase64UrlDecode(data.source);
  const opened=await openGovernanceOriginal(new File([new Uint8Array(bytes)],data.filename,{type:data.mime}));
  if(opened.digest!==data.digest)throw Error('Public Original digest mismatch.');
  return opened;
}
export async function admitPublicGovernanceRow(input:unknown){
  if(!input||typeof input!=='object')throw Error('Invalid public entry.');
  const row=input as PublicProofTransportRecord & {appProjectionClientId?:string;appProjectionPublishedByReceizUserId?:string;appObjectId?:string;appNamespace?:string};
  const sdk=await loadReceiz(),data=sdk.extractReceizAppStateData(row,{schema:governanceSchema,state:'published',requiredDataKey:'source'});
  if(!data||row.appNamespace!==governanceNamespace||row.appProjectionClientId!==BANK_APPLICATION_ID||typeof data.digest!=='string'||! /^[a-f0-9]{64}$/.test(data.digest)||row.appObjectId!=='bankeiz-voting-'+data.digest)return;
  const publisher=row.appProjectionPublishedByReceizUserId;
  const known=records.get(data.digest);
  // A previously admitted Original may predate publisher retention. Upgrade its
  // display metadata from this same delivery without rewriting its proof bytes.
  let existing:GovernanceOriginal|undefined;
  if(known){
    try{existing=await heldGovernanceOriginal(data.digest);}catch{/* Repair a missing file from the incoming source. */}
    if(existing){
      const current=records.get(data.digest)!,updated=withPublisher(current,publisher);
      if(updated!==current){
        records.set(data.digest,updated);changed();
        try{const held=await cache();await held?.put(locationFor(data.digest)+'/view',Response.json(updated));}catch{/* Held in memory. */}
      }
      return;
    }
  }
  const opened=await openGovernanceTransportSource(data);
  await retain(opened,publisher);return opened;
}
let watermark:string|null=null;
export function refreshGovernanceDirectory(rescan=false){
  return refresh??=(async()=>{
    let after=rescan?null:watermark,rejected=false;
    do{
      const url=new URL('/api/public-proof/namespace/'+governanceNamespace,'https://receiz.com');
      url.searchParams.set('limit','12');if(after)url.searchParams.set('after',after);
      const response=await nativeFetch(url);if(!response.ok)throw Error('Public delivery is unavailable. Previously held records remain readable.');
      const page=await response.json() as {ok?:boolean;records?:unknown[];nextCursor?:string|null;checkpoint?:string|null};
      if(page.ok!==true||!Array.isArray(page.records))throw Error('The public directory returned an incomplete page.');
      for(const row of page.records){try{await admitPublicGovernanceRow(row);}catch{rejected=true;}}
      if(page.nextCursor===undefined){if(page.records.length>=100)throw Error('This delivery contains only the newest 100 records. Earlier records require the paginated Receiz reader.');break;}
      const checkpoint=governanceCursorKey(page.checkpoint),prior=governanceCursorKey(after);
      if(page.nextCursor!==null&&(!checkpoint||page.nextCursor!==page.checkpoint||prior&&checkpoint<=prior))throw Error('The public directory cursor did not advance.');
      if(page.records.length&&(!checkpoint||prior&&checkpoint<=prior))throw Error('The public directory checkpoint is invalid.');
      if(!rejected&&page.checkpoint)watermark=page.checkpoint;
      after=page.nextCursor;
    }while(after);
    if(rejected)throw Error('Some delivered Originals could not be verified. Previously verified records are retained.');
  })().finally(()=>{refresh=undefined;});
}

const openingPublic=new Map<string,Promise<void>>();
export function openPublicGovernancePage(digest:string):Promise<void>{
  if(!/^[a-f0-9]{64}$/.test(digest))return Promise.reject(Error('Invalid governance link.'));
  if(records.has(digest))return Promise.resolve();
  const pending=openingPublic.get(digest);if(pending)return pending;
  const action=(async()=>{
    const held=await cache().catch(()=>null),cached=await held?.match(locationFor(digest)+'/view').catch(()=>undefined);
    if(cached){
      try{
        const r=savedProjection(await cached.json(),digest);
        if(r){records.set(digest,r);changed();return;}
      }catch{/* Continue to the exact public transport locator. */}
    }
    const sdk=await loadReceiz(),client=sdk.createReceizClient({baseUrl:'https://receiz.com',fetchImpl:nativeFetch});
    const result=await client.appState.byId('bankeiz-voting-'+digest);
    if(!result.record||result.record.appObjectId!=='bankeiz-voting-'+digest)throw Error('The linked Original is unavailable from public delivery.');
    await admitPublicGovernanceRow(result.record);
    if(!records.has(digest))throw Error('The linked Original could not be verified.');
  })().finally(()=>openingPublic.delete(digest));
  openingPublic.set(digest,action);return action;
}
