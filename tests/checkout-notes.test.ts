import {expect,it,vi} from 'vitest';
import {createCheckoutNotes} from '../src/receiz/checkout-notes';
import {loadReceiz} from '../src/receiz/client';
import type {BankNoteRail,BankNoteDepositResult,BankNoteInspection} from '../src/receiz/offline-notes';
import type {OpenIdentity} from '../src/receiz/native-identity';
const noteId='10000000-0000-4000-8000-000000000001',bytes=new Uint8Array([137,80,78,71,1]);
function fixture(rail:BankNoteRail){
 const inspection:BankNoteInspection={noteId,rail,amountUsdCents:'1000',amountPhiMicro:'10000000',...(rail==='composite'?{fundingParts:{reserve:{amountUsdCents:'400',amountPhiMicro:'4000000'},settlement:{amountUsdCents:'600',amountPhiMicro:'6000000'}}}:{})};
 let rows:BankNoteDepositResult[]=[];const received={...inspection,rail,status:'received' as const,proofBytes:bytes};const confirmed={...inspection,status:'confirmed' as const,proofBytes:bytes,reserveAfterUsdCents:'1000'};
 const inspect=vi.fn(async()=>inspection),deposit=vi.fn(async()=>{rows=[received];return received;});
 const nativeNotes={inspect,deposit,receivedNotes:async()=>rows,reconcileReceivedNotes:async()=>rows};const identity={offlineNotes:async()=>nativeNotes}as unknown as OpenIdentity;
 const sources=new Map<string,Uint8Array>(),storeSource=async(data:Uint8Array)=>{const id=await(await loadReceiz()).sha256ReceizBytes(data);sources.set(id,data);return id;};
 const adapter=createCheckoutNotes({identity,storeSource,restoreSource:async(id:string)=>sources.get(id)!,assertCurrent(){}});
 return{adapter,deposit,inspect,nativeNotes,confirmed,confirm(){rows=[confirmed];},file:new File([bytes],'note.png',{type:'image/png'})};
}
it.each(['reserve','settlement','composite']as const)('waits for confirmed %s credit and never deposits again while checking',async rail=>{
 const f=fixture(rail),entry=await f.adapter.inspect(f.file),pending=await f.adapter.deposit(entry);expect(pending.status).toBe('received');expect(pending.rail).toBe(rail);expect(f.deposit).toHaveBeenCalledExactlyOnceWith(bytes);
 expect((await f.adapter.check(pending)).status).toBe('received');f.confirm();const done=await f.adapter.check(pending);expect(done.status).toBe('confirmed');expect(done.creditSourceDigest).toMatch(/^[a-f0-9]{64}$/);expect(done.inspection).toEqual(entry.inspection);await f.adapter.check(done);expect(f.deposit).toHaveBeenCalledTimes(1);
});
it('does not claim a different source or replay a depositing entry after reopening',async()=>{
 const f=fixture('reserve'),entry=await f.adapter.inspect(f.file);expect((await f.adapter.check({...entry,status:'depositing'})).status).toBe('depositing');expect(f.deposit).not.toHaveBeenCalled();
 await expect(f.adapter.deposit({...entry,sourceDigest:'a'.repeat(64)})).rejects.toThrow();expect(f.deposit).not.toHaveBeenCalled();
});
it('rejects ownership/claim errors and oversized files without turning them into funding',async()=>{
 const f=fixture('reserve');f.inspect.mockRejectedValue(Error('BANK_NOTE_ALREADY_DEPOSITED'));await expect(f.adapter.inspect(f.file)).rejects.toThrow('ALREADY_DEPOSITED');expect(f.deposit).not.toHaveBeenCalled();
 await expect(f.adapter.inspect({size:33*1024*1024}as File)).rejects.toThrow('capacity');
});
it('recovers a retained legacy deposit through its native original attempt without depositing again',async()=>{
 const f=fixture('reserve'),entry=await f.adapter.inspect(f.file),recoverDeposit=vi.fn(async()=>f.confirmed);Object.assign(f.nativeNotes,{recoverDeposit});
 expect((await f.adapter.check({...entry,status:'depositing'})).status).toBe('confirmed');expect(recoverDeposit).toHaveBeenCalledExactlyOnceWith(bytes);expect(f.deposit).not.toHaveBeenCalled();
});
