import {beforeEach,expect,it,vi} from 'vitest';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES} from '../src/receiz/config';
import {openCanonicalIdentity,importNativeIdentity} from '../src/receiz/native-identity';
import type {WalletObservation} from '../src/receiz/wallet-observation';
// Integration sequencing only. The independent Chrome test opens real v129
// native originals with the actual verifier and encrypted IndexedDB store.
const p=vi.hoisted(()=>({known:null as WalletObservation|null,projection:null as unknown,device:vi.fn(),restore:vi.fn(),retain:vi.fn(),proof:vi.fn(),continueId:vi.fn(),wallet:vi.fn(),save:vi.fn(),request:vi.fn()}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>p.known,saveWalletObservation:p.save,saveDeviceIdentity:p.device}));
vi.mock('../src/receiz/account-ledger',async original=>({...await original<typeof import('../src/receiz/account-ledger')>(),createLocalAccountLedger:()=>({restore:p.restore,retain:p.retain})}));
vi.mock('../src/receiz/account-proof',async original=>({...await original<typeof import('../src/receiz/account-proof')>(),readAccountProof:p.proof}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'fixture-key',artifactSha256:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({owner:{uid:'owner',username:'owner'},issuedAt:'2026-10-13T00:00:00Z',keyId:'fixture-key',crypto:{}}),projectReceizIdentityAccount:async()=>p.projection??({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:100,uPulse:'100000000'}),sha256ReceizBytes:async()=> 'a'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:({accessToken,applicationId=BANK_APPLICATION_ID}:{accessToken?:string;applicationId?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_READ_SCOPES]},connect:{wallet:p.wallet},request:p.request}:{identity:{continueReceizId:p.continueId,signLoginProof:async()=>({}),exchangeProofAuthority:async()=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:[...BANK_READ_SCOPES],accessToken:'fixture-only',expiresAtKai:200})}},
})}));
const observation=(reserve='600',kai='100000002'):WalletObservation=>({observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'bound-user',totalUsdCents:reserve,reserveUsdCents:reserve,settlementUsdCents:'0',balancePhiMicro:'3000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:kai}});
const proof={sourceDigest:'b'.repeat(64),statement:{schema:'bankeiz.public-account-statement.v2'}};
const carriedProjection=()=> ({authority:'verified-identity-portable-state',portableStateVerified:true,completeAtSealedHead:true,owner:{uid:'owner'},verifiedState:{account:{userId:'owner'},exportedAt:'2026-10-18T12:00:00Z',accountStateHead:{kaiUpulse:'10000000'},wallet:{routeSummary:{userId:'owner',balanceUsd:'50.92',balancePhiMicro:'3000000',quote:{usdPerPhiMicrocents:'4092328496'},valueStates:{settledBalanceUsdCents:'1000',ecosystemBalanceUsdCents:'4092'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'3000000'}},ledgerEntries:[{id:'funded',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_phi_micro:'2000000',amount_usd_cents:'1000',kai_upulse:'2000000',metadata:{}},{id:'received',user_id:'owner',direction:'credit',entry_kind:'chat_transfer',amount_phi_micro:'1000000',amount_usd_cents:'5024',kai_upulse:'3000000',metadata:{rail:'settlement'}}]},ledger:{entries:[{actorUserId:'owner',subjectUserId:null,kaiUpulse:'1000000'}]}}});
beforeEach(()=>{
 p.known=null;p.projection=null;p.device.mockReset().mockResolvedValue(undefined);p.restore.mockReset().mockResolvedValue(null);p.retain.mockReset().mockResolvedValue({proof,observation:observation()});p.proof.mockReset().mockImplementation(async({request})=>{await request('/account-source');return proof;});
 p.continueId.mockReset().mockResolvedValue({ok:true,session:{uid:'bound-user'}});p.wallet.mockReset().mockResolvedValue({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000003'}}});p.save.mockReset().mockResolvedValue(undefined);p.request.mockReset().mockResolvedValue({});
});
it('reports unavailable account balance sources when both cold reads fail and preserves both causes',async()=>{
 const walletCause=Error('WALLET_SOURCE_UNAVAILABLE'),historyCause=Error('ACCOUNT_PROOF_UNAVAILABLE');
 p.wallet.mockRejectedValue(walletCause);p.proof.mockRejectedValue(historyCause);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const failure=await identity.prepareAccountView().then(()=>null,cause=>cause);expect(failure.message).toContain('balance source is temporarily unavailable');expect(failure.cause).toBeInstanceOf(AggregateError);expect(failure.cause.errors).toEqual([walletCause,historyCause]);}
 finally{identity.dispose();}
});
it('returns complete carried historical valuations with the admitted identity before optional source or network reads',async()=>{
 p.projection=carriedProjection();
 let finish!:(value:null)=>void;p.restore.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const known=identity.knownWallet()!;
  expect(known.wallet.totalUsdCents).toBe('5092');expect(known.history![0]).toMatchObject({kaiUPulse:'1000000',totalUsdCents:'0'});
  expect(known.history!.filter(point=>point.valuation==='deterministic-v129').length).toBeGreaterThan(100);
  expect(known.history!.at(-1)).toMatchObject({kaiUPulse:'10000000',totalUsdCents:'5092'});
  expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();
 }finally{finish(null);identity.dispose();}
});
it('restores a retained verified Ledger before any account continuation or wallet request',async()=>{
 p.restore.mockResolvedValue({proof,observation:observation()});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('opens a cached account without waiting for optional full-source verification',async()=>{
 p.known=observation(); let finish!:(value:unknown)=>void;
 p.restore.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const opening=openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 const result=await Promise.race([opening.then(identity=>({identity})),new Promise<{identity:null}>(resolve=>setTimeout(()=>resolve({identity:null}),100))]);
 try{expect(result.identity?.knownWallet()?.wallet.totalUsdCents).toBe('600');}
 finally{finish(null);(result.identity??await opening).dispose();}
});
it('returns a complete retained chart without waiting for optional Ledger enrichment',async()=>{
 p.projection=carriedProjection();let finish!:(value:null)=>void;
 p.restore.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try {
  const result=await Promise.race([identity.prepareAccountView(),new Promise<null>(resolve=>setTimeout(()=>resolve(null),100))]);
  expect(result?.historyBasis?.startKaiUPulse).toBe('1000000');
  expect(result?.history!.length).toBeGreaterThan(100);
  expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();
 } finally {finish(null);identity.dispose();}
});
it('returns a received balance before optional encrypted display-cache persistence finishes',async()=>{
 p.known=observation();let finish!:()=>void;p.save.mockReturnValue(new Promise<void>(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 const reading=identity.readWallet();
 const result=await Promise.race([reading,new Promise<null>(resolve=>setTimeout(()=>resolve(null),100))]);
 try{expect(result?.totalUsdCents).toBe('800');expect(identity.knownWallet()?.history?.at(-1)?.totalUsdCents).toBe('800');}
 finally{finish();await reading;identity.dispose();}
});
it('adds verified source history after entry without rewinding a later wallet response',async()=>{
 p.known=observation();let finish!:(value:unknown)=>void;
 p.restore.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('600');
  await identity.readWallet();expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('800');
  finish({proof,observation:observation('600','100000002')});
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('800');
 }finally{identity.dispose();}
});
it('retains the authenticated full source and paints its newer same-account balance',async()=>{
 p.known=observation('1000','100000001');
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(await identity.accountProof!()).toBe(proof);expect(p.retain).toHaveBeenCalledWith(proof,'bound-user');expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');await vi.waitFor(()=>expect(p.save).toHaveBeenCalledTimes(1));}finally{identity.dispose();}
});
it('keeps a later wallet response when an earlier account-source read finishes afterwards',async()=>{
 p.known=observation('1000','100000001');let finish!:(value:unknown)=>void;
 p.proof.mockImplementationOnce(async({request})=>{await request('/account-source');return new Promise(resolve=>{finish=resolve;});});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const pending=identity.accountProof!();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await identity.readWallet();finish(proof);await pending;expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('800');expect(p.retain).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('does not export an older remote source as complete while a local Note successor is authoritative',async()=>{
 p.known={...observation('400','100000005'),source:'local-note-head',localHeadDigest:'c'.repeat(64)};
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await expect(identity.accountProof!()).rejects.toThrow('ACCOUNT_PROOF_LOCAL_CUSTODY_SOURCE_REQUIRED');expect(p.proof).not.toHaveBeenCalled();expect(p.request).not.toHaveBeenCalled();expect(p.retain).not.toHaveBeenCalled();expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('400');expect(p.save).not.toHaveBeenCalled();
  const sharing=await identity.accountProofSharing!();await expect(sharing.publish(proof as never,{approved:true,liveUpdates:true})).rejects.toThrow('ACCOUNT_PROOF_LOCAL_CUSTODY_SOURCE_REQUIRED');expect(p.request).not.toHaveBeenCalled();
  p.request.mockResolvedValue({schema:'bankeiz.account-proof-sharing.v1',sharingHead:'a'.repeat(64),liveUpdates:false,latestSourceDigest:null});
  await expect(sharing.status()).resolves.toMatchObject({liveUpdates:false});await expect(sharing.disable()).resolves.toMatchObject({liveUpdates:false});expect(p.request).toHaveBeenCalled();
 }finally{identity.dispose();}
});
it.each(['proof','retention'])('refuses complete export if a local successor becomes authoritative during %s',async(stage)=>{
 const held=observation('600','100000002');p.known=held;
 let finish!:(value:unknown)=>void;
 if(stage==='proof')p.proof.mockImplementationOnce(async({request})=>{await request('/account-source');return new Promise(resolve=>{finish=resolve;});});
 else p.retain.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const pending=identity.accountProof!();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  // Consumer sequencing only: simulate the already-verified local adoption.
  // Actual local-credit admission is covered by the native Note crypto tests.
  held.source='local-note-head';held.localHeadDigest='c'.repeat(64);
  finish(stage==='proof'?proof:{proof,observation:observation()});
  await expect(pending).rejects.toThrow('ACCOUNT_PROOF_LOCAL_CUSTODY_SOURCE_REQUIRED');expect(identity.knownWallet()?.source).toBe('local-note-head');expect(p.save).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it('does not hold activity rendering open for an optional full account-source refresh',async()=>{
 p.request.mockImplementation(async(path:string)=>path.startsWith('/api/wallet/ledger')?{ok:true,accountUserId:'bound-user',events:[],nextCursor:null}:{});p.proof.mockImplementation(()=>new Promise(()=>{}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const page=await identity.readPrivateHistory();expect(page.accountUid).toBe('bound-user');expect(JSON.parse(page.sourceJson).events).toEqual([]);await vi.waitFor(()=>expect(p.proof).toHaveBeenCalledTimes(1));}finally{identity.dispose();}
});

it('uses a newer retained complete Ledger when reopening with an older cached wallet',async()=>{
 p.known=observation('1000','100000001');p.restore.mockResolvedValue({proof,observation:observation()});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');expect(p.continueId).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('keeps a newer local note balance when reopening beside an older shared Ledger',async()=>{
 p.known={...observation('400','100000005'),source:'local-note-head',localHeadDigest:'c'.repeat(64)};p.restore.mockResolvedValue({proof,observation:observation()});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('400');expect(identity.knownWallet()?.source).toBe('local-note-head');expect(p.continueId).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('does not let an older matching proof label a later cached wallet as its own projection',async()=>{
 p.known=observation('1000','100000300');p.restore.mockResolvedValue({proof,observation:observation('1000','100000100')});p.retain.mockResolvedValue({proof,observation:observation('600','100000200')});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await identity.accountProof!();expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('1000');expect(identity.knownWallet()?.wallet.kaiUpulse).toBe('100000300');}finally{identity.dispose();}
});
it('does not invalidate an in-flight wallet read when account-source adoption changes nothing',async()=>{
 p.known=observation();let finish!:(value:unknown)=>void;p.wallet.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const pending=identity.readWallet();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await identity.accountProof!();finish({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000003'}}});await pending;expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('800');}finally{identity.dispose();}
});
it('keeps restored history visible while a pending same-coordinate wallet repricing completes',async()=>{
 const current=observation(),latest={userId:'bound-user',at:new Date(Date.now()-60_000).toISOString(),kaiUPulse:'100000002',totalUsdCents:'800',reserveUsdCents:'600',settlementUsdCents:'200'};
 current.observedAt=latest.at;current.wallet={...current.wallet,totalUsdCents:'800',settlementUsdCents:'200'};current.history=[latest];
 const historical={...latest,at:new Date(Date.now()-3_600_000).toISOString(),kaiUPulse:'100000001',totalUsdCents:'700',settlementUsdCents:'100'};
 p.known=current;p.retain.mockResolvedValue({proof,observation:{...current,history:[historical,latest]}});
 let finish!:(value:unknown)=>void;p.wallet.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const repaint=vi.fn();vi.stubGlobal('dispatchEvent',repaint);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const pending=identity.readWallet();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  await identity.accountProof!();
  expect(identity.knownWallet()?.history).toEqual([historical,latest]);expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('800');
  expect(repaint.mock.calls.some(([event])=>event.type==='bankeiz:account-observation')).toBe(true);
  finish({ok:true,wallet:{userId:'bound-user',balanceUsd:'9.00',balancePhiMicro:'3000000',valueStates:{settledBalanceUsdCents:'600',ecosystemBalanceUsdCents:'300'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000002'}}});
  expect((await pending).settlementUsdCents).toBe('300');
  expect(identity.knownWallet()?.wallet).toMatchObject({totalUsdCents:'900',reserveUsdCents:'600',settlementUsdCents:'300',kaiUpulse:'100000002'});
  expect(identity.knownWallet()?.history).toContainEqual(historical);expect(identity.knownWallet()?.history?.at(-1)?.settlementUsdCents).toBe('300');
 }finally{identity.dispose();vi.unstubAllGlobals();}
});
it.each([['100000003','800'],['100000002','600'],['100000001','600']])('compares a delayed wallet coordinate %s against a newly verified Ledger checkpoint',async(kai,expected)=>{
 p.known=observation('1000','100000001');let finish!:(value:unknown)=>void;p.wallet.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const pending=identity.readWallet();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await identity.accountProof!();finish({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:kai}}});await pending;expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe(expected);}finally{identity.dispose();}
});
it('refuses a normally completed wallet read whose transaction coordinate predates the restored Ledger',async()=>{
 p.restore.mockResolvedValue({proof,observation:observation('600','100000200')});p.wallet.mockResolvedValue({ok:true,wallet:{userId:'bound-user',balanceUsd:'10.00',balancePhiMicro:'5000000',valueStates:{settledBalanceUsdCents:'1000',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000100'}}});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await identity.readWallet();expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');}finally{identity.dispose();}
});

it('upgrades an older sparse display cache from the matching complete carried source and retains it for next paint',async()=>{
 p.projection=carriedProjection();
 p.known={observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'owner',totalUsdCents:'5092',reserveUsdCents:'1000',settlementUsdCents:'4092',balancePhiMicro:'3000000',projectionComplete:true,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,pulse:'3',kaiUpulse:'3000000'}};
 const original=p.known.wallet,identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  expect(identity.knownWallet()?.wallet).toBe(original);
  expect(identity.knownWallet()?.history?.[0]).toMatchObject({kaiUPulse:'1000000',totalUsdCents:'0'});
  await vi.waitFor(()=>expect(p.save).toHaveBeenCalled());
  expect(p.save.mock.calls[0][3].some((point:{valuation?:string})=>point.valuation==='deterministic-v129')).toBe(true);
  expect(p.continueId).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it('does not use carried chart enrichment to change a stronger local Note wallet',async()=>{
 p.projection=carriedProjection();
 p.known={observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'owner',totalUsdCents:'5092',reserveUsdCents:'1000',settlementUsdCents:'4092',balancePhiMicro:'3000000',projectionComplete:true,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,pulse:'3',kaiUpulse:'3000000'},source:'local-note-head',localHeadDigest:'c'.repeat(64)};
 const original=p.known,identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.knownWallet()).toBe(original);expect(p.save).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('serializes post-import display retention with a later balance so a late seed cannot overwrite it',async()=>{
 p.known=observation();let finish!:()=>void;p.save.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve;}));
 const identity=await importNativeIdentity(new File([new Uint8Array([1])],'fixture.receiz'),' ',true);
 try{
  await vi.waitFor(()=>expect(p.save).toHaveBeenCalledTimes(1));
  expect((await identity.readWallet()).totalUsdCents).toBe('800');
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(p.save).toHaveBeenCalledTimes(1);
  finish();await vi.waitFor(()=>expect(p.save).toHaveBeenCalledTimes(2));
  expect(p.save.mock.calls.at(-1)![1].totalUsdCents).toBe('800');
 }finally{finish();identity.dispose();}
});

function completeObservation(){
 const value=observation();
 const opening={userId:value.wallet.userId,at:'2024-05-10T06:45:41.888Z',kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'};
 value.history=[opening,{...opening,at:value.observedAt,kaiUPulse:value.wallet.kaiUpulse,totalUsdCents:value.wallet.totalUsdCents,reserveUsdCents:value.wallet.reserveUsdCents,settlementUsdCents:value.wallet.settlementUsdCents}];
 value.historyBasis={schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:value.wallet.kaiUpulse!};
 return value;
}
it('settles a ready retained view after checking for a stronger retained source without a server',async()=>{
 p.known=completeObservation();p.restore.mockResolvedValue(null);
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const known=await identity.prepareAccountView();expect(known).toBe(p.known);expect(known.history?.[0].kaiUPulse).toBe('0');expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();expect(p.restore).toHaveBeenCalledWith(p.known);}finally{identity.dispose();}
});
it('prepares the canonical collision-assigned public username for a locally ready new account without changing its signed owner or wallet',async()=>{
 p.known=completeObservation();p.known.source='account-genesis';p.restore.mockResolvedValue(null);
 p.continueId.mockResolvedValueOnce({ok:true,profileProjectionPending:true,session:{uid:'bound-user',username:null}}).mockResolvedValue({ok:true,profileProjectionPending:false,session:{uid:'bound-user',username:'assigned_collision_2'}});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  await identity.prepareAccountView();expect(p.continueId).not.toHaveBeenCalled();
  expect(identity.prepareReceivingUsername).toBeTypeOf('function');
  const [first,second]=await Promise.all([identity.prepareReceivingUsername!(),identity.prepareReceivingUsername!()]);
  expect(first).toBe('assigned_collision_2');expect(second).toBe(first);expect(identity.accountUsername?.()).toBe(first);
  expect(identity.username).toBe('owner');expect(identity.binding.artifactOwnerReceizId).toBe('owner.receiz.id');expect(p.wallet).not.toHaveBeenCalled();
  expect(p.continueId).toHaveBeenCalledTimes(2);await identity.prepareReceivingUsername!();expect(p.continueId).toHaveBeenCalledTimes(2);
 }finally{identity.dispose();}
});
it('waits for complete retained history before preparing a formerly balance-only account view',async()=>{
 p.known=observation();let finish!:(value:unknown)=>void;p.restore.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 let settled=false;const preparing=identity.prepareAccountView().then(value=>{settled=true;return value;});
 try{await new Promise(resolve=>setTimeout(resolve,0));expect(settled).toBe(false);finish({proof,observation:completeObservation()});expect((await preparing).history?.[0].kaiUPulse).toBe('0');expect(p.continueId).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('prepares the full account source before admitting a balance-only cache on entry',async()=>{
 p.known=observation();const complete=completeObservation();p.retain.mockResolvedValue({proof,observation:complete});
 let finish!:(value:unknown)=>void;p.proof.mockImplementationOnce(async({request})=>{await request('/account-source');return new Promise(resolve=>{finish=resolve;});});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 let settled=false;const preparing=identity.prepareAccountView().then(value=>{settled=true;return value;});
 try{
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));expect(settled).toBe(false);finish(proof);
  const first=await preparing;expect(first.history?.[0].kaiUPulse).toBe('0');expect(first.historyBasis?.startKaiUPulse).toBe('0');expect(first.wallet.totalUsdCents).toBe('600');
 }finally{identity.dispose();}
});
it('preserves an older admitted account without inventing a complete cash timeline or requiring a native migration',async()=>{
 p.known=observation();p.proof.mockRejectedValue(Error('HISTORY_SOURCE_UNAVAILABLE'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const first=identity.prepareAccountView(),second=identity.prepareAccountView();expect(first).toBe(second);const opened=await first;expect(opened.wallet.totalUsdCents).toBe('600');expect(opened.historyBasis).toBeUndefined();expect(opened.history).toHaveLength(1);expect(p.proof).toHaveBeenCalledTimes(1);expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('opens a genuine local Note successor without requiring unavailable remote cash history',async()=>{
 p.known={...observation('400','100000005'),source:'local-note-head',localHeadDigest:'c'.repeat(64)};
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const value=await identity.prepareAccountView();expect(value.source).toBe('local-note-head');expect(value.wallet.totalUsdCents).toBe('400');expect(value.historyBasis).toBeUndefined();expect(p.proof).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('lets the real wallet finish when an unsupported native source fails first on a cold legacy import',async()=>{
 p.known=null;p.proof.mockRejectedValue(Error('NATIVE_ACCOUNT_SOURCE_UNAVAILABLE'));
 let finish!:(value:unknown)=>void;p.wallet.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 const preparing=identity.prepareAccountView();
 try{await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await Promise.resolve();finish({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000003'}}});expect((await preparing).wallet.totalUsdCents).toBe('800');expect(identity.knownWallet()?.historyBasis).toBeUndefined();}finally{identity.dispose();}
});
it('checks a newer retained source even beside a formerly settled display cache',async()=>{
 p.known=completeObservation();const next=completeObservation();next.wallet={...next.wallet,totalUsdCents:'400',reserveUsdCents:'400',kaiUpulse:'100000005'};next.history![next.history!.length-1]={...next.history!.at(-1)!,kaiUPulse:'100000005',totalUsdCents:'400',reserveUsdCents:'400'};next.historyBasis!.endKaiUPulse='100000005';p.restore.mockResolvedValue({proof,observation:next});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);try{expect((await identity.prepareAccountView()).wallet.totalUsdCents).toBe('400');expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});

it('opens legacy composite chart operands before requesting an unrelated public account proof',async()=>{
 const {projectCompositeWalletAt}=await import('../src/receiz/composite-wallet-history');
 const source={schema:'receiz.wallet.chart-source.v129' as const,authority:'authenticated-display-source' as const,userId:'bound-user',throughKaiUPulse:'100000000',objects:[{id:'proof',seed:{kind:'sigil',claimPulse:1,beat:0,stepIndex:0,creatorVerified:true},intervals:[{fromKaiUPulse:'1000000',toKaiUPulse:null}]}],movements:[],lawfulValues:[]};
 const point=projectCompositeWalletAt(source,source.throughKaiUPulse);
 p.known=observation();p.proof.mockRejectedValue(Error('PUBLIC_PROOF_UNAVAILABLE'));
 p.request.mockImplementation(async path=>path.startsWith('/api/connect/wallet/me?history=1')?{ok:true,wallet:{userId:'bound-user',balanceUsd:(Number(point.totalUsdCents)/100).toFixed(2),balancePhiMicro:point.balancePhiMicro,valueStates:{settledBalanceUsdCents:point.reserveUsdCents,ecosystemBalanceUsdCents:point.settlementUsdCents},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:null},chartSource:source}}:{});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const first=await identity.prepareAccountView();expect(first.historyBasis?.kind).toBe('portfolio-model-v129');expect(first.history?.[0].kaiUPulse).toBe('1000000');expect(first.history!.length).toBeGreaterThan(90);expect(p.proof).not.toHaveBeenCalled();expect(p.save.mock.calls.at(-1)?.[9]).toMatchObject(source);}finally{identity.dispose();}
});
