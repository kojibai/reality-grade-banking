import {profileAvatarUrl} from '../receiz/profile-avatar';
import {ProfileAvatar} from '../components/ProfileAvatar';
import {publicProfileArtwork} from '../receiz/profile-artwork';
import type {PublicMarketItem} from '../receiz/public-market';
const portraits=new Map<string,string|null>();
/** Same original-account artwork projector as the public profile. These fields
 * are presentation coordinates, never a private record or identity authority. */
export function publicOwnerSealAvatar(item:PublicMarketItem):string|null{
 const thumbnail=profileAvatarUrl(item.ownerAvatarFallback);if(thumbnail?.startsWith('data:image/webp;base64,'))return thumbnail;
 const identity=item.ownerIdentity;if(!identity)return null;const key=[identity.userId,identity.username,identity.createdAt].join(':');
 if(portraits.has(key))return portraits.get(key)!;
 const src=publicProfileArtwork(identity).avatarUrl;portraits.set(key,src);if(portraits.size>128)portraits.delete(portraits.keys().next().value!);return src;
}
export function PublicOwnerAvatar({item,name,eager=false}:{item:PublicMarketItem;name:string;eager?:boolean}){
 return <ProfileAvatar src={item.ownerAvatarUrl} fallbackSrc={publicOwnerSealAvatar(item)} name={name} eager={eager}/>;
}
