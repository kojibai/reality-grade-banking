import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {expect,it} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {receiptLink,readReceiptLink,activityCategory} from '../src/receiz/ledger-receipts';
it('carries only the selected transaction receipt, preserving its real Kai and excluding private context',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'transfer-1',kind:'chat_transfer',createdAt:'2026-10-17T12:00:00Z',pulse:14692714,kaiUpulse:'14692714000000',amountUsdCents:'12500',sender:{displayName:'Sender'},recipient:{displayName:'Recipient'},privateKey:'must-never-share',conversationId:'private-chat'}]}).records[0];
 const link=receiptLink(record)!;expect(link).toContain('/receipt/#');
 const receipt=readReceiptLink(link);expect(receipt.pulse).toBe('14692714');expect(receipt.amountUsdCents).toBe('12500');expect(receipt.sender).toBe('Sender');expect(JSON.stringify(receipt)).not.toContain('must-never-share');expect(JSON.stringify(receipt)).not.toContain('private-chat');
 expect(activityCategory(record)).toBe('transfers');
});
it('rejects malformed and oversized links without inventing a coordinate or verification',()=>{
 expect(()=>readReceiptLink('https://bankeiz.com/receipt/#r=bad')).toThrow();
 expect(()=>readReceiptLink('https://bankeiz.com/receipt/#r='+ 'a'.repeat(40_000))).toThrow();
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'old',kind:'reserve_credit',amountUsdCents:'100'}]}).records[0];
 expect(readReceiptLink(receiptLink(record)!).pulse).toBeNull();expect(activityCategory(record)).toBe('transactions');
});
it('retains an exact allowed original receipt URL and rejects unsafe sources',()=>{
 const original='https://receiz.com/t/20261017_1646/92DD0339C992B40E/14692714?p=c1%3Aabc';
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',transactionHref:original}]}).records[0];
 expect(readReceiptLink(receiptLink(record)!).sourceUrl).toBe(original);
});

it('preserves original receipt/source links through offline public cache and receipt sharing',()=>{
 for(const original of ['https://receiz.com/t/20261017_1646/92DD0339C992B40E/14692714?p=c1%3Aabc','https://receiz.com/market/assets/asset-1']){
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',transactionHref:original}]}).records[0];
 const restored=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[record],coverage:[]}).records[0];
 expect(restored.sourceUrl).toBe(original);expect(readReceiptLink(receiptLink(restored)!).sourceUrl).toBe(original);
 }
});
