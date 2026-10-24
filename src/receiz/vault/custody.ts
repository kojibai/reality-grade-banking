import type {ReceizIdentityLoginProof,ReceizKeyFile} from '@receiz/sdk';
import {nativeFetch,nativeRequestTimeout,permittedNativePath} from '../native-transport';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest,vaultObject} from './encoding';
import {emptyVaultJournal} from './journal';
import {encodeVaultPrivateSource,readVaultPrivateSource,type VaultAdmittedCustody,type VaultPrivateSource} from './source';
import {loadVaultNative,type VaultNativeRuntime,type VaultNativeCustodyAdmission,type VaultNativeCustodySubmission,type VaultNativeExchangeRequest} from './runtime';
type Sdk=Pick<typeof import('@receiz/sdk'),'createReceizIdentityKeyFile'|'serializeReceizIdentityArtifact'|'parseReceizIdentityArtifactText'|'signReceizIdentityLoginProof'|'verifyReceizIdentityPublicKeyProjectionSignature'>;
type Loaders={sdk?():Promise<Sdk>;native?():Promise<VaultNativeRuntime>;signal?:AbortSignal};
export type VaultCustodyParent={userId:string;receizId:string;identity:ReceizKeyFile;passphrase:string;request(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>;signal?:AbortSignal}):Promise<unknown>};
export type VaultCustodyPorts=Loaders&{applicationId:string;vaultId:string;name:string;parent():Promise<VaultCustodyParent>;save(next:VaultPrivateSource,expected:VaultPrivateSource|null):Promise<void>;nowMs?():number};
const bytes=(v:unknown)=>new TextEncoder().encode(vaultCanonical(v)),parse=(b:Uint8Array):unknown=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));
const scopes=['receiz:wallet.read','receiz:reserve.read','receiz:reserve.write','receiz:settlement.read','receiz:settlement.write','receiz:domains.read'] as const;
const sdkFor=(p:Loaders)=>p.sdk?p.sdk():import('@receiz/sdk');
const nativeFor=(p:Loaders)=>p.native?p.native():loadVaultNative();
const alive=(signal?:AbortSignal)=>{if(signal?.aborted)throw Error('VAULT_CLOSED');};
const path=(applicationId:string)=>`/api/connect/vault/custody?applicationId=${encodeURIComponent(applicationId)}`;
function original(source:VaultPrivateSource,ref:string){const b=source.blocks.find(b=>b.sha256===ref);if(!b)throw Error('VAULT_SOURCE_REQUIRED');return vaultBytes(b.exactBytesB64u,23*1024*1024);}
async function block(value:unknown){const exact=bytes(value);return {sha256:await vaultDigest(exact),exactBytesB64u:vaultBase64(exact)};}
function expectedBinding(s:VaultPrivateSource,a:VaultNativeCustodyAdmission,applicationId:string){if(a.vaultId!==s.vaultId||a.applicationId!==applicationId||a.owner.userId!==s.owner.accountId||a.owner.keyId!==s.owner.keyId||a.owner.receizId!==s.owner.receizId||a.custody.accountId!==s.custody.accountId||a.custody.keyId!==s.custody.keyId)throw Error('VAULT_CUSTODY_MISMATCH');}
async function childPossession(source:VaultPrivateSource,submission:VaultNativeCustodySubmission,sdk:Sdk,sourceHead:string){
 const key=sdk.parseReceizIdentityArtifactText(source.custody.keyFileText),r=submission.request;
 if(key.keyId!==source.custody.keyId||key.owner.uid!==source.custody.accountId||r.custody.accountId!==source.custody.accountId||r.custody.keyId!==source.custody.keyId)throw Error('VAULT_CUSTODY_KEY_MISMATCH');
 const challenge=vaultBase64(bytes({schema:'bank.vault.custody-key-admission.v1',vaultId:source.vaultId,accountId:r.custody.accountId,keyId:r.custody.keyId,sourceHead})),proof=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase:source.custody.passphrase,challengeB64Url:challenge});
 if(proof.keyId!==r.custody.keyId||proof.alg!==r.custody.alg||proof.challengeB64Url!==challenge||!await sdk.verifyReceizIdentityPublicKeyProjectionSignature({keyId:r.custody.keyId,alg:r.custody.alg,publicKeyRawB64u:r.custody.publicKeyRawB64u,challengeB64Url:challenge,signatureB64Url:proof.signatureB64Url}))throw Error('VAULT_CUSTODY_KEY_MISMATCH');return key;
}
async function qualify(value:VaultPrivateSource,ports:Loaders,expectedApplicationId?:string){
 alive(ports.signal);const source=await readVaultPrivateSource(encodeVaultPrivateSource(value));alive(ports.signal);if(!source.custody.sourceRef)throw Error('VAULT_CUSTODY_REQUIRED');const [sdk,native]=await Promise.all([sdkFor(ports),nativeFor(ports)]);alive(ports.signal);
 const submission=await native.inspectVaultCustodySubmission(parse(original(source,source.custody.submissionRef))),packet=parse(original(source,source.custody.sourceRef)),record=packet as {submission?:unknown},admitted=await native.verifyVaultCustodySource(packet);alive(ports.signal);
 if(vaultCanonical(record.submission)!==vaultCanonical(submission))throw Error('VAULT_CUSTODY_MISMATCH');expectedBinding(source,admitted,expectedApplicationId??submission.request.applicationId);
 const identity=await childPossession(source,submission,sdk,admitted.custodyHead);alive(ports.signal);return {source,sdk,native,admitted,identity,submission};
}
/** Metadata preflight chooses the actual native parent head. The completed
 * native Source, rather than this metadata, admits ownership. Parent key bytes
 * are never retained in the private Vault. */
