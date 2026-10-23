// Public display specimens only. No accounts, keys, admission roots or funds.
const owner='fixtureowner',avatar='https://receiz.com/artwork/regression-avatar.png';
export const items=Array.from({length:51},(_,index)=>({
 id:`profile:${owner}:specimen-${index}`,assetId:`specimen-${index}`,
 title:index?`Unopened specimen ${index}`:'Selected regression specimen',summary:'Synthetic public display specimen',category:'proof',
 sourceUrl:`https://receiz.com/${owner}/verified/specimen-${index}`,verifyUrl:null,
 originalUrl:`https://receiz.com/api/profile/originals/download?receizId=specimen-${index}&kind=original`,originalDigest:'a'.repeat(64),pulse:null,sealedAt:null,
 mediaKind:'image',artworkUrl:`https://receiz.com/artwork/regression-cover-${index}.png`,hasLongForm:false,
 ownerUsername:owner,ownerDisplayName:'Regression specimen',ownerProfileUrl:`https://receiz.com/${owner}`,ownerAvatarUrl:avatar,
 priceUsd:12,changePct:0,chart:[10,12],authority:'projection-only',canTrade:false,
}));
export const selected=items[0];
export const market={ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:items.length,revision:'browser-regression-specimens'},publicOriginals:items.map(item=>({
 id:item.id,receizId:item.assetId,title:item.title,summary:item.summary,valueUsd:item.priceUsd,ownerUsername:owner,ownerDisplayName:item.ownerDisplayName,ownerAvatarUrl:avatar,
 canonicalHref:item.sourceUrl,profileOriginal:{mediaKind:'image',hasLongForm:false,media:{kind:'image',src:item.artworkUrl,originalDownloadSrc:item.originalUrl,originalDownloadSha256Hex:item.originalDigest}},
}))}};
export const profile={schema:'bankeiz.public-profile.v1',userId:'public-display-specimen',username:owner,displayName:'Regression specimen',bio:null,location:null,websiteUrl:null,avatarUrl:avatar,bannerUrl:'https://receiz.com/artwork/unused-regression-banner.png',socialLinks:[],links:[],authorshipVerified:false,pbiReceiptHash:null,createdAt:null,stats:{originals:items.length,views:null,plays:null,seconds:null,completion:null},items,nextCursor:null};
