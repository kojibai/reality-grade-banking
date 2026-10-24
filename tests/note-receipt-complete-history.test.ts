import {expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
import {compactReceiptLink} from '../src/receiz/receipt-sharing';
import {decodeReceiptPacket} from '../src/receiz/receipt-packet';
it.each(['note_mint','note_claim'])('keeps every carried ancestor of a large %s in its standalone share link without IO',kind=>{
 const note='note:public-original',root={kind:'note',id:note},nodes:Record<string,unknown>={};
 for(let i=0;i<180;i++){const id='source-'+i;nodes['credit:'+id]={ref:{kind:'credit',id},parents:i?[{kind:'credit',id:'source-'+(i-1)}]:[{kind:'proof-basis',id:'origin'}],source:'bank_connected_note_redeem',amountUsdCents:'100',amountPhiMicro:'400',occurredAt:'2026-10-24T00:00:00Z',kaiUpulse:String(1000000+i)};}
 nodes['proof-basis:origin']={ref:{kind:'proof-basis',id:'origin'},parents:[],objectIds:['20000000-0000-4000-8000-000000000001'],originalDigest:'d'.repeat(64)};
 nodes['note:'+note]={ref:root,parents:[{kind:'credit',id:'source-179'}],amountUsdCents:'100',amountPhiMicro:'400'};
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'large-note',kind,noteId:note,amountUsdCents:'100',amountPhiMicro:'400'}],fundingContexts:{schema:'receiz.wallet.funding-context.v1',root,nodes}}).records[0],fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const url=compactReceiptLink(receiptLink(row)!),receipt=readReceiptLink(url),trace=ledgerFundingTrace({...row,details:receipt.details??undefined});
  expect(trace.steps.map(s=>s.sourceId)).toEqual(ledgerFundingTrace(row).steps.map(s=>s.sourceId));
  expect(receipt.contextOmitted).toBe(false);expect(trace.context?.coverage.status).toBe('complete');expect(url.length).toBeLessThan(32000);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('refuses an oversized expanded receipt declaration before allocating its output',()=>{
 const bytes=new Uint8Array([2,255,255,255,1,2]),packet=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 expect(()=>decodeReceiptPacket(packet)).toThrow('RECEIPT_INVALID');
});