export async function prepareVaultCustody(ports:VaultCustodyPorts):Promise<VaultPrivateSource>{
 alive(ports.signal);if(!/^rc_[A-Za-z0-9_-]{1,128}$/.test(ports.applicationId)||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(ports.vaultId)||!ports.name.trim()||ports.name.length>80||/[\u0000-\u001f\u007f]/.test(ports.name))throw Error('VAULT_FORMAT_INVALID');
 const [parent,sdk,native]=await Promise.all([ports.parent(),sdkFor(ports),nativeFor(ports)]);alive(ports.signal);
 const raw=await parent.request(path(ports.applicationId),{method:'POST',body:{operation:'prepare-owner',submission:{}},signal:ports.signal}),metadata=vaultObject(raw,['schema','owner','parentSourceSha256']),owner=vaultObject(metadata.owner,['userId','receizId','keyId','alg','publicKeyRawB64u']);alive(ports.signal);
 if(metadata.schema!=='receiz.bank.vault-owner-binding.v1'||owner.userId!==parent.userId||owner.receizId!==parent.receizId||owner.keyId!==parent.identity.keyId||owner.alg!==parent.identity.alg||owner.publicKeyRawB64u!==parent.identity.crypto.publicKeyRawB64u||typeof metadata.parentSourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(metadata.parentSourceSha256))throw Error('VAULT_OWNER_MISMATCH');
 const accountId=await native.deriveVaultCustodyAccountId(parent.userId,ports.vaultId),child=await sdk.createReceizIdentityKeyFile({owner:{uid:accountId}});alive(ports.signal);
 const request={schema:'receiz.bank.vault-custody-create.v1' as const,applicationId:ports.applicationId,vaultId:ports.vaultId,ownerUserId:parent.userId,ownerReceizId:parent.receizId,parentSourceSha256:metadata.parentSourceSha256,parent:{keyId:String(owner.keyId),alg:owner.alg as 'Ed25519'|'P-256',publicKeyRawB64u:String(owner.publicKeyRawB64u)},custody:{accountId,keyId:child.keyId,alg:child.alg,publicKeyRawB64u:child.publicKeyRawB64u,localUid:accountId},createdAt:new Date((ports.nowMs??Date.now)()).toISOString()},challengeB64Url=native.vaultCustodyChallenge(request),submission=await native.inspectVaultCustodySubmission({request,parentProof:await sdk.signReceizIdentityLoginProof({keyFile:parent.identity,passphrase:parent.passphrase,challengeB64Url}),childProof:await sdk.signReceizIdentityLoginProof({keyFile:child.keyFile,challengeB64Url})});alive(ports.signal);
 const held=await block(submission),source:VaultPrivateSource={schema:'bank.vault.private-source.v1',vaultId:ports.vaultId,name:ports.name,owner:{accountId:parent.userId,keyId:parent.identity.keyId,receizId:parent.receizId},custody:{accountId,keyId:child.keyId,keyFileText:sdk.serializeReceizIdentityArtifact(child.keyFile),passphrase:'',submissionRef:held.sha256,sourceRef:null},journal:emptyVaultJournal(ports.vaultId,parent.identity.keyId),workflows:{money:null,assets:null,market:null},blocks:[held]};
 await childPossession(source,submission,sdk,held.sha256);alive(ports.signal);const captured=await readVaultPrivateSource(encodeVaultPrivateSource(source));await ports.save(captured,null);alive(ports.signal);return captured;
}
/** Retention admission for the pre-create backup only. Both signatures and
 * child possession verify, but parent account ownership/current native state
 * remain unadmitted until the final complete custody Source is available. */
