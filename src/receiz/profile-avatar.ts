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
 const current=identity.knownProfile?.();if(current)return profileAvatarUrl(current.avatarUrl);
 const held=identity.knownMessagingDisplay?.();
 if(held)for(const conversation of held.inbox){const own=conversation.members.find(person=>person.kind==='user'&&person.userId===held.accountUid),avatar=profileAvatarUrl(own?.avatarUrl);if(avatar)return avatar;}
 if(identity.localHistory?.portableStateVerified!==true)return null;
 const source=object(identity.localHistory.verifiedState);
 return profileAvatarUrl(object(source.profile).avatarUrl)??profileAvatarUrl(object(object(source.profileView).profile).avatarUrl);
}
