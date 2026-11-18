// Save the existing anonymous directory cards for Observatory's static entry.
// A partial walk never replaces the previously shipped complete observation.
import {writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
function publicAudienceObservation(transport,cards){
  if(transport.publicMembership?.isComplete!==true||!Number.isFinite(Date.parse(transport.generatedAt))||!Array.isArray(transport.publicProfileHeads))throw Error('Complete public Showcase required');
  const directory=new Map(cards.map(card=>[card.userId,card.username]));
  const heads=transport.publicProfileHeads.flatMap(head=>{
    const profile=head.profile;
    if(head.viewer?.canView!==true||profile?.isPrivate!==false||directory.get(profile.userId)!==profile.username||head.unavailableDecorators?.some(key=>key==='engagement'||key==='profile-details'))return [];
    const {userId,username,isPrivate}=profile;
    const stats=Object.fromEntries(['originalViews','streams','witnessedSeconds','streamCompletionRatePct','followers','following','signedOriginals'].flatMap(key=>{
      const value=head.stats?.[key];return typeof value==='number'&&Number.isFinite(value)&&value>=0?[[key,value]]:[];
    }));
    return [{profile:{userId,username,isPrivate},viewer:{canView:true},stats}];
  });
  return {observedAt:transport.generatedAt,heads};
}
const cards=[],ids=new Set(),handles=new Set();
const url=new URL('https://receiz.com/api/profile/public-directory?limit=64');
let previous='';
for(;;){
  const response=await fetch(url,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(25_000)});
  if(!response.ok)throw Error('Public directory unavailable');
  const data=await response.json();
  if(data.schema!=='receiz.public-profile-directory.v1'||data.ok!==true||!Array.isArray(data.profiles)||!Array.isArray(data.cards)||data.cards.length!==data.profiles.length||data.cards.length>64)throw Error('Incomplete public directory page');
  const descriptors=new Map(data.profiles.map(p=>[p.userId,p]));
  for(const card of data.cards){
    const match=descriptors.get(card.userId);
    if(!match||card.isPrivate!==false||match.username!==card.username||match.updatedAt!==card.updatedAt||ids.has(card.userId)||handles.has(card.username))throw Error('Ambiguous public directory card');
    ids.add(card.userId);handles.add(card.username);
    // The display needs only the fields the public card already publishes.
    const {userId,username,displayName,createdAt,updatedAt,isPrivate}=card;
    cards.push({userId,username,displayName,createdAt,updatedAt,isPrivate});
  }
  if(data.nextCursor===null)break;
  if(typeof data.nextCursor!=='string'||data.nextCursor<=previous)throw Error('Public directory cursor did not advance');
  previous=data.nextCursor;url.searchParams.set('after',previous);
}
const source=await fetch('https://receiz.com/api/market/public-membership',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(45_000)});
if(!source.ok)throw Error('Public Showcase unavailable');
const {transport}=await source.json();
const audience=publicAudienceObservation(transport,cards);
const dest=fileURLToPath(new URL('../src/observatory/public-directory.json',import.meta.url));
const scratch=dest+'.'+process.pid;
await writeFile(scratch,JSON.stringify({observedAt:new Date().toISOString(),cards,audience})+'\n');
await rename(scratch,dest);
console.log('Captured '+cards.length+' anonymous public directory cards.');