export async function admitPreparedVaultCustody(value:VaultPrivateSource,ports:Loaders={},applicationId?:string){
 alive(ports.signal);const source=await readVaultPrivateSource(encodeVaultPrivateSource(value));if(source.custody.sourceRef!==null)throw Error('VAULT_PREPARED_SOURCE_REQUIRED');const [sdk,native]=await Promise.all([sdkFor(ports),nativeFor(ports)]);alive(ports.signal);const submission=await native.inspectVaultCustodySubmission(parse(original(source,source.custody.submissionRef))),r=submission.request;
 if(r.applicationId!==(applicationId??r.applicationId)||r.vaultId!==source.vaultId||r.ownerUserId!==source.owner.accountId||r.ownerReceizId!==source.owner.receizId||r.parent.keyId!==source.owner.keyId||r.custody.accountId!==source.custody.accountId||r.custody.keyId!==source.custody.keyId)throw Error('VAULT_CUSTODY_MISMATCH');await childPossession(source,submission,sdk,source.custody.submissionRef);alive(ports.signal);
 return Object.freeze({phase:'prepared' as const,nativeAccountAdmitted:false as const,vaultId:source.vaultId,applicationId:r.applicationId,request:structuredClone(r)});
}
/** Retries use the same persisted child and exact signed request. An unknown
 * response never generates a replacement account/key or claims zero writes. */
