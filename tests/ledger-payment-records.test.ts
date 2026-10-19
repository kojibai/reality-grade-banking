import {expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {groupLedgerPaymentRecords,ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
const movement=(id='one',transferId='transfer-one',amount='100')=>parsePublicNetworkPage('wallet',{ok:true,events:[{id,kind:'chat_transfer',transferId,amountUsdCents:amount}]}).records[0];
const execution=(id='execution',transferId='transfer-one',amount='100')=>parsePublicNetworkPage('actions',{ok:true,actions:[{id,actionKind:'wallet.transfer.connect',summary:'Delegated wallet transfer',transferId,amountUsdCents:amount}]}).records[0];
it('keeps the two exact records of one payment together without modifying or duplicating money',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const value=movement(),action=execution(),original=JSON.stringify([action,value]);
 const groups=groupLedgerPaymentRecords([action,value]);expect(groups).toEqual([{record:value,executionRecords:[action]}]);
 expect(ledgerRecordTitle(value)).toBe('Value transfer');expect(ledgerRecordTitle(action)).toBe('Delegated wallet transfer');
 expect(JSON.stringify([action,value])).toBe(original);expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('never pairs records by amount, time, actor, title, or an ambiguous transfer reference',()=>{
 const value=movement(),other=execution('other','different'),conflict=execution('conflict','transfer-one','200');
 expect(groupLedgerPaymentRecords([value,other,conflict])).toHaveLength(3);
 expect(groupLedgerPaymentRecords([value,movement('duplicate'),execution()])).toHaveLength(3);
});
it('preserves separate payments and all original execution witnesses in their own group',()=>{
 const one=movement(),two=movement('two','transfer-two'),a=execution(),b=execution('retry'),c=execution('second','transfer-two');
 expect(groupLedgerPaymentRecords([c,one,a,two,b])).toEqual([{record:one,executionRecords:[a,b]},{record:two,executionRecords:[c]}]);
 expect(ledgerRecordTitle({...one,kind:'sports_card_transfer',title:'Card transferred'})).toBe('Card transferred');
});
it('keeps the exact action transfer reference but excludes unrelated payload fields',()=>{
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'action',actionKind:'wallet.transfer.connect',payload:{transferId:'original-transfer',conversationId:'private-conversation',accessToken:'private-token'}}]}).records[0];
 expect(record.evidence.transferId).toBe('original-transfer');expect(JSON.stringify(record)).not.toContain('private-conversation');expect(JSON.stringify(record)).not.toContain('private-token');
});
it('uses the original native foreign key already carried beneath a public Wallet alias',()=>{
 const value=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'public',kind:'chat_transfer',transferId:'tx:public-alias',createdAt:'2026-05-03T00:00:00Z',amountUsdCents:'100',fundingTransferId:'tx:public-alias',fundingAttribution:{rule:'receiz-card-fifo-cent-intervals',basis:'calculated-attribution',walletDebitId:'debit',transferId:'native-original',amountUsdCents:'100',occurredAt:'2026-05-03T00:00:00.1Z',parts:[{rail:'reserve',amountUsdCents:'100',sources:[{sourceId:'deposit',amountUsdCents:'100',offsetUsdCents:'0',creditAmountUsdCents:'100',occurredAt:'2026-05-01T00:00:00Z'}]}]}}]}).records[0];
 const action=execution('native-action','native-original');expect(groupLedgerPaymentRecords([value,action])).toEqual([{record:value,executionRecords:[action]}]);
 expect(groupLedgerPaymentRecords([{...value,details:{...value.details,fundingTransferId:'wrong-binding'}},action])).toHaveLength(2);
});
