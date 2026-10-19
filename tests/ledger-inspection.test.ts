import {expect,it} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {readReceiptLink,receiptLink} from '../src/receiz/ledger-receipts';
import {ledgerInspectionDocument} from '../src/receiz/ledger-inspection';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';

const original='https://receiz.com/t/20261017_1646/92DD0339C992B40E/14692714?p=c1%3Aabc';
const event={id:'transfer',kind:'chat_transfer',pulse:14692714,kaiUpulse:'14692714000001',createdAt:'2026-10-17T12:00:00Z',amountUsdCents:'12345',amountPhiMicro:'999999999999999999',usdPerPhiMicrocents:'12500000',sender:{username:'sender',displayName:'Sender',accessToken:'hidden-token'},recipient:{username:'receiver',displayName:'Receiver'},objectId:'proof-one',proofBundle:{verifierUrl:original,capsuleHash:'a'.repeat(64),bundleHash:'b'.repeat(64),verificationVersion:'wallet-ledger-v1',proofCapsule:{pulse:14692714,upulse:'14692714000001',kaiSignature:'public-signature',privateKey:'hidden-key'}},conversationId:'hidden-conversation',noteToken:'hidden-note',metadata:{clientSecret:'hidden-secret'}};

it('retains inspectable public participants, exact value inputs and evidence without custody or conversations',()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[event]}).records[0];
 const doc=ledgerInspectionDocument(row,ledgerValueForRecord(row));
 expect(doc.details).toMatchObject({sender:{username:'sender',displayName:'Sender'},recipient:{username:'receiver'},proofBundle:{verificationVersion:'wallet-ledger-v1',proofCapsule:{upulse:'14692714000001',kaiSignature:'public-signature'}}});
 expect(doc.valueOperands).toMatchObject({amountPhiMicro:'999999999999999999',usdPerPhiMicrocents:'12500000'});
 expect(JSON.stringify(doc)).not.toContain('hidden-');
 expect(doc.authority).toBe('public-source-projection');
 expect(doc).not.toHaveProperty('verified');
});

it('keeps public inspection available after cache reload and in a shareable receipt',()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[event]}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[row],coverage:[]}).records[0];
 expect(cached.details).toEqual(row.details);
 const receipt=readReceiptLink(receiptLink(cached)!);
 expect(receipt.details).toEqual(row.details);
 expect(receipt.valueOperands).toEqual(row.valueOperands);
 expect(receipt.sourceUrl).toBe(original);
 expect(JSON.stringify(receipt)).not.toContain('hidden-');
});

it('does not add private source context or injected cache fields to shareable receipts',()=>{
 const row=parsePublicNetworkPage('wallet',{ok:true,events:[event]}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[{...row,details:{...row.details,privateKey:'hidden-key',sender:{displayName:'Sender',clientSecret:'hidden-secret'}}}],coverage:[]}).records[0];
 expect(JSON.stringify(cached.details)).not.toContain('hidden-');
 const receipt=readReceiptLink(receiptLink({...row,authority:'account-source-projection',origin:'private-account'})!);
 expect(receipt.details).toBeNull();
 expect(receipt.valueOperands).toEqual({});expect(receipt.valuation).toBeNull();expect(receipt.authority).toBe('account-source-projection');
});

it('keeps proof ownership, original download and digest inspectable without inventing a transaction',()=>{
 const row=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'profile:artist:one',receizId:'one',title:'Sealed work',ownerUsername:'artist',ownerDisplayName:'Artist',pulse:'120',valueUsd:42.25,canonicalHref:'/artist/verified/one',profileOriginal:{media:{originalDownloadSrc:'/api/profile/originals/download?receizId=one&kind=original',originalDownloadSha256Hex:'c'.repeat(64)}}}]}}).records[0];
 expect(row.recipient).toBeNull();
 expect(row.details).toMatchObject({owner:{username:'artist',displayName:'Artist'},assetId:'one',originalUrl:'https://receiz.com/api/profile/originals/download?receizId=one&kind=original'});
 expect(row.evidence.artifactDigest).toBe('c'.repeat(64));
});
it('retains the exact public reading coordinate through ledger cache and receipt transport',()=>{
 const post='https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396';
 const row=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'essay',receizId:'essay',title:'Sealed essay',verifyHref:post,profileOriginal:{hasLongForm:true,readingTzMinutesEast:-240,media:{originalDownloadSrc:'/api/profile/originals/download?receizId=essay&kind=original',originalDownloadSha256Hex:'c'.repeat(64)}}}]}}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[row],coverage:[]}).records[0];
 const receipt=readReceiptLink(receiptLink(cached)!);
 expect(receipt.details).toMatchObject({readingUrl:post+'&tz=-240',hasLongForm:true});
});

it('preserves the full supported public description through offline cache and receipt sharing',()=>{
 const summary='A'.repeat(8192);
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'long',receizId:'long',title:'Long description',summary}]}}).records[0];
 const cached=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',records:[record],coverage:[]}).records[0];
 expect(cached.detail).toBe(summary);expect(readReceiptLink(receiptLink(cached)!).detail).toBe(summary);
});
it('keeps core receipt controls available when optional multibyte context exceeds link capacity',()=>{
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id:'large',receizId:'large',title:'😀'.repeat(2048),summary:'😀'.repeat(4096),pulse:'120',valueUsd:42.25}]}}).records[0];
 const link=receiptLink(record);expect(link).not.toBeNull();
 const receipt=readReceiptLink(link!);expect(receipt.title).toBe(record.title);expect(receipt.value?.amountUsdCents).toBe('4225');expect(receipt.contextOmitted).toBe(true);
});
