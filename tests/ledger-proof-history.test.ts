import {expect,it} from 'vitest';
import {readLedgerProofHistory} from '../src/receiz/ledger-proof-history';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {receiptLink,readReceiptLink} from '../src/receiz/ledger-receipts';
const h=(n:string)=>n.repeat(64);
const node=(id:string,parents:string[],pulse:string)=>({schema:'receiz.proof-history-node.v1',artifactId:'object',nodeDigest:h(id),parentDigests:parents.map(h),kaiPulse:pulse,receiptDigest:h('f'),event:parents.length?{type:'ownership.transition',fromOwnerReceizId:'a.receiz.id',toOwnerReceizId:'b.receiz.id'}:{type:'ownership.transition',fromOwnerReceizId:null,toOwnerReceizId:'a.receiz.id'},namespaceData:{'receiz.kks-v1':{kaiPulse:pulse,kaiUpulse:pulse+'000001'}},receipt:{privateKey:'not-for-display'}});
const history=()=>({schema:'receiz.proof-history.v1',artifactId:'object',rootDigest:h('d'),historyDigest:h('e'),headDigests:[h('b')],nodes:[node('b',['a'],'120'),node('a',[],'100')]});
it('reads the native DAG from genesis in causal order, preserving parent links and exact coordinates',()=>{
 const result=readLedgerProofHistory(history())!;expect(result.nodes.map(n=>n.nodeDigest)).toEqual([h('a'),h('b')]);expect(result.nodes[0].kaiUpulse).toBe('100000001');expect(JSON.stringify(result)).not.toContain('not-for-display');
 const r=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'tx',actionKind:'proof_transfer',objectId:'object',pulse:120,proofHistory:history()}]}).records[0];
 expect(ledgerFundingTrace(r)).toMatchObject({basis:'proof-object-history',sources:[{kind:'proof_genesis'}],steps:[{kaiPulse:'100'},{kaiPulse:'120',parentDigests:[h('a')]}]});
 const receipt=readReceiptLink(receiptLink(r)!);expect(ledgerFundingTrace({...r,details:receipt.details!})).toEqual(ledgerFundingTrace(r));
});
it('refuses missing parents, disconnected nodes, cycles and another object rather than inventing continuity',()=>{
 const missing=history();missing.nodes[0].parentDigests=[h('c')];expect(readLedgerProofHistory(missing)).toBeUndefined();
 const cycle=history();cycle.nodes[1].parentDigests=[h('b')];expect(readLedgerProofHistory(cycle)).toBeUndefined();
 const r=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'tx',actionKind:'proof_transfer',objectId:'different',pulse:120,proofHistory:history()}]}).records[0];expect(ledgerFundingTrace(r).steps).toEqual([]);
});
it('does not include future object states in the selected event trace',()=>{
 const r=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'tx',actionKind:'proof_transfer',objectId:'object',pulse:110,proofHistory:history()}]}).records[0];expect(ledgerFundingTrace(r).steps.map(s=>s.kaiPulse)).toEqual(['100']);
});
it('respects the exact micro-pulse boundary for states within the same pulse',()=>{
 const r=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'tx',actionKind:'proof_transfer',objectId:'object',pulse:120,kaiUpulse:'120000000',proofHistory:history()}]}).records[0];expect(ledgerFundingTrace(r).steps.map(s=>s.kaiPulse)).toEqual(['100']);
});
