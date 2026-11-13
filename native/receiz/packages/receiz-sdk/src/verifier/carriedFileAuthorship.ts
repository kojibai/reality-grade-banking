import {carryAuthoredFile,openAuthoredFileCarrier} from './authoredFileCarrier.js';
import { base64UrlDecode, base64UrlEncode, isRecord, jcsCanonicalize, sha256Hex } from './crypto.js';
import { normalizeLocalPbiAuthorshipProof, verifyLocalPbiAuthorshipProof } from '../pbiLocalAuthorship.js';
import { verifyLocalPbiAssertion } from '../pbiLocalVerifier.js';
import { extractReceizPortableAssetPayload } from '../portableAsset.js';
import {ReceizProtocolLimitError} from '../verificationLimits.js';
import type { CarriedFileAuthorship, ReceizLocalArtifactOpenResult } from './types.js';

const KIND = 'receiz.carried-file-authorship.v1';
const HEX = /^[a-f0-9]{64}$/;
type CanonicalReader = (input: {fileBytes:Uint8Array;filename:string;mime:string}) => Promise<ReceizLocalArtifactOpenResult>;
export type {CarriedFileAuthorship} from './types.js';

/** Transport only. Both exact artifacts and the existing PBI proof must still
 * be independently verified. No new seal, signature, owner or history is issued. */
export function appendCarriedFileAuthorship(input: Readonly<{
  original:Uint8Array;source:Uint8Array;sourceFilename:string;sourceMimeType:string;proof:unknown;
}>):Uint8Array {
 const proof=normalizeLocalPbiAuthorshipProof(input.proof);
 if(!proof||!input.original.length||!input.source.length)throw new TypeError('FILE_AUTHORSHIP_SOURCE_REQUIRED');
 return carryAuthoredFile(input.original,{kind:KIND,
  sourceBase64Url:base64UrlEncode(input.source),sourceFilename:input.sourceFilename,sourceMimeType:input.sourceMimeType,proof});
}

export function readCarriedFileAuthorship(bytes:Uint8Array) {
 const parsed=openAuthoredFileCarrier(bytes);if(!parsed)return null;
 const {previousCarrier:_previousCarrier,originalIsSource:_originalIsSource,...value}=parsed.body;
 if(!isRecord(value)||value.kind!==KIND)return null;
 if(Object.keys(value).sort().join('|')!=='kind|proof|sourceBase64Url|sourceFilename|sourceMimeType'
  ||typeof value.sourceBase64Url!=='string'||!value.sourceBase64Url||typeof value.sourceFilename!=='string'||!value.sourceFilename
  ||typeof value.sourceMimeType!=='string'||!value.sourceMimeType.includes('/'))throw new TypeError('FILE_AUTHORSHIP_TRANSPORT_INVALID');
 const proof=normalizeLocalPbiAuthorshipProof(value.proof);
 if(!proof)throw new TypeError('FILE_AUTHORSHIP_PROOF_INVALID');
 const source=base64UrlDecode(value.sourceBase64Url);
 if(base64UrlEncode(source)!==value.sourceBase64Url||!source.length||!parsed.original.length)throw new TypeError('FILE_AUTHORSHIP_TRANSPORT_INVALID');
 // Canonical metadata round-trip refuses duplicate keys, extra fields and
 // alternate carrier placement. The sealed Source still binds every native byte.
 const canonical=carryAuthoredFile(parsed.original,{kind:KIND,sourceBase64Url:value.sourceBase64Url,
  sourceFilename:value.sourceFilename,sourceMimeType:value.sourceMimeType,proof});
 if(canonical.length!==bytes.length||canonical.some((byte,index)=>byte!==bytes[index]))throw new TypeError('FILE_AUTHORSHIP_TRANSPORT_NONCANONICAL');
 return {original:parsed.original,source,sourceFilename:value.sourceFilename,sourceMimeType:value.sourceMimeType,proof};
}

