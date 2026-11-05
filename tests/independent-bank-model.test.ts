import {describe,it,expect} from 'vitest';
import {independentState,independentOwners,formatMoney} from '../public/learn/independent-bank-model.js';

describe('independent receiver teaching model',()=>{
 it.each([
  [0,['10000000','0','0'],[100000,0,0]],
  [1,['6000000','4000000','0'],[60000,40000,0]],
  [2,['6000000','1500000','2500000'],[60000,15000,25000]],
 ] as const)('conserves exact native value and its frozen illustrative display at step %s',(step,phi,cents)=>{
  const state=independentState(step),keys=['bankeiz','independent','merchant'] as const;
  expect(keys.map(key=>state.positions[key].phiMicro)).toEqual(phi);
  expect(keys.map(key=>state.positions[key].usdCents)).toEqual(cents);
  expect(keys.map(key=>state.balances[key])).toEqual(cents);
  expect(keys.reduce((sum,key)=>sum+BigInt(state.positions[key].phiMicro),0n)).toBe(10000000n);
  expect(keys.reduce((sum,key)=>sum+state.balances[key],0)).toBe(100000);
  expect(state.totalPhiMicro).toBe('10000000');expect(state.totalCents).toBe(100000);
  expect(state.rail).toBe('SETTLEMENT');expect(state.demonstration).toBe(true);
 });
 it('carries both participant predecessor/successor heads and retains the residual A branch during B to C',()=>{
  const start=independentState(0),first=independentState(1),last=independentState(2),[ab,bc]=last.transitions;
  expect(ab).toMatchObject({sender:'bankeiz',recipient:'independent',amountPhiMicro:'4000000',amountCents:40000,senderPredecessor:start.positions.bankeiz.head,recipientPredecessor:start.positions.independent.head,senderSuccessor:first.positions.bankeiz.head,recipientSuccessor:first.positions.independent.head});
  expect(bc).toMatchObject({sender:'independent',recipient:'merchant',amountPhiMicro:'2500000',amountCents:25000,senderPredecessor:first.positions.independent.head,recipientPredecessor:start.positions.merchant.head,senderSuccessor:last.positions.independent.head,recipientSuccessor:last.positions.merchant.head});
  expect(last.positions.bankeiz).toEqual(first.positions.bankeiz);
  expect(last.positions.bankeiz.head).not.toBe(bc.senderSuccessor);
  for(const transition of last.transitions){
   expect(transition.senderOwnerId).toBe(last.positions[transition.sender].ownerId);expect(transition.recipientOwnerId).toBe(last.positions[transition.recipient].ownerId);
   expect(transition.lineage).toBe(last.lineage);expect(transition.senderPredecessor).not.toBe(transition.senderSuccessor);expect(transition.recipientPredecessor).not.toBe(transition.recipientSuccessor);
   for(const head of [transition.senderPredecessor,transition.senderSuccessor,transition.recipientPredecessor,transition.recipientSuccessor])expect(head).toMatch(/^demo-head-/);
  }
  expect(new Set(last.transitions.map(row=>row.id)).size).toBe(2);
 });
 it('labels the fixed display quote fictional and supplies no funding, live price or redemption claim',()=>{
  const state=independentState(2);
  expect(state.displayQuote).toEqual({fictional:true,usdCentsPerPhi:'10000',purpose:'display-only',live:false,funding:false,redemption:false});
  expect(independentOwners.map(owner=>owner.ownerId)).toEqual(['demo-owner-A','demo-owner-B','demo-owner-C']);
  expect(Object.values(state.positions).every(position=>position.lineage===state.lineage)).toBe(true);
  expect(['bankeiz','independent','merchant'].map(key=>formatMoney(state.balances[key as keyof typeof state.balances]))).toEqual(['$600','$150','$250']);
 });
 it.each([-1,3,1.5,NaN,Infinity,'1',null,undefined,1n])('rejects an invalid demonstration step: %s',value=>{
  expect(()=>Reflect.apply(independentState,undefined,[value])).toThrow('DEMONSTRATION_STEP_INVALID');
 });
 it('returns independent objects and repeated renders never apply another credit',()=>{
  const before=independentState(2),changed=independentState(2);
  changed.positions.bankeiz.phiMicro='999999999';changed.positions.independent.head='invented';changed.balances.merchant=999;
  changed.transitions[0].amountPhiMicro='1';changed.transitions.push({...changed.transitions[0]});
  changed.displayQuote.usdCentsPerPhi='1';
  expect(independentState(2)).toEqual(before);
  expect(independentState(0).transitions).toEqual([]);expect(independentState(1).transitions).toHaveLength(1);expect(independentState(2).transitions).toHaveLength(2);
  expect(Object.isFrozen(independentOwners)).toBe(true);expect(independentOwners.every(Object.isFrozen)).toBe(true);
  expect(()=>Reflect.set(independentOwners[0],'ownerId','invented')).not.toThrow();
  expect(independentOwners[0].ownerId).toBe('demo-owner-A');
 });
});
