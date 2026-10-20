import {expect,it,vi} from 'vitest';
import type {ReceizIdentityAccountProjection} from '@receiz/sdk';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
import {projectPersonalHistory} from '../src/receiz/personal-history';
import {ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
import {parsePublicNetworkPage,mergePublicRecords} from '../src/receiz/public-network';

const event=(id:string,sender:string,recipient:string)=>({id,kind:'chat_transfer',transferId:id,amountUsdCents:'100',sender:{userId:sender,displayName:sender},recipient:{userId:recipient,displayName:recipient}});
it('retains both incoming and outgoing transfers with account-bound direction and no extra reads',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const events=[event('sent','me','other'),event('received','other','me'),event('self','me','me'),event('foreign','other','third')];
  const records=parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events},'me').records;
  expect(records).toHaveLength(4);
  expect(records.map(r=>r.accountFlow)).toEqual(['out','in','self',undefined]);
  expect(records.map(ledgerRecordTitle)).toEqual(['Money Sent','Money Received','Money Transfer','Money Transfer']);
  expect(parsePublicNetworkPage('wallet',{ok:true,events}).records.every(r=>r.accountFlow===undefined)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('uses native credit/debit coordinates for account activity and never guesses from a display name',()=>{
 const events=[{id:'credit',kind:'wallet_ledger_entry',direction:'credit'},{id:'debit',kind:'sports_card_transfer',direction:'debit'},
  {id:'deposit',kind:'note_claim'},{id:'mint',kind:'note_mint'},
  {id:'unknown',kind:'chat_transfer',sender:{displayName:'me'},recipient:{username:'me'}},
  {...event('conflict','me','other'),direction:'credit'}];
 const rows=parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events},'me').records;
 expect(rows.map(r=>r.accountFlow)).toEqual(['in','out','in','out',undefined,undefined]);
 for(const kind of ['note_mint','note_claim','reserve_credit','wallet_ledger_entry']){
  expect(parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events:[{id:'foreign',kind,direction:'credit',actor:{userId:'other'}}]},'me').records[0].accountFlow).toBeUndefined();
 }
});
it('retains a known transfer direction when the same native event is projected thinly later',()=>{
 const page=(events:unknown[])=>parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events},'me').records;
 const known=page([event('received','other','me')]),thin=page([{id:'received',kind:'chat_transfer',transferId:'received',amountUsdCents:'100'}]);
 expect(mergePublicRecords(known,thin)[0].accountFlow).toBe('in');
 expect(mergePublicRecords(known,page([event('received','me','other')]))[0].accountFlow).toBeUndefined();
 const conflict=page([{...event('received','me','other'),direction:'credit'}]);
 expect(conflict[0].accountFlowConflict).toBe(true);
 expect(mergePublicRecords(known,conflict)[0].accountFlowConflict).toBe(true);
 expect(mergePublicRecords(known,conflict)[0].accountFlow).toBeUndefined();
 expect(mergePublicRecords(mergePublicRecords(known,conflict),known)[0].accountFlow).toBeUndefined();
 const purchase=page([{id:'purchase',kind:'wallet_ledger_entry',ledgerEntryKind:'market_buy',direction:'debit',amountUsdCents:'100'}]);
 const refresh=page([{id:'purchase',kind:'wallet_ledger_entry',amountUsdCents:'100'}]);
 const merged=mergePublicRecords(purchase,refresh)[0];
 expect(merged.accountFlow).toBe('out');expect(ledgerRecordTitle(merged)).toBe('Asset Purchase');
});
it('projects the same directions from an admitted Identity Seal including raw transfer rows',()=>{
 const projection={authority:'verified-identity-portable-state',portableStateVerified:true,owner:{uid:'me'},completeAtSealedHead:true,
  verifiedState:{account:{userId:'me'},wallet:{chatTransfers:[{id:'in',sender_user_id:'other',recipient_user_id:'me',amount_usd_cents:'100'},{id:'out',sender_user_id:'me',recipient_user_id:'other',amount_usd_cents:'200'}],activityEvents:[{id:'credit',kind:'wallet_ledger_entry',direction:'credit',amountUsdCents:'300'}]}}} as unknown as ReceizIdentityAccountProjection;
 const records=projectPersonalHistory(projection).records;
 expect(records.find(r=>r.sourceId==='transfer:in')?.accountFlow).toBe('in');
 expect(records.find(r=>r.sourceId==='transfer:out')?.accountFlow).toBe('out');
 expect(records.find(r=>r.sourceId==='credit')?.accountFlow).toBe('in');
});
