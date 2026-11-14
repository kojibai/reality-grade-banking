import {readPublicProfileHeads,readPublicProfileHeadRefusals} from './public-profile-header.js';
import {publicProfileDirectoryBindings} from './public-profile-directory-contract.js';
import {retainPublicProfileHeaders,type PublicMarketCatalog} from './public-market.js';
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
/** Recover only the directory metadata a previous selected response carried.
 * Current membership, pricing, inventory and history remain the same objects;
 * local display restoration supplies no Source receipt or currentness verdict. */
export function restorePublicProfileDirectoryHeaders(input:unknown,revision:string,current:PublicMarketCatalog):PublicMarketCatalog{
 if(!/^[a-f0-9]{64}$/.test(revision))return current;
 const envelope=object(input),held=envelope.schema==='bank.public-market.held-catalog.v1'?object(envelope.catalog):object(envelope.transport),raw=held.publicProfileHeads,policies=held.publicProfileHeadRefusals;
 const bound=publicProfileDirectoryBindings(current),known=new Map((current.publicProfileHeads??[]).map(head=>[head.profile.userId,head]));
 const heads=readPublicProfileHeads(raw).filter(head=>{
  if(!bound({userId:head.profile.userId,username:head.profile.username}))return false;const prior=known.get(head.profile.userId);if(!prior)return true;
  if(prior.profile.username!==head.profile.username)return false;
  const a=Date.parse(String(prior.profile.updatedAt??'')),b=Date.parse(String(head.profile.updatedAt??''));return Number.isFinite(b)&&(!Number.isFinite(a)||b>a);
 });
 const refusals=readPublicProfileHeadRefusals([...(Array.isArray(raw)?raw:[]),...(Array.isArray(policies)?policies:[])]).filter(head=>bound(head.profile));
 if(!heads.length&&!refusals.length)return current;
 const next=retainPublicProfileHeaders({...current,publicProfileHeads:heads,publicProfileHeadRefusals:refusals},current);
 if(JSON.stringify([next.publicProfileHeads,next.publicProfileHeadRefusals])===JSON.stringify([current.publicProfileHeads,current.publicProfileHeadRefusals]))return current;
 return{...next,publicProfileHeadsRevision:revision};
}
