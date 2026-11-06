import type {OpenIdentity} from './native-identity';
import {projectProfileHeaderFields,type PublicProfileHeader} from './public-profile-header';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Already admitted owner presentation only. Never publish the portable view,
 * its Originals or owner-only fields into anonymous public retention. */
export function readVerifiedOwnerProfileHeader(identity:OpenIdentity,userId:string|null):PublicProfileHeader|null{
 const history=identity.localHistory,binding=identity.binding;
 if(!userId||history?.schema!=='receiz.sdk.identity_account_projection.v1'||history.portableStateVerified!==true
  ||history.authority!=='verified-identity-portable-state'||!history.keyId||history.keyId!==binding?.keyId
  ||!history.owner?.uid||history.owner.uid!==binding?.identityOwnerReceizId)return null;
 const state=object(history.verifiedState),account=object(state.account),username=identity.accountUsername?.()||identity.username;
 if(state.schema!=='receiz.account.state.v3'||account.userId!==userId||typeof username!=='string'||!/^[a-z0-9_]{3,24}$/.test(username))return null;
 const candidates=[object(object(state.profileView).profile),object(state.profile)].filter(profile=>profile.userId===userId&&profile.username===username);
 if(candidates.some(profile=>profile.isPrivate===true))return null;
 const profile=candidates.find(profile=>profile.isPrivate===false);
 return profile?projectProfileHeaderFields(profile):null;
}
