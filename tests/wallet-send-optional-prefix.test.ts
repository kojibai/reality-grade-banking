import {expect,it,vi} from 'vitest';
import {createWalletSend} from '../src/receiz/wallet-send';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002';
function fixture(username:string,receivingUsername?:string){
 const transfer=vi.fn(),write=vi.fn(),calls:string[]=[];
 const request=vi.fn(async(path:string)=>{calls.push(path);return path.startsWith('/api/chat/users/search?')?{ok:true,users:[{kind:'user',userId:recipient,username,...(receivingUsername?{receivingUsername}:{})}]}:{ok:true,senderUserId:sender,quote:{amountUsdCents:'1000',amountPhiMicro:'10000000',usdPerPhiMicrocents:'100000000',settledUsdCents:'250',ecosystemUsdCents:'750',fundingRule:'settled_first_then_phi'}};});
 const api=createWalletSend({ownerReceizId:'owner.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async f=>f(),store:{read:async()=>null,write},connect:async()=>({accountUid:sender,client:{request,connect:{transfer}}})});
 return {api,calls,transfer,write};
}
it.each(['pbahqdfouqyxgsifc','receiz_pbahqdfouqyxgsifc','@PBAHQDFOUQYXGSIFC.receiz.id'])('resolves %s to the existing prefixed recipient with the same one directory request',async input=>{
 const f=fixture('receiz_pbahqdfouqyxgsifc'),review=await f.api.prepare({recipient:input,amountUsdCents:'1000'});
 expect(review.recipientUserId).toBe(recipient);expect(review.recipientLabel).toBe('@receiz_pbahqdfouqyxgsifc');
 expect(f.calls).toEqual(['/api/connect/transfers?amountUsd=10.00','/api/chat/users/search?q=pbahqdfouqyxgsifc']);
 expect(f.transfer).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();
});
it.each(['pbahqdfouqyxgsifcy','receiz_pbahqdfouqyxgsifcy'])('preserves every character in %s instead of truncating to another username',async input=>{
 const f=fixture('receiz_pbahqdfouqyxgsifcy'),review=await f.api.prepare({recipient:input,amountUsdCents:'1000'});
 expect(review.recipientUserId).toBe(recipient);expect(f.calls[1]).toBe('/api/chat/users/search?q=pbahqdfouqyxgsifcy');
 expect(f.transfer).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();
});
it('refuses a directory result that differs by its final character',async()=>{
 const f=fixture('receiz_pbahqdfouqyxgsifc');
 await expect(f.api.prepare({recipient:'pbahqdfouqyxgsifcy',amountUsdCents:'1000'})).rejects.toThrow('BANK_WALLET_RECIPIENT_UNAVAILABLE');
 expect(f.transfer).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();
});

it.each(['pbahqdfouqyxgsifcy','receiz_pbahqdfouqyxgsifcy'])('resolves the full retained %s even when the canonical profile locator is shorter',async input=>{
 const f=fixture('receiz_pbahqdfouqyxgsifc','pbahqdfouqyxgsifcy'),review=await f.api.prepare({recipient:input,amountUsdCents:'1000'});
 expect(review.recipientUserId).toBe(recipient);expect(f.calls[1]).toBe('/api/chat/users/search?q=pbahqdfouqyxgsifcy');expect(f.transfer).not.toHaveBeenCalled();expect(f.write).not.toHaveBeenCalled();
});
