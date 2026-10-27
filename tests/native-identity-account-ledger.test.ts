import {beforeEach,expect,it,vi} from 'vitest';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES,BANK_MESSAGING_SCOPES,BANK_ORGANIZER_SCOPES} from '../src/receiz/config';
import {openCanonicalIdentity,importNativeIdentity} from '../src/receiz/native-identity';
import type {WalletObservation} from '../src/receiz/wallet-observation';
// Integration sequencing only. The independent Chrome test opens real v129
// native originals with the actual verifier and encrypted IndexedDB store.
const p=vi.hoisted(()=>({pulse:100,organizerDisplay:null as unknown,saveOrganizerDisplay:vi.fn(),messagingDisplay:null as unknown,saveMessagingDisplay:vi.fn(),messagingConsent:null as unknown,saveMessaging:vi.fn(),scopes:[] as string[],known:null as WalletObservation|null,projection:null as unknown,device:vi.fn(),restore:vi.fn(),retain:vi.fn(),original:vi.fn(),proof:vi.fn(),continueId:vi.fn(),wallet:vi.fn(),save:vi.fn(),request:vi.fn(),library:vi.fn(),heldFetch:undefined as typeof fetch|undefined}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>p.known,saveWalletObservation:p.save,loadOrganizerDisplay:async()=>p.organizerDisplay,saveOrganizerDisplay:p.saveOrganizerDisplay,saveDeviceIdentity:p.device,loadMessagingDisplay:async()=>p.messagingDisplay,saveMessagingDisplay:p.saveMessagingDisplay,loadMessagingConsent:async()=>p.messagingConsent,saveMessagingConsent:p.saveMessaging}));
vi.mock('../src/receiz/account-ledger',async original=>({...await original<typeof import('../src/receiz/account-ledger')>(),createLocalAccountLedger:()=>({restore:p.restore,retain:p.retain,original:p.original})}));
vi.mock('../src/receiz/proof-library',()=>({createProofLibrary:p.library}));
vi.mock('../src/receiz/account-proof',async original=>({...await original<typeof import('../src/receiz/account-proof')>(),readAccountProof:p.proof}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'fixture-key',artifactSha256:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({owner:{uid:'owner',username:'owner'},issuedAt:'2026-10-13T00:00:00Z',keyId:'fixture-key',crypto:{}}),projectReceizIdentityAccount:async()=>p.projection??({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:p.pulse,uPulse:String(p.pulse*1000000)}),sha256ReceizBytes:async()=> 'a'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:({accessToken,applicationId=BANK_APPLICATION_ID,fetchImpl}:{accessToken?:string;applicationId?:string;fetchImpl?:typeof fetch}={})=>{p.heldFetch=fetchImpl;return accessToken?{auth:{grantedScopes:async()=>p.scopes},connect:{wallet:p.wallet},request:p.request}:{identity:{continueReceizId:p.continueId,signLoginProof:async()=>({}),exchangeProofAuthority:async()=>({applicationId,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:p.scopes,accessToken:'fixture-only',expiresAtKai:200})}};},
})}));
const observation=(reserve='600',kai='100000002'):WalletObservation=>({observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'bound-user',totalUsdCents:reserve,reserveUsdCents:reserve,settlementUsdCents:'0',balancePhiMicro:'3000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:kai}});
const proof={sourceDigest:'b'.repeat(64),statement:{schema:'bankeiz.public-account-statement.v2'}};
const carriedProjection=()=> ({authority:'verified-identity-portable-state',portableStateVerified:true,completeAtSealedHead:true,owner:{uid:'owner'},verifiedState:{account:{userId:'owner'},exportedAt:'2026-10-18T12:00:00Z',accountStateHead:{kaiUpulse:'10000000'},wallet:{routeSummary:{userId:'owner',balanceUsd:'50.92',balancePhiMicro:'3000000',quote:{usdPerPhiMicrocents:'4092328496'},valueStates:{settledBalanceUsdCents:'1000',ecosystemBalanceUsdCents:'4092'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'3000000'}},ledgerEntries:[{id:'funded',user_id:'owner',direction:'credit',entry_kind:'admin_adjustment',amount_phi_micro:'2000000',amount_usd_cents:'1000',kai_upulse:'2000000',metadata:{}},{id:'received',user_id:'owner',direction:'credit',entry_kind:'chat_transfer',amount_phi_micro:'1000000',amount_usd_cents:'5024',kai_upulse:'3000000',metadata:{rail:'settlement'}}]},ledger:{entries:[{actorUserId:'owner',subjectUserId:null,kaiUpulse:'1000000'}]}}});
beforeEach(()=>{
 p.pulse=100;p.organizerDisplay=null;p.saveOrganizerDisplay.mockReset().mockResolvedValue(undefined);p.messagingDisplay=null;p.saveMessagingDisplay.mockReset().mockResolvedValue(undefined);p.messagingConsent=null;p.saveMessaging.mockReset().mockResolvedValue(undefined);p.scopes=[...BANK_READ_SCOPES];p.known=null;p.projection=null;p.device.mockReset().mockResolvedValue(undefined);p.restore.mockReset().mockResolvedValue(null);p.retain.mockReset().mockResolvedValue({proof,observation:observation()});p.proof.mockReset().mockImplementation(async({request})=>{await request('/account-source');return proof;});
 p.original.mockReset().mockResolvedValue(null);p.library.mockReset().mockImplementation(options=>options);
 p.continueId.mockReset().mockResolvedValue({ok:true,session:{uid:'bound-user'}});p.wallet.mockReset().mockResolvedValue({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000003'}}});p.save.mockReset().mockResolvedValue(undefined);p.request.mockReset().mockResolvedValue({});
});
it('keeps the stream deadline and caller cancellation inside the identity lifetime',async()=>{
 const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{}')),deadlines=vi.spyOn(AbortSignal,'timeout');
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true),caller=new AbortController();
 try{
  await p.heldFetch!('https://receiz.com/api/chat/conversations/12345678-1234-4123-8123-123456789abc/messages/stream',{method:'POST',body:'{}',signal:caller.signal});
  const signal=upstream.mock.calls[0][1]!.signal!;expect(signal.aborted).toBe(false);caller.abort();expect(signal.aborted).toBe(true);expect(deadlines).toHaveBeenLastCalledWith(110_000);
 }finally{identity.dispose();upstream.mockRestore();deadlines.mockRestore();}
});
it('restores imported verified account history through the existing local ledger without another host read',async()=>{
 p.known=observation('1000','100000001');const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const library=await identity.proofLibrary!() as unknown as {restoreAccounts(proofs:unknown[]):Promise<boolean>};
  expect(await library.restoreAccounts([proof])).toBe(true);
  expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');expect(p.retain).toHaveBeenCalledExactlyOnceWith(proof,'bound-user');
  expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();expect(p.request).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it('retains imported account evidence without adopting it over local Note custody',async()=>{
 p.known={...observation('400','100000005'),source:'local-note-head',localHeadDigest:'c'.repeat(64)};
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const library=await identity.proofLibrary!() as unknown as {restoreAccounts(proofs:unknown[]):Promise<boolean>};expect(await library.restoreAccounts([proof])).toBe(false);expect(p.retain).not.toHaveBeenCalled();expect(identity.knownWallet()?.source).toBe('local-note-head');expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('preserves a newer wallet that arrives while imported account history is being retained',async()=>{
 p.known=observation('1000','100000001');let finish!:(value:unknown)=>void;p.retain.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const library=await identity.proofLibrary!() as unknown as {restoreAccounts(proofs:unknown[]):Promise<boolean>};const restoring=library.restoreAccounts([proof]);await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await identity.readWallet();finish({proof,observation:observation()});expect(await restoring).toBe(false);expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('800');}finally{identity.dispose();}
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
it('resumes the retained balance and full held curve without waiting for a stalled history refresh after its balance head changed',async()=>{
 const previous=completeObservation();
 p.known={...previous,wallet:{...previous.wallet,totalUsdCents:'500',reserveUsdCents:'500',kaiUpulse:'100000003'},history:[...previous.history!,{...previous.history!.at(-1)!,kaiUPulse:'100000003',totalUsdCents:'500',reserveUsdCents:'500'}],historyBasis:undefined};
 const retained=p.known,curve=structuredClone(retained.history);
 p.request.mockReturnValue(new Promise(()=>{}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  const opened=await Promise.race([identity.prepareAccountView({resume:true}),new Promise<null>(resolve=>setTimeout(()=>resolve(null),75))]);
  expect(opened).toBe(retained);expect(opened?.wallet.totalUsdCents).toBe('500');expect(opened?.history).toEqual(curve);
  expect(opened?.historyBasis).toBeUndefined();expect(p.request).not.toHaveBeenCalled();expect(p.continueId).not.toHaveBeenCalled();
 }finally{identity.dispose();}
});
it.each(['response','worker'] as const)('keeps a newer authenticated wallet when a deferred startup chart %s finishes later',async stage=>{
 p.known={...completeObservation(),historyBasis:undefined};
 const source={schema:'receiz.wallet.chart-source.v129' as const,authority:'authenticated-display-source' as const,userId:'bound-user',throughKaiUPulse:'100000002',objects:[],movements:[{id:'credit',kaiUPulse:'100000001',direction:'credit' as const,phiMicro:'0',usdCents:'500',reserveSliceUsdCents:'0',profileSeed:false}],lawfulValues:[]};
 const response={ok:true,wallet:{userId:'bound-user',balanceUsd:'5.00',balancePhiMicro:'0',valueStates:{settledBalanceUsdCents:'0',ecosystemBalanceUsdCents:'500'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000002'},chartSource:source}};
 let finish!:()=>void;
 p.request.mockImplementation(path=>path.startsWith('/api/connect/wallet/me?history=1')?stage==='response'?new Promise(resolve=>{finish=()=>resolve(response);}):Promise.resolve(response):Promise.resolve({}));
 const module=await import('../src/receiz/prepare-composite-wallet'),prepare=module.prepareCompositeWallet;
 const worker=vi.spyOn(module,'prepareCompositeWallet').mockImplementation(async(...args)=>{if(stage==='worker')await new Promise<void>(resolve=>{finish=resolve;});return prepare(...args);});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{
  await identity.prepareAccountView({resume:true});const preparing=identity.prepareAccountView();
  await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));
  await identity.readWallet();expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('800');
  finish();await preparing;expect(identity.knownWallet()?.wallet.totalUsdCents).toBe('800');
  expect(p.proof).not.toHaveBeenCalled();
 }finally{identity.dispose();worker.mockRestore();}
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

it('requires exact messaging approval before expanding the account grant and keeps its bearer private',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({ok:true,conversations:[]})));
 try{await expect(identity.messaging!()).rejects.toThrow('MESSAGING_CONSENT_REQUIRED');expect(p.continueId).not.toHaveBeenCalled();p.scopes=[...BANK_MESSAGING_SCOPES];const api=await identity.messaging!(true);expect(api.accountUid).toBe('bound-user');expect('accessToken' in api).toBe(false);await api.conversations();expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer fixture-only');expect(p.saveMessaging).toHaveBeenCalledTimes(1);await expect(api.callTransport.heldFetch('/api/connect/wallet/me')).rejects.toThrow('MESSAGING_PATH_DENIED');identity.dispose();await expect(api.conversations()).rejects.toThrow();}
 finally{identity.dispose();upstream.mockRestore();}
});
it('includes messaging in a fresh account approval without a second consent or eager chat request',async()=>{
 const identity=await importNativeIdentity(new File([new Uint8Array([1])],'fixture.receiz'),'',true);
 try{
  expect(p.saveMessaging).toHaveBeenCalledTimes(1);
  expect(p.continueId).not.toHaveBeenCalled();
  expect(p.saveMessaging.mock.calls[0][1]).toMatchObject({applicationId:BANK_APPLICATION_ID,keyId:'fixture-key',scopes:[...BANK_MESSAGING_SCOPES]});
  p.scopes=[...BANK_MESSAGING_SCOPES];
  await expect(identity.messaging!()).resolves.toHaveProperty('accountUid','bound-user');
  expect(p.saveMessaging).toHaveBeenCalledTimes(1);
  p.messagingConsent=p.saveMessaging.mock.calls[0][1];identity.dispose();
  const restored=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
  try{await expect(restored.messaging!()).resolves.toHaveProperty('accountUid','bound-user');}finally{restored.dispose();}
 }finally{identity.dispose();}
});
it('binds retained messaging approval to the exact identity, registration, scopes and statement',async()=>{
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);p.scopes=[...BANK_MESSAGING_SCOPES];await identity.messaging!(true);p.messagingConsent=p.saveMessaging.mock.calls[0][1];identity.dispose();
 const reopened=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);try{await expect(reopened.messaging!()).resolves.toHaveProperty('accountUid','bound-user');}finally{reopened.dispose();}
 p.messagingConsent={...p.messagingConsent as object,keyId:'another-key'};const foreign=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);try{await expect(foreign.messaging!()).rejects.toThrow('MESSAGING_CONSENT_REQUIRED');}finally{foreign.dispose();}
});
it('leaves only an already attempted call membership after identity disposal without reviving general access',async()=>{
 p.scopes=[...BANK_MESSAGING_SCOPES];const upstream=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response('{"ok":true}'));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const api=await identity.messaging!(true),path='/api/chat/conversations/11111111-1111-4111-8111-111111111111/calls/33333333-3333-4333-8333-333333333333/participants';await api.callTransport.heldFetch(path,{method:'POST',body:JSON.stringify({action:'join'})});identity.dispose();await vi.waitFor(()=>expect(upstream.mock.calls.some(call=>call[1]?.method==='DELETE')).toBe(true));const cleanup=upstream.mock.calls.find(call=>call[1]?.method==='DELETE')!;expect(cleanup[0]).toBe('/api/bank/native'+path);expect(cleanup[1]?.signal?.aborted).toBe(false);expect(new Headers(cleanup[1]?.headers).get('authorization')).toBe('Bearer fixture-only');await expect(api.callTransport.heldFetch(path.replace('33333333','44444444'),{method:'DELETE',signal:null})).rejects.toThrow('MESSAGING_IDENTITY_CLOSED');await expect(api.callTransport.heldFetch(path,{method:'POST',body:'{"action":"join"}'})).rejects.toThrow('MESSAGING_IDENTITY_CLOSED');await expect(api.callTransport.heldFetch(path,{method:'DELETE',signal:null})).resolves.toHaveProperty('status',200);}
 finally{identity.dispose();upstream.mockRestore();}
});
it('orders departure before another controller joins and refuses superseded controller cleanup',async()=>{
 p.scopes=[...BANK_MESSAGING_SCOPES];let release!:(response:Response)=>void;let deletes=0;const upstream=vi.spyOn(globalThis,'fetch').mockImplementation(async(_path,init)=>{if(init?.method==='DELETE'&&++deletes===1)return new Promise<Response>(resolve=>{release=resolve;});return new Response('{"ok":true}');});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const api=await identity.messaging!(true),first=api.callTransport.forController!(),second=api.callTransport.forController!(),path='/api/chat/conversations/11111111-1111-4111-8111-111111111111/calls/33333333-3333-4333-8333-333333333333/participants';const join={method:'POST',body:'{"action":"join"}'};await first.heldFetch(path,join);const leaving=first.heldFetch(path,{method:'DELETE',signal:null});await vi.waitFor(()=>expect(release).toBeTypeOf('function'));const joining=second.heldFetch(path,join);await new Promise(resolve=>setTimeout(resolve,0));expect(upstream).toHaveBeenCalledTimes(2);release(new Response('{"ok":true}'));await leaving;await joining;expect(upstream).toHaveBeenCalledTimes(3);await expect(first.heldFetch(path,{method:'DELETE',signal:null})).rejects.toThrow('CALL_MEMBERSHIP_SUPERSEDED');expect(upstream).toHaveBeenCalledTimes(3);}
 finally{identity.dispose();upstream.mockRestore();}
});

it('restores the identity-bound inbox before any remote messaging grant and seeds the admitted account only',async()=>{
 const first=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);p.scopes=[...BANK_MESSAGING_SCOPES];await first.messaging!(true);p.messagingConsent=p.saveMessaging.mock.calls[0][1];first.dispose();
 const row={id:'11111111-1111-4111-8111-111111111111',kind:'dm',title:'Retained Mira',members:[],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-10-19T12:00:00Z',updatedAt:'2026-10-19T12:00:00Z',lastMessageAt:null};
 p.messagingDisplay={schema:'bankeiz.messaging-display.v1',accountUid:'bound-user',inbox:[row],pages:[]};p.continueId.mockClear();
 const restored=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(restored.knownMessagingDisplay!()?.inbox[0].title).toBe('Retained Mira');expect(p.continueId).not.toHaveBeenCalled();expect((await restored.messaging!()).knownConversations()[0].title).toBe('Retained Mira');restored.dispose();expect(restored.knownMessagingDisplay!()).toBeNull();}finally{restored.dispose();}
 p.messagingConsent=null;const legacy=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);try{expect(legacy.knownMessagingDisplay!()).toBeNull();await expect(legacy.messaging!()).rejects.toThrow('MESSAGING_CONSENT_REQUIRED');}finally{legacy.dispose();}
});

it('binds a first-use empty organizer to the continued account instead of its provisional wallet placement',async()=>{
 p.known={...observation(),wallet:{...observation().wallet,userId:'provisional-device-owner'}};p.scopes=[...BANK_ORGANIZER_SCOPES];
 const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({ok:true,signedIn:true,complete:true,ownerUid:'bound-user',projection:{ownerUid:'bound-user',complete:true,contacts:[]}}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const api=await identity.organizer!();expect(api.accountUid).toBe('bound-user');expect(await api.contacts()).toEqual([]);expect(await api.contacts()).toEqual([]);expect(p.continueId).toHaveBeenCalledTimes(1);expect(upstream).toHaveBeenCalledTimes(1);expect(p.wallet).not.toHaveBeenCalled();}
 finally{identity.dispose();upstream.mockRestore();}
});
it('opens retained empty contacts without a grant, wallet read or collection reload',async()=>{
 p.known=observation();p.organizerDisplay={schema:'bankeiz.organizer-display.v1',accountUid:'bound-user',contacts:[],contactsComplete:true,events:null,ranges:[],username:null};
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const api=await identity.organizer!();expect(await api.contacts()).toEqual([]);expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();}
 finally{identity.dispose();}
});
it('rejects a different account on organizer grant refresh before reading its contacts',async()=>{
 p.known=observation();p.scopes=[...BANK_ORGANIZER_SCOPES];
 const upstream=vi.spyOn(globalThis,'fetch').mockResolvedValue(Response.json({ok:true,signedIn:true,complete:true,ownerUid:'bound-user',projection:{ownerUid:'bound-user',complete:true,contacts:[]}}));
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const api=await identity.organizer!();await api.contacts();p.pulse=201;p.continueId.mockResolvedValue({ok:true,session:{uid:'foreign-user'}});await expect(api.contacts(true)).rejects.toThrow('ORGANIZER_IDENTITY_CHANGED');expect(api.knownContacts()).toEqual([]);expect(upstream).toHaveBeenCalledTimes(1);}
 finally{identity.dispose();upstream.mockRestore();}
});
