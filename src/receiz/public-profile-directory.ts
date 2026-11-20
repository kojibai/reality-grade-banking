import {curatePublicProfileHead,curatePublicProfileHeadRefusal,publicProfileHeaderDisplayBasis,type PublicProfileHead,type PublicProfileHeadRefusal} from './public-profile-header';
import {PROFILE_DIRECTORY_PAGE_SIZE,publicProfileDescriptor,publicProfileDirectoryUid,publicProfileDirectoryBindings,type PublicProfileDescriptor} from './public-profile-directory-contract';
import {prepareHeldPublicMarketResponse,retainPublicProfileHeaders,reusePublicMarketResponse,observePublicMarketMembership,samePublicMarketMembership,type PublicMarketCatalog} from './public-market';
import {publishDiscoveredPublicCatalog,retainedDiscoveredPublicCatalog} from './asset-publication-adoption';
import {createPublicProfileDirectoryStream} from './public-profile-directory-stream';
import {createPublicProfileDirectoryRetention,restorePublicProfileDirectoryHeaders} from './public-profile-directory-retention';
type Header=PublicProfileHead|PublicProfileHeadRefusal;
function heads(catalog:PublicMarketCatalog){return[...(catalog.publicProfileHeads??[]),...(catalog.publicProfileHeadRefusals??[])];}
function basis(head:Header|undefined){return head?publicProfileHeaderDisplayBasis(head)??JSON.stringify(head):null;}
function hints(catalog:PublicMarketCatalog,after:string|undefined,invalidated:ReadonlyMap<string,number>){return heads(catalog).flatMap(head=>{const p=head.profile,descriptor=publicProfileDescriptor({userId:p.userId,username:p.username,updatedAt:invalidated.has(String(p.userId))?null:'unavailableDecorators'in head&&head.unavailableDecorators?.includes('profile-details')?null:'updatedAt'in p?p.updatedAt??null:null});return descriptor&&descriptor.userId>(after??'')?[descriptor]:[];}).sort((a,b)=>a.userId.localeCompare(b.userId)).slice(0,PROFILE_DIRECTORY_PAGE_SIZE);}
function compatible(next:PublicProfileHead,previous:PublicProfileHead|undefined):PublicProfileHead{
 if(!previous||previous.profile.userId!==next.profile.userId||previous.profile.username!==next.profile.username)return next;
 if(next.unavailableDecorators?.includes('profile-details')&&!previous.unavailableDecorators?.includes('profile-details')){
  return{...previous,profile:{...previous.profile,...next.profile,links:previous.profile.links,updatedAt:previous.profile.updatedAt}};
 }
 const p=next.profile,old=previous.profile,retained:Record<string,unknown>={};
 for(const key of ['avatarUrl','bannerUrl','creationKaiMicroPulse','creationKaiSource','authorshipPbiSignedAt','authorshipPbiSignedKaiMicroPulse','receivingUsername'])if(!Object.hasOwn(p,key)&&Object.hasOwn(old,key))retained[key]=old[key];
 if(old.authorshipVerified===true&&typeof old.authorshipPbiReceiptHash==='string'&&/^[a-f0-9]{64}$/.test(old.authorshipPbiReceiptHash)&&!(p.authorshipVerified===true&&typeof p.authorshipPbiReceiptHash==='string'&&/^[a-f0-9]{64}$/.test(p.authorshipPbiReceiptHash))){retained.authorshipVerified=true;retained.authorshipPbiReceiptHash=old.authorshipPbiReceiptHash;}
 return Object.keys(retained).length?{...next,profile:{...p,...retained}}:next;
}
/** One background walk for active shared public consumers. Existing data is never
 * gated by this delivery; every pass starts at the beginning to find new IDs
 * that sort before a previously exhausted cursor. */