/** A source-scoped signature stays source-scoped. The exact sealed composer
 * Source must commit to this exact native file; neither a display flag nor an
 * arbitrary valid signature can stand in for that connection. */
export async function verifyCarriedFileAuthorship(input:Readonly<{
  carried:NonNullable<ReturnType<typeof readCarriedFileAuthorship>>;
  readSource:CanonicalReader;
}>):Promise<{authorship:CarriedFileAuthorship;source:Extract<ReceizLocalArtifactOpenResult,{ok:true}>}>{
 const {carried}=input;
 const source=await input.readSource({fileBytes:carried.source,filename:carried.sourceFilename,mime:carried.sourceMimeType});
 if(source.verification.denial)throw new ReceizProtocolLimitError(source.verification.denial.code,'verification-runtime');
 if(!source.ok||!source.verification.bundle||source.verification.assetContinuity?.state!=='verified')throw new TypeError('FILE_AUTHORSHIP_SEALED_SOURCE_REQUIRED');
 const bundle=source.verification.bundle,proof=carried.proof;
 const expected:Record<string,unknown>={slug:bundle.slug,code:bundle.code,pulse:bundle.kaiPulseEternal,claimHashHex:bundle.artifactSha256Basis};
 const sourceArtifactSha256=await sha256Hex(carried.source),originalArtifactSha256=await sha256Hex(carried.original);
 const scope=proof.input.proofObjectScope;
 if(scope){
  const head=source.verification.assetContinuity.headReference;
  const predecessorProofHead=typeof head==='string'&&HEX.test(head)?head:bundle.groth16ProofDigest;
  expected.proofObjectScope={predecessorArtifactSha256:sourceArtifactSha256,predecessorProofHead,receizId:scope.receizId,
   authorshipPosition:0,kaiUpulse:scope.kaiUpulse};
 }
 if(jcsCanonicalize(proof.input)!==jcsCanonicalize(expected)||!await verifyLocalPbiAuthorshipProof(proof,args=>verifyLocalPbiAssertion({...args,
  policy:{rpId:'receiz.com',originAllowList:['https://receiz.com','https://www.receiz.com','https://bankeiz.com','https://www.bankeiz.com','https://bank.receiz.com'],requireUP:true,requireUV:true}})))throw new TypeError('FILE_AUTHORSHIP_PROOF_MISMATCH');
 const sourcePayload:unknown=JSON.parse(new TextDecoder().decode(source.payloadBytes));
 const content:unknown=isRecord(sourcePayload)&&sourcePayload.schema==='receiz.portable_asset.v1'
  ?JSON.parse(new TextDecoder().decode((await extractReceizPortableAssetPayload(sourcePayload)).bytes)):sourcePayload;
 if(!isRecord(content)||content.schema!=='receiz.bank.asset-content.v2'||!Array.isArray(content.files))throw new TypeError('FILE_AUTHORSHIP_COMPOSER_SOURCE_REQUIRED');
 const protectedOriginal=isRecord(content.protectedOriginal)?content.protectedOriginal.file:null;
 const primaries=protectedOriginal?[protectedOriginal]:content.files.filter(file=>isRecord(file)&&file.role==='primary');
 const file=primaries.length===1?primaries[0]:null;
 const owner=source.verification.assetContinuity.ownerReceizId;
 if(!owner||content.ownerReceizId!==owner||!(isRecord(file)&&file.sha256===originalArtifactSha256&&file.size===carried.original.length
  ||!primaries.length&&sourceArtifactSha256===originalArtifactSha256))throw new TypeError('FILE_AUTHORSHIP_ORIGINAL_BINDING_MISMATCH');
 return {source,authorship:Object.freeze({state:'verified',scope:'enclosing-source',pbiReceiptHash:proof.pbiReceiptHash,sourceArtifactSha256,originalArtifactSha256})};
}
