/** Presentation only. The caller must supply the current account's confirmed
 * public name; device names and incomplete receiving locators are not inputs. */
const infrastructure=new Set(['info','reply','hello','support','postmaster','abuse','noreply','no_reply','mailer_daemon','security','admin']);
export function accountEmailAddress(confirmedUsername:unknown):string|null{
 if(typeof confirmedUsername!=='string'||!/^\w{3,24}$/.test(confirmedUsername)||confirmedUsername!==confirmedUsername.toLowerCase()||infrastructure.has(confirmedUsername)||/^receiz_[a-z0-9]{17,18}$/.test(confirmedUsername))return null;
 return confirmedUsername+'@receiz.com';
}
