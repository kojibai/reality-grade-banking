import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002';
function fixture(){
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;}),calls:string[]=[];let recipientError:Error|undefined,quoteError:Error|undefined;
 const request=async(path:string)=>{calls.push(path);if(path.startsWith('/api/chat/users/search?')){await gate;if(recipientError)throw recipientError;return{ok:true,users:[{kind:'user',userId:recipient,username:'receiver'}]};}if(quoteError)throw quoteError;return{ok:true,senderUserId:sender,capabilities:{publicTransferNotes:true},quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};};
 const write=vi.fn(),transfer=vi.fn();const api=createWalletSend({ownerReceizId:'owner.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async f=>f(),store:{read:async()=>null,write},connect:async()=>({accountUid:sender,client:{request,connect:{transfer}}})});
 return{api,release,calls,write,transfer,failRecipient(){recipientError=Error('recipient unavailable');},failQuote(){quoteError=Error('quote unavailable');}};
}
it('prepares recipient and amount quote together with no write or send',async()=>{
 const f=fixture(),pending=f.api.prepare({recipient:'receiver',amountUsdCents:'1000'});
 try{await vi.waitFor(()=>expect(f.calls).toContain('/api/connect/transfers?amountUsd=10.00'));}finally{f.release();}
 const review=await pending;expect(review).toMatchObject({accountUid:sender,recipientUserId:recipient,amountUsdCents:'1000',quote:{settledUsdCents:'250',ecosystemUsdCents:'750'}});expect(f.write).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
it('preserves recipient error precedence and observes an early quote failure',async()=>{
 const f=fixture();f.failRecipient();f.failQuote();const pending=f.api.prepare({recipient:'receiver',amountUsdCents:'1000'});await new Promise(resolve=>setTimeout(resolve,5));f.release();await expect(pending).rejects.toThrow('recipient unavailable');expect(f.write).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
it('does not quote, create or send when the custody guard refuses preparation',async()=>{
 const request=vi.fn(),api=createWalletSend({ownerReceizId:'owner.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{throw Error('BANK_EXECUTION_PENDING');},lock:async f=>f(),store:{read:async()=>null,write:vi.fn()},connect:async()=>({accountUid:sender,client:{request,connect:{transfer:vi.fn()}}})});
 await expect(api.prepare({recipient:'receiver',amountUsdCents:'1000'})).rejects.toThrow('BANK_EXECUTION_PENDING');expect(request).not.toHaveBeenCalled();
});
it('does not request a quote for a known self-recipient',async()=>{
 const f=fixture();await expect(f.api.prepare({recipient:sender,amountUsdCents:'1000'})).rejects.toThrow('BANK_WALLET_RECIPIENT_UNAVAILABLE');expect(f.calls).toEqual([]);expect(f.write).not.toHaveBeenCalled();expect(f.transfer).not.toHaveBeenCalled();
});
