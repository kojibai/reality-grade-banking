import {readVerifiedReceizDocumentBytesCanonical} from '../../../../packages/receiz-sdk/src/verifier/canonical';
import {receizCurrentPinnedSignatureV4Roots} from '../../../../packages/receiz-sdk/src/verifier/roots';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {receizBase64UrlDecode,receizBase64UrlEncode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature} from '../../../../packages/receiz-sdk/src/identity';
import {sha256Hex} from '../../../utils/sha256';
import {localProfileNamePreservationPatches} from '../../profile/localProfileNamePreservation';
import {custodyCanonical,custodyBytes,custodyExact,custodyHex,inspectVaultCustodySubmission,vaultCustodyReceivingAddress,type VaultCustodySource,type VaultCustodyKey,type VaultCustodyOwnerSource} from './custody';
type Json=Record<string,unknown>;
type RootMap=ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;
type Coordinate=VaultCustodySource['child'];
function fail(code:string):never{throw Error(`VAULT_CUSTODY_${code}`);}
function record(value:unknown):Json{if(!value||typeof value!=='object'||Array.isArray(value))fail('SOURCE_INVALID');return value as Json;}
const nativeAccountSchemas=new Set(['account-key-inventory-observation','account-key-write','account-key-revocation','account-device-binding','account-local-identity-binding','account-profile-creation','account-profile-name','account-profile-correction','account-profile-mutation','account-email-claim','account-credential','account-credential-reset','account-subscription','account-usage-grant','account-usage-lifecycle','account-creation-sigil-entitlement','account-showcase-publication'].map(name=>`receiz.${name}.v1`));
for(let n=1;n<=10;n++)nativeAccountSchemas.add(`receiz.account-creation.v${n}`);
/** Bounded custody projection of the existing accepted account primitives.
 * This reader grants no general account session, financial value or execution.
 * Both the enclosing Receiz artifact and native accepted-effect signature must
 * verify before any carried field is projected. No network or DB is used. */
