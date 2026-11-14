import {legacyReceivingUsername} from '../native/receiz/app/lib/profile/receivingUsername.js';
import {profileUsername} from '../src/receiz/public-profile.js';

export const fullReceivingProfileName=(value:unknown):string|null=>typeof value==='string'&&/^(?:receiz_)?[a-z0-9]{18}$/.test(value)?value:null;
export function fullReceivingProfilePath(path:string):string|null{return fullReceivingProfileName(/^\/(?:u\/)?([^/]+)\/?$/.exec(path)?.[1]);}
/** A new alias needs only its existing public route's exact canonical redirect.
 * Canonical compiled pages never call this reader or open another collection. */
export async function readPublicProfileAlias(username:string,fetchImpl:typeof fetch=fetch):Promise<string|null>{
 const expected=legacyReceivingUsername(username);if(!expected)return username;
 const target=new URL(`https://receiz.com/api/profile/${username}?surface=public-route&representation=collection-v2`);
 const response=await fetchImpl(target,{method:'HEAD',credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(8000)});
 await response.body?.cancel().catch(()=>{});
 if([403,404].includes(response.status))return null;
 if(response.status===307){
  const location=response.headers.get('location');if(!location)throw Error('PROFILE_ALIAS_UNAVAILABLE');
  const canonical=new URL(location,target);
  const name=canonical.pathname.slice('/api/profile/'.length);
  if(canonical.origin!==target.origin||!canonical.pathname.startsWith('/api/profile/')||!profileUsername(name)||canonical.pathname!==`/api/profile/${name}`||canonical.pathname!==`/api/profile/${expected}`&&response.headers.get('x-receiz-profile-alias')!==username||canonical.search!==target.search||canonical.hash)throw Error('PROFILE_ALIAS_UNAVAILABLE');
  return name;
 }
 if(response.ok&&profileUsername(username))return username;
 throw Error('PROFILE_ALIAS_UNAVAILABLE');
}

/** Explicit email presentation needs the canonical alias's exact owner as well
 * as its locator. Ordinary profile navigation keeps its existing reader. */
export async function readPublicProfileAliasOwner(username:string,fetchImpl:typeof fetch=fetch):Promise<{username:string;ownerUserId:string|null}|null>{
 let redirected=false,owner:string|null=null,alias:string|null=null;
 const canonical=await readPublicProfileAlias(username,async(input,init)=>{
  const response=await fetchImpl(input,init);
  if(response.status===307){redirected=true;owner=response.headers.get('x-receiz-profile-owner');alias=response.headers.get('x-receiz-profile-alias');}
  return response;
 });
 if(!canonical)return null;
 if(redirected&&(!owner||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(owner)||alias!==username))throw Error('PROFILE_ALIAS_UNAVAILABLE');
 return{username:canonical,ownerUserId:owner};
}
