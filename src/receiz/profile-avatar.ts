import {accountPersonName} from './account-presentation.js';
import {publicProfileAvatar} from './profile-artwork.js';
import {isBankNativeApplicationId} from './config.js';
import type {OpenIdentity} from './native-identity';
import {readAccountAppearance} from './account-appearance.js';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
// Index the same held public presentation by immutable account ID. This keeps
// the early avatar helper independent of the full Market/profile import graph.
const observedPortraits=new Map<string,{username:string;avatarUrl:string|null}>();
export function rememberObservedProfilePortrait(profile:{userId:string;username:string;avatarUrl:string|null;createdAt?:string|null;authorshipVerified?:boolean;pbiReceiptHash?:string|null}){
 const avatarUrl=profileAvatarUrl(profile.avatarUrl)??publicProfileAvatar({...profile,authorshipPbiReceiptHash:profile.pbiReceiptHash}),previous=observedPortraits.get(profile.userId);
 observedPortraits.delete(profile.userId);observedPortraits.set(profile.userId,{username:profile.username,avatarUrl});if(observedPortraits.size>24)observedPortraits.delete(observedPortraits.keys().next().value!);
 // The retained BankApp memo and its existing cold-page hint observe this
 // event. Repeated public values and valuation updates do not repaint it.
 if((!previous||previous.avatarUrl!==avatarUrl)&&typeof dispatchEvent==='function')dispatchEvent(new Event('bankeiz:profile-updated'));
}
export function forgetObservedProfilePortrait(username:string){for(const[uid,profile]of observedPortraits)if(profile.username===username)observedPortraits.delete(uid);}

/** Public presentation only. Preserve carried Receiz seal artwork intact;
 * never use a private Identity Seal backup as an avatar. */
export function profileAvatarUrl(value:unknown):string|null {
 if(typeof value!=='string'||value.length>256*1024)return null;
 const raw=value.trim();
 if(/^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)(?:;charset=utf-8|;utf8)?(?:;base64)?,/i.test(raw))return raw;
 if(!raw||raw.length>8192||raw.startsWith('//'))return null;
 try{const url=new URL(raw,raw.startsWith('/')?'https://receiz.com':undefined);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
/** The signed Bank bootstrap establishes birth only for its exact admitted
 * identity. A connected wallet's account UID does not replace that identity. */
export function freshGenesisProfile(identity:OpenIdentity,source:Record<string,unknown>) {
 const projection=identity.localHistory,genesis=object(source.bankGenesis),account=object(source.account),userId=account.userId,owner=projection.owner?.uid;
 if(projection.schema!=='receiz.sdk.identity_account_projection.v1'||projection.authority!=='verified-identity-portable-state'
  ||typeof projection.keyId!=='string'||!projection.keyId||projection.keyId!==identity.binding?.keyId||typeof owner!=='string'||owner!==identity.binding?.identityOwnerReceizId
  ||source.schema!=='receiz.account.state.v3'||genesis.schema!=='bank.account-genesis.v1'||!isBankNativeApplicationId(genesis.applicationId)
  ||genesis.keyId!==projection.keyId||typeof userId!=='string'||!userId||genesis.userId!==userId||owner!==userId
  ||typeof account.username!=='string'||!account.username||typeof genesis.createdAt!=='string'||source.createdAt!==genesis.createdAt||!Number.isFinite(Date.parse(genesis.createdAt))
  ||typeof source.exportedAt!=='string'||!Number.isFinite(Date.parse(source.exportedAt))||Date.parse(genesis.createdAt)>Date.parse(source.exportedAt)
  ||typeof genesis.kaiUPulse!=='string'||!/^\d{1,30}$/.test(genesis.kaiUPulse))return null;
 return {userId,username:identity.accountUsername?.()||account.username,createdAt:genesis.createdAt};
}
export function identityProfileAvatar(identity:OpenIdentity):string|null {
 const current=identity.knownProfile?.();if(current)return profileAvatarUrl(current.avatarUrl)??publicProfileAvatar(current);
 const source=identity.localHistory?.portableStateVerified===true?object(identity.localHistory.verifiedState):{},walletUid=identity.knownWallet?.()?.wallet.userId,uid=walletUid??object(source.account).userId;
 const observed=typeof uid==='string'?observedPortraits.get(uid):undefined;if(observed)return observed.avatarUrl;
 // The existing cold-page hint is usable only beneath this admitted account
 // or its exact local identity key. It never establishes identity or funds.
 const appearance=readAccountAppearance();if(appearance&&(typeof uid==='string'&&appearance.accountUid===uid||!walletUid&&appearance.identityKeyId&&appearance.identityKeyId===identity.binding?.keyId))return appearance.avatarUrl;
 const held=identity.knownMessagingDisplay?.();
 if(held)for(const conversation of held.inbox){const own=conversation.members.find(person=>person.kind==='user'&&person.userId===held.accountUid),avatar=profileAvatarUrl(own?.avatarUrl)??(own?publicProfileAvatar(own as unknown as Record<string,unknown>):null);if(avatar)return avatar;}
 if(identity.localHistory?.portableStateVerified!==true)return null;
 const profile=object(source.profile),view=object(object(source.profileView).profile);
 const avatar=profileAvatarUrl(profile.avatarUrl)??profileAvatarUrl(view.avatarUrl)??publicProfileAvatar(profile)??publicProfileAvatar(view);
 if(avatar)return avatar;
 const fresh=freshGenesisProfile(identity,source);return fresh?publicProfileAvatar(fresh):null;
}

/** The same display-name precedence as the public profile; never key/export time. */
export function identityProfileName(identity:OpenIdentity):string{
 const current=identity.knownProfile?.();if(current)return accountPersonName(current);
 if(identity.localHistory?.portableStateVerified===true){const state=object(identity.localHistory.verifiedState),profile=object(object(state.profileView).profile),direct=object(state.profile);for(const candidate of [profile,direct])if(candidate.userId&&candidate.username)return accountPersonName(candidate);}
 const held=identity.knownMessagingDisplay?.(),own=held?.inbox.flatMap(row=>row.members).find(person=>person.kind==='user'&&person.userId===held.accountUid);
 return own?accountPersonName(own):identity.accountUsername?.()??identity.username??identity.binding.identityOwnerReceizId;
}
