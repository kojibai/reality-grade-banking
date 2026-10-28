import {expect,it,vi} from 'vitest';
import {createMeetingPayments} from '../src/receiz/meeting-payments';
import {meetingWallet,sender,recipient,conversation,other} from './fixtures/meeting-payments';
const people=()=>[{kind:'user' as const,userId:recipient,displayName:'Maya',username:'maya',avatarUrl:null}];
const setup=(f=meetingWallet(),extra={})=>({f,control:createMeetingPayments({conversationId:conversation,viewerId:sender,members:people,wallet:async()=>f.api,...extra})});
it('sends the displayed amount in this meeting once while duplicate clicks are ignored',async()=>{
 const f=meetingWallet(),done=vi.fn(),{control}=setup(f,{onRecorded:done});await control.open();
 const a=control.send(recipient,'10.00'),b=control.send(recipient,'10.00');await Promise.all([a,b]);
 expect(f.transfer).toHaveBeenCalledOnce();expect(f.state.current.body).toMatchObject({conversationId:conversation,recipientUserId:recipient,amountUsd:'10.00'});expect(control.getSnapshot()).toMatchObject({outcome:{status:'recorded'},context:{recipientLabel:'Maya'},receipt:{amountUsdCents:'1000'}});expect(done).toHaveBeenCalledOnce();
});
it('opening restores a same-room checkout without executing, then check resumes its saved nonce',async()=>{
 const f=meetingWallet('300');f.refuse=true;const first=setup(f).control;await first.send(recipient,'10');expect(first.getSnapshot().outcome).toMatchObject({status:'funding'});
 const second=setup(f).control;await second.open();expect(f.transfer).toHaveBeenCalledOnce();expect(f.check).not.toHaveBeenCalled();f.paid=true;await second.check();expect(second.getSnapshot().outcome).toMatchObject({status:'recorded'});expect(f.begin).toHaveBeenCalledOnce();expect(f.transfer.mock.calls[0][0]).toEqual(f.transfer.mock.calls[1][0]);
});
it('does not resume, resolve or cancel an unrelated pending payment',async()=>{
 const f=meetingWallet();f.unknown=true;const r=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:other});await f.api.execute(r,r.digest);
 const {control}=setup(f);await control.open();expect(control.getSnapshot().blocked).toBe(true);await control.check();await control.cancel();await control.send(recipient,'10');expect(f.transfer).toHaveBeenCalledOnce();expect(f.check).not.toHaveBeenCalled();expect(f.state.current.status).toBe('unknown');
});
it('looks up an unknown payment without repeating it or opening checkout',async()=>{
 const f=meetingWallet();f.unknown=true;const {control}=setup(f);await control.send(recipient,'10');await control.check();expect(control.getSnapshot().outcome).toMatchObject({status:'unknown'});expect(f.transfer).toHaveBeenCalledOnce();expect(f.begin).not.toHaveBeenCalled();
});
it('cancels only this room’s funding and does not send after cancellation',async()=>{
 const f=meetingWallet('300');f.refuse=true;const {control}=setup(f);await control.send(recipient,'10');await control.cancel();expect(control.getSnapshot().outcome).toMatchObject({status:'not-sent',reason:'card_cancelled'});expect(f.transfer).toHaveBeenCalledOnce();await control.check();expect(f.transfer).toHaveBeenCalledOnce();
});
it.each(['account','nonmember','amount','closed'])('refuses %s intent before submission',async kind=>{
 const f=meetingWallet(),{control}=setup(f);if(kind==='account')f.uid=other;if(kind==='closed')control.close();await control.send(kind==='nonmember'?other:recipient,kind==='amount'?'1.999':'10');expect(f.transfer).not.toHaveBeenCalled();expect(f.begin).not.toHaveBeenCalled();
});
it('never silently changes recipient when membership changes while quote is pending',async()=>{
 const f=meetingWallet();let members=people();const base=f.request.getMockImplementation()!;f.request.mockImplementation(async p=>{const raw=await base(p);if(p.includes('amountUsd='))members=[];return raw;});const{control}=setup(f,{members:()=>members});await control.send(recipient,'10');expect(f.transfer).not.toHaveBeenCalled();
});
it.each(['funding','unknown'] as const)('passes the inspected %s nonce to existing Wallet recovery',async status=>{
 const f=meetingWallet('300');f.refuse=true;if(status==='unknown')f.unknown=true;const a=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:conversation});await f.api.execute(a,a.digest);const stored=await f.api.status();
 const resume=vi.fn(async()=>stored),resolve=vi.fn(async()=>stored),api={...f.api,status:async()=>stored,resumeFunding:resume,resolve};
 const{control}=setup(f,{wallet:async()=>api});await control.open();await control.check();if(status==='funding')expect(resume).toHaveBeenCalledExactlyOnceWith(a.clientNonce);else expect(resolve).toHaveBeenCalledExactlyOnceWith(true,a.clientNonce);
});
