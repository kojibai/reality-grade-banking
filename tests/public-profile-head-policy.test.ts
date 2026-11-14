import {afterEach,expect,it,vi} from 'vitest';
import {buildMembershipOnlyPublicMarketSeed} from '../server/public-market-preparation';
import {curatePublicMarketMembership} from '../server/public-market';
import {curatePublicProfileHeadRefusal} from '../src/receiz/public-profile-header';
import {parsePublicMarket,rememberPublicMarketResponse,retainPublicMarket,retainPublicProfileHeaders} from '../src/receiz/public-market';
import {selectHeldPublicProfile} from '../src/receiz/public-profile';
const uid='policy-account',username='policy_owner';
const head=(fields:Record<string,unknown>={})=>({profile:{userId:uid,username,isPrivate:false,displayName:'Public name',createdAt:'2026-01-01T12:00:00Z',...fields},viewer:{canView:true},stats:{originals:0}});
const input=(heads:unknown[])=>({ok:true,transport:{publicOriginals:[],publicProfileHeads:heads,publicProfileHeadsRevision:'a'.repeat(64),publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:0,revision:'b'.repeat(64)}}});
afterEach(()=>vi.unstubAllGlobals());
it('does not infer a refusal from missing or incomplete public metadata',()=>{
 for(const value of [null,{},head(),{profile:{userId:uid,username}},{profile:{userId:uid},viewer:{canView:false}}])expect(curatePublicProfileHeadRefusal(value)).toBeNull();
});
it.each(['private','denied'])('carries only the exact owner binding of an explicit %s policy through the existing public boundary',kind=>{
 const raw=head({email:'must-not-leave-source',displayName:'private-name',...(kind==='private'?{isPrivate:true}:{})});if(kind==='denied')raw.viewer.canView=false;
 const curated=curatePublicMarketMembership(input([raw])),catalog=parsePublicMarket(curated);
 expect(catalog.publicProfileHeads??[]).toEqual([]);
 expect(catalog.publicProfileHeadRefusals).toEqual([{profile:{userId:uid,username,...(kind==='private'?{isPrivate:true}:{})},viewer:{canView:false}}]);
 expect(JSON.stringify(curated)).not.toMatch(/must-not-leave-source|private-name/);
 expect(selectHeldPublicProfile(username,catalog)).toBeNull();
});
it('retains an exact refusal through a thinner versioned response and cold serialization, and accepts its later public header',()=>{
 const before=parsePublicMarket(input([head()]));expect(selectHeldPublicProfile(username,before)?.userId).toBe(uid);
 const raw=input([head({isPrivate:true,email:'private-email',displayName:'private-name'})]),next=parsePublicMarket(raw),withdrawn=retainPublicProfileHeaders(next,before);
 expect(withdrawn.publicProfileHeads??[]).toEqual([]);expect(selectHeldPublicProfile(username,withdrawn)).toBeNull();
 const thinRaw=input([]),thin=parsePublicMarket(thinRaw),selected=retainPublicProfileHeaders(thin,withdrawn);
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
 rememberPublicMarketResponse(thin,thinRaw);retainPublicMarket(thin,undefined,selected,withdrawn);
 const serial=values.get('receiz-bank-public-discovery-v2')!;expect(serial).not.toMatch(/private-email|private-name/);
 const cold=parsePublicMarket(JSON.parse(serial));expect(cold.publicProfileHeadRefusals?.[0].profile.userId).toBe(uid);expect(selectHeldPublicProfile(username,cold)).toBeNull();
 const reopened=retainPublicProfileHeaders(parsePublicMarket(input([head()])),cold);
 expect(reopened.publicProfileHeadRefusals??[]).toEqual([]);expect(selectHeldPublicProfile(username,reopened)?.userId).toBe(uid);
});
it('does not apply another UID policy to the selected public owner of the same handle',()=>{
 const catalog=parsePublicMarket(input([head(),head({userId:'different-account',isPrivate:true})]));
 expect(selectHeldPublicProfile(username,catalog)?.userId).toBe(uid);
});

it('keeps an explicit refusal alongside other public headers through saved-page preparation',()=>{
 const membership=input([head(),head({userId:'private-account',username:'private_owner',isPrivate:true,email:'must-not-leave-source'})]);
 const snapshot={ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}};
 const prepared=buildMembershipOnlyPublicMarketSeed({membership,snapshot}),catalog=parsePublicMarket(prepared);
 expect(catalog.publicProfileHeads?.map(head=>head.profile.userId)).toEqual([uid]);
 expect(catalog.publicProfileHeadRefusals?.map(head=>head.profile.userId)).toEqual(['private-account']);
 expect(JSON.stringify(prepared)).not.toContain('must-not-leave-source');
 expect(selectHeldPublicProfile('private_owner',catalog)).toBeNull();
});

it.each([false,true])('keeps an explicit refusal dominant over a conflicting public header during serialization (reversed: %s)',reverse=>{
 const prior=parsePublicMarket(input([head({userId:'retained-other',username:'retained_other'})]));
 const offered=[head({isPrivate:true}),head()];if(reverse)offered.reverse();
 const raw=input(offered),next=parsePublicMarket(raw),selected=retainPublicProfileHeaders(next,prior);
 const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)});
 rememberPublicMarketResponse(next,raw);retainPublicMarket(next,undefined,selected,prior);
 const cold=parsePublicMarket(JSON.parse(values.get('receiz-bank-public-discovery-v2')!));
 expect(cold.publicProfileHeads?.map(head=>head.profile.userId)).toEqual(['retained-other']);
 expect(cold.publicProfileHeadRefusals?.map(head=>head.profile.userId)).toEqual([uid]);expect(selectHeldPublicProfile(username,cold)).toBeNull();
});
