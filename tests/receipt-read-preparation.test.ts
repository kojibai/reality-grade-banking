import {expect,it,vi} from 'vitest';
import {readReceiptSnapshot,receiptDigest} from '../src/receiz/receipt-snapshot';
import {completeLedgerReceipt} from '../src/receiz/ledger-receipts';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
async function fixture(id:string){const receipt=completeLedgerReceipt(parsePublicNetworkPage('wallet',{ok:true,events:[{id,kind:'chat_transfer',amountUsdCents:'12500',pulse:'123'}]}).records[0]);const bytes=new TextEncoder().encode(JSON.stringify(receipt));return{receipt,bytes,digest:await receiptDigest(bytes)};}
it('shares an exact pending receipt read, keeping the full integrity-checked receipt',async()=>{
 const {receipt,bytes,digest}=await fixture('shared-receipt');let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),fetcher=vi.fn(async()=>{await gate;return new Response(bytes);});
 const a=readReceiptSnapshot(digest,fetcher),b=readReceiptSnapshot(digest,fetcher);release();expect(await a).toEqual(receipt);expect(await b).toEqual(receipt);expect(fetcher).toHaveBeenCalledOnce();
});
it('keeps different transports isolated even for the same requested digest',async()=>{
 const {receipt,bytes,digest}=await fixture('isolated-receipt'),good=vi.fn(async()=>new Response(bytes)),bad=vi.fn(async()=>new Response('changed'));
 const [accepted,refused]=await Promise.allSettled([readReceiptSnapshot(digest,good),readReceiptSnapshot(digest,bad)]);expect(accepted).toEqual({status:'fulfilled',value:receipt});expect(refused).toMatchObject({status:'rejected',reason:Error('RECEIPT_INTEGRITY_FAILED')});expect(good).toHaveBeenCalledOnce();expect(bad).toHaveBeenCalledOnce();
});
it('retries after a shared refusal and keeps different receipt digests separate',async()=>{
 const a=await fixture('a'),b=await fixture('b'),fetcher=vi.fn(async(url:RequestInfo|URL)=>String(url).endsWith(a.digest)?new Response(a.bytes):new Response(b.bytes));
 fetcher.mockResolvedValueOnce(new Response(null,{status:404}));await Promise.all([expect(readReceiptSnapshot(a.digest,fetcher)).rejects.toThrow('RECEIPT_NOT_FOUND'),expect(readReceiptSnapshot(a.digest,fetcher)).rejects.toThrow('RECEIPT_NOT_FOUND')]);
 const result=await Promise.all([readReceiptSnapshot(a.digest,fetcher),readReceiptSnapshot(b.digest,fetcher)]);expect(result).toEqual([a.receipt,b.receipt]);expect(fetcher).toHaveBeenCalledTimes(3);
});
