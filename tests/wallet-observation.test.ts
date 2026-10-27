import { expect, it } from 'vitest';
import { readWalletObservation } from '../src/receiz/wallet-observation';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
it('restores only the exact identity-bound, consistent private source observation', () => {
  const binding = { keyId: 'key-a', artifactSha256: 'a'.repeat(64) }, input = { schema: 'receiz.bank.private-wallet-observation.v1', authority: 'read-only-observation', applicationId: BANK_APPLICATION_ID, ...binding, observedAt: '2026-10-13T20:00:00Z', wallet: { userId: 'same-user', totalUsdCents: '300', reserveUsdCents: '100', settlementUsdCents: '200', balancePhiMicro: '1000' } };
  expect(readWalletObservation(input, binding)?.wallet.totalUsdCents).toBe('300');
  expect(readWalletObservation(input, { ...binding, keyId: 'other-key' })).toBeNull();
  expect(readWalletObservation({ ...input, wallet: { ...input.wallet, totalUsdCents: '99999' } }, binding)).toBeNull();
  expect(readWalletObservation({ ...input, authority: 'funding-authority' }, binding)).toBeNull();
});
it('retains identity-bound deterministic chart samples as display history through offline restoration',()=>{
  const binding={keyId:'key',artifactSha256:'a'.repeat(64)};
  const point={userId:'owner',at:'2026-10-13T19:00:00Z',kaiUPulse:'14692714000000',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',valuation:'deterministic-v129'};
  const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet:{userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000'},history:[point]};
  expect(readWalletObservation(input,binding)?.history).toEqual([point]);
  expect(readWalletObservation({...input,history:[{...point,valuation:'financial-authority'}]},binding)?.history).toBeUndefined();
  expect(readWalletObservation({...input,history:[{...point,userId:'foreign'}]},binding)?.history).toBeUndefined();
});
it('does not turn a signer-authenticated foreign placement into an independently bound wallet', async () => {
  const { readCarriedWalletObservation } = await import('../src/receiz/wallet-observation');
  const projection = { portableStateVerified: true, authority: 'verified-identity-portable-state', owner: { uid: 'local-device' }, verifiedState: { account: { userId: 'foreign' }, exportedAt: '2026-10-14T12:00:00Z', wallet: { routeSummary: { userId: 'foreign', balanceUsd: '1.00', balancePhiMicro: '10', valueStates: { settledBalanceUsdCents: '0', ecosystemBalanceUsdCents: '100' }, sync: {}, rollup: {} } } } } as unknown as import('@receiz/sdk').ReceizIdentityAccountProjection;
  expect(readCarriedWalletObservation(projection)).toBeNull();
  projection.owner.uid = 'foreign';
  expect(readCarriedWalletObservation(projection)?.wallet.totalUsdCents).toBe('100');
});

it('retains full display coverage only when every same-owner history point survives decoding',()=>{
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},point={userId:'owner',at:'2026-10-13T19:00:00Z',kaiUPulse:'1000000',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200'};
 const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet:{userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000'},history:[point],historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'1000000',endKaiUPulse:'1000000',retainedStateSha256:'b'.repeat(64)}};
 expect(readWalletObservation(input,binding)?.historyBasis).toEqual(input.historyBasis);
 expect(readWalletObservation({...input,history:[point,{...point,userId:'foreign'}]},binding)?.historyBasis).toBeUndefined();
 expect(readWalletObservation({...input,history:Array.from({length:4097},()=>point)},binding)?.historyBasis).toBeUndefined();
});

it('decodes explicit native scope without promoting old caches and rejects unknown markers',()=>{
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)};
 const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet:{userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000'}};
 for(const walletScope of ['native-full','native-cash-only'])expect(readWalletObservation({...input,walletScope},binding)?.walletScope).toBe(walletScope);
 expect(readWalletObservation(input,binding)?.wallet.totalUsdCents).toBe('300');expect(readWalletObservation(input,binding)?.walletScope).toBeUndefined();
 expect(readWalletObservation({...input,walletScope:'native-guess'},binding)).toBeNull();
});

it('retains an exact quote-hold tuple and refuses malformed or foreign quote markers',()=>{
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},quoteHold={schema:'bank.wallet-quote-hold.v1',userId:'owner',balancePhiMicro:'1000',reserveUsdCents:'100',kaiUpulse:'2000000',pulse:'2'};
 const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet:{userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000'},quoteHold};
 expect(readWalletObservation(input,binding)?.quoteHold).toEqual(quoteHold);
 for(const invalid of [{...quoteHold,schema:'unknown'},{...quoteHold,userId:'foreign'},{...quoteHold,balancePhiMicro:'-1'},{...quoteHold,kaiUpulse:'unknown'},{...quoteHold,extra:true},null])expect(readWalletObservation({...input,quoteHold:invalid},binding)).toBeNull();
});
it('retains exact Phi fields and refuses a stale split without discarding the known dollar observation',()=>{
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},wallet={userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000',reservePhiMicro:'123',settlementPhiMicro:'877'};
 const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet};
 expect(readWalletObservation(input,binding)?.wallet).toMatchObject({reservePhiMicro:'123',settlementPhiMicro:'877'});
 expect(readWalletObservation({...input,wallet:{...wallet,settlementPhiMicro:'999'}},binding)?.wallet).toMatchObject({totalUsdCents:'300',reservePhiMicro:null,settlementPhiMicro:null});
});
it('projects source-known native split immediately from a complete retained basis without rediscovery',()=>{
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},wallet={userId:'owner',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'2100002',projectionComplete:true};
 const history=['1000000','2000000'].map(kai=>({userId:'owner',at:'2026-10-13T19:00:00Z',kaiUPulse:kai,totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200'}));
 const input={schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding,observedAt:'2026-10-13T20:00:00Z',wallet,walletScope:'native-full',history,historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'1000000',endKaiUPulse:'2000000',settlementPhiMicro:'2000001',balancePhiMicro:'2100002',reserveUsdCents:'100',retainedStateSha256:'b'.repeat(64)}};
 expect(readWalletObservation(input,binding)?.wallet).toMatchObject({settlementPhiMicro:'2000001',reservePhiMicro:'100001'});
 expect(readWalletObservation({...input,historyBasis:{...input.historyBasis,balancePhiMicro:'2100003'}},binding)?.wallet.settlementPhiMicro).toBeUndefined();
});
