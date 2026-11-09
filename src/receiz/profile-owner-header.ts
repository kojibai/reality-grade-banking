import type {OpenIdentity} from './native-identity';
import {projectProfileHeaderFields,type PublicProfileHeader} from './public-profile-header';
import {freshGenesisProfile} from './profile-avatar';
import {parseReceivingUsername,receivingUsernameForIdentity} from '../../native/receiz/app/lib/profile/receivingUsername.js';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Already admitted owner presentation only. Never publish the portable view,
 * its Originals or owner-only fields into anonymous public retention. */
export function readVerifiedOwnerProfileHeader(identity:OpenIdentity,userId:string|null):PublicProfileHeader|null{
 const history=identity.localHistory,binding=identity.binding;
 if(!userId||history?.schema!=='receiz.sdk.identity_account_projection.v1'||history.portableStateVerified!==true
  ||history.authority!=='verified-identity-portable-state'||!history.keyId||history.keyId!==binding?.keyId
  ||!history.owner?.uid||history.owner.uid!==binding?.identityOwnerReceizId)return null;
 const state=object(history.verifiedState),account=object(state.account),username=identity.accountUsername?.()||identity.username;
 if(state.schema!=='receiz.account.state.v3'||typeof username!=='string'||parseReceivingUsername(username)!==username)return null;
 const genesis=freshGenesisProfile(identity,state);
 // Connection may bind the device's signed birth to its receiving Account.
 // Reuse that admitted runtime binding; never infer it from the public name.
 if(account.userId!==userId&&(!genesis||identity.walletReceivingAddress?.()!==userId))return null;
 const candidates=[object(object(state.profileView).profile),object(state.profile)].filter(profile=>profile.userId===userId&&profile.username===username);
 if(candidates.some(profile=>profile.isPrivate===true))return null;
 const profile=candidates.find(profile=>profile.isPrivate===false);
 if(profile)return projectProfileHeaderFields(profile);
 if(!genesis||genesis.username!==username)return null;
 const receivingUsername=receivingUsernameForIdentity(username,identity.username??'');
 return projectProfileHeaderFields({...genesis,userId,receivingUsername},{originals:0});
}
