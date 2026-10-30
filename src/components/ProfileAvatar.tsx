import {memo,useMemo,useState} from 'react';
import {profileAvatarUrl} from '../receiz/profile-avatar';
import './profile-avatar.css';
export const ProfileAvatar=memo(function ProfileAvatar({src,name,fallback,fallbackSrc,className='',eager=false}:{src?:string|null;name:string;fallback?:string;fallbackSrc?:string|null;className?:string;eager?:boolean}){
 const url=useMemo(()=>profileAvatarUrl(src),[src]),[failed,setFailed]=useState<string|null>(null);
 const seal=useMemo(()=>profileAvatarUrl(fallbackSrc),[fallbackSrc]),image=url&&failed!==url?url:seal&&failed!==seal?seal:null;
 const initials=fallback??(name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()||'ID');
 return <span className={'profile-avatar '+className} aria-hidden="true"><span>{initials}</span>{image&&<img key={image} src={image} alt="" loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" draggable={false} onError={()=>setFailed(image)}/>}</span>;
});
