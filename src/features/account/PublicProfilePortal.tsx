import {useEffect,useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import type {OpenIdentity} from '../../receiz/native-identity';
import {publishProfileOwner,readProfileEdit,subscribeProfileActions,closeProfileEdit} from '../../receiz/profile-actions';
import {ProfileEditor} from './ProfileEditor';
/** Shares BankApp's one existing identity owner. Opening a public profile
 * never creates an account, grants a scope or reads private history. */
export function PublicProfilePortal({identity,userId}:{identity:OpenIdentity|null;userId:string|null}){
 const edit=useSyncExternalStore(subscribeProfileActions,readProfileEdit,()=>null);
 useEffect(()=>{publishProfileOwner(userId);return()=>publishProfileOwner(null);},[identity,userId]);
 if(!identity||!edit?.slot||edit.profile.userId!==userId)return null;
 return createPortal(<ProfileEditor key={edit.id} identity={identity} profile={edit.profile} onClose={()=>closeProfileEdit(edit.id)}/>,edit.slot);
}
