import {feedKind,type FeedKind} from '../public-feed/feed-items';
import {profileUsernameLabel,publicAccountDisplayName} from '../receiz/account-name';
import {profileUsername,profilePageUsername} from '../receiz/public-profile';
import type {PublicMarketItem} from '../receiz/public-market';
export type DiscoveryFilter='All'|'People'|FeedKind;
export const discoveryOwnerName=(item:PublicMarketItem)=>publicAccountDisplayName({displayName:item.ownerDisplayName,username:item.ownerUsername},item.ownerUsername??'');
export type DiscoveryPerson={username:string;name:string;avatarUrl:string|null;items:PublicMarketItem[]};
const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
const kinds:FeedKind[]=['image','book','audio','moment','video','essay','document','collectible'];
/** An index of the existing public presentation; never proof or custody admission. */
export function buildDiscoveryIndex(rows:readonly PublicMarketItem[]){
 const seen=new Set<string>(),items:PublicMarketItem[]=[],people=new Map<string,DiscoveryPerson>();
 for(const row of rows){if(seen.has(row.id))continue;seen.add(row.id);items.push(row);
  const username=profileUsername(row.ownerUsername);if(!username||!profilePageUsername(`/${username}/`))continue;
  let person=people.get(username);if(!person){person={username,name:discoveryOwnerName(row),avatarUrl:row.ownerAvatarUrl??null,items:[]};people.set(username,person);}person.items.push(row);
 }
 return {items,people:[...people.values()],entries:new Map(items.map(item=>[item.id,normalize(`${item.title} ${item.summary} ${item.ownerDisplayName??''} @${item.ownerUsername??''} @${profileUsernameLabel(item.ownerUsername)}`)]))};
}
export type DiscoveryIndex=ReturnType<typeof buildDiscoveryIndex>;
export function searchDiscovery(index:DiscoveryIndex,query:string,filter:DiscoveryFilter){
 const words=normalize(query.trim()).split(/\s+/).filter(Boolean),matches=(text:string)=>words.every(word=>text.includes(word));
 const items=filter==='People'?[]:index.items.filter(item=>(filter==='All'||feedKind(item)===filter)&&matches(index.entries.get(item.id)!));
 const people=index.people.filter(person=>(filter==='All'||filter==='People'||person.items.some(item=>feedKind(item)===filter))&&matches(normalize(`${person.name} @${person.username} @${profileUsernameLabel(person.username)}`)));
 return {items,people};
}

/** Initial composition only. Later additions retain the complete visible prefix. */
export function orderDiscoveryItems(rows:readonly PublicMarketItem[]):PublicMarketItem[]{
 const index=buildDiscoveryIndex(rows),buckets=new Map<FeedKind,PublicMarketItem[]>();
 for(const item of index.items){const kind=feedKind(item),bucket=buckets.get(kind)??[];bucket.push(item);buckets.set(kind,bucket);}
 const out:PublicMarketItem[]=[];for(let at=0;out.length<index.items.length;at++)for(const kind of kinds){const item=buckets.get(kind)?.[at];if(item)out.push(item);}return out;
}
