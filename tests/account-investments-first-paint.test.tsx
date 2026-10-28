// @vitest-environment happy-dom
import {act,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {webcrypto} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createReceizIdIdentity,projectReceizIdentityAccount,type ReceizKeyFile,type ReceizIdentityAccountProjection} from '@receiz/sdk';
import {LiveAccount} from '../src/features/account/LiveAccount';
import {useMarketPortfolio} from '../src/receiz/useMarketPortfolio';
import {createNativeIdentity,openCanonicalIdentity,type OpenIdentity} from '../src/receiz/native-identity';
import {initializeFreshBankAccount} from '../src/receiz/new-account-genesis';
import {readCarriedWalletObservation,type WalletObservation} from '../src/receiz/wallet-observation';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {BANK_APPLICATION_ID,BANK_READ_SCOPES} from '../src/receiz/config';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';

// Genuine SDK-signed bootstrap/genesis projections. Artifact transport, device
// persistence and authenticated HTTP are isolated; no enrollment or money runs.
const p=vi.hoisted(()=>({key:null as ReceizKeyFile|null,projection:null as ReceizIdentityAccountProjection|null,created:false,retained:null as unknown,wallet:null as WalletObservation|null,continue:vi.fn(),request:vi.fn(),grant:vi.fn(),read:vi.fn(),save:vi.fn(),image:vi.fn()}));
vi.mock('../src/receiz/client',async()=>{const sdk=await import('@receiz/sdk');return{loadReceiz:async()=>({...sdk,
 verifyReceizArtifact:async()=>({status:'verified-artifact'}),createReceizArtifactAdmissionEngine:()=>async()=>({verdict:'canonical-identity'}),isSdkIssuedReceizArtifactAdmission:()=>true,
 readReceizIdentityPublicBinding:async()=>({keyId:p.key!.keyId,artifactSha256:'a'.repeat(64),artifactOwnerReceizId:'owner.receiz.id'}),readReceizIdentityArtifact:async(bytes:Uint8Array)=>p.created&&bytes[0]===1?{...p.key,crypto:{...p.key!.crypto,privateKeyPkcs8B64u:undefined}}:p.key,projectReceizIdentityAccount:async(key:ReceizKeyFile)=>sdk.projectReceizIdentityAccount(key),
 createReceizProofAuthorityChallenge:()=>({challenge:{nonce:'first-paint-fixture'},challengeB64Url:'fixture'}),
 createReceizClient:({accessToken,applicationId=BANK_APPLICATION_ID}:{accessToken?:string;applicationId?:string}={})=>accessToken?{auth:{grantedScopes:async()=>[...BANK_READ_SCOPES]},request:p.request,connect:{wallet:()=>new Promise(()=>{})}}:{identity:{continueReceizId:p.continue,signLoginProof:async()=>({challengeB64Url:'fixture',signatureB64Url:'fixture'}),exchangeProofAuthority:(args:unknown)=>p.grant(args,applicationId)}},
})};});
vi.mock('@receiz/sdk/offline',()=>({createReceizIndexedDbSealStore:()=>({}),createReceizOfflineSealer:()=>({enroll:async()=>{},createIdentity:async()=>({artifactBytes:new Uint8Array([1])}),seal:async()=>({artifactBytes:new Uint8Array([2]),filename:'identity.png'})})}));
vi.mock('../src/receiz/identity-image',()=>({createNewIdentityImageSource:p.image}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:async()=>({wasm:new Uint8Array([1]),zkey:new Uint8Array([2])})}));
vi.mock('../src/receiz/identity-protection',()=>({unprotectIdentityKeyFile:async(value:unknown)=>value}));
vi.mock('../src/receiz/identity-vault',async original=>({...await original<typeof import('../src/receiz/identity-vault')>(),loadDeviceIdentity:p.read,loadWalletObservation:async()=>p.wallet,loadMarketPortfolioState:async()=>p.retained,loadAccountLedgerState:async()=>null,loadMessagingConsent:async()=>null,loadMessagingDisplay:async()=>null,loadPrivateHistoryCache:async()=>null,saveMessagingConsent:async()=>{},saveDeviceIdentity:p.save,saveWalletObservation:async()=>{}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
beforeEach(async()=>{
 vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('navigator',{locks:{request:async(_name:string,work:()=>Promise<unknown>)=>work()}});
 p.key=(await createReceizIdIdentity({createdAt:'2026-10-28T12:00:00Z'})).keyFile;p.projection=await projectReceizIdentityAccount(p.key);p.retained=null;p.wallet=null;p.created=false;
 p.read.mockReset().mockResolvedValue(null);p.save.mockReset().mockResolvedValue(undefined);p.continue.mockReset().mockImplementation(()=>new Promise(()=>{}));p.request.mockReset().mockImplementation(()=>new Promise(()=>{}));
 p.grant.mockReset().mockImplementation(async(args:{applicationId:string;scopes:string[]})=>({applicationId:args.applicationId,keyId:p.key!.keyId,artifactDigest:'a'.repeat(64),grantedScopes:args.scopes,accessToken:'fixture-grant',expiresAtKai:999999999}));
 p.image.mockReset().mockImplementation(async(key:ReceizKeyFile)=>{p.key=key;p.projection=await projectReceizIdentityAccount(key);p.created=true;return{bytes:new Uint8Array([1]),filename:'identity.png',mimeType:'image/png'};});
});
afterEach(()=>{vi.unstubAllGlobals();});
async function historicalGenesis(){p.key=await initializeFreshBankAccount(p.key!);p.projection=await projectReceizIdentityAccount(p.key);return readCarriedWalletObservation(p.projection)!;}
function firstAccountCommit(identity:OpenIdentity){
 const host=document.createElement('div'),root=createRoot(host),frames:{balance:string|null;investment:string|null}[]=[];
 function Frame(){const portfolio=useMarketPortfolio(identity,true);useLayoutEffect(()=>{frames.push({balance:host.querySelector('.balance-amount')?.textContent??null,investment:host.querySelector('.account-investment-total-copy strong')?.textContent??null});});return <LiveAccount wallet={identity.knownWallet()!.wallet} walletHistory={identity.knownWallet()!.history} portfolio={portfolio.data} marketItems={[]} busy={false} error={null} observedAt={null} onRefresh={()=>{}} onSend={()=>{}} onReceive={()=>{}} onBalance={()=>{}} onAssets={()=>{}} onLedger={()=>{}}/>;}
 act(()=>root.render(<Frame/>));return{first:frames[0],host,close:()=>act(()=>root.unmount())};
}
it('paints genuine fresh creation with zero Investments in its first Account commit while background reads remain unresolved',async()=>{
 const identity=await createNativeIdentity(true);let view:ReturnType<typeof firstAccountCommit>|undefined;
 try{expect(p.projection?.portableStateVerified).toBe(true);expect(readCarriedWalletObservation(p.projection!)?.source).toBe('account-genesis');view=firstAccountCommit(identity);expect(view.first).toEqual({balance:'$0.00',investment:'$0.00'});expect(p.request).not.toHaveBeenCalled();}finally{view?.close();identity.dispose();}
});
it('keeps retained same-account holdings in the first commit without waiting for the catalog or portfolio read',async()=>{
 const genesis=await historicalGenesis();p.wallet=genesis;p.retained=parseMarketPortfolio({...portfolioFixture(),actorUserId:genesis.wallet.userId},genesis.wallet.userId);
 const identity=await openCanonicalIdentity(new Uint8Array([2]),'','identity.png',true),view=firstAccountCommit(identity);
 try{expect(view.first).toEqual({balance:'$0.00',investment:'$30.00'});}finally{view.close();identity.dispose();}
});
it('does not turn an arbitrary restored historical genesis into zero current holdings',async()=>{
 await historicalGenesis();const identity=await openCanonicalIdentity(new Uint8Array([2]),'','identity.png',true),view=firstAccountCommit(identity);
 try{expect(view.first).toEqual({balance:'$0.00',investment:'—'});}finally{view.close();identity.dispose();}
});
it('rejects foreign retained holdings instead of using them or guessing an empty portfolio',async()=>{
 await historicalGenesis();p.retained=parseMarketPortfolio(portfolioFixture(),portfolioUid);const identity=await openCanonicalIdentity(new Uint8Array([2]),'','identity.png',true),view=firstAccountCommit(identity);
 try{expect(view.first).toEqual({balance:'$0.00',investment:'—'});expect(identity.knownMarketPortfolio?.()).toBeNull();}finally{view.close();identity.dispose();}
});
it('keeps the freshly established zero when the existing background continuation places that same new identity',async()=>{
 const identity=await createNativeIdentity(true);try{expect(identity.knownMarketPortfolio?.()?.positions).toEqual([]);p.continue.mockResolvedValue({ok:true,session:{uid:portfolioUid}});const api=await identity.marketPortfolio!();expect(api.known()?.accountUid).toBe(portfolioUid);expect(api.known()?.positions).toEqual([]);expect(p.request).not.toHaveBeenCalled();}finally{identity.dispose();}
});
