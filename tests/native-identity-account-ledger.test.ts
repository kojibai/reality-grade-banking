import {beforeEach,expect,it,vi} from 'vitest';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES} from '../src/receiz/config';
import {openCanonicalIdentity} from '../src/receiz/native-identity';
import type {WalletObservation} from '../src/receiz/wallet-observation';
// Integration sequencing only. The independent Chrome test opens real v129
// native originals with the actual verifier and encrypted IndexedDB store.
const p=vi.hoisted(()=>({known:null as WalletObservation|null,restore:vi.fn(),retain:vi.fn(),proof:vi.fn(),continueId:vi.fn(),wallet:vi.fn(),save:vi.fn(),request:vi.fn()}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadWalletObservation:async()=>p.known,saveWalletObservation:p.save}));
vi.mock('../src/receiz/account-ledger',async original=>({...await original<typeof import('../src/receiz/account-ledger')>(),createLocalAccountLedger:()=>({restore:p.restore,retain:p.retain})}));
vi.mock('../src/receiz/account-proof',async original=>({...await original<typeof import('../src/receiz/account-proof')>(),readAccountProof:p.proof}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:'fixture-key',artifactSha256:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),
 readReceizIdentityArtifact:async()=>({owner:{uid:'owner',username:'owner'},issuedAt:'2026-10-13T00:00:00Z',keyId:'fixture-key',crypto:{}}),projectReceizIdentityAccount:async()=>({authority:'identity-only'}),
 receizKaiNow:()=>({pulse:100,uPulse:'100000000'}),sha256ReceizBytes:async()=> 'a'.repeat(64),createReceizProofAuthorityChallenge:()=>({challenge:{},challengeB64Url:'fixture'}),
 createReceizClient:({accessToken}:{accessToken?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_READ_SCOPES]},connect:{wallet:p.wallet},request:p.request}:{identity:{continueReceizId:p.continueId,signLoginProof:async()=>({}),exchangeProofAuthority:async()=>({applicationId:BANK_APPLICATION_ID,keyId:'fixture-key',artifactDigest:'a'.repeat(64),grantedScopes:[...BANK_READ_SCOPES],accessToken:'fixture-only',expiresAtKai:200})}},
})}));
const observation=(reserve='600',kai='100000002'):WalletObservation=>({observedAt:'2026-10-18T12:00:00Z',wallet:{userId:'bound-user',totalUsdCents:reserve,reserveUsdCents:reserve,settlementUsdCents:'0',balancePhiMicro:'3000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:kai}});
const proof={sourceDigest:'b'.repeat(64),statement:{schema:'bankeiz.public-account-statement.v2'}};
beforeEach(()=>{
 p.known=null;p.restore.mockReset().mockResolvedValue(null);p.retain.mockReset().mockResolvedValue({proof,observation:observation()});p.proof.mockReset().mockImplementation(async({request})=>{await request('/account-source');return proof;});
 p.continueId.mockReset().mockResolvedValue({ok:true,session:{uid:'bound-user'}});p.wallet.mockReset().mockResolvedValue({ok:true,wallet:{userId:'bound-user',balanceUsd:'8.00',balancePhiMicro:'4000000',valueStates:{settledBalanceUsdCents:'800',ecosystemBalanceUsdCents:'0'},sync:{projectionComplete:true},rollup:{lastEntryKaiUpulse:'100000003'}}});p.save.mockReset().mockResolvedValue(undefined);p.request.mockReset().mockResolvedValue({});
});
it('restores a retained verified Ledger before any account continuation or wallet request',async()=>{
 p.restore.mockResolvedValue({proof,observation:observation()});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');expect(p.continueId).not.toHaveBeenCalled();expect(p.wallet).not.toHaveBeenCalled();}finally{identity.dispose();}
});
it('retains the authenticated full source and paints its newer same-account balance',async()=>{
 p.known=observation('1000','100000001');
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{expect(await identity.accountProof!()).toBe(proof);expect(p.retain).toHaveBeenCalledWith(proof,'bound-user');expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('600');expect(p.save).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('keeps a later wallet response when an earlier account-source read finishes afterwards',async()=>{
 p.known=observation('1000','100000001');let finish!:(value:unknown)=>void;
 p.proof.mockImplementationOnce(async({request})=>{await request('/account-source');return new Promise(resolve=>{finish=resolve;});});
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{const pending=identity.accountProof!();await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));await identity.readWallet();finish(proof);await pending;expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('800');expect(p.retain).toHaveBeenCalledTimes(1);}finally{identity.dispose();}
});
it('retains the original without overwriting a committed local note successor',async()=>{
 p.known={...observation('400','100000005'),source:'local-note-head',localHeadDigest:'c'.repeat(64)};
 const identity=await openCanonicalIdentity(new Uint8Array([1]),'','fixture.receiz',true);
 try{await identity.accountProof!();expect(p.retain).toHaveBeenCalledTimes(1);expect(identity.knownWallet()?.wallet.reserveUsdCents).toBe('400');expect(p.save).not.toHaveBeenCalled();}finally{identity.dispose();}
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
