import {profileUsernameLabel} from '../receiz/account-name';
import type {ReactNode} from 'react';
import {profilePagePath,profileUsername} from '../receiz/public-profile';
/** Public identity navigation only; canonical proof/source links stay intact. */
export function AccountProfileLink({username,children,className,label}:{username:string|null|undefined;children:ReactNode;className?:string;label?:string}){
 const name=profileUsername(username?.toLowerCase());
 const handle=Array.isArray(children)&&children.length===2&&children[0]==='@'&&children[1]===name||typeof children==='string'&&children==='@'+name;
 const visible=handle&&name?'@'+profileUsernameLabel(name):children;
 return name?<a href={profilePagePath(name)} className={className} aria-label={label}>{visible}</a>:<span className={className}>{children}</span>;
}
