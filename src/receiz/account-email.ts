/** Presentation only. The caller must supply the current account's confirmed
 * public name; device names and incomplete receiving locators are not inputs. */
const infrastructure=new Set(['info','reply','hello','support','postmaster','abuse','noreply','no_reply','mailer_daemon','security','admin']);
export function accountEmailAddress(confirmedUsername:unknown):string|null{
 if(typeof confirmedUsername!=='string'||!/^\w{3,24}$/.test(confirmedUsername)||confirmedUsername!==confirmedUsername.toLowerCase()||infrastructure.has(confirmedUsername)||/^receiz_[a-z0-9]{17,18}$/.test(confirmedUsername))return null;
 return confirmedUsername+'@receiz.com';
}

const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** A same-account profile can suggest a complete name; it cannot establish
 * canonical mail ownership. Conflicting full names remain unresolved. */
export function accountEmailReceivingName(confirmedUsername:unknown,accountUid:string|null,profiles:readonly unknown[]):string|null{
 if(typeof confirmedUsername!=='string'||!/^receiz_[a-z0-9]{17}$/.test(confirmedUsername)||!accountUid)return null;
 const names=new Set<string>();
 for(const value of profiles){const p=object(value);if(p.userId!==accountUid||p.username!==confirmedUsername)continue;
  const name=p.receivingUsername;if(typeof name==='string'&&/^[a-z0-9]{18}$/.test(name)&&'receiz_'+name.slice(0,17)===confirmedUsername)names.add(name);
 }
 return names.size===1?[...names][0]:null;
}
/** The exact canonical full-name lookup must independently select this UID.
 * A shortened/device-derived projection alone is never a mailbox claim. */
export function canonicalAccountEmailAddress(fullName:string|null,accountUid:string|null,profile:unknown):string|null{
 const p=object(profile);
 if(!fullName||!accountUid||p.userId!==accountUid||p.username!==fullName&&p.resolvedReceivingUsername!==fullName)return null;
 return accountEmailAddress(fullName);
}
export function verifiedAccountEmailProfiles(history:unknown,accountUid:string|null):readonly unknown[]{
 const held=object(history),state=object(held.verifiedState);
 if(!accountUid||held.authority!=='verified-identity-portable-state'||held.portableStateVerified!==true||object(state.account).userId!==accountUid)return[];
 return[object(state.profileView).profile,state.profile];
}
