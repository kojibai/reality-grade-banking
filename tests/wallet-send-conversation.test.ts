import {expect,it} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
import {meetingWallet,sender,recipient,conversation,other} from './fixtures/meeting-payments';
it('binds an approved meeting conversation into the exact transfer without creating a DM',async()=>{
 const f=meetingWallet(),review=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:conversation});
 expect(review).toHaveProperty('conversationId',conversation);expect(f.transfer).not.toHaveBeenCalled();
 expect(await f.api.execute(review,review.digest)).toMatchObject({status:'recorded'});
 expect(f.state.current.body.conversationId).toBe(conversation);expect(f.request.mock.calls.some(([p])=>p==='/api/chat/conversations')).toBe(false);
 expect(await createWalletSend(f.options).status()).toMatchObject({context:{conversationId:conversation,accountUid:sender,recipientUserId:recipient,amountUsdCents:'1000',clientNonce:review.clientNonce}});
});
it('keeps default Send on its existing DM path and restores its old checkpoint',async()=>{
 const f=meetingWallet(),r=await f.api.prepare({recipient,amountUsdCents:'1000'});expect(await f.api.execute(r,r.digest)).toMatchObject({status:'recorded'});expect(f.state.current.body.conversationId).toBe(other);expect(await createWalletSend(f.options).status()).not.toHaveProperty('context');
});
it('rejects malformed conversation intent and changed saved body before any submission',async()=>{
 const f=meetingWallet();await expect(f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:'invalid'})).rejects.toThrow();
 const r=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:conversation});f.unknown=true;await f.api.execute(r,r.digest);f.state.current.body.conversationId=other;
 await expect(createWalletSend(f.options).resolve(true)).rejects.toThrow('CHECKPOINT');expect(f.transfer).toHaveBeenCalledOnce();
});
it('keeps the same meeting and nonce through shortfall checkout and reopening',async()=>{
 const f=meetingWallet('300');f.refuse=true;const r=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:conversation});expect(await f.api.execute(r,r.digest)).toMatchObject({status:'funding',shortfallUsdCents:'700'});f.paid=true;
 expect(await createWalletSend(f.options).resumeFunding()).toMatchObject({status:'recorded'});expect(f.transfer.mock.calls.map(([b])=>[b.conversationId,b.clientNonce])).toEqual([[conversation,r.clientNonce],[conversation,r.clientNonce]]);expect(f.begin).toHaveBeenCalledOnce();
});
it.each(['funding','unknown'] as const)('refuses recovery of a replaced %s checkpoint inside the Wallet lock',async status=>{
 const f=meetingWallet('300');f.refuse=true;const a=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:conversation});await f.api.execute(a,a.digest);await f.api.cancelFunding(a.clientNonce);
 if(status==='unknown')f.unknown=true;const b=await f.api.prepare({recipient,amountUsdCents:'1000'},{conversationId:other});await f.api.execute(b,b.digest);const before=f.request.mock.calls.length,count=f.transfer.mock.calls.length;
 await expect(status==='funding'?f.api.resumeFunding(a.clientNonce):f.api.resolve(true,a.clientNonce)).rejects.toThrow('CHANGED');expect(f.request.mock.calls.length).toBe(before);expect(f.transfer.mock.calls.length).toBe(count);expect(f.check).not.toHaveBeenCalled();expect(f.state.current.body.clientNonce).toBe(b.clientNonce);
});
