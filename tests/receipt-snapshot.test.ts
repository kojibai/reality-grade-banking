import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {completeLedgerReceipt} from '../src/receiz/ledger-receipts';
import {saveReceiptSnapshot,readReceiptSnapshot,receiptSnapshotUrl,receiptSnapshotDigest} from '../src/receiz/receipt-snapshot';
afterEach(()=>vi.unstubAllGlobals());
const row=()=>parsePublicNetworkPage('wallet',{ok:true,events:[{id:'snapshot-send',kind:'chat_transfer',amountUsdCents:'2700',privateKey:'SECRET'}]}).records[0];
it('saves complete funding context without compaction, uses exact byte digest and one coalesced publication',async()=>{
 const record=row(),nodes:Record<string,unknown>={};for(let i=0;i<300;i++)nodes['credit:c'+i]={ref:{kind:'credit',id:'c'+i},parents:i?[{kind:'credit',id:'c'+(i-1)}]:[{kind:'proof-basis',id:'origin'}],amountUsdCents:'2700'};
 nodes['proof-basis:origin']={ref:{kind:'proof-basis',id:'origin'},parents:[],originalDigest:'a'.repeat(64)};
 record.details={fundingContext:{schema:'receiz.wallet.funding-context.v1',root:{kind:'credit',id:'c299'},nodes} as never,privateKey:'SECRET'};
 const receipt=completeLedgerReceipt(record);expect(Object.keys((receipt.details!.fundingContext as {nodes:Record<string,unknown>}).nodes)).toHaveLength(301);expect(receipt.contextOmitted).toBe(false);expect(JSON.stringify(receipt)).not.toContain('SECRET');
 const fetcher=vi.fn(async(_url:unknown,init?:RequestInit)=>Response.json({ok:true,sha256:createHash('sha256').update(String(init!.body)).digest('hex')}));
 const [a,b]=await Promise.all([saveReceiptSnapshot(receipt,fetcher),saveReceiptSnapshot(receipt,fetcher)]);expect(a).toBe(b);expect(a.length).toBeLessThan(110);expect(fetcher).toHaveBeenCalledTimes(1);
 const bytes=String(fetcher.mock.calls[0][1]?.body),digest=createHash('sha256').update(bytes).digest('hex');expect(a).toBe('https://bankeiz.com/receipt/'+digest+'/');expect(receiptSnapshotDigest(a)).toBe(digest);
 expect(await readReceiptSnapshot(digest,async()=>new Response(bytes))).toEqual(receipt);
});
it('refuses a changed delivery body and never produces a successful URL when saving fails',async()=>{
 const receipt=completeLedgerReceipt(row()),digest='a'.repeat(64);
 await expect(readReceiptSnapshot(digest,async()=>Response.json(receipt))).rejects.toThrow('RECEIPT_INTEGRITY_FAILED');
 await expect(saveReceiptSnapshot({...receipt,id:'failure'},async()=>new Response(null,{status:503}))).rejects.toThrow('RECEIPT_SAVE_UNAVAILABLE');
 expect(()=>receiptSnapshotUrl('../other')).toThrow();
});
