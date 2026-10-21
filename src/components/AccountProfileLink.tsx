import type {ReactNode} from 'react';
import {profilePagePath,profileUsername} from '../receiz/public-profile';
/** Public identity navigation only; canonical proof/source links stay intact. */
export function AccountProfileLink({username,children,className,label}:{username:string|null|undefined;children:ReactNode;className?:string;label?:string}){
 const name=profileUsername(username?.toLowerCase());
 return name?<a href={profilePagePath(name)} className={className} aria-label={label}>{children}</a>:<span className={className}>{children}</span>;
}
