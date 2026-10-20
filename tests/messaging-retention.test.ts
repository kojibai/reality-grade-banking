import {expect,it,vi} from 'vitest';
import {openMessagingRetention,readMessagingDisplay,projectMessagingDisplay,MESSAGING_DISPLAY_MAX_BYTES} from '../src/receiz/messaging-retention';
import type {ChatConversation,ChatMessage,ChatPage} from '../src/receiz/native-messaging';
const uid='22222222-2222-4222-8222-222222222222',id='11111111-1111-4111-8111-111111111111';
const message:ChatMessage={id:'m1',conversationId:id,senderUserId:uid,senderKind:'user',senderAiId:null,senderDisplay:'Mira',body:'Retained private conversation',createdAt:'2026-10-19T12:00:00Z',receizedAt:'2026-10-19T12:00:00Z',receipt:{private:'proof metadata'},sealedOriginalAvailable:true,sealedOriginal:{bytes:'large exact artifact'}};
const conversation:ChatConversation={id,kind:'dm',title:'Mira',members:[],aiAgents:[],defaultAiId:null,unreadCount:1,previewMessage:message,createdAt:message.createdAt,updatedAt:message.createdAt,lastMessageAt:message.createdAt};
const page:ChatPage={conversation,messages:[message],hasMore:false,nextCursor:null};
const source={accountUid:uid,inbox:[conversation],pages:[page]};
it('retains bounded local Twin access questions in the existing private display and excludes extra fields',async()=>{
 const questions=Array.from({length:12},(_,i)=>({id:'q'+i,question:'My chosen question '+i,privateToken:'not display data'}));
 let saved:unknown=null;
 const display=projectMessagingDisplay({...source,twinAccessQuestions:questions});
 expect(display.twinAccessQuestions).toHaveLength(8);expect(display.twinAccessQuestions?.[0]?.id).toBe('q4');expect(JSON.stringify(display)).not.toContain('not display data');
 const retention=await openMessagingRetention({load:async()=>null,save:async value=>{saved=value;},isOpen:()=>true});retention.capture(display);await retention.flush();
 const reopened=await openMessagingRetention({load:async()=>saved,save:async()=>{},isOpen:()=>true});expect(reopened.known()?.twinAccessQuestions).toEqual(display.twinAccessQuestions);expect(readMessagingDisplay(saved,'foreign-owner')).toBeNull();
});
it('coalesces the local access reply with fresh inbox reads without losing either or copying it across accounts',async()=>{
 let saved:unknown=null;const retained=await openMessagingRetention({load:async()=>null,save:async value=>{saved=value;},isOpen:()=>true});
 retained.capture({...source,inbox:[{...conversation,title:'Fresh inbox'}]});retained.retainTwinAccessQuestions(uid,[{id:'access-question',question:'Help with this payment'}]);retained.capture({...source,inbox:[{...conversation,title:'Newest inbox'}]});await retained.flush();
 expect(retained.known()?.inbox[0]?.title).toBe('Newest inbox');expect(readMessagingDisplay(saved,uid)?.twinAccessQuestions?.[0]?.question).toBe('Help with this payment');
 retained.retainTwinAccessQuestions('foreign-owner',[{id:'foreign',question:'Foreign question'}]);await retained.flush();expect(JSON.stringify(saved)).not.toContain('Foreign question');
 retained.capture({...source,accountUid:'different-account'});await retained.flush();expect(retained.known()?.twinAccessQuestions).toBeUndefined();
});
it('retains the account Twin tab preference with the existing encrypted inbox projection',()=>{
 for(const twinAccess of [true,false]){const display=projectMessagingDisplay({...source,twinAccess});expect(readMessagingDisplay(display,uid)?.twinAccess).toBe(twinAccess);}
 expect(readMessagingDisplay(projectMessagingDisplay(source),uid)?.twinAccess).toBeUndefined();
});
it('keeps complete carried seal avatars without losing conversations when image metadata exceeds the display budget',()=>{
 const seal='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg">'+' '.repeat(4000)+'</svg>');
 const members=[{kind:'user' as const,userId:uid,username:'mira',displayName:'Mira',avatarUrl:seal}];
 expect(projectMessagingDisplay({...source,inbox:[{...conversation,members}]}).inbox[0].members[0].avatarUrl).toBe(seal);
 const crowded={...conversation,members:Array.from({length:50},(_,i)=>({...members[0],userId:'peer-'+i,avatarUrl:'data:image/png;base64,'+'A'.repeat(200000)}))};
 const display=projectMessagingDisplay({...source,inbox:[crowded],pages:[{...page,conversation:crowded}]});
 expect(display.inbox[0]?.id).toBe(id);expect(display.pages[0]?.messages[0].body).toBe(message.body);expect(new TextEncoder().encode(JSON.stringify(display)).byteLength).toBeLessThanOrEqual(MESSAGING_DISPLAY_MAX_BYTES);
});
it('retains only bounded presentation fields, without originals, receipts, transport or credentials',()=>{
 const injected={...conversation,accessToken:'must not retain'};const display=projectMessagingDisplay({...source,inbox:[injected]});
 expect(display.inbox[0].title).toBe('Mira');expect(display.pages[0].messages[0].body).toBe(message.body);
 const raw=JSON.stringify(display);expect(raw).not.toContain('must not retain');expect(raw).not.toContain('proof metadata');expect(raw).not.toContain('large exact artifact');
 expect(readMessagingDisplay(display,uid)).toEqual(display);expect(readMessagingDisplay(display,'another-owner')).toBeNull();expect(readMessagingDisplay({...display,schema:'future'})).toBeNull();
});
it('caps Unicode-heavy histories and marks retained history truncated with a truthful earlier cursor',()=>{
 const display=projectMessagingDisplay({...source,pages:[{...page,messages:Array.from({length:500},(_,i)=>({...message,id:'m'+i,body:'🧠'.repeat(4000),createdAt:new Date(Date.UTC(2026,0,1,0,i)).toISOString()}))}]});
 expect(new TextEncoder().encode(JSON.stringify(display)).byteLength).toBeLessThanOrEqual(MESSAGING_DISPLAY_MAX_BYTES);expect(display.pages[0].messages.length).toBeLessThan(100);expect(display.pages[0].messages.at(-1)?.id).toBe('m499');expect(display.pages[0].hasMore).toBe(true);expect(display.pages[0].nextCursor).toBe(display.pages[0].messages[0].createdAt);
});
it('coalesces accepted reads, skips identical polling results, and reloads without any transport',async()=>{
 let saved:unknown=null;const save=vi.fn(async(value:unknown,expected:unknown)=>{expect(saved).toEqual(expected);saved=value;});
 const retained=await openMessagingRetention({load:async()=>saved,save,isOpen:()=>true});
 retained.capture(source);retained.capture(source);await retained.flush();expect(save).toHaveBeenCalledTimes(1);
 retained.capture(source);await retained.flush();expect(save).toHaveBeenCalledTimes(1);
 const reopened=await openMessagingRetention({load:async()=>saved,save,isOpen:()=>true});expect(reopened.known()?.pages[0].messages[0].body).toBe(message.body);expect(save).toHaveBeenCalledTimes(1);
});
it('does not block messages on unavailable private storage and ignores work after identity closure',async()=>{
 let active=true;const save=vi.fn(async()=>{throw Error('quota');});const retained=await openMessagingRetention({load:async()=>{throw Error('unavailable');},save,isOpen:()=>active});
 expect(retained.known()).toBeNull();retained.capture(source);await expect(retained.flush()).resolves.toBeUndefined();active=false;retained.capture(source);await retained.flush();expect(retained.known()).toBeNull();
});
it('stops optional retention after a competing revision instead of overwriting it',async()=>{
 const save=vi.fn(async()=>{throw Error('BANK_NOTE_INTENT_CHANGED');});const retained=await openMessagingRetention({load:async()=>null,save,isOpen:()=>true});retained.capture(source);await retained.flush();retained.capture({...source,inbox:[{...conversation,title:'New title'}]});await retained.flush();expect(save).toHaveBeenCalledTimes(1);
});
