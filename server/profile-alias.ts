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
  if(canonical.origin!==target.origin||canonical.pathname!==`/api/profile/${expected}`||canonical.search!==target.search||canonical.hash)throw Error('PROFILE_ALIAS_UNAVAILABLE');
  return expected;
 }
 if(response.ok&&profileUsername(username))return username;
 throw Error('PROFILE_ALIAS_UNAVAILABLE');
}
