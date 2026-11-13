import {afterEach,expect,it,vi} from 'vitest';
import * as entry from '../src/receiz/email-message-entry';
const account=vi.hoisted(()=>({open:vi.fn(),dispose:vi.fn()}));
vi.mock('../src/receiz/pbi-account',()=>({openVerifiedInvitationAccount:account.open}));
const value={ok:true as const,recipient:{userId:'10000000-0000-4000-8000-000000000002',email:'recipient@example.test'},invitation:{conversationId:'10000000-0000-4000-8000-000000000004',messageId:'10000000-0000-4000-8000-000000000005'}};
afterEach(()=>{vi.unstubAllGlobals();vi.resetAllMocks();});
it('finishes real account selection before adoption, keeps the exact recipient/conversation, and deduplicates StrictMode work',async()=>{
 const module=entry,order:string[]=[];
 let release!:()=>void;const custody=new Promise<void>(resolve=>{release=resolve;});
 account.open.mockImplementation(async(userId:string)=>{expect(userId).toBe(value.recipient.userId);order.push('custody-start');await custody;order.push('custody-finished');return{dispose:account.dispose};});
 const send=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{expect(init).toMatchObject({method:'POST',body:'{}',credentials:'same-origin',redirect:'error',cache:'no-store'});if(String(input).endsWith('/open')){order.push('observe');return Response.json(value);}expect(String(input)).toBe('/api/bank/native/email-message/adopt');order.push('adopt');return Response.json({...value,adopted:true});});vi.stubGlobal('fetch',send);
 const first=module.openEmailMessage(),second=module.openEmailMessage();await vi.waitFor(()=>expect(order).toEqual(['observe','custody-start']));expect(send).toHaveBeenCalledTimes(1);release();
 expect(await first).toEqual(value);expect(await second).toEqual(value);expect(order).toEqual(['observe','custody-start','custody-finished','adopt']);expect(account.dispose).toHaveBeenCalledOnce();
 expect(module.emailMessageResumePath(value)).toBe('/?bankNotification=1&conversation=10000000-0000-4000-8000-000000000004&recipient=10000000-0000-4000-8000-000000000002&message=10000000-0000-4000-8000-000000000005#account/messages');
});
it('never grants membership when real device custody refuses or opening observations are malformed',async()=>{
 const module=entry,send=vi.fn().mockResolvedValueOnce(Response.json({...value,recipient:{...value.recipient,email:'not-an-email'}})).mockResolvedValueOnce(Response.json(value));vi.stubGlobal('fetch',send);account.open.mockRejectedValue(Error('PBI_ACCOUNT_MISMATCH'));
 await expect(module.openEmailMessage()).rejects.toThrow();expect(account.open).not.toHaveBeenCalled();await expect(module.openEmailMessage()).rejects.toThrow('PBI_ACCOUNT_MISMATCH');expect(send.mock.calls.map(([input])=>input)).toEqual(['/api/bank/native/email-message/open','/api/bank/native/email-message/open']);
});
it.each(['missing-adoption','wrong-recipient','wrong-message'])('refuses %s after custody and disposes the opened identity safely',async failure=>{
 const module=entry,adopted={...value,adopted:failure!=='missing-adoption',recipient:failure==='wrong-recipient'?{...value.recipient,userId:value.invitation.messageId}:value.recipient,invitation:failure==='wrong-message'?{...value.invitation,messageId:value.recipient.userId}:value.invitation};
 const send=vi.fn().mockResolvedValueOnce(Response.json(value)).mockResolvedValueOnce(Response.json(adopted));vi.stubGlobal('fetch',send);account.open.mockResolvedValue({dispose:account.dispose});await expect(module.openEmailMessage()).rejects.toThrow();expect(account.dispose).toHaveBeenCalledOnce();
});
it('reports absent or scanner state without consuming a token or opening an identity',async()=>{
 const module=entry,send=vi.fn().mockResolvedValueOnce(Response.json({ok:true,pending:true,autoContinue:false})).mockResolvedValueOnce(Response.json({ok:true,invitation:false})).mockResolvedValueOnce(Response.json({ok:false},{status:401}));vi.stubGlobal('fetch',send);
 expect(await module.readEmailMessageEntry()).toEqual({ok:true,pending:true,autoContinue:false});expect(await module.readEmailMessageEntry()).toEqual({ok:true,invitation:false});await expect(module.readEmailMessageEntry()).rejects.toThrow();expect(send.mock.calls.every(([input])=>input==='/api/bank/native/email-message/state')).toBe(true);expect(account.open).not.toHaveBeenCalled();
});
it('carries exact call/message coordinates only in the verified in-memory entry and never admits a reconstructed object',async()=>{
 const callId='10000000-0000-4000-8000-000000000006',wire={...value,invitation:{...value.invitation,callId,mode:'video' as const}};
 account.open.mockResolvedValue({dispose:account.dispose});vi.stubGlobal('fetch',vi.fn(async input=>Response.json(String(input).endsWith('/adopt')?{...wire,adopted:true}:wire)));
 expect(entry.isVerifiedEmailMessageEntry(wire,value.recipient.userId)).toBe(false);
 const admitted=await entry.openEmailMessage();expect(entry.isVerifiedEmailMessageEntry(admitted,value.recipient.userId)).toBe(true);expect(entry.isVerifiedEmailMessageEntry(JSON.parse(JSON.stringify(admitted)),value.recipient.userId)).toBe(false);expect(entry.isVerifiedEmailMessageEntry(admitted,callId)).toBe(false);
 const url=new URL(entry.emailMessageResumePath(admitted),'https://bankeiz.com');expect(url.searchParams.get('message')).toBe(value.invitation.messageId);expect(url.searchParams.get('call')).toBe(callId);expect(url.searchParams.get('mode')).toBe('video');expect(JSON.stringify(admitted)).not.toMatch(/token|signature|cookie/);
});
