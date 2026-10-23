import {expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {groupLedgerPaymentRecords,ledgerRecordTitle} from '../src/receiz/ledger-payment-records';
const movement=(id='one',transferId='transfer-one',amount='100')=>parsePublicNetworkPage('wallet',{ok:true,events:[{id,kind:'chat_transfer',transferId,amountUsdCents:amount}]}).records[0];
const execution=(id='execution',transferId='transfer-one',amount='100')=>parsePublicNetworkPage('actions',{ok:true,actions:[{id,actionKind:'wallet.transfer.connect',summary:'Delegated Wallet Transfer',transferId,amountUsdCents:amount}]}).records[0];
it('keeps the two exact records of one payment together without modifying or duplicating money',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const value=movement(),action=execution(),original=JSON.stringify([action,value]);
 const groups=groupLedgerPaymentRecords([action,value]);expect(groups).toEqual([{record:value,executionRecords:[action]}]);
 expect(ledgerRecordTitle(value)).toBe('Money Transfer');expect(ledgerRecordTitle(action)).toBe('Delegated Wallet Transfer');
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
 expect(ledgerRecordTitle({...one,kind:'sports_card_transfer',title:'Card transferred'})).toBe('Collectible Transfer');
});
it('keeps ambiguous public aliases or conflicting money separate even when one reference agrees',()=>{
 const value=movement('one','tx:'+'a'.repeat(24)),action={...execution('action','native'),evidence:{transferId:'native',publicTransferId:value.evidence.transferId}};
 expect(groupLedgerPaymentRecords([value,action])).toEqual([{record:value,executionRecords:[action]}]);
 expect(groupLedgerPaymentRecords([value,movement('duplicate',value.evidence.transferId),action])).toHaveLength(3);
 expect(groupLedgerPaymentRecords([value,movement('native-other','native'),action])).toHaveLength(3);
 expect(groupLedgerPaymentRecords([value,{...action,amountUsdCents:'101'}])).toHaveLength(2);
 expect(groupLedgerPaymentRecords([value,{...action,authority:'account-source-projection'}])).toHaveLength(2);
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
it('names Wallet activity by its actual recorded purpose rather than its database record type',()=>{
 const title=(row:Record<string,unknown>)=>ledgerRecordTitle(parsePublicNetworkPage('wallet',{ok:true,events:[{id:'event',kind:'wallet_ledger_entry',...row}]}).records[0]);
 for(const [kind,label] of Object.entries({market_buy:'Asset Purchase',market_sell:'Asset Sale',sports_pack_purchase:'Pack Purchase',signal_pack_purchase:'Pack Purchase',prediction_wager:'Prediction Placed',prediction_payout:'Prediction Payout',prediction_refund:'Prediction Refund',signal_card_reward_seal:'Collectible Created'}))expect(title({ledgerEntryKind:kind})).toBe(label);
 expect(title({ledgerEntryKind:'future_kind'})).toBe('Balance Update');
 expect(title({ledgerEntryKind:'admin_adjustment',metadata:{source:'bank_connected_note_allocate'}})).toBe('Note Created');
 expect(title({ledgerEntryKind:'note_claim',metadata:{source:'bank_connected_note_cancel'}})).toBe('Note Refunded');
 expect(title({kind:'note_claim'})).toBe('Note Deposited');
 expect(title({kind:'note_mint'})).toBe('Note Created');
 expect(title({kind:'reserve_credit'})).toBe('Money Added');
 expect(title({kind:'reserve_credit',reserveCreditKind:'payment'})).toBe('Payment Received');
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'purchase',kind:'wallet_ledger_entry',ledgerEntryKind:'market_buy'}]}).records[0];
 expect(record.kind).toBe('wallet_ledger_entry');expect(record.details?.ledgerEntryKind).toBe('market_buy');
});
it('uses familiar public action names while preserving authored titles and original source fields',()=>{
 const rows=parsePublicNetworkPage('actions',{ok:true,actions:[
  {id:'purchase',actionKind:'market.share.buy',summary:'market share buy'},
  {id:'sale',actionKind:'market.share.sell',summary:'market share sell'},
  {id:'login',actionKind:'auth.login.receiz_id',summary:'Sign-in via Receiz ID'},
  {id:'transfer',actionKind:'receiz.sports_arena.card_transfer',summary:'MLB Sports Card current owner transferred'},
  {id:'unknown',actionKind:'future.action'},
 ]}).records;
 const original=JSON.stringify(rows);
 expect(rows.map(ledgerRecordTitle)).toEqual(['Asset Purchase','Asset Sale','Signed In','Collectible Transfer','Recorded Activity']);
 expect(JSON.stringify(rows)).toBe(original);
 const authored={...rows[0],source:'proofs' as const,title:'a quiet moment',kind:'proof recorded'};
 expect(ledgerRecordTitle(authored)).toBe('a quiet moment');
 expect(ledgerRecordTitle({...rows[0],kind:'custom.event',title:'A specific recorded event'})).toBe('A specific recorded event');
});
it('gives Reserve, Settlement and combined Notes the same clear creation, deposit and refund names',()=>{
 for(const rail of ['reserve','settlement','composite']){
  const records=parsePublicNetworkPage('wallet',{ok:true,events:[
   {id:'created',kind:'note_mint',rail,summary:'note mint'},
   {id:'deposited',kind:'note_claim',rail,summary:'note claim'},
   {id:'refunded',kind:'note_claim',rail,metadata:{source:'bank_connected_note_cancel'}},
   {id:'allocated',kind:'wallet_ledger_entry',ledgerEntryKind:'offline_cash_allocate',rail},
   {id:'credited',kind:'wallet_ledger_entry',ledgerEntryKind:'offline_note_redeem',rail},
   {id:'returned',kind:'wallet_ledger_entry',ledgerEntryKind:'offline_cash_cancel',rail},
  ]}).records;
  const original=JSON.stringify(records);
  expect(records.map(ledgerRecordTitle)).toEqual(['Note Created','Note Deposited','Note Refunded','Note Created','Note Deposited','Note Refunded']);
  expect(JSON.stringify(records)).toBe(original);
 }
});
