import {publicAccountDisplayName,publicProfileUsername} from './account-name.js';
import {publicProfileArtwork} from './profile-artwork.js';
export interface PublicProfileHeader {
 schema:'bankeiz.public-profile.v1';userId:string;username:string;receivingUsername?:string;displayName:string;bio:string|null;location:string|null;
 websiteUrl:string|null;avatarUrl:string|null;bannerUrl:string|null;socialLinks:{label:string;url:string}[];links:{label:string;url:string}[];
 authorshipVerified:boolean;pbiReceiptHash:string|null;createdAt:string|null;bookingEnabled?:boolean;
 stats:{originals:number|null;views:number|null;plays:number|null;seconds:number|null;completion:number|null};
}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():null;
const number=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
function link(v:unknown){const raw=text(v,8192);if(!raw)return null;try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const profileFields=['userId','username','receivingUsername','displayName','displayNameSource','bio','location','websiteUrl','avatarUrl','bannerUrl','socialXUrl','socialInstagramUrl','socialYoutubeUrl','socialLinkedinUrl','socialGithubUrl','authorshipVerified','authorshipPbiReceiptHash','authorshipPbiSignedAt','authorshipPbiSignedKaiMicroPulse','createdAt','updatedAt','creationKaiMicroPulse','creationKaiSource','showSchedulerButton','isPrivate'] as const;
const statsFields=['originals','originalViews','streams','witnessedSeconds','streamCompletionRatePct'] as const;
/** Select the already anonymous, accepted Source header. No Original bodies,
 * owner-only fields or authority are added to the public display handoff. */
export function curatePublicProfileHead(input:unknown){
 const view=object(input),p=object(view.profile),viewer=object(view.viewer);
 if(!text(p.userId,256)||typeof p.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(p.username)||p.isPrivate!==false||viewer.canView!==true)return null;
 const stats=object(view.stats),profile:Record<string,unknown>={...Object.fromEntries(profileFields.filter(key=>Object.hasOwn(p,key)).map(key=>[key,p[key]])),links:Array.isArray(p.links)?p.links.slice(0,20).flatMap(value=>{const row=object(value),label=text(row.label,80),url=link(row.url);return label&&url&&url.length<=2048?[{label,url}]:[];}):[]};
 return{profile,viewer:{canView:viewer.canView},stats:Object.fromEntries(statsFields.map(key=>[key,number(stats[key])])),...(Array.isArray(view.unavailableDecorators)&&view.unavailableDecorators.includes('engagement')?{unavailableDecorators:['engagement']}:{} )};
}
export type PublicProfileHead=NonNullable<ReturnType<typeof curatePublicProfileHead>>;
const selectedHeads=new WeakMap<object,PublicProfileHeader>(),headerBases=new WeakMap<object,string>();
/** Exact display equality for one compact carried header, never a freshness,
 * verification or authority verdict. Stats and generated artwork are excluded. */
export function publicProfileHeaderDisplayBasis(input:unknown):string|null{
 if(!input||typeof input!=='object')return null;const known=headerBases.get(input);if(known)return known;
 const view=curatePublicProfileHead(input);if(!view)return null;const key=JSON.stringify(view.profile);headerBases.set(input,key);return key;
}
/** Header projection shared by full profile reads and the existing Market
 * response. PBI belongs to this profile, never to one of its Originals. */
export function readPublicProfileHeader(input:unknown,expectedUsername?:string):PublicProfileHeader|null{
 const previous=input&&typeof input==='object'?selectedHeads.get(input):undefined;if(previous&&(expectedUsername===undefined||previous.username===expectedUsername))return previous;
 const view=curatePublicProfileHead(input);if(!view)return null;const p=view.profile;
 if(expectedUsername!==undefined&&p.username!==expectedUsername)return null;
 const header=projectProfileHeaderFields(p,view.stats,view.unavailableDecorators?.includes('engagement'));if(input&&typeof input==='object'){selectedHeads.set(input,header);const basis=publicProfileHeaderDisplayBasis(input);if(basis)headerBases.set(header,basis);}return header;
}
/** Pure display field projection. Callers preserve their own public/owner
 * scope and exact account binding; this performs no admission or lookup. */
export function projectProfileHeaderFields(p:Record<string,unknown>,stats:Record<string,unknown>={},unavailable=false):PublicProfileHeader{
 const username=String(p.username),images=publicProfileArtwork(p),hash=text(p.authorshipPbiReceiptHash,64);
 return{schema:'bankeiz.public-profile.v1',userId:String(p.userId),username,...(typeof p.receivingUsername==='string'&&publicProfileUsername(username,p.receivingUsername)===p.receivingUsername?{receivingUsername:p.receivingUsername}:{}),displayName:publicAccountDisplayName(p,username),bookingEnabled:p.showSchedulerButton===true,bio:text(p.bio,280),location:text(p.location,100),websiteUrl:link(p.websiteUrl),...images,
 socialLinks:[['X','socialXUrl'],['Instagram','socialInstagramUrl'],['YouTube','socialYoutubeUrl'],['LinkedIn','socialLinkedinUrl'],['GitHub','socialGithubUrl']].flatMap(([label,key])=>{const url=link(p[key]);return url?[{label,url}]:[];}),links:Array.isArray(p.links)?p.links.slice(0,20).flatMap(value=>{const row=object(value),label=text(row.label,80),url=link(row.url);return label&&url&&url.length<=2048?[{label,url}]:[];}):[],
 authorshipVerified:p.authorshipVerified===true&&!!hash&&/^[a-f0-9]{64}$/i.test(hash),pbiReceiptHash:hash&&/^[a-f0-9]{64}$/i.test(hash)?hash:null,createdAt:text(p.createdAt,64),
 stats:{originals:number(stats.originals),views:unavailable?null:number(stats.originalViews),plays:unavailable?null:number(stats.streams),seconds:unavailable?null:number(stats.witnessedSeconds),completion:unavailable?null:number(stats.streamCompletionRatePct)}};
}

/** A duplicate owner or handle is ambiguous, not a reason to pick one header. */
export function readPublicProfileHeads(input:unknown):PublicProfileHead[]{
 if(!Array.isArray(input)||input.length>100_000)return[];
 const rows=input.flatMap(value=>{const head=curatePublicProfileHead(value);return head?[head]:[];}),uids=new Map<string,number>(),names=new Map<string,number>();
 for(const row of rows){const uid=String(row.profile.userId),name=String(row.profile.username);uids.set(uid,(uids.get(uid)??0)+1);names.set(name,(names.get(name)??0)+1);}
 return rows.filter(row=>uids.get(String(row.profile.userId))===1&&names.get(String(row.profile.username))===1);
}
