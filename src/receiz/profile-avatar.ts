import {accountPersonName} from './account-presentation.js';
import {publicProfileAvatar} from './profile-artwork.js';
import type {OpenIdentity} from './native-identity';
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Public presentation only. Preserve carried Receiz seal artwork intact;
 * never use a private Identity Seal backup as an avatar. */
export function profileAvatarUrl(value:unknown):string|null {
 if(typeof value!=='string'||value.length>256*1024)return null;
 const raw=value.trim();
 if(/^data:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)(?:;charset=utf-8|;utf8)?(?:;base64)?,/i.test(raw))return raw;
 if(!raw||raw.length>8192||raw.startsWith('//'))return null;
 try{const url=new URL(raw,raw.startsWith('/')?'https://receiz.com':undefined);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function identityProfileAvatar(identity:OpenIdentity):string|null {
 const current=identity.knownProfile?.();if(current)return profileAvatarUrl(current.avatarUrl)??publicProfileAvatar(current);
 const held=identity.knownMessagingDisplay?.();
 if(held)for(const conversation of held.inbox){const own=conversation.members.find(person=>person.kind==='user'&&person.userId===held.accountUid),avatar=profileAvatarUrl(own?.avatarUrl)??(own?publicProfileAvatar(own as unknown as Record<string,unknown>):null);if(avatar)return avatar;}
 if(identity.localHistory?.portableStateVerified!==true)return null;
 const source=object(identity.localHistory.verifiedState);
 const profile=object(source.profile),view=object(object(source.profileView).profile);
 return profileAvatarUrl(profile.avatarUrl)??profileAvatarUrl(view.avatarUrl)??publicProfileAvatar(profile)??publicProfileAvatar(view);
}

/** The same display-name precedence as the public profile; never key/export time. */
export function identityProfileName(identity:OpenIdentity):string{
 const current=identity.knownProfile?.();if(current)return accountPersonName(current);
 if(identity.localHistory?.portableStateVerified===true){const state=object(identity.localHistory.verifiedState),profile=object(object(state.profileView).profile),direct=object(state.profile);for(const candidate of [profile,direct])if(candidate.userId&&candidate.username)return accountPersonName(candidate);}
 const held=identity.knownMessagingDisplay?.(),own=held?.inbox.flatMap(row=>row.members).find(person=>person.kind==='user'&&person.userId===held.accountUid);
 return own?accountPersonName(own):identity.accountUsername?.()??identity.username??identity.binding.identityOwnerReceizId;
}
