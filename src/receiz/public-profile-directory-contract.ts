/** Public discovery pointers only; neither membership nor proof authority. */
import type {PublicMarketCatalog} from './public-market.js';
export interface PublicProfileDescriptor { userId:string; username:string; updatedAt:string|null }
export const PROFILE_DIRECTORY_PAGE_SIZE=64;
export const publicProfileDirectoryUid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
export function publicProfileDescriptor(value:unknown):PublicProfileDescriptor|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const p=value as Record<string,unknown>;
 if(!publicProfileDirectoryUid(p.userId)||typeof p.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(p.username)||p.updatedAt!==null&&(typeof p.updatedAt!=='string'||p.updatedAt.length>64||!Number.isFinite(Date.parse(p.updatedAt))))return null;
 return{userId:p.userId,username:p.username,updatedAt:p.updatedAt as string|null};
}
/** Existing selected work keeps its exact owner binding through header-only
 * delivery. A handle change cannot relabel that work or make it another UID. */
export function publicProfileDirectoryBindings(catalog:PublicMarketCatalog){
 const owners=new Map<string,Set<string>>(),names=new Map<string,Set<string>>();
 for(const item of catalog.items){const owner=item.ownerIdentity;if(!owner)continue;const handles=owners.get(owner.userId)??new Set<string>(),uids=names.get(owner.username)??new Set<string>();handles.add(owner.username);uids.add(owner.userId);owners.set(owner.userId,handles);names.set(owner.username,uids);}
 return(p:{userId:unknown;username:unknown})=>{
  if(typeof p.userId!=='string'||typeof p.username!=='string')return false;const handles=owners.get(p.userId),uids=names.get(p.username);
  return(!handles||handles.size===1&&handles.has(p.username))&&(!uids||uids.size===1&&uids.has(p.userId));
 };
}