export async function completeVaultCustodyCreation(value:VaultPrivateSource,ports:VaultCustodyPorts):Promise<VaultPrivateSource>{
 alive(ports.signal);const before=await readVaultPrivateSource(encodeVaultPrivateSource(value));if(before.vaultId!==ports.vaultId)throw Error('VAULT_CUSTODY_MISMATCH');if(before.custody.sourceRef){await qualify(before,ports,ports.applicationId);return before;}
 const [sdk,native,parent]=await Promise.all([sdkFor(ports),nativeFor(ports),ports.parent()]);alive(ports.signal);const submission=await native.inspectVaultCustodySubmission(parse(original(before,before.custody.submissionRef))),r=submission.request;
 if(r.applicationId!==ports.applicationId||r.vaultId!==before.vaultId||r.ownerUserId!==parent.userId||r.ownerReceizId!==parent.receizId||r.parent.keyId!==parent.identity.keyId||r.ownerUserId!==before.owner.accountId||r.parent.keyId!==before.owner.keyId||r.ownerReceizId!==before.owner.receizId)throw Error('VAULT_OWNER_MISMATCH');await childPossession(before,submission,sdk,before.custody.submissionRef);alive(ports.signal);
 const packet=await parent.request(path(ports.applicationId),{method:'POST',body:{operation:'create',submission},signal:ports.signal});alive(ports.signal);const held=await block(packet),next={...before,custody:{...before.custody,sourceRef:held.sha256},blocks:[...before.blocks,held]};await qualify(next,{sdk:async()=>sdk,native:async()=>native,signal:ports.signal},ports.applicationId);alive(ports.signal);await ports.save(next,before);alive(ports.signal);return next;
}
export async function admitVaultCustodyForBank(source:VaultPrivateSource,ports:Loaders={}):Promise<VaultAdmittedCustody>{const {admitted:a}=await qualify(source,ports);return {vaultId:a.vaultId,ownerAccountId:a.owner.userId,ownerKeyId:a.owner.keyId,ownerReceizId:a.owner.receizId,custodyAccountId:a.custody.accountId,custodyKeyId:a.custody.keyId};}
function permitted(pathname:string,applicationId:string,method:string,body:Record<string,unknown>|undefined){
 const u=new URL(pathname,'https://receiz.com');if(!permittedNativePath(u.href,method))throw Error('VAULT_CHILD_PATH_REFUSED');
 if(u.pathname==='/api/connect/offline-notes/connected')return u;
 if(method!=='POST'||[...u.searchParams.keys()].length!==1||u.searchParams.getAll('applicationId').length!==1||u.searchParams.get('applicationId')!==applicationId)throw Error('VAULT_CHILD_PATH_REFUSED');
 if(/^\/api\/connect\/bank\/(?:payments\/(?:prepare|execute|recover)|assets\/(?:prepare|execute|recover|portfolio))$/.test(u.pathname)||/^\/api\/connect\/vault\/market-shares\/(?:prepare|execute|recover|portfolio|source)$/.test(u.pathname))return u;
 if(u.pathname==='/api/connect/vault/custody'&&body&&['money-source','money-prepare','money-capacity','money-execute','money-public','asset-prepare','asset-source','asset-public','custody-witness','publish-public'].includes(String(body.operation)))return u;throw Error('VAULT_CHILD_PATH_REFUSED');
}
/** An admitted private Original is the isolated credential. No parent callback,
 * ordinary account record, browser identity store, cookie or refresh grant is
 * used during this unlocked lifetime. Every financial execution still requires
 * the native operation's exact separate consent and once-only source writer. */
