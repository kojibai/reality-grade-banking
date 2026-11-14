import {curatePublicProfileHead,curatePublicProfileHeadRefusal,readPublicProfileHeads,readPublicProfileHeadRefusals} from './public-profile-header.js';
import {publicProfileDirectoryBindings} from './public-profile-directory-contract.js';
import {retainPublicProfileHeaders,type PublicMarketCatalog} from './public-market.js';
import {browserPreparedBankCache,type PreparedBankCache} from './prepared-bank-cache.js';
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
export const PUBLIC_PROFILE_DIRECTORY_CACHE_PATH='/api/bank/public-profile-directory?held=1';
/** Public metadata only, in the existing public CacheStorage. Keeping the
 * received operands small avoids reopening a carried collection to find them.
 * This checkpoint supplies no proof, ownership or Source-currentness verdict. */
export function createPublicProfileDirectoryRetention(cache:PreparedBankCache|undefined=browserPreparedBankCache(PUBLIC_PROFILE_DIRECTORY_CACHE_PATH)){
 const heads=new Map<string,unknown>();let revision:string|undefined,loading:Promise<ReturnType<typeof snapshot>>|undefined,loaded=false;
 const snapshot=()=>revision?{revision,input:{transport:{publicProfileHeads:[...heads.values()]}}}:null;
 const curate=(input:unknown)=>curatePublicProfileHeadRefusal(input)??curatePublicProfileHead(input);
 const read=()=>{
  if(loaded)return Promise.resolve(snapshot());if(loading)return loading;
  loading=(async()=>{try{
   const response=await cache?.read();if(!response)return null;
   const length=Number(response.headers.get('content-length'));
   if(!response.ok||!Number.isSafeInteger(length)||length<=0||length>32*1024*1024){void response.body?.cancel();return null;}
   const input=await response.json();if(input?.schema!=='bank.public-profile-directory.retained.v1'||!/^[a-f0-9]{64}$/.test(input.revision)||!Array.isArray(input.heads)||input.heads.length>100000)return null;
   for(const raw of input.heads){const head=curate(raw);if(head)heads.set(String(head.profile.userId),head);}revision=input.revision;return snapshot();
  }catch{return null;}finally{loaded=true;loading=undefined;}})();return loading;
 };
 return{read,async save(values:readonly unknown[],nextRevision:string){
  await read();if(!/^[a-f0-9]{64}$/.test(nextRevision))return;
  for(const raw of values){const head=curate(raw);if(head)heads.set(String(head.profile.userId),head);}revision=nextRevision;if(!cache)return;
  const bytes=new TextEncoder().encode(JSON.stringify({schema:'bank.public-profile-directory.retained.v1',revision,heads:[...heads.values()]}));if(bytes.length>32*1024*1024)return;
  await cache.write(new Response(bytes,{headers:{'content-type':'application/json','content-length':String(bytes.length)}}));
 }};
}
/** Recover only the directory metadata a previous selected response carried.
 * Current membership, pricing, inventory and history remain the same objects;
 * local display restoration supplies no Source receipt or currentness verdict. */
export function restorePublicProfileDirectoryHeaders(input:unknown,revision:string,current:PublicMarketCatalog):PublicMarketCatalog{
 if(!/^[a-f0-9]{64}$/.test(revision))return current;
 const envelope=object(input),held=envelope.schema==='bank.public-market.held-catalog.v1'?object(envelope.catalog):object(envelope.transport),raw=held.publicProfileHeads,policies=held.publicProfileHeadRefusals;
 const bound=publicProfileDirectoryBindings(current),known=new Map((current.publicProfileHeads??[]).map(head=>[head.profile.userId,head])),refused=new Set((current.publicProfileHeadRefusals??[]).map(head=>head.profile.userId));
 const heads=readPublicProfileHeads(raw).filter(head=>{
  if(refused.has(String(head.profile.userId))||!bound({userId:head.profile.userId,username:head.profile.username}))return false;const prior=known.get(head.profile.userId);if(!prior)return true;
  if(prior.profile.username!==head.profile.username)return false;
  const a=Date.parse(String(prior.profile.updatedAt??'')),b=Date.parse(String(head.profile.updatedAt??''));return Number.isFinite(b)&&(!Number.isFinite(a)||b>a);
 });
 const refusals=readPublicProfileHeadRefusals([...(Array.isArray(raw)?raw:[]),...(Array.isArray(policies)?policies:[])]).filter(head=>bound(head.profile));
 if(!heads.length&&!refusals.length)return current;
 const next=retainPublicProfileHeaders({...current,publicProfileHeads:heads,publicProfileHeadRefusals:refusals},current);
 if(JSON.stringify([next.publicProfileHeads,next.publicProfileHeadRefusals])===JSON.stringify([current.publicProfileHeads,current.publicProfileHeadRefusals]))return current;
 return{...next,publicProfileHeadsRevision:revision};
}
