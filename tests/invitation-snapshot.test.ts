import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {Window} from 'happy-dom';
import {RECEIVING_MESSAGE,readReceivingInvitationObject,type ReceivingInvitation} from '../src/adoption/invitation';
import {saveInvitationSnapshot,readInvitationSnapshot,invitationSnapshotDigest,invitationSnapshotUrl,initialInvitationSnapshot} from '../src/adoption/invitation-snapshot';
const value=(name:string):ReceivingInvitation=>({schema:'bankeiz.receiving-invitation.v1',message:RECEIVING_MESSAGE,senderName:'Mira',recipientName:name,senderUsername:'mira_123'});
const wire=(invitation:ReceivingInvitation)=>JSON.stringify(readReceivingInvitationObject(invitation));
const hash=(body:string)=>createHash('sha256').update(body).digest('hex');
afterEach(()=>vi.unstubAllGlobals());
it('publishes only the exact reviewed nonfinancial display once and returns its immutable compact URL',async()=>{
 const invitation=value('Anaïs 佐藤'),fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>Response.json({ok:true,sha256:hash(String(init?.body))}));
 const [a,b]=await Promise.all([saveInvitationSnapshot(invitation,fetcher),saveInvitationSnapshot(invitation,fetcher)]);
 expect(a).toBe(b);expect(fetcher).toHaveBeenCalledTimes(1);const [endpoint,init]=fetcher.mock.calls[0],body=String(init?.body),digest=hash(body);
 expect(endpoint).toBe('https://receiz.com/api/public/display-snapshots/'+digest);expect(init).toMatchObject({method:'POST',credentials:'omit',headers:{'content-type':'application/json'}});
 expect(JSON.parse(body)).toEqual(invitation);expect(body).not.toMatch(/recipientEmail|recipientUserId|accessToken|verified|accepted/);
 expect(a).toBe('https://bankeiz.com/invitation/'+digest+'/');expect(a.length).toBeLessThan(105);expect(invitationSnapshotDigest(a)).toBe(digest);
 expect(await saveInvitationSnapshot({...invitation},fetcher)).toBe(a);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('reuses the exact successful immutable read and knows that already-published display needs no new write',async()=>{
 const invitation=value('Already published'),body=wire(invitation),digest=hash(body),fetcher=vi.fn(async()=>new Response(body));
 const [a,b]=await Promise.all([readInvitationSnapshot(digest,fetcher),readInvitationSnapshot(digest,fetcher)]);expect(a).toBe(b);expect(a).toEqual(invitation);expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0]).toEqual(['https://receiz.com/api/public/display-snapshots/'+digest,expect.objectContaining({credentials:'omit',cache:'force-cache'})]);
 expect(await readInvitationSnapshot(digest,fetcher)).toBe(a);expect(await saveInvitationSnapshot(a,fetcher)).toBe(invitationSnapshotUrl(digest));expect(fetcher).toHaveBeenCalledTimes(1);
});
it('refuses private extra fields and oversized or malformed display before any publication',async()=>{
 const fetcher=vi.fn(),invalid=[{...value('Private'),recipientEmail:'private@example.test'},{...value('Private'),recipientUserId:'private-id'},{...value('Private'),senderVerified:true},{...value('Private'),message:'漢'.repeat(4000),purpose:'漢'.repeat(500),recipientName:'漢'.repeat(200)}];
 for(const invitation of invalid)await expect(saveInvitationSnapshot(invitation as ReceivingInvitation,fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
 const accessor={...value('Accessor')};Object.defineProperty(accessor,'message',{get:()=>RECEIVING_MESSAGE,enumerable:true});await expect(saveInvitationSnapshot(accessor,fetcher)).rejects.toThrow();
 for(const link of ['/invitation/not-a-digest/','/invitation/'+ 'a'.repeat(64)+'/?extra=1','/invitation/'+ 'a'.repeat(64)+'/#invite=private'])expect(invitationSnapshotDigest(link)).toBeNull();expect(()=>invitationSnapshotUrl('../private')).toThrow();
});
it('rejects wrong or invalid source bytes and makes failed reads and publications explicitly retryable',async()=>{
 const invitation=value('Retry'),body=wire(invitation),digest=hash(body);
 await expect(readInvitationSnapshot(digest,async()=>new Response(body+' '))).rejects.toThrow('INVITATION_INTEGRITY_FAILED');
 const malformed=JSON.stringify({...invitation,recipientEmail:'private@example.test'});await expect(readInvitationSnapshot(hash(malformed),async()=>new Response(malformed))).rejects.toThrow('RECEIVING_INVITATION_INVALID');
 await expect(readInvitationSnapshot(digest,async()=>new Response('x'.repeat(12*1024+1)))).rejects.toThrow('INVITATION_TOO_LARGE');
 let readAttempts=0;const reader=vi.fn(async()=>++readAttempts===1?new Response(null,{status:503}):new Response(body));await expect(readInvitationSnapshot(digest,reader)).rejects.toThrow('INVITATION_READ_UNAVAILABLE');expect(await readInvitationSnapshot(digest,reader)).toEqual(invitation);expect(reader).toHaveBeenCalledTimes(2);
 let publishAttempts=0;const publisher=vi.fn(async()=>++publishAttempts===1?new Response(null,{status:503}):Response.json({ok:true,sha256:digest}));await expect(saveInvitationSnapshot(invitation,publisher)).rejects.toThrow('INVITATION_SAVE_UNAVAILABLE');expect(await saveInvitationSnapshot(invitation,publisher)).toBe(invitationSnapshotUrl(digest));expect(publisher).toHaveBeenCalledTimes(2);
 await expect(saveInvitationSnapshot(value('False success'),async()=>Response.json({ok:true,sha256:'b'.repeat(64)}))).rejects.toThrow('INVITATION_SAVE_UNAVAILABLE');
});
it('keeps publication success and admission memo tied to the actual configured transport',async()=>{
 const invitation=value('Distinct transport'),digest=hash(wire(invitation)),first=vi.fn(async()=>Response.json({ok:true,sha256:digest})),second=vi.fn(async()=>new Response(null,{status:503}));await saveInvitationSnapshot(invitation,first);await expect(saveInvitationSnapshot(invitation,second)).rejects.toThrow('INVITATION_SAVE_UNAVAILABLE');expect(second).toHaveBeenCalledTimes(1);
});
it('uses only the exact route-associated server seed without a second public read',()=>{
 const document=new Window().document,invitation=value('Cold first paint'),digest=hash(wire(invitation)),seed=document.createElement('script');seed.id='receiving-invitation-snapshot';seed.type='application/json';seed.dataset.digest=digest;seed.textContent=JSON.stringify(invitation);document.body.append(seed);vi.stubGlobal('document',document);
 expect(initialInvitationSnapshot(invitationSnapshotUrl(digest))).toEqual(invitation);expect(initialInvitationSnapshot(invitationSnapshotUrl('b'.repeat(64)))).toBeNull();seed.textContent=JSON.stringify({...invitation,privateKey:'private'});expect(initialInvitationSnapshot(invitationSnapshotUrl(digest))).toBeNull();
});

it('reuses only a matching acknowledged digest on cold restore and publishes a changed reviewed invitation',async()=>{
 const invitation=value('Cold restored'),known=hash(wire(invitation)),fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>Response.json({ok:true,sha256:hash(String(init?.body))}));
 expect(await saveInvitationSnapshot(invitation,fetcher,known)).toBe(invitationSnapshotUrl(known));expect(fetcher).not.toHaveBeenCalled();
 const changed={...invitation,recipientName:'New reviewed name'},url=await saveInvitationSnapshot(changed,fetcher,known);expect(url).not.toBe(invitationSnapshotUrl(known));expect(fetcher).toHaveBeenCalledTimes(1);
});
