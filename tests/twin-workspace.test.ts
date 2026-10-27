import {expect,it,vi} from 'vitest';
import {createTwinWorkspace} from '../src/receiz/twin-workspace';
const uid='owner-one',agent={version:1,agentId:'agent-one',ownerUserId:uid,displayName:'My Twin',systemPersona:'Careful and clear',memoryScope:'relationship',capabilities:['greet','converse'],policy:{allowScheduling:true},updatedAt:'2026-10-26T12:00:00Z'};
const view={ok:true,profile:{userId:uid,username:'studio',displayName:'Studio'},agent,avatar:{ownerUserId:uid,avatarId:'portrait-one',avatarImageUrl:'https://receiz.com/portrait.png'}};
it('does no work until opened, shares one owner view and keeps the portrait separate from the profile',async()=>{
 const request=vi.fn(async()=>view),api=createTwinWorkspace({accountUid:uid,request,assertOpen(){}});expect(request).not.toHaveBeenCalled();
 const [a,b]=await Promise.all([api.settings(),api.settings()]);expect(a).toBe(b);expect(a.avatar?.avatarImageUrl).toContain('portrait.png');expect(request).toHaveBeenCalledTimes(1);
 expect(await api.embed()).toBe('<script src="https://receiz.com/receiz-twin-embed.js" data-username="studio" async></script>');
});
it('preserves one exact ambiguous portrait attempt and refuses a changed retry',async()=>{
 const requests:unknown[]=[];const api=createTwinWorkspace({accountUid:uid,assertOpen(){},request:async(input,file)=>{requests.push({input,file});if(input.action==='inspect')return view;throw Error('Lost response');}});
 await api.settings();const file=new File(['source'],'portrait.png',{type:'image/png'});
 await expect(api.portrait(file,'photoreal','A calm portrait')).rejects.toThrow();
 await expect(api.portrait(new File(['other'],'other.png',{type:'image/png'}),'photoreal','Other')).rejects.toThrow('TWIN_CHANGE_PENDING');expect(requests).toHaveLength(2);
 await expect(api.retry()).rejects.toThrow();expect(requests[2]).toEqual(requests[1]);
});
it('does not admit a foreign owner or do a hidden memory read, and ignores disposed results',async()=>{
 let open=true;const request=vi.fn(async()=>({...view,profile:{...view.profile,userId:'foreign'}}));const api=createTwinWorkspace({accountUid:uid,request,assertOpen(){if(!open)throw Error('Closed');}});
 await expect(api.settings()).rejects.toThrow('TWIN_WORKSPACE_OWNER_MISMATCH');expect(request).toHaveBeenCalledTimes(1);
 open=false;expect(()=>api.settings()).toThrow('Closed');expect(request).toHaveBeenCalledTimes(1);
});
it('updates the held settings from the accepted write without refetching or changing unrelated policy',async()=>{
 const request=vi.fn(async(input:{action:string;patch?:unknown})=>input.action==='save'?{ok:true,agent:{...agent,displayName:'Studio Twin'}}:view),api=createTwinWorkspace({accountUid:uid,request,assertOpen(){}});
 await api.settings();await api.save({displayName:'Studio Twin'});expect((await api.settings()).agent?.displayName).toBe('Studio Twin');expect((await api.settings()).agent?.policy.allowScheduling).toBe(true);expect(request).toHaveBeenCalledTimes(2);
});
it('shares one active work read and timer across chat and the recap, and reuses saved contact results',async()=>{
 vi.useFakeTimers();try{let finished=false;const onContacts=vi.fn(async()=>{}),request=vi.fn(async()=>({ok:true,tasks:[{id:'task',status:finished?'completed':'running',contactsSyncedAt:'source-revision-one',contactUpdates:[{id:'saved-contact'}]}],campaigns:[]}));
 const api=createTwinWorkspace({accountUid:uid,request,onContacts,assertOpen(){}}),first=vi.fn(),second=vi.fn(),stopFirst=api.watchWork(first),stopSecond=api.watchWork(second);
 await vi.advanceTimersByTimeAsync(0);expect(request).toHaveBeenCalledOnce();expect(onContacts).toHaveBeenCalledExactlyOnceWith(uid,[{id:'saved-contact'}]);expect(first).toHaveBeenCalledOnce();expect(second).toHaveBeenCalledOnce();
 finished=true;await vi.advanceTimersByTimeAsync(4000);expect(request).toHaveBeenCalledTimes(2);expect(onContacts).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(12000);expect(request).toHaveBeenCalledTimes(2);stopFirst();stopSecond();
 }finally{vi.useRealTimers();}
});

it('resolves the saved native Twin portrait against Receiz, including accepted portrait writes',async()=>{
 const relative='/api/storage/object?bucket=receiz-world-media&path=world%2Fowner%2Fportrait.png';
 const request=vi.fn(async(input:{action:string})=>input.action==='portrait'?{ok:true,avatar:{...view.avatar,avatarImageUrl:relative}}:{...view,avatar:{...view.avatar,avatarImageUrl:relative}});
 const api=createTwinWorkspace({accountUid:uid,request,assertOpen(){}});
 expect((await api.settings()).avatar?.avatarImageUrl).toBe('https://receiz.com'+relative);
 await api.portrait(new File(['image'],'portrait.png',{type:'image/png'}),'photoreal','');
 expect((await api.settings()).avatar?.avatarImageUrl).toBe('https://receiz.com'+relative);expect(request).toHaveBeenCalledTimes(2);
});

it('rejects an unsafe saved portrait URL without changing the account settings',async()=>{
 const api=createTwinWorkspace({accountUid:uid,request:async()=>({...view,avatar:{...view.avatar,avatarImageUrl:'javascript:alert(1)'}}),assertOpen(){}});
 await expect(api.settings()).rejects.toThrow('TWIN_IMAGE_URL_INVALID');
});
