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

it('gives a public proof a shareable receipt without claiming it was independently verified',()=>{
 const proof=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'profile:artist:proof-1',receizId:'proof-1',title:'Sealed work',valueUsd:42.25,pulse:'14692714',canonicalHref:'/artist/verified/proof-1'}]}}).records[0];
 const link=receiptLink(proof);
 expect(link).not.toBeNull();
 const receipt=readReceiptLink(link!);
 expect(receipt.title).toBe('Sealed work');
 expect(receipt).not.toHaveProperty('verified');
 expect((proof as unknown as {valueOperands?:{proofValueUsdCents:string}}).valueOperands?.proofValueUsdCents).toBe('4225');
});

it('retains a private card snapshot separately from consideration and excludes unrelated payloads',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'card-transfer',kind:'sports_card_transfer',pulse:14692714,kaiUpulse:'14692714000000',amountUsdCents:'98765',amountPhiMicro:'5000000',usdPerPhiMicrocents:'19753000',collectibleId:'card-1',claimHash:'a'.repeat(64),considerationUsdCents:'12500',valueReceipt:{settledUsdCents:'0',phiUsdCents:'98765',fundingSource:'sovereign',fundingRule:'sports_card_transfer_card_value_snapshot',certificateSharesMicro:null},privateKey:'secret',metadata:{accessToken:'secret'}}]}).records[0];
 const operands=(record as unknown as {valueOperands?:Record<string,unknown>}).valueOperands;
 expect(operands).toMatchObject({amountPhiMicro:'5000000',usdPerPhiMicrocents:'19753000',collectibleId:'card-1',claimHash:'a'.repeat(64),considerationUsdCents:'12500',cardValueUsdCents:'98765',fundingRule:'sports_card_transfer_card_value_snapshot'});
 expect(JSON.stringify(operands)).not.toContain('secret');
});
it('keeps the canonical source verifier carried by the real wallet proof bundle',()=>{
 const source='https://receiz.com/v/20261017_1646/92DD0339C992B40E/14692714?p=c1%3Aabc';
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'t',kind:'chat_transfer',proofBundle:{verifierUrl:source,capsuleHash:'a'.repeat(64),bundleHash:'b'.repeat(64)}}]}).records[0];
 expect(readReceiptLink(receiptLink(record)!).sourceUrl).toBe(source);
});
it('keeps shared cohort context off per-row receipt URLs without dropping the original record context',()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'send',kind:'chat_transfer',amountUsdCents:'100',fundingCohorts:[{rule:'receiz-profile-rollup-v1-owned-and-received',basis:'reconstructed-membership',creditSourceId:'credit',computedAt:'2026-05-01T00:00:00Z',amountPhiMicro:'1000',members:[{objectId:'original',title:'Original',createdAt:'2026-04-01T00:00:00Z',verifyUrl:'https://receiz.com/v/moment/original',basis:'owned'}]}]}]}).records[0];
 const cohorts=record.details!.fundingCohorts,receipt=readReceiptLink(receiptLink(record)!);
 expect(receipt.contextOmitted).toBe(true);expect(receipt.details).not.toHaveProperty('fundingCohorts');expect(record.details!.fundingCohorts).toBe(cohorts);
 expect(receipt.amountUsdCents).toBe('100');
});
it('shares the selected My history trade facts while excluding unrelated private account context',async()=>{
 const {compactReceiptLink}=await import('../src/receiz/receipt-sharing');
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'sale',kind:'wallet_ledger_entry',ledgerEntryKind:'market_sell',amountUsdCents:'12500',assetTrade:{side:'sell',marketItemId:'profile:artist:work',title:'An original',shareQuantityMicro:'2500000',priceUsdCents:'5000',settlementUsdCents:'12500',feeUsdCents:'0',realizedCostBasisUsdCents:'10000'}}]}).records[0];
 const record={...row,authority:'account-source-projection' as const,detail:'PRIVATE ACCOUNT CONTEXT',details:{...row.details,conversationId:'private-conversation',fundingHistory:[{private:'private-source'}]}};
 const link=compactReceiptLink(receiptLink(record)!),receipt=readReceiptLink(link);
 expect(receipt.details).toEqual({ledgerEntryKind:'market_sell',assetTrade:row.details!.assetTrade});
 expect(JSON.stringify(receipt)).not.toMatch(/PRIVATE ACCOUNT CONTEXT|private-conversation|private-source/);expect(link.length).toBeLessThan(2000);
});
