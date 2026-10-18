import{expect,it}from'vitest';
import{projectLegacyWalletObservation}from'../src/receiz/legacy-wallet-history';
import{historicalWalletUsdRate}from'../src/receiz/historical-wallet';
import{quoteReceizDisplayUsdV122,type ReceizIdentityAccountProjection}from'@receiz/sdk';
import type{WalletObservation}from'../src/receiz/wallet-observation';
const fixture=()=>{
 const end='14692714741688',rate=historicalWalletUsdRate(end),total=quoteReceizDisplayUsdV122('9000000',rate);
 const rows=[{id:'a',created_at:'2026-03-06T00:00:00.000001Z',kai_upulse:'10980447240836',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_phi_micro:'10000000',amount_usd_cents:'1000',balance_after_phi_micro:'10000000',metadata:{source:'stripe_checkout_wallet_deposit'}},{id:'b',created_at:'2026-10-17T00:00:00.000001Z',kai_upulse:end,user_id:'owner',direction:'debit',entry_kind:'chat_transfer',amount_phi_micro:'1000000',amount_usd_cents:'200',balance_after_phi_micro:'9000000',metadata:{}}];
 const projection={authority:'verified-identity-portable-state',portableStateVerified:true,completeAtSealedHead:true,owner:{uid:'owner'},verifiedState:{account:{userId:'owner'},accountStateHead:{kaiUpulse:end},wallet:{ledgerEntries:rows,account:{user_id:'owner',balance_phi_micro:'9000000'},userRollup:{user_id:'owner',balance_phi_micro:'9000000',total_credit_phi_micro:'10000000',total_debit_phi_micro:'1000000'},routeSummary:{quote:{usdPerPhiMicrocents:rate}}},ledger:{entries:[{actorUserId:'owner',kaiUpulse:'10000000000000'}]}}}as unknown as ReceizIdentityAccountProjection;
 const observation={wallet:{userId:'owner',balancePhiMicro:'9000000',totalUsdCents:total,reserveUsdCents:'800',settlementUsdCents:(BigInt(total)-800n).toString()},observedAt:'2026-10-18T14:00:00Z'}as WalletObservation;
 return{projection,observation,rows};
};
it('uses the earliest actual legacy balance without moving its beginning to an earlier unrelated action or login',()=>{
 const f=fixture(),result=projectLegacyWalletObservation(f.projection,f.observation)!;
 expect(result.history?.[0].kaiUPulse).toBe(f.rows[0].kai_upulse);expect(result.history!.length).toBeGreaterThan(500);
 expect(result.history?.at(-1)?.totalUsdCents).toBe(f.observation.wallet.totalUsdCents);
 expect(result.historyBasis?.kind).toBe('legacy-wallet-observations');expect(result.historyBasis?.settlementPhiMicro).toBeUndefined();
 expect(result.wallet).toBe(f.observation.wallet);
});
it.each(['foreign','incomplete','gap','reserve','gross','duplicate','coordinate','unsafe','order'])('preserves the wallet and refuses unsupported %s history',kind=>{
 const f=fixture();if(kind==='foreign')f.rows[0].user_id='other';if(kind==='incomplete')f.projection.completeAtSealedHead=false;if(kind==='gap')f.rows[1].balance_after_phi_micro='8000000';if(kind==='reserve')f.observation.wallet.reserveUsdCents='999';if(kind==='gross')f.observation.wallet.totalUsdCents='999';if(kind==='duplicate')f.rows[1].id='a';if(kind==='coordinate')f.rows[1].kai_upulse='1';if(kind==='unsafe')(f.rows[0]as any).amount_phi_micro=Number.MAX_SAFE_INTEGER+1;if(kind==='order')f.rows[1].created_at='2025-01-01T00:00:00Z';
 expect(projectLegacyWalletObservation(f.projection,f.observation)).toBeNull();
});

it('uses exact explicit Reserve slices before source qualification and clamps each debit',()=>{
 const f=fixture();(f.rows[0].metadata as Record<string,unknown>).settledUsdCents='0';f.observation.wallet.reserveUsdCents='0';f.observation.wallet.settlementUsdCents=f.observation.wallet.totalUsdCents;
 const result=projectLegacyWalletObservation(f.projection,f.observation)!;expect(result.history?.every(point=>point.reserveUsdCents==='0')).toBe(true);
});
it('keeps every period distinct over retained observations without replaying a database',async()=>{
 const {chartPeriodPoints}=await import('../src/core/chart-history'),f=fixture(),result=projectLegacyWalletObservation(f.projection,f.observation)!;
 const begins=['ALL','1D','1W','1M','3M','1Y'].map(period=>chartPeriodPoints(result.history!,period as any)[0].kaiUPulse);
 expect(new Set(begins).size).toBeGreaterThan(4);
});
it('preserves the legacy read basis and first observation through private offline cache decoding',async()=>{
 const {readWalletObservation}=await import('../src/receiz/wallet-observation'),{BANK_APPLICATION_ID}=await import('../src/receiz/config'),f=fixture(),result=projectLegacyWalletObservation(f.projection,f.observation)!;
 const binding={keyId:'key',artifactSha256:'a'.repeat(64)},read=readWalletObservation({...result,schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:BANK_APPLICATION_ID,...binding},binding)!;
 expect(read.history?.[0]).toEqual(result.history?.[0]);expect(read.historyBasis?.kind).toBe('legacy-wallet-observations');
});

it('does not substitute a computed rate for a missing explicit carried endpoint quote',()=>{
 const f=fixture();delete(f.projection.verifiedState as any).wallet.routeSummary.quote;expect(projectLegacyWalletObservation(f.projection,f.observation)).toBeNull();
});

it('matches the legacy source rule for explicit slice text containing a trailing newline',()=>{
 const f=fixture();(f.rows[0].metadata as Record<string,unknown>).settledUsdCents='0\n';
 const result=projectLegacyWalletObservation(f.projection,f.observation)!;expect(result.history?.[0].reserveUsdCents).toBe('1000');
 f.rows[0].amount_phi_micro+='\n';expect(projectLegacyWalletObservation(f.projection,f.observation)).toBeNull();
});

it('merges earlier reconciled observations while preserving a later same-head dollar quote and current wallet',async()=>{
 const {mergeCarriedWalletHistory}=await import('../src/receiz/carried-wallet-history'),f=fixture();
 f.observation.wallet.kaiUpulse=f.rows[1].kai_upulse;const wallet={...f.observation.wallet,totalUsdCents:(BigInt(f.observation.wallet.totalUsdCents)+200n).toString(),settlementUsdCents:(BigInt(f.observation.wallet.settlementUsdCents)+200n).toString()};
 const current={...f.observation,wallet,history:[{userId:'owner',at:'2026-10-18T13:00:00Z',kaiUPulse:'14692715741688',totalUsdCents:wallet.totalUsdCents,reserveUsdCents:wallet.reserveUsdCents,settlementUsdCents:wallet.settlementUsdCents}]};
 const merged=mergeCarriedWalletHistory(current,f.observation,f.projection);expect(merged.wallet).toBe(wallet);expect(merged.history?.[0].kaiUPulse).toBe(f.rows[0].kai_upulse);expect(merged.history?.at(-1)?.totalUsdCents).toBe(wallet.totalUsdCents);
 expect(mergeCarriedWalletHistory({...current,wallet:{...wallet,balancePhiMicro:'1'}},f.observation,f.projection).history).toBe(current.history);
 expect(mergeCarriedWalletHistory({...current,source:'local-note-head'},f.observation,f.projection).history).toBe(current.history);
});
