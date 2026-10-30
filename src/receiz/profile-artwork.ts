import {artwork} from './identity-artwork-runtime.mjs';
import {profileAvatarUrl} from './profile-avatar.js';
import {resolveProfileIdentityCreationKaiMicroPulse} from '../../native/receiz/app/lib/profile/profileIdentityCreationCoordinate.js';
/** Same source/arguments as Receiz's default profile artwork. This is public
 * presentation, not the private Identity Record or its recovery payload. */
export function publicProfileArtwork(profile:Readonly<Record<string,unknown>>):{avatarUrl:string|null;bannerUrl:string|null}{
 const avatarUrl=profileAvatarUrl(profile.avatarUrl),bannerUrl=profileAvatarUrl(profile.bannerUrl);
 if(avatarUrl&&bannerUrl)return {avatarUrl,bannerUrl};
 const createdAt=typeof profile.createdAt==='string'?profile.createdAt:null;
 const creationKaiMicroPulse=resolveProfileIdentityCreationKaiMicroPulse({originalAccountCreatedAt:createdAt,persistedMicroPulse:typeof profile.creationKaiMicroPulse==='string'?profile.creationKaiMicroPulse:null,persistedSource:typeof profile.creationKaiSource==='string'?profile.creationKaiSource:null});
 if(!createdAt||!Number.isFinite(Date.parse(createdAt))||!creationKaiMicroPulse||typeof profile.userId!=='string'||!profile.userId||typeof profile.username!=='string')return {avatarUrl,bannerUrl};
 const hash=profile.authorshipVerified===true&&typeof profile.authorshipPbiReceiptHash==='string'&&/^[a-f0-9]{64}$/i.test(profile.authorshipPbiReceiptHash)?profile.authorshipPbiReceiptHash:null;
 const generated=artwork({userId:profile.userId,createdAt,creationKaiMicroPulse,receizId:profile.username,pbiReceiptHash:hash,pbiSignedAt:typeof profile.authorshipPbiSignedAt==='string'?profile.authorshipPbiSignedAt:null,pbiSignedKaiMicroPulse:typeof profile.authorshipPbiSignedKaiMicroPulse==='string'?profile.authorshipPbiSignedKaiMicroPulse:null});
 const inline=(svg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 return {avatarUrl:avatarUrl??inline(generated.avatarSvg),bannerUrl:bannerUrl??inline(generated.bannerSvg)};
}