async function accountReader(sources:VaultCustodySource['sources'],roots:RootMap){
 const blocks=new Map<string,Uint8Array>(),used=new Set<string>();
 for(const source of sources){if(!custodyExact(source,['sha256','exactBytesB64u'])||!custodyHex(source.sha256)||typeof source.exactBytesB64u!=='string'||blocks.has(source.sha256))fail('SOURCE_INVALID');const b=receizBase64UrlDecode(source.exactBytesB64u);if(receizBase64UrlEncode(b)!==source.exactBytesB64u||await sha256Hex(b)!==source.sha256)fail('SOURCE_DIGEST_INVALID');blocks.set(source.sha256,b);}
 const open=async(digest:unknown)=>{if(!custodyHex(digest))fail('SOURCE_REFERENCE_INVALID');const bytes=blocks.get(digest);if(!bytes)fail('SOURCE_REQUIRED');used.add(digest);return bytes!;};
 async function statement(digest:string){
  const opened=await readVerifiedReceizDocumentBytesCanonical({fileBytes:await open(digest),filename:'account.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});
  if(!opened.ok||!opened.verification.integrity.ok||opened.payloadMimeType!=='application/json')fail('SOURCE_UNVERIFIED');
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.payloadBytes),v=record(JSON.parse(raw));
  if(custodyCanonical(v)!==raw||typeof v.schema!=='string'||!nativeAccountSchemas.has(v.schema)||v.domain!==v.schema.replace(/\.v([0-9]+)$/u,'.root-signature.v$1')||typeof v.accountId!=='string'||typeof v.issuerRootKid!=='string')fail('SOURCE_STATEMENT_INVALID');
  const signature=record(v.rootSignature),root=roots.get(v.issuerRootKid),pulse=v.acceptedAtKaiPulse??v.observedAtKaiPulse;
  if(typeof pulse!=='string'||!/^(0|[1-9][0-9]*)$/u.test(pulse)||String(opened.verification.bundle?.kaiPulseEternal)!==pulse||!root||root.alg!=='Ed25519'||root.status!=='active'&&(root.status!=='retired'||!root.retiredAtPulse)||root.activeFromPulse&&BigInt(pulse)<BigInt(root.activeFromPulse)||root.retiredAtPulse&&BigInt(pulse)>BigInt(root.retiredAtPulse)||!custodyExact(signature,['kid','alg','sig'])||signature.kid!==v.issuerRootKid||signature.alg!=='Ed25519'||typeof signature.sig!=='string')fail('SOURCE_ROOT_INVALID');
  const {rootSignature:_signature,...payload}=v;
  if(!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,challengeB64Url:receizBase64UrlEncode(custodyBytes(payload)),signatureB64Url:signature.sig}))fail('SOURCE_ROOT_INVALID');
  if(v.schema==='receiz.account-key-inventory-observation.v1')await open(v.inventoryEvidenceSha256);
  else{await open(v.acceptedInputSha256);if(!Array.isArray(v.admissionEvidenceSha256)||!v.admissionEvidenceSha256.includes(v.acceptedInputSha256))fail('SOURCE_EVIDENCE_INVALID');for(const d of v.admissionEvidenceSha256)await open(d);}
  return v;
 }
 async function key(input:unknown){const v=record(input),registration=record(v.registration);if(!custodyHex(v.keyId)||!['Ed25519','P-256'].includes(String(registration.alg))||typeof registration.publicKeyRawB64u!=='string'||await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(registration.publicKeyRawB64u,registration.alg as VaultCustodyKey['alg'])!==v.keyId)fail('SOURCE_KEY_INVALID');return v;}
 async function history(coordinate:Coordinate){
  if(!custodyExact(coordinate,['accountId','baselineSourceSha256','headSourceSha256'])||!custodyHex(coordinate.baselineSourceSha256)||!custodyHex(coordinate.headSourceSha256))fail('SOURCE_COORDINATE_INVALID');
  const chain:Json[]=[],seen=new Set<string>();let cursor=coordinate.headSourceSha256;
  for(;;){if(seen.has(cursor))fail('SOURCE_CYCLE');seen.add(cursor);const v=await statement(cursor);if(v.accountId!==coordinate.accountId)fail('SOURCE_ACCOUNT_MISMATCH');chain.push(v);if(cursor===coordinate.baselineSourceSha256)break;if(!custodyHex(v.predecessorSourceSha256))fail('SOURCE_PREDECESSOR_INVALID');cursor=v.predecessorSourceSha256;}
  chain.reverse();const first=chain[0],keys=new Map<string,Json>(),bindings=new Map<string,Json>();let account:Json,profile:Json|null,credentials:unknown[];
  if(String(first.schema).startsWith('receiz.account-creation.')){if(first.operation!=='identity.account.create'||first.predecessorSourceSha256!==null)fail('SOURCE_CREATION_INVALID');account=record(first.effect);profile=first.initialProfile===null?null:record(first.initialProfile);credentials=Array.isArray(first.initialCredentials)?first.initialCredentials:[];}
  else if(first.schema==='receiz.account-key-inventory-observation.v1'){account=record(first.accountRecord);profile=first.profile==null?null:record(first.profile);credentials=Array.isArray(first.credentials)?first.credentials:[];if(!Array.isArray(first.keys))fail('SOURCE_KEY_INVALID');for(const k of first.keys){const value=await key(k);if(keys.has(String(value.keyId)))fail('SOURCE_KEY_INVALID');keys.set(String(value.keyId),value);}if(Array.isArray(first.deviceBindings))for(const b of first.deviceBindings){const value=record(b);bindings.set(String(value.keyId),value);}}
  else fail('SOURCE_BASELINE_INVALID');
  if(account.id!==coordinate.accountId)fail('SOURCE_ACCOUNT_MISMATCH');let pulse=BigInt(String(first.acceptedAtKaiPulse??first.observedAtKaiPulse));
  for(const v of chain.slice(1)){
   const next=BigInt(String(v.acceptedAtKaiPulse));if(next<pulse)fail('SOURCE_CAUSAL_ORDER_INVALID');pulse=next;
   const effect=record(v.effect);
   switch(v.schema){
    case 'receiz.account-key-write.v1':{const value=await key(effect),prior=keys.get(String(value.keyId));if(value.revokedAt!==null||prior?.revokedAt||prior&&prior.id!==value.id||v.operation==='identity.key.device-register'&&prior)fail('SOURCE_KEY_INVALID');keys.set(String(value.keyId),value);break;}
    case 'receiz.account-key-revocation.v1':{const prior=keys.get(String(effect.keyId));if(!prior||prior.id!==effect.identityKeyRowId||typeof effect.revokedAt!=='string')fail('SOURCE_KEY_INVALID');keys.set(String(effect.keyId),{...prior,revokedAt:effect.revokedAt});break;}
    case 'receiz.account-device-binding.v1':{const prior=bindings.get(String(effect.keyId));if(!custodyHex(effect.keyId)||typeof effect.publicKeyRawB64u!=='string'||prior&&prior.id!==effect.id)fail('SOURCE_BINDING_INVALID');bindings.set(effect.keyId,effect);break;}
    case 'receiz.account-profile-creation.v1':if(profile!==null||effect.user_id!==coordinate.accountId)fail('SOURCE_PROFILE_INVALID');profile=effect;break;
    case 'receiz.account-profile-name.v1':{if(!profile||!custodyExact(effect,['input','attempt','updatedAt']))fail('SOURCE_PROFILE_INVALID');const names=record(effect.input);if(!Number.isInteger(effect.attempt)||Number(effect.attempt)<0||Number(effect.attempt)>23)fail('SOURCE_PROFILE_INVALID');const patches=localProfileNamePreservationPatches({preferredUsername:typeof names.preferredUsername==='string'?names.preferredUsername:null,preferredDisplayName:typeof names.preferredDisplayName==='string'?names.preferredDisplayName:null});profile={...profile,...patches[Number(effect.attempt)]};break;}
    case 'receiz.account-profile-mutation.v1':if(!profile)fail('SOURCE_PROFILE_INVALID');if(effect.kind==='update-profile')profile={...profile,...record(effect.patch)};break;
    case 'receiz.account-email-claim.v1':if(effect.id!==account.id||effect.createdAt!==account.createdAt)fail('SOURCE_ACCOUNT_MISMATCH');account=effect;break;
    case 'receiz.account-credential.v1':credentials=[...credentials.filter(c=>record(c).credentialId!==effect.credentialId),effect];break;
    case 'receiz.account-credential-reset.v1':credentials=[];break;
   }
  }
  return {coordinate,first,account,profile,credentials,keys,bindings,pulse:pulse.toString()};
 }
 return {open,history,complete(){if(used.size!==blocks.size)fail('SOURCE_UNRELATED_BYTES');}};
}
export async function verifyVaultCustodySource(input:unknown,roots:RootMap=receizCurrentPinnedSignatureV4Roots()){
 if(!custodyExact(input,['schema','submission','receivingAddress','parent','child','sources'])||input.schema!=='receiz.bank.vault-custody-source.v1'||!Array.isArray(input.sources))fail('SOURCE_INVALID');
 const source=input as unknown as VaultCustodySource,submission=await inspectVaultCustodySubmission(source.submission),r=submission.request,reader=await accountReader(source.sources,roots),parent=await reader.history(source.parent),child=await reader.history(source.child);
 const parentKey=parent.keys.get(r.parent.keyId),childKey=child.keys.get(r.custody.keyId),binding=child.bindings.get(r.custody.keyId),parentRegistration=parentKey&&record(parentKey.registration),childRegistration=childKey&&record(childKey.registration);
 if(parent.coordinate.accountId!==r.ownerUserId||parent.coordinate.headSourceSha256!==r.parentSourceSha256||parentKey?.revokedAt!==null||parentRegistration?.alg!==r.parent.alg||parentRegistration?.publicKeyRawB64u!==r.parent.publicKeyRawB64u||`${parent.profile?.username}.receiz.id`!==r.ownerReceizId)fail('SOURCE_OWNER_MISMATCH');
 if(child.coordinate.accountId!==r.custody.accountId||childKey?.revokedAt!==null||child.keys.size!==1||childRegistration?.alg!==r.custody.alg||childRegistration?.publicKeyRawB64u!==r.custody.publicKeyRawB64u||child.profile!==null||child.credentials.length!==0||child.bindings.size!==1||binding?.localUid!==r.custody.localUid||binding?.publicKeyRawB64u!==r.custody.publicKeyRawB64u||binding?.revokedAt!==null||child.account.email!==`vault_${r.custody.accountId.replaceAll('-','')}@custody.receiz.local`)fail('SOURCE_ISOLATION_INVALID');
 if(child.first.schema!=='receiz.account-creation.v10'||child.first.acceptedInputSha256!==await sha256Hex(custodyBytes(submission))||child.account.createdAt!==r.createdAt||new TextDecoder().decode(await reader.open(child.first.acceptedInputSha256))!==custodyCanonical(submission)||source.receivingAddress!==vaultCustodyReceivingAddress(r.custody.accountId))fail('SOURCE_CREATION_INVALID');
 reader.complete();return Object.freeze({owner:Object.freeze({userId:r.ownerUserId,receizId:r.ownerReceizId,keyId:r.parent.keyId}),custody:Object.freeze({...r.custody}),vaultId:r.vaultId,applicationId:r.applicationId,parentHead:parent.coordinate.headSourceSha256,custodyHead:child.coordinate.headSourceSha256,receivingAddress:source.receivingAddress});
}
export async function verifyVaultCustodyOwnerSource(input:unknown,roots:RootMap=receizCurrentPinnedSignatureV4Roots()){
 if(!custodyExact(input,['schema','owner','account','sources'])||input.schema!=='receiz.bank.vault-owner-source.v1'||!Array.isArray(input.sources))fail('SOURCE_INVALID');const source=input as unknown as VaultCustodyOwnerSource,reader=await accountReader(source.sources,roots),account=await reader.history(source.account),key=account.keys.get(source.owner.keyId),registration=key&&record(key.registration);
 if(account.coordinate.accountId!==source.owner.userId||key?.revokedAt!==null||registration?.alg!==source.owner.alg||registration?.publicKeyRawB64u!==source.owner.publicKeyRawB64u||`${account.profile?.username}.receiz.id`!==source.owner.receizId)fail('SOURCE_OWNER_MISMATCH');reader.complete();return Object.freeze({...source.owner,parentSourceSha256:source.account.headSourceSha256});
}
