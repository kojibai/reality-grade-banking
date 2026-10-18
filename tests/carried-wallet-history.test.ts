import{expect,it}from'vitest';
import{projectCarriedWalletHistory}from'../src/receiz/carried-wallet-history';
import type{ReceizIdentityAccountProjection}from'@receiz/sdk';
import type{WalletObservation}from'../src/receiz/wallet-observation';
import{readCarriedWalletObservation}from'../src/receiz/wallet-observation';
import{createReceizIdIdentity,appendReceizIdentityPortableState,projectReceizIdentityAccount}from'@receiz/sdk';
const fixture=()=>({projection:{authority:'verified-identity-portable-state',portableStateVerified:true,completeAtSealedHead:true,owner:{uid:'owner'},verifiedState:{account:{userId:'owner'},accountStateHead:{kaiUpulse:'10000000'},wallet:{routeSummary:{quote:{usdPerPhiMicrocents:'4092328496'}},ledgerEntries:[{id:'funded',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_phi_micro:'2000000',amount_usd_cents:'1000',kai_upulse:'2000000',metadata:{}},{id:'received',user_id:'owner',direction:'credit',entry_kind:'chat_transfer',amount_phi_micro:'1000000',amount_usd_cents:'5024',kai_upulse:'3000000',metadata:{rail:'settlement'}}]},ledger:{entries:[{actorUserId:'owner',subjectUserId:null,kaiUpulse:'1000000'}]}}}as unknown as ReceizIdentityAccountProjection,observation:{observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'owner',reserveUsdCents:'1000',settlementUsdCents:'4092',totalUsdCents:'5092',balancePhiMicro:'3000000'}}as WalletObservation});
it('builds offline history directly from a complete SDK-admitted same-owner Identity Seal',()=>{
 const f=fixture(),history=projectCarriedWalletHistory(f.projection,f.observation)!;
 expect(history[0]).toMatchObject({kaiUPulse:'1000000',totalUsdCents:'0'});
 expect(history.find(point=>point.kaiUPulse==='2000000')).toMatchObject({reserveUsdCents:'1000',settlementUsdCents:'0'});
 expect(history.find(point=>point.kaiUPulse==='3000000')?.settlementUsdCents).not.toBe('4092');
 expect(history.at(-1)).toMatchObject({totalUsdCents:'5092',reserveUsdCents:'1000',settlementUsdCents:'4092'});
});
it.each(['incomplete','foreign','rail','balance','duplicate','future','missing-source'])('does not invent a complete timeline for %s',reason=>{
 const f=fixture(),state=f.projection.verifiedState as any;
 if(reason==='incomplete')f.projection.completeAtSealedHead=false;
 if(reason==='foreign')f.projection.owner.uid='other';
 if(reason==='rail')delete state.wallet.ledgerEntries[1].metadata.rail;
 if(reason==='balance')f.observation.wallet.balancePhiMicro='1';
 if(reason==='duplicate')state.wallet.ledgerEntries.push(state.wallet.ledgerEntries[0]);
 if(reason==='future')state.wallet.ledgerEntries[1].kai_upulse='11000000';
 if(reason==='missing-source')delete state.wallet.ledgerEntries;
 expect(projectCarriedWalletHistory(f.projection,f.observation)).toBeNull();
});
it('supports exact raw portable bigint JSON numbers without rounding unsafe values',()=>{
 const f=fixture(),state=f.projection.verifiedState as any;
 for(const row of state.wallet.ledgerEntries)for(const field of ['amount_phi_micro','amount_usd_cents','kai_upulse'])row[field]=Number(row[field]);
 expect(projectCarriedWalletHistory(f.projection,f.observation)?.at(-1)?.totalUsdCents).toBe('5092');
 state.wallet.ledgerEntries[0].amount_phi_micro=Number.MAX_SAFE_INTEGER+1;
 expect(projectCarriedWalletHistory(f.projection,f.observation)).toBeNull();
});
it('rejects impossible intermediate gross Phi even when both final rails reconcile',()=>{
 const f=fixture(),state=f.projection.verifiedState as any;
 const reserve=(id:string,kai:string,direction:string,phi:string,cents:string)=>({id,kai_upulse:kai,user_id:'owner',direction,entry_kind:'admin_adjustment',amount_phi_micro:phi,amount_usd_cents:cents,metadata:{}});
 state.wallet.ledgerEntries=[reserve('first','2000000','credit','1','1000'),reserve('overdraw','3000000','debit','2','100'),reserve('last','4000000','credit','3','100')];
 f.observation.wallet={...f.observation.wallet,balancePhiMicro:'2',settlementUsdCents:'0',totalUsdCents:'1000'};
 expect(projectCarriedWalletHistory(f.projection,f.observation)).toBeNull();
});
it('rejects Settlement units exceeding gross holdings at an intermediate coordinate',()=>{
 const f=fixture(),state=f.projection.verifiedState as any;
 state.wallet.ledgerEntries.push({...state.wallet.ledgerEntries[0],id:'overdraw',kai_upulse:'4000000',direction:'debit',amount_phi_micro:'2500000',amount_usd_cents:'100'});
 state.wallet.ledgerEntries.push({...state.wallet.ledgerEntries[0],id:'return',kai_upulse:'5000000',amount_phi_micro:'2500000',amount_usd_cents:'100'});
 expect(projectCarriedWalletHistory(f.projection,f.observation)).toBeNull();
});

