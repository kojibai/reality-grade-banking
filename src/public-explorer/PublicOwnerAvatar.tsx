import {profileAvatarUrl} from '../receiz/profile-avatar';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {publicProfileAvatar} from '../receiz/profile-artwork';
import type {PublicMarketItem} from '../receiz/public-market';
/** Same original-account artwork projector as the public profile. These fields
 * are presentation coordinates, never a private record or identity authority. */
export function publicOwnerSealAvatar(item:PublicMarketItem):string|null{
 const thumbnail=profileAvatarUrl(item.ownerAvatarFallback);if(thumbnail?.startsWith('data:image/webp;base64,'))return thumbnail;
 return item.ownerIdentity?publicProfileAvatar(item.ownerIdentity):null;
}
export function PublicOwnerAvatar({item,name,src=item.ownerAvatarUrl,eager=false}:{item:PublicMarketItem;name:string;src?:string|null;eager?:boolean}){
 const thumbnail=profileAvatarUrl(item.ownerAvatarFallback);
 return <ProfileAvatar account={item.ownerIdentity} src={src} fallbackSrc={thumbnail?.startsWith('data:image/webp;base64,')?thumbnail:null} name={name} eager={eager}/>;
}
