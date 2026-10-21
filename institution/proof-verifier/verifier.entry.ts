// Read-only composition of the unchanged, included v129 canonical verifier.
import {ledgerSourceHistoryFromPayload} from '../../src/receiz/ledger-source-payload';
import {readVerifiedReceizDocumentBytesCanonical} from '../../native/receiz/packages/receiz-sdk/src/verifier/canonical';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import documentKey from '../../native/receiz/packages/receiz-sdk/src/verifier/documentSealVerificationKey';
import kaiKey from '../../native/receiz/packages/receiz-sdk/src/kaiSigilVerificationKey';
import {recognizeReceizGroth16Structure} from '../../native/receiz/packages/receiz-sdk/src/verifier/groth16';
import {jcsCanonicalize,sha256Hex} from '../../native/receiz/packages/receiz-sdk/src/verifier/crypto';

export const materials={sdk:'129.0.0',documentSealVerificationKey:documentKey,kaiSigilVerificationKey:kaiKey,signatureV4Roots:[...receizCurrentPinnedSignatureV4Roots().values()]};
/** Exact bytes and fixed roots. No caller-selected key, signer or network API. */
export async function readArtifact(bytes:Uint8Array,filename='original.receiz'){
 if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>24*1024*1024)throw Error('PROOF_INSPECTION_CAPACITY');
 const exact=bytes.slice(),artifactSha256=await sha256Hex(exact);
 const opened=await readVerifiedReceizDocumentBytesCanonical({fileBytes:exact,filename,signatureV4RootPublicKeys:receizCurrentPinnedSignatureV4Roots()});
 if(!opened.ok||!opened.verification.integrity.ok)throw Error('ORIGINAL_CANONICAL_VERIFICATION_FAILED');
 const bundle=opened.verification.bundle,groth16=recognizeReceizGroth16Structure(bundle?.groth16Proof);
 const sourceHistory=ledgerSourceHistoryFromPayload(opened.payloadBytes,opened.payloadMimeType);
 const payloadSha256=await sha256Hex(opened.payloadBytes);
 const report={...sourceHistory,schema:'bankeiz.offline-proof-inspection.v1',sdk:'129.0.0',artifactSha256,artifactBytes:exact.length,payloadSha256,payloadBytes:opened.payloadBytes.length,payloadFilename:opened.payloadFilename,payloadMimeType:opened.payloadMimeType,verification:opened.verification,groth16:groth16?{version:groth16.versionMarker,proof:groth16.proof,publicSignals:groth16.publicSignals}:null,verificationMaterial:materials,scope:'Canonical enclosing artifact and carried continuity only. No live spendability, account balance or execution authorization.'};
 return {report,payload:{bytes:opened.payloadBytes,sha256:payloadSha256,filename:opened.payloadFilename,mimeType:opened.payloadMimeType}};
}
export async function inspectArtifact(bytes:Uint8Array,filename='original.receiz'){return(await readArtifact(bytes,filename)).report;}
/** Wallet v1 supplies a hash capsule, not a signed Groth16 artifact. Hash
 * consistency is deliberately reported separately from authenticity. */
export async function inspectWalletCapsule(value:unknown){
 const b=value as Record<string,unknown>|null;
 const required=['proofCapsule','capsuleHash','bundleHash','verifierUrl','verifier','verificationVersion','verifiedAtPulse','proofHints'];
 if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).length!==required.length||required.some(key=>!Object.hasOwn(b,key))||b.verificationVersion!=='wallet-ledger-v1')throw Error('WALLET_CAPSULE_INCOMPLETE');
 const {bundleHash,...base}=b;
 if(await sha256Hex(jcsCanonicalize(b.proofCapsule))!==b.capsuleHash||await sha256Hex(jcsCanonicalize(base))!==bundleHash)throw Error('WALLET_CAPSULE_HASH_MISMATCH');
 return {status:'hash-consistent-projection',authentication:'not-established',scope:'SHA-256/JCS consistency of the carried Wallet capsule only. No signature, Groth16 proof, original artifact or current account state is established.'};
}
export {sha256Hex};
