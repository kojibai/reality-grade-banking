import {memo,useMemo,useState} from 'react';
import {profileAvatarUrl} from '../receiz/profile-avatar';
import './profile-avatar.css';
export const ProfileAvatar=memo(function ProfileAvatar({src,name,fallback,className='',eager=false}:{src?:string|null;name:string;fallback?:string;className?:string;eager?:boolean}){
 const url=useMemo(()=>profileAvatarUrl(src),[src]),[failed,setFailed]=useState<string|null>(null);
 const initials=fallback??(name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()||'ID');
 return <span className={'profile-avatar '+className} aria-hidden="true"><span>{initials}</span>{url&&failed!==url&&<img key={url} src={url} alt="" loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" draggable={false} onError={()=>setFailed(url)}/>}</span>;
});
