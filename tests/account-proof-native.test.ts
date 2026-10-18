import {describe,it,expect} from 'vitest';
import {inspectAccountStatement} from '../src/receiz/account-proof';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
const h=(c:string)=>c.repeat(64);
function statement(){return{schema:'bankeiz.public-account-statement.v2',applicationId:BANK_APPLICATION_ID,domain:'receiz.bank.native-account-statement.root-signature.v2',issuerRootKid:'shape-only-test',rootSignature:{kid:'shape-only-test',alg:'Ed25519',sig:'a'.repeat(86)},
 account:{receizId:'source.receiz.id',keyId:h('a'),alg:'Ed25519',publicKeyRawB64u:'AQID'},
 checkpoint:{accountHead:h('d'),identityBindingDigest:h('b'),genesisHead:h('c'),historyHead:h('e'),transactionCount:2,kaiUPulse:'120',reserveUsdCents:'600',settlementPhiMicro:'0',balancePhiMicro:'3000000',usdPerPhiMicrocents:'400000000',historyDigest:h('f')},
 transactions:[{sequence:1,transactionId:'deposit',eventDigest:h('d'),previousEventDigest:h('c'),kaiUPulse:'100',kind:'deposit',description:'Reserve funded.',reserveDeltaUsdCents:'1000',settlementDeltaPhiMicro:'0',balanceDeltaPhiMicro:'5000000'},
 {sequence:2,transactionId:'payment',eventDigest:h('e'),previousEventDigest:h('d'),kaiUPulse:'110',kind:'payment-sent',description:'Value sent.',reserveDeltaUsdCents:'-400',settlementDeltaPhiMicro:'0',balanceDeltaPhiMicro:'-2000000'}]};}
describe('native account statement projection inspection',()=>{
 it('reconciles gross Phi and fixed Reserve without rewriting history on a quote change',()=>{
  const value=statement();expect(inspectAccountStatement(value)).toEqual(value);
  const next=statement();next.checkpoint.usdPerPhiMicrocents='800000000';expect(inspectAccountStatement(next).transactions).toEqual(value.transactions);
  const phantom=statement();phantom.checkpoint.settlementPhiMicro='1500000';expect(()=>inspectAccountStatement(phantom)).toThrow(/BALANCE/);
 });
 it('refuses unmatched Phi, denomination, history and private extra fields',()=>{
  const bad=statement();bad.transactions[1].balanceDeltaPhiMicro='-6000000';expect(()=>inspectAccountStatement(bad)).toThrow(/BALANCE/);
  const badReserve=statement();badReserve.checkpoint.reserveUsdCents='601';expect(()=>inspectAccountStatement(badReserve)).toThrow(/BALANCE/);
  const privateValue={...statement(),signingKey:'must never be public'};expect(()=>inspectAccountStatement(privateValue)).toThrow(/PRIVATE/);
 });
 it('preserves an acquired identity coordinate without backdating later financial entries',()=>{
  const value=statement();
  value.transactions.splice(1,0,{sequence:2,transactionId:'opened',eventDigest:h('1'),previousEventDigest:h('d'),kaiUPulse:'50',kind:'account-opened',description:'Account opened.',reserveDeltaUsdCents:'0',settlementDeltaPhiMicro:'0',balanceDeltaPhiMicro:'0'});
  value.transactions[2].sequence=3;value.transactions[2].previousEventDigest=h('1');value.checkpoint.transactionCount=3;
  expect(inspectAccountStatement(value).transactions[1].kaiUPulse).toBe('50');
  const backdated=structuredClone(value);backdated.transactions[2].kaiUPulse='75';
  expect(()=>inspectAccountStatement(backdated)).toThrow(/HISTORY/);
  const nonzero=structuredClone(value);nonzero.transactions[1].reserveDeltaUsdCents='1';
  expect(()=>inspectAccountStatement(nonzero)).toThrow(/HISTORY/);
  const unknown=structuredClone(value);unknown.transactions[1].kind='unknown';
  expect(()=>inspectAccountStatement(unknown)).toThrow(/HISTORY/);
 });
});

it('v3 preserves cash reconciliation while binding separately held asset and value components to a closed frontier',async()=>{
 const base=statement(),value={...base,schema:'bankeiz.public-account-statement.v3',sourceFrontier:{schema:'receiz.bank.account-source-frontier.v1',authorizationHead:h('1'),walletHead:h('2'),lawfulInventoryHead:h('3'),accountHistoryHead:base.checkpoint.historyHead,assetHistoryDigest:h('4'),assetHeads:[{assetId:h('5'),sourceSha256:h('6')}],artifactSourceHead:null,offlineSourceHead:null},components:{lawfulValues:[{membershipId:'lawful:one',admissionDigest:h('7'),valueHeadDigest:null,settlementPhiMicro:'900'}],assets:[{assetId:h('5'),name:'Native units',symbol:'UNIT',description:'Current\nsource',linkedProofDigest:null,supplyMicro:'10000000',quantityMicro:'2000000',backingRail:'reserve',backingPhiMicro:'1000000',backingUsdCents:'200',status:'active',issuanceSourceSha256:h('8'),headSourceSha256:h('6')}],assetOffers:[],artifactIntrinsicPhiMicro:'0',offlineLockedPhiMicro:'0',offlineLockedUsdCents:'0'}};
 expect(inspectAccountStatement(value).checkpoint.balancePhiMicro).toBe('3000000');
 expect(inspectAccountStatement(value).components?.lawfulValues[0].settlementPhiMicro).toBe('900');
 const missing=structuredClone(value);delete (missing as Partial<typeof value>).components;expect(()=>inspectAccountStatement(missing)).toThrow(/PRIVATE_OR_UNSUPPORTED/);
 const detached=structuredClone(value);detached.components.assets[0].headSourceSha256=h('9');expect(()=>inspectAccountStatement(detached)).toThrow(/COMPONENTS/);
 const inflated=structuredClone(value);inflated.components.assets[0].quantityMicro='10000001';expect(()=>inspectAccountStatement(inflated)).toThrow(/COMPONENTS/);
 const privateValue={...value,components:{...value.components,identitySeal:'private'}};expect(()=>inspectAccountStatement(privateValue)).toThrow(/PRIVATE_OR_UNSUPPORTED/);
 const fake=structuredClone(value);fake.checkpoint.balancePhiMicro='3000900';expect(()=>inspectAccountStatement(fake)).toThrow(/BALANCE/);
 const {verifyBankNativeAccountStatementSignature}=await import('../src/receiz/account-proof-signature');
 expect(await verifyBankNativeAccountStatementSignature(value,BANK_APPLICATION_ID)).toBeNull();
});