export function createPublicProfileDirectoryObserver(dependencies:{fetch:typeof fetch;selected():PublicMarketCatalog|null;publish(next:PublicMarketCatalog,previous:PublicMarketCatalog|null):void;membership?:(current:PublicMarketCatalog|null)=>Promise<PublicMarketCatalog|null>;retention?:ReturnType<typeof createPublicProfileDirectoryRetention>}){
 const retention=dependencies.retention??createPublicProfileDirectoryRetention();
 const detailChanges=new Map<string,number>();let detailChange=0;
 let rerun=false,consumers=0,pending:Promise<void>|undefined,controller:AbortController|undefined;
 async function run(signal:AbortSignal){
  const initial=dependencies.selected();if(!initial?.complete)return;
  const requestedDetails=new Map(detailChanges);
  const expected=new Map(heads(initial).map(head=>[String(head.profile.userId),basis(head)])),patches=new Map<string,Header>();let after:string|undefined;
  try{for(;;){
   if(signal.aborted)return;const current=dependencies.selected();if(!current?.complete)return;
   const known=hints(current,after,requestedDetails),response=await dependencies.fetch('/api/bank/public-profile-directory'+(after?'?after='+after:''),{credentials:'omit',signal,headers:known.length?{'x-receiz-held-profile-heads':JSON.stringify(known)}:undefined});
   if(!response.ok)throw Error('PUBLIC_PROFILE_DIRECTORY_UNAVAILABLE');
   const input=await response.json();if(input?.ok!==true||input.schema!=='bank.public-profile-directory.v1'||!Array.isArray(input.profiles)||input.profiles.length>PROFILE_DIRECTORY_PAGE_SIZE||!Array.isArray(input.publicProfileHeads)||input.publicProfileHeads.length>2*PROFILE_DIRECTORY_PAGE_SIZE||input.nextCursor!==null&&(!publicProfileDirectoryUid(input.nextCursor)||input.nextCursor<=(after??'')))throw Error('PUBLIC_PROFILE_DIRECTORY_INVALID');
   const descriptors=input.profiles.map(publicProfileDescriptor) as (PublicProfileDescriptor|null)[],bindings=new Map<string,PublicProfileDescriptor>();let last=after??'';
   for(const profile of descriptors){if(!profile||profile.userId<=last||input.nextCursor!==null&&profile.userId>input.nextCursor)throw Error('PUBLIC_PROFILE_DIRECTORY_INVALID');last=profile.userId;bindings.set(profile.userId,profile);}
   for(const profile of known)if((input.nextCursor===null||profile.userId<=input.nextCursor)&&!bindings.has(profile.userId))bindings.set(profile.userId,profile);
   for(const raw of input.publicProfileHeads){const head=curatePublicProfileHeadRefusal(raw)??curatePublicProfileHead(raw),binding=head&&bindings.get(String(head.profile.userId));if(head&&binding?.username===head.profile.username)patches.set(String(head.profile.userId),head);}
   if(input.nextCursor===null)break;after=input.nextCursor;
  }}catch{/* Successful earlier pages still join the same held family. */}
  await adopt(patches,expected,signal);
  if(!signal.aborted)for(const [uid,head]of patches)if((!('unavailableDecorators'in head)||!head.unavailableDecorators?.includes('profile-details'))&&detailChanges.get(uid)===requestedDetails.get(uid))detailChanges.delete(uid);
 }
 async function adopt(patches:Map<string,Header>,expected:Map<string,string|null>,signal:AbortSignal){
  if(signal.aborted||!patches.size)return;
  // Rebase only the changed owner bindings. An unrelated quote/Original update
  // must remain selected, and a late header cannot replace a newer owner view.
  const current=dependencies.selected();if(!current?.complete)return;const existing=new Map(heads(current).map(head=>[String(head.profile.userId),head])),accepted:Header[]=[];
  const bound=publicProfileDirectoryBindings(current);
  for(const [uid,patch]of patches)if(bound({userId:patch.profile.userId,username:patch.profile.username})&&basis(existing.get(uid))===(expected.get(uid)??null))accepted.push(curatePublicProfileHead(patch)?compatible(patch as PublicProfileHead,curatePublicProfileHead(existing.get(uid))??undefined):patch);
  if(!accepted.length)return;
  const refused=accepted.flatMap(value=>{const policy=curatePublicProfileHeadRefusal(value);return policy?[policy]:[];}),positive=accepted.flatMap(value=>{const head=curatePublicProfileHead(value);return head?[head]:[];});
  let next=retainPublicProfileHeaders({...current,publicProfileHeads:positive,publicProfileHeadRefusals:refused},current);
  const selection=(value:PublicMarketCatalog)=>JSON.stringify(heads(value).sort((a,b)=>String(a.profile.userId).localeCompare(String(b.profile.userId))));
  const before=selection(current),serial=selection(next);if(serial===before)return;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(serial));if(signal.aborted)return;
  const latest=dependencies.selected();if(!latest?.complete||selection(latest)!==before)return;
  next={...latest,publicProfileHeads:next.publicProfileHeads,publicProfileHeadRefusals:next.publicProfileHeadRefusals,publicProfileHeadsRevision:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
  prepareHeldPublicMarketResponse(latest);reusePublicMarketResponse(latest,next);dependencies.publish(next,latest);
  void retention.save(accepted,next.publicProfileHeadsRevision!).catch(()=>{});
 }
 // Profile details and Showcase membership have separate delivery lifetimes.
 // Neither waits for the other; both publish through the selected family.
 let membershipPending:Promise<void>|undefined,membershipAgain=false;
 const refreshMembership=(changed:boolean):Promise<void>=>{
  if(!dependencies.membership||!consumers)return Promise.resolve();
  if(membershipPending){if(changed)membershipAgain=true;return membershipPending;}
  const attempt=(async()=>{do{
   membershipAgain=false;const initial=dependencies.selected();if(initial&&!initial.complete)return;
   const expected=new Map((initial?heads(initial):[]).map(head=>[String(head.profile.userId),basis(head)]));
   try{
    const next=await dependencies.membership!(initial),current=dependencies.selected();
    if(!consumers||!next?.complete)continue;
    if(initial?current?.revision!==initial.revision:current!==null){membershipAgain=true;continue;}
    if(current&&!current.complete||samePublicMarketMembership(next,current))continue;
    // An edit delivered while this collection was in flight stays selected.
    const keep=(current?heads(current):[]).filter(head=>basis(head)!==(expected.get(String(head.profile.userId))??null));
    const successor=keep.length?retainPublicProfileHeaders({...next,publicProfileHeads:keep.flatMap(value=>{const head=curatePublicProfileHead(value);return head?[head]:[];}),publicProfileHeadRefusals:keep.flatMap(value=>{const head=curatePublicProfileHeadRefusal(value);return head?[head]:[];})},next):next;
    reusePublicMarketResponse(next,successor);dependencies.publish(successor,current);
    if(!initial)void refreshDirectory(true).catch(()=>{});
   }catch{/* Offline delivery preserves the complete selected family. */}
  }while(membershipAgain&&consumers);})();membershipPending=attempt;void attempt.finally(()=>{if(membershipPending===attempt)membershipPending=undefined;}).catch(()=>{});return attempt;
 };
 // An edit received during a directory walk must get a trailing pass: that
 // older walk may already have compared this owner's previous update key.
 const refreshDirectory=(changed=false)=>{if(pending){if(changed)rerun=true;return pending;}if(!consumers)return Promise.resolve();controller=new AbortController();const signal=controller.signal,attempt=(async()=>{do{rerun=false;await run(signal);}while(rerun&&consumers&&!signal.aborted);})();pending=attempt;void attempt.finally(()=>{if(pending===attempt){pending=undefined;controller=undefined;}}).catch(()=>{});return attempt;};
 const refresh=(changed=false)=>Promise.all([refreshDirectory(changed),refreshMembership(changed)]).then(()=>{});
 function subscribe(){
  if(++consumers===1){
   void retention.read().then(saved=>{
    const current=dependencies.selected();if(!consumers||!saved||!current?.complete)return;
    const next=restorePublicProfileDirectoryHeaders(saved.input,saved.revision,current);if(next!==current){prepareHeldPublicMarketResponse(current);reusePublicMarketResponse(current,next);dependencies.publish(next,current);}
   }).catch(()=>{});
   void refresh().catch(()=>{});
  }
  let stopped=false;return()=>{if(stopped)return;stopped=true;if(!--consumers)controller?.abort();};
 }
 return{refresh,receive(input:unknown){const current=dependencies.selected();if(!consumers||!current?.complete)return Promise.resolve();const received=(Array.isArray(input)?input:[input]).flatMap(value=>{const head=curatePublicProfileHeadRefusal(value)??curatePublicProfileHead(value);return head?[head]:[];}),previous=new Map(heads(current).map(row=>[String(row.profile.userId),row]));for(const head of received)if('unavailableDecorators'in head&&head.unavailableDecorators?.includes('profile-details'))detailChanges.set(String(head.profile.userId),++detailChange);return adopt(new Map(received.map(head=>[String(head.profile.userId),head])),new Map(received.map(head=>[String(head.profile.userId),basis(previous.get(String(head.profile.userId)))])),new AbortController().signal);},subscribe};
}
const selections=new Set<()=>PublicMarketCatalog|null>();
const observer=createPublicProfileDirectoryObserver({fetch:(input,init)=>fetch(input,init),selected:()=>retainedDiscoveredPublicCatalog()??[...selections].map(read=>read()).find(value=>value?.complete)??null,publish:(next,previous)=>publishDiscoveredPublicCatalog(next,undefined,previous),membership:current=>observePublicMarketMembership(current?.revision??'',current?.publicProfileHeadsRevision)});
let stream:ReturnType<typeof createPublicProfileDirectoryStream>|undefined;
export function subscribePublicProfileDirectory(selected:()=>PublicMarketCatalog|null){
 const selection=()=>selected();selections.add(selection);
 const surface=typeof document==='undefined'?undefined:document.body.dataset.bankSurface;
 const stop=observer.subscribe();
 stream??=createPublicProfileDirectoryStream({fetch:(input,init)=>fetch(input,init),receive:observer.receive,refresh:observer.refresh});
 return()=>{
  if(!selections.delete(selection))return;
  // The next retained surface subscribes during the same navigation commit.
  // Release after that handoff so it can reuse the existing reader and stream.
  const release=()=>{stop();if(!selections.size){stream?.close();stream=undefined;}};
  if(typeof document!=='undefined'&&surface!==document.body.dataset.bankSurface)queueMicrotask(release);else release();
 };
}
export const publicProfileDirectoryIsLive=()=>stream?.isLive()===true;
export const observePublicProfileDirectory=observer.refresh;
export const receivePublicProfileForDiscovery=observer.receive;
