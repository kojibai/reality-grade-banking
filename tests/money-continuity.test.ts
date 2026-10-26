import {expect,it} from 'vitest';
import {mergeMoneyJournalEvent,type MoneyJournalEvent} from '../src/receiz/money-continuity';
import {readMoneyState} from '../src/receiz/money-workspace';
const uid='owner-uid',identity='a'.repeat(64),turn={requestId:'operation-0001',humanText:'Acme owes me $125'};
const commitment={id:'commitment-1',title:'Acme project',direction:'receivable' as const,counterparty:'Acme',amountUsdCents:'12500',dueAt:'2026-10-20T17:00:00.000Z',note:'',status:'open' as const,source:turn,requests:[]};
function event(status='open'):MoneyJournalEvent{return{schema:'bank.money-planning-event.v1',ownerUid:uid,operationId:'operation-0001',data:JSON.stringify({source:turn,fingerprint:'{"tool":"money_record_commitment","args":{}}',receipt:{id:'operation-0001',tool:'money_record_commitment',status:'accepted',summary:'Saved'},commitments:[{...commitment,status}],reviews:[],requests:[]})};}
it('restores exact reported planning into the current device without making it monetary proof',()=>{
 const state=mergeMoneyJournalEvent(readMoneyState(null,identity,uid),event());expect(state.identityDigest).toBe(identity);expect(state.commitments[0]).toEqual(commitment);expect(state.commitments[0]).not.toHaveProperty('verifiedPaidUsdCents');expect(mergeMoneyJournalEvent(state,event()).commitments).toHaveLength(1);
});
it('does not let an older remote open record reopen a locally terminal commitment',()=>{
 const state=mergeMoneyJournalEvent(readMoneyState(null,identity,uid),event());state.commitments[0].status='cancelled';expect(mergeMoneyJournalEvent(state,{...event(),operationId:'operation-0002',data:JSON.stringify({...JSON.parse(event().data),source:{...turn,requestId:'operation-0002'},receipt:{...JSON.parse(event().data).receipt,id:'operation-0002'}})}).commitments[0].status).toBe('cancelled');
});
it('rejects foreign owners and conflicting immutable claims rather than silently overwriting',()=>{
 const state=mergeMoneyJournalEvent(readMoneyState(null,identity,uid),event());expect(()=>mergeMoneyJournalEvent(state,{...event(),ownerUid:'foreign'})).toThrow('OWNER_MISMATCH');const conflict={...event(),operationId:'operation-0002',data:JSON.stringify({...JSON.parse(event().data),source:{...turn,requestId:'operation-0002'},receipt:{...JSON.parse(event().data).receipt,id:'operation-0002'}}).replace('12500','99999')};expect(()=>mergeMoneyJournalEvent(state,conflict)).toThrow('CONFLICT');expect(state.commitments[0].amountUsdCents).toBe('12500');
});
