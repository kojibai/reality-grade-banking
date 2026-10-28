import {useEffect,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {OpenIdentity} from '../../receiz/native-identity';
import {publishProfileOwner,readProfileEdit,subscribeProfileActions,closeProfileEdit,registerProfilePbiSigner} from '../../receiz/profile-actions';
import {ProfileEditor} from './ProfileEditor';
import {registerProfileInsightsSource} from '../../receiz/profile-insights-access';
/** Shares BankApp's one existing identity owner. Opening a public profile
 * never creates an account, grants a scope or reads private history. */
export function PublicProfilePortal({identity,userId}:{identity:OpenIdentity|null;userId:string|null}){
 const edit=useSyncExternalStore(subscribeProfileActions,readProfileEdit,()=>null);
 useEffect(()=>{publishProfileOwner(userId);return()=>publishProfileOwner(null);},[identity,userId]);
 useEffect(()=>{if(identity?.profileInsights&&userId)return registerProfileInsightsSource(userId,identity.profileInsights);},[identity,userId]);
 useEffect(()=>{if(!identity||!userId)return;let current=true;const assertCurrent=()=>{if(!current)throw Error('PBI_ACCOUNT_CLOSED');};const remove=registerProfilePbiSigner(userId,async()=>{const {connectPbiToAccount}=await import('../../receiz/pbi-account-connect');assertCurrent();await connectPbiToAccount(identity,assertCurrent);});return()=>{current=false;remove();};},[identity,userId]);
 if(!identity||!edit?.slot||edit.profile.userId!==userId)return null;
 return createPortal(<ProfileEditor key={edit.id} identity={identity} profile={edit.profile} onClose={()=>closeProfileEdit(edit.id)}/>,edit.slot);
}