it('refuses a foreign activity as the opening of this account history',()=>{
 const f=fixture(),state=f.projection.verifiedState as any;
 state.ledger.entries[0].actorUserId='foreign';
 expect(projectCarriedWalletHistory(f.projection,f.observation)).toBeNull();
 state.ledger.entries[0].subjectUserId='owner';
 expect(projectCarriedWalletHistory(f.projection,f.observation)?.[0]?.kaiUPulse).toBe('1000000');
 state.ledger.entries[0]={actor_user_id:'owner',subject_user_id:null,kai_upulse:'1000000'};
 expect(projectCarriedWalletHistory(f.projection,f.observation)?.[0]?.kaiUPulse).toBe('1000000');
});
it('reopens an SDK-signed synthetic carrier, ignores unsigned alias changes and rejects a broken proof with v129',async()=>{
 // Throwaway local signature fixture only: no account API, money or externally
 // backed balance claim. This tests the carried display signature boundary.
 const identity=await createReceizIdIdentity(),f=fixture(),owner=identity.keyFile.owner.uid;
 const state=structuredClone(f.projection.verifiedState)as any;
 state.account.userId=owner;state.exportedAt=new Date().toISOString();state.accountStateHead.kaiPulse='10';
 state.wallet.ledgerEntries.forEach((row:{user_id:string})=>{row.user_id=owner;});
 state.ledger.entries[0].actorUserId=owner;
 state.wallet.routeSummary={...state.wallet.routeSummary,userId:owner,balanceUsd:'50.92',balancePhiMicro:'3000000',valueStates:{settledBalanceUsdCents:'1000',ecosystemBalanceUsdCents:'4092'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'3000000'}};
 state.portableCompleteness={schema:'receiz.account.portable-completeness.v2',completeAtSealedHead:true,accountStateHead:{...state.accountStateHead},domains:Object.fromEntries(['profile','showcase','actionLedger','calendar','contacts','wallet','market','sports','signalVault','media','preferences','proofHistory'].map(domain=>[domain,true]))};
 const key=await appendReceizIdentityPortableState({keyFile:identity.keyFile,schema:'receiz.account.state.v3',snapshot:state});
 const projection=await projectReceizIdentityAccount(key);
 expect(projection.completeAtSealedHead).toBe(true);
 const known=readCarriedWalletObservation(projection)!;
 expect(projectCarriedWalletHistory(projection,known)?.[0]).toMatchObject({userId:owner,kaiUPulse:'1000000',totalUsdCents:'0'});
 // The materialized snapshot is a derived alias; v129 reopens the exact signed
 // segments instead. Changing that alias must not change admitted history.
 const alias=structuredClone(key);(alias.portableState!.snapshot as any).wallet.ledgerEntries[0].amount_usd_cents='9999';
 const reopened=await projectReceizIdentityAccount(alias);
 expect((reopened.verifiedState as any).wallet.ledgerEntries[0].amount_usd_cents).toBe('1000');
 const changed=structuredClone(key);changed.portableState!.proof!.digestSha256Hex='0'.repeat(64);
 const rejected=await projectReceizIdentityAccount(changed);
 expect(rejected.portableStateVerified).toBe(false);expect(readCarriedWalletObservation(rejected)).toBeNull();
 expect(projectCarriedWalletHistory(rejected,known)).toBeNull();
});
