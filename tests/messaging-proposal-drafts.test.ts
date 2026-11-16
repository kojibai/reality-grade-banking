import {expect,it,vi} from 'vitest';
import {createNativeMessaging,type ChatConversation} from '../src/receiz/native-messaging';
import {openMessagingRetention,projectMessagingDisplay,readMessagingDisplay,MESSAGING_DISPLAY_MAX_BYTES} from '../src/receiz/messaging-retention';

const uid='22222222-2222-4222-8222-222222222222',conversationId='11111111-1111-4111-8111-111111111111';
const conversation:ChatConversation={id:conversationId,kind:'dm',title:'Client',members:[],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',lastMessageAt:null};
const source={accountUid:uid,inbox:[conversation],pages:[]};
const draft={schema:'bankeiz.proposal-composer.v1',draft:{kind:'proposal',title:'Project proposal',summary:'Unsent edits',items:[{description:'Consulting',quantity:'1',unitPriceUsdCents:'50000'}],deliverables:['Report'],timeline:'Two weeks',terms:'Due on delivery'},sourceFingerprint:'a'.repeat(64),proposalId:'33333333-3333-4333-8333-333333333333',phase:'review'};
const uuid=(i:number)=>`${i.toString(16).padStart(8,'0')}-1111-4111-8111-111111111111`;

it('cold reopens a conversation draft under its existing owner without transport or mutable aliases',()=>{
 const changed=vi.fn(),request=vi.fn(),api=createNativeMessaging({accountUid:uid,request,onChange:changed});
 expect(api.knownProposalDraft(conversationId)).toBeNull();api.retainProposalDraft(conversationId,draft);
 const held=api.knownProposalDraft(conversationId) as typeof draft;held.draft.summary='Mutated caller copy';expect(api.knownProposalDraft(conversationId)).toEqual(draft);expect(request).not.toHaveBeenCalled();
 const snapshot=projectMessagingDisplay(changed.mock.calls[0][0]);expect(snapshot.proposalDrafts).toEqual([{conversationId,value:draft}]);
 const cold=readMessagingDisplay(JSON.parse(JSON.stringify(snapshot)),uid)!;const reopened=createNativeMessaging({accountUid:uid,request,retained:cold});expect(reopened.knownProposalDraft(conversationId)).toEqual(draft);expect(request).not.toHaveBeenCalled();
 expect(readMessagingDisplay(snapshot,'another-owner')).toBeNull();expect(createNativeMessaging({accountUid:'another-owner',request,retained:snapshot}).knownProposalDraft(conversationId)).toBeNull();
});

it('clears only the explicitly selected sent draft and keeps older snapshots compatible',()=>{
 const changed=vi.fn(),api=createNativeMessaging({accountUid:uid,request:vi.fn(),onChange:changed});api.retainProposalDraft(conversationId,draft);api.retainProposalDraft(uuid(2),{...draft,proposalId:uuid(12)});api.retainProposalDraft(conversationId,null);
 expect(api.knownProposalDraft(conversationId)).toBeNull();expect(api.knownProposalDraft(uuid(2))).toEqual({...draft,proposalId:uuid(12)});expect(projectMessagingDisplay(changed.mock.calls.at(-1)![0]).proposalDrafts).toHaveLength(1);
 expect(readMessagingDisplay(projectMessagingDisplay(source),uid)?.proposalDrafts).toBeUndefined();
});

it('refuses invalid IDs, credentials, binary values and oversize replacements without losing the held draft',()=>{
 const api=createNativeMessaging({accountUid:uid,request:vi.fn()});api.retainProposalDraft(conversationId,draft);
 for(const id of['invalid','','https://evil.example']){expect(()=>api.retainProposalDraft(id,draft)).toThrow('CHAT_INVALID_CONVERSATION');expect(()=>api.knownProposalDraft(id)).toThrow('CHAT_INVALID_CONVERSATION');}
 const circular:Record<string,unknown>={};circular.self=circular;
 for(const value of[{...draft,uploadToken:'private'},{...draft,metadata:{accessToken:'private'}},{...draft,bytes:[1,2,3]},{...draft,file:new File(['x'],'file.pdf')},{...draft,data:new Uint8Array([1,2])},{...draft,summary:'x'.repeat(32*1024)},{...draft,summary:'🧠'.repeat(9000)},{...draft,conversationId:uuid(9)},{...draft,value:Infinity},circular])expect(()=>api.retainProposalDraft(conversationId,value)).toThrow('CHAT_PROPOSAL_DRAFT_INVALID');
 expect(api.knownProposalDraft(conversationId)).toEqual(draft);
});

it('rejects array accessors without invoking user code while inspecting a retained draft',()=>{
 const access=vi.fn(()=>1),values:unknown[]=[];Object.defineProperty(values,'0',{enumerable:true,get:access});
 const api=createNativeMessaging({accountUid:uid,request:vi.fn()});expect(()=>api.retainProposalDraft(conversationId,{...draft,values})).toThrow('CHAT_PROPOSAL_DRAFT_INVALID');expect(access).not.toHaveBeenCalled();
});

it('refuses a thirty-first draft without evicting any unsent user edits and permits an existing draft update',()=>{
 const changed=vi.fn(),api=createNativeMessaging({accountUid:uid,request:vi.fn(),onChange:changed});for(let i=1;i<=30;i++)api.retainProposalDraft(uuid(i),{...draft,proposalId:uuid(i+100)});
 expect(()=>api.retainProposalDraft(uuid(31),draft)).toThrow('CHAT_PROPOSAL_DRAFT_CAPACITY');for(let i=1;i<=30;i++)expect(api.knownProposalDraft(uuid(i))).toEqual({...draft,proposalId:uuid(i+100)});
 api.retainProposalDraft(uuid(1),{...draft,phase:'edited'});expect(api.knownProposalDraft(uuid(1))).toEqual({...draft,phase:'edited'});expect(projectMessagingDisplay(changed.mock.calls.at(-1)![0]).proposalDrafts).toHaveLength(30);
});

it('refuses draft storage that would displace retained conversation history',()=>{
 const messages=Array.from({length:5},(_,i)=>({id:uuid(i+10),conversationId,senderUserId:uid,senderKind:'user' as const,senderAiId:null,senderDisplay:null,body:'h'.repeat(200000),createdAt:'2026-11-15T00:00:00Z',receizedAt:'2026-11-15T00:00:00Z',receipt:null,sealedOriginalAvailable:false}));
 const snapshot=projectMessagingDisplay({...source,pages:[{conversation,messages,hasMore:false,nextCursor:null}]}),changed=vi.fn(),api=createNativeMessaging({accountUid:uid,request:vi.fn(),retained:snapshot,onChange:changed});
 let accepted=0;for(let i=1;i<=5;i++){try{api.retainProposalDraft(uuid(i),{...draft,padding:'d'.repeat(30000)});accepted++;}catch(error){expect((error as Error).message).toBe('CHAT_PROPOSAL_DRAFT_CAPACITY');break;}}
 expect(accepted).toBeGreaterThan(0);expect(accepted).toBeLessThan(5);expect(api.knownMessages(conversationId)?.messages).toHaveLength(5);const saved=projectMessagingDisplay(changed.mock.calls.at(-1)![0]);expect(saved.pages[0].messages).toHaveLength(5);expect(new TextEncoder().encode(JSON.stringify(saved)).byteLength).toBeLessThanOrEqual(MESSAGING_DISPLAY_MAX_BYTES);
});

it('coalesces draft snapshots with existing inbox updates without copying them across owners',async()=>{
 let saved:unknown=null;const retention=await openMessagingRetention({load:async()=>null,save:async value=>{saved=value;},isOpen:()=>true});
 retention.capture({...source,proposalDrafts:[{conversationId,value:draft}]});retention.capture({...source,inbox:[{...conversation,title:'Fresh inbox'}]});await retention.flush();expect(readMessagingDisplay(saved,uid)?.proposalDrafts?.[0].value).toEqual(draft);
 retention.capture({...source,accountUid:'another-owner'});await retention.flush();expect(readMessagingDisplay(saved,'another-owner')?.proposalDrafts).toBeUndefined();
});
