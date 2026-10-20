import {canonicalizeReceizConstitution as canonical} from '../../../../packages/receiz-sdk/src/constitution';
import {digestReceizAuthority} from '../../../../packages/receiz-sdk/src/authorityEncoding';
import {parseReceizIdentityArtifactText,verifyReceizIdentityPortableStateProof,signReceizIdentityLoginProof,
 receizBase64UrlEncode,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizKeyFileV1,type ReceizIdentityKeyAlgorithm} from '../../../../packages/receiz-sdk/src/identity';

const schema='receiz.bank.note-account-receiving-request.v1' as const;
type Basis=Readonly<{schema:typeof schema;receiverUserId:string;receiverKeyId:string;receiverAlgorithm:ReceizIdentityKeyAlgorithm;
 receiverPublicKeyRawB64u:string;receiverUsername:string|null;identityPortableStateDigest:string;nonce:string}>;
export type BankNoteAccountReceivingRequest=Basis&Readonly<{requestDigest:string;signatureB64Url:string}>;
const fields=['schema','receiverUserId','receiverKeyId','receiverAlgorithm','receiverPublicKeyRawB64u','receiverUsername','identityPortableStateDigest','nonce'];
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
function check(v:Basis){
 if(!v||v.schema!==schema||Object.keys(v).sort().join('|')!==[...fields].sort().join('|')||!uuid(v.receiverUserId)||!uuid(v.nonce)
  ||!hash(v.receiverKeyId)||!hash(v.identityPortableStateDigest)||!['Ed25519','P-256'].includes(v.receiverAlgorithm)
  ||typeof v.receiverPublicKeyRawB64u!=='string'||!/^[A-Za-z0-9_-]{43,180}$/.test(v.receiverPublicKeyRawB64u)
  ||v.receiverUsername!==null&&(typeof v.receiverUsername!=='string'||!v.receiverUsername.trim()||v.receiverUsername.length>128))throw Error('BANK_NOTE_RECEIVING_REQUEST_INVALID');
}
const challenge=(digest:string)=>receizBase64UrlEncode(new TextEncoder().encode(`${schema}:${digest}`));

/** A signed destination request, not account membership, value or qualification.
 * The host independently checks its actual account/key binding at redemption.
 * The receiver needs only their existing Identity Seal; no authenticator probe,
 * enrollment, attestation, server request or installation counter is performed. */
export async function createBankNoteAccountReceivingRequest(input:Readonly<{identity:ReceizKeyFileV1;passphrase?:string;accountUserId:string}>):Promise<Uint8Array>{
 const identity=parseReceizIdentityArtifactText(JSON.stringify(input.identity));
 if(await verifyReceizIdentityPortableStateProof(identity)!=='verified')throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 const state=identity.portableState?.snapshot as {schema?:string;createdAt?:string;account?:{userId?:string};bankGenesis?:{schema?:string;keyId?:string;userId?:string;createdAt?:string}}|undefined;
 const accountState=state?.schema==='receiz.account.state.v3'&&state.account?.userId===input.accountUserId;
 // A freshly created SDK ID carries its local device UID, not a native UUID.
 // The already known native destination is signed routing intent only. Native
 // account/key membership remains independently enforced at credit admission.
 const deviceState=state?.schema==='receiz.device.identity.v1'&&state.account?.userId===identity.owner.uid;
 // Bank initialization signs an empty v3 genesis before native account binding.
 // Its verified local owner/key marker may also sign the subsequently known
 // native UUID as routing intent; an ordinary foreign v3 account may not.
 const genesis=state?.bankGenesis;
 const bankGenesis=state?.schema==='receiz.account.state.v3'&&identity.owner.uid.startsWith('receiz_device_')
  &&state.account?.userId===identity.owner.uid&&genesis?.schema==='bank.account-genesis.v1'
  &&genesis.userId===identity.owner.uid&&genesis.keyId===identity.keyId&&genesis.createdAt===identity.issuedAt&&state.createdAt===identity.issuedAt;
 if(!accountState&&!deviceState&&!bankGenesis)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 const basis:Basis={schema,receiverUserId:input.accountUserId,receiverKeyId:identity.keyId,receiverAlgorithm:identity.alg,
  receiverPublicKeyRawB64u:identity.crypto.publicKeyRawB64u,receiverUsername:identity.owner.username?.trim()||null,
  identityPortableStateDigest:identity.portableState!.proof!.digestSha256Hex,nonce:crypto.randomUUID()};
 check(basis);const requestDigest=await digestReceizAuthority('identity',schema,basis);
 const signature=await signReceizIdentityLoginProof({keyFile:identity,passphrase:input.passphrase,challengeB64Url:challenge(requestDigest)});
 const bytes=new TextEncoder().encode(canonical({...basis,requestDigest,signatureB64Url:signature.signatureB64Url}));
 await verifyBankNoteAccountReceivingRequest(bytes);return bytes;
}

export async function verifyBankNoteAccountReceivingRequest(input:Uint8Array):Promise<BankNoteAccountReceivingRequest>{
 if(!input.length||input.length>16384)throw Error('BANK_NOTE_RECEIVING_REQUEST_INVALID');
 const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(input));
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).sort().join('|')!==[...fields,'requestDigest','signatureB64Url'].sort().join('|'))throw Error('BANK_NOTE_RECEIVING_REQUEST_INVALID');
 const value=structuredClone(parsed) as BankNoteAccountReceivingRequest,{requestDigest,signatureB64Url,...basis}=value;check(basis);
 if(!hash(requestDigest)||await digestReceizAuthority('identity',schema,basis)!==requestDigest||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:basis.receiverKeyId,alg:basis.receiverAlgorithm,
  publicKeyRawB64u:basis.receiverPublicKeyRawB64u,challengeB64Url:challenge(requestDigest),signatureB64Url}))throw Error('BANK_NOTE_RECEIVING_REQUEST_INVALID');
 return Object.freeze(value);
}