export async function createVaultChildAuthority(input:Loaders&{source:VaultPrivateSource;applicationId:string;assertOpen():void;fetch?:typeof fetch;nowMs?():number}){
 const {applicationId,assertOpen,signal:parentSignal}=input,nowMs=input.nowMs??Date.now,fetcher=input.fetch??nativeFetch,lifetime=new AbortController(),signal=parentSignal?AbortSignal.any([parentSignal,lifetime.signal]):lifetime.signal;
 const q=await qualify(input.source,{sdk:input.sdk,native:input.native,signal},applicationId),{admitted:a,sdk,native}=q,passphrase=q.source.custody.passphrase;let identity:ReceizKeyFile|null=q.identity,access:{token:string;until:number}|null=null,opening:Promise<string>|null=null;
 const binding={userId:a.custody.accountId,receizId:a.owner.receizId,keyId:a.custody.keyId,vaultId:a.vaultId,applicationId};
 function live(){if(signal.aborted||!identity)throw Error('VAULT_CLOSED');assertOpen();}
 function lock(){access=null;identity=null;if(!lifetime.signal.aborted)lifetime.abort();}
 parentSignal?.addEventListener('abort',lock,{once:true});if(parentSignal?.aborted)lock();
 async function sign(challengeB64Url:string):Promise<ReceizIdentityLoginProof>{live();const key=identity!,proof=await sdk.signReceizIdentityLoginProof({keyFile:key,passphrase,challengeB64Url});live();return proof;}
 async function token(){live();if(access&&nowMs()<access.until)return access.token;if(opening)return opening;
  opening=(async()=>{const expected=[...native.VAULT_CHILD_SCOPES];if(vaultCanonical([...expected].sort())!==vaultCanonical([...scopes].sort()))throw Error('VAULT_CHILD_ACCESS_INVALID');const started=nowMs(),r:VaultNativeExchangeRequest={schema:'receiz.bank.vault-custody-exchange.v1',applicationId,vaultId:a.vaultId,ownerUserId:a.owner.userId,accountId:a.custody.accountId,keyId:a.custody.keyId,nonce:vaultBase64(crypto.getRandomValues(new Uint8Array(24))),issuedAtMs:started},proof=await sign(native.vaultCustodyExchangeChallenge(r)),response=await fetcher(`https://receiz.com${path(applicationId)}`,{method:'POST',credentials:'omit',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation:'open',submission:{request:r,proof}}),signal:AbortSignal.any([signal,AbortSignal.timeout(60000)])});live();if(!response.ok)throw Error('VAULT_CHILD_ACCESS_UNAVAILABLE');const raw=vaultObject(await response.json(),['access_token','token_type','expires_in','scope','custody']),c=vaultObject(raw.custody,['userId','keyId','applicationId','receizId','vaultId']);live();
   if(raw.token_type!=='Bearer'||raw.expires_in!==60||typeof raw.access_token!=='string'||raw.access_token.length>16384||typeof raw.scope!=='string'||vaultCanonical(raw.scope.split(' ').sort())!==vaultCanonical(expected.sort())||vaultCanonical(c)!==vaultCanonical(binding))throw Error('VAULT_CHILD_ACCESS_INVALID');const parts=raw.access_token.split('.');if(parts.length!==3)throw Error('VAULT_CHILD_ACCESS_INVALID');let claims:Record<string,unknown>;try{claims=parse(vaultBytes(parts[1],16384)) as Record<string,unknown>;}catch{throw Error('VAULT_CHILD_ACCESS_INVALID');}
   // Claim consistency only. The existing issuer/resource verifier checks the
   // token signature and exact current native child authority on every request.
   if(claims.iss!=='https://receiz.com'||claims.sub!==binding.userId||claims.client_id!==applicationId||claims.aud!==applicationId||claims.actor_type!=='vault_custody_v1'||claims.actor_label!==binding.keyId||claims.token_use!=='access'||claims.scope!==raw.scope||!Number.isSafeInteger(claims.iat)||!Number.isSafeInteger(claims.exp)||Number(claims.exp)-Number(claims.iat)!==60||Number(claims.iat)*1000>nowMs()+5000||Number(claims.exp)*1000<=nowMs())throw Error('VAULT_CHILD_ACCESS_INVALID');const until=Math.min(started+60000,Number(claims.exp)*1000)-5000;live();access={token:raw.access_token,until};return raw.access_token;
  })().finally(()=>{opening=null;});return opening;
 }
 async function request(route:string,options:{method:'GET'|'POST';body?:Record<string,unknown>;signal?:AbortSignal}):Promise<unknown>{live();const body=options.body?structuredClone(options.body):undefined,u=permitted(route,applicationId,options.method,body);if(options.signal?.aborted)throw Error('VAULT_REQUEST_ABORTED');const bearer=await token();live();if(options.signal?.aborted)throw Error('VAULT_REQUEST_ABORTED');const response=await fetcher(u,{method:options.method,credentials:'omit',redirect:'error',headers:{Authorization:`Bearer ${bearer}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.any([signal,...(options.signal?[options.signal]:[]),AbortSignal.timeout(nativeRequestTimeout(u))])});live();if(!response.ok){if(response.status===401)access=null;throw Error('VAULT_NATIVE_OUTCOME_UNKNOWN');}const result=await response.json();live();return result;}
 return Object.freeze({signal,binding:Object.freeze(binding),sign,request,async account(){live();return {userId:binding.userId,receizId:binding.receizId,identity:identity!,passphrase,request};},lock});
}
