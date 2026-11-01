import {artwork} from './identity-artwork-runtime.mjs';
import {profileAvatarUrl} from './profile-avatar.js';
import {resolveProfileIdentityCreationKaiMicroPulse} from '../../native/receiz/app/lib/profile/profileIdentityCreationCoordinate.js';
const generatedPortraits=new Map<string,string>(),generatedBanners=new Map<string,string>();
/** Same source/arguments as Receiz's default profile artwork. This is public
 * presentation, not the private Identity Record or its recovery payload. */
function profileArtwork(profile:Readonly<Record<string,unknown>>,avatarOnly=false):{avatarUrl:string|null;bannerUrl:string|null}{
 const avatarUrl=profileAvatarUrl(profile.avatarUrl),bannerUrl=profileAvatarUrl(profile.bannerUrl);
 if(avatarUrl&&bannerUrl)return {avatarUrl,bannerUrl};
 const createdAt=typeof profile.createdAt==='string'?profile.createdAt:null;
 const creationKaiMicroPulse=resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:createdAt,persistedMicroPulse:typeof profile.creationKaiMicroPulse==='string'?profile.creationKaiMicroPulse:null,persistedSource:typeof profile.creationKaiSource==='string'?profile.creationKaiSource:null});
 if(!createdAt||!Number.isFinite(Date.parse(createdAt))||!creationKaiMicroPulse||typeof profile.userId!=='string'||!profile.userId||typeof profile.username!=='string')return {avatarUrl,bannerUrl};
 const hash=profile.authorshipVerified===true&&typeof profile.authorshipPbiReceiptHash==='string'&&/^[a-f0-9]{64}$/i.test(profile.authorshipPbiReceiptHash)?profile.authorshipPbiReceiptHash:null;
 const key=JSON.stringify([profile.userId,createdAt,creationKaiMicroPulse,profile.username,hash,profile.authorshipPbiSignedAt,profile.authorshipPbiSignedKaiMicroPulse]);
 const heldAvatar=generatedPortraits.get(key),heldBanner=generatedBanners.get(key);if((avatarUrl||heldAvatar)&&(avatarOnly||bannerUrl||heldBanner))return{avatarUrl:avatarUrl??heldAvatar??null,bannerUrl:bannerUrl??heldBanner??null};
 const generated=artwork({userId:profile.userId,createdAt,creationKaiMicroPulse,receizId:profile.username,pbiReceiptHash:hash,pbiSignedAt:typeof profile.authorshipPbiSignedAt==='string'?profile.authorshipPbiSignedAt:null,pbiSignedKaiMicroPulse:typeof profile.authorshipPbiSignedKaiMicroPulse==='string'?profile.authorshipPbiSignedKaiMicroPulse:null});
 const inline=(svg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 const result={avatarUrl:inline(generated.avatarSvg),bannerUrl:inline(generated.bannerSvg)};generatedPortraits.set(key,result.avatarUrl);generatedBanners.set(key,result.bannerUrl);if(generatedPortraits.size>128)generatedPortraits.delete(generatedPortraits.keys().next().value!);if(generatedBanners.size>8)generatedBanners.delete(generatedBanners.keys().next().value!);
 return {avatarUrl:avatarUrl??result.avatarUrl,bannerUrl:bannerUrl??result.bannerUrl};
}

export const publicProfileArtwork=(profile:Readonly<Record<string,unknown>>)=>profileArtwork(profile);
/** Small account portraits share one bounded realization cache; lists do not retain banners. */
export const publicProfileAvatar=(profile:Readonly<Record<string,unknown>>)=>profileArtwork(profile,true).avatarUrl;
