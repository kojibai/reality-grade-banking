import type {ReceizKksV1ProofCoordinate, ReceizSealedArtifact} from '@receiz/sdk';
import {loadReceiz} from './client';

export type GovernanceExecutionRegister = Readonly<{
 custodian:string; registerProofObjectId:string; registerGenesisHead:string; head:string;
}>;
type RegisterGenesis = {schema:'bankeiz.governance.register.v1';custodian:string;nonce:string};
export type RegisterSealer = (bytes:Uint8Array, filename:string)=>Promise<ReceizSealedArtifact>;

export async function openGovernanceRegister(file:File, owner:string) {
 const sdk=await loadReceiz();
 const verify=await sdk.verifyReceizArtifact(file);
 if(verify.status!=='verified-artifact')throw Error('The register Original failed verification.');
 const admission=await sdk.createReceizArtifactAdmissionEngine()(verify,{profile:'portable-state',ownerConstraint:owner});
 if(admission.verdict!=='bearer-recovery'||!admission.proofHistory)throw Error('Select the complete portable governance register.');
 const history=admission.proofHistory;
 const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(admission.verifiedPayload.bytes));
 const portable=await sdk.parseReceizPortableAssetDocument(raw);
 const {verification:_verification,...carriedHistory}=history;
 const publicFields=['schema','assetType','payload','ownership','provenance','settlement','receizProofHistory'].sort();
 if(sdk.canonicalizeReceizV122(Object.keys(raw).sort())!==sdk.canonicalizeReceizV122(publicFields)||
   sdk.canonicalizeReceizV122(raw)!==sdk.canonicalizeReceizV122(portable)||
   sdk.canonicalizeReceizV122(raw.receizProofHistory.history)!==sdk.canonicalizeReceizV122(carriedHistory))throw Error('The register contains unexpected fields.');
 const genesisText=new TextDecoder('utf-8',{fatal:true}).decode(sdk.receizBase64UrlDecode(portable.payload.bytesBase64Url));
 const genesis=JSON.parse(genesisText) as RegisterGenesis;
 if(sdk.canonicalizeReceizV122({schema:'bankeiz.governance.register.v1',custodian:owner,nonce:genesis.nonce})!==genesisText
   ||typeof genesis.nonce!=='string'||!/^[a-f0-9-]{36}$/.test(genesis.nonce)||portable.payload.sha256!==history.artifactId
   ||portable.assetType!=='proof_object'||portable.payload.mimeType!=='application/json'||portable.provenance.root!=='bankeiz.governance.register:'+genesis.nonce
   ||portable.ownership.custody!=='bearer'||portable.ownership.ownerReceizId!==owner||history.currentOwnerReceizId!==owner
   ||history.headDigests.length!==1||history.terminal)throw Error('The register does not carry this custodian and a single active head.');
 const head=history.headDigests[0],node=history.nodes.find(n=>n.nodeDigest===head);
 if(!node)throw Error('The register head is missing.');
 const coordinate=await sdk.admitReceizKksV1ProofCoordinate(node.namespaceData['receiz.kks-v1']);
 if(coordinate.kaiPulse!==node.kaiPulse)throw Error('The register head and KKS source differ.');
 const register:GovernanceExecutionRegister=Object.freeze({custodian:owner,registerProofObjectId:history.artifactId,registerGenesisHead:history.rootDigest,head});
 if(history.nodes.length===1){
  const expected=await genesisPayload(owner,genesis.nonce,coordinate);
  if(await sdk.sha256ReceizBytes(expected)!==await sdk.sha256ReceizBytes(admission.verifiedPayload.bytes))throw Error('Select the unmodified public governance register genesis.');
 }
 return {register,coordinate,admission,history,portable};
}

export async function createGovernanceRegister(owner:string,coordinate:ReceizKksV1ProofCoordinate,seal:RegisterSealer) {
 return seal(await genesisPayload(owner,crypto.randomUUID(),coordinate),'governance-register.json');
}

async function genesisPayload(owner:string,nonce:string,coordinate:ReceizKksV1ProofCoordinate){
 const sdk=await loadReceiz();
 const genesis:RegisterGenesis={schema:'bankeiz.governance.register.v1',custodian:owner,nonce};
 const bytes=new TextEncoder().encode(sdk.canonicalizeReceizV122(genesis));
 const portable=await sdk.createReceizPortableAssetDocument({assetType:'proof_object',payload:{bytes,mimeType:'application/json'},
  ownership:{ownerReceizId:owner,custody:'bearer',proofRef:'genesis'},provenance:{root:'bankeiz.governance.register:'+nonce,appends:[]},settlement:{state:'unsettled'}});
 const receipt={schema:'bankeiz.governance.register-genesis.v1',source:portable.payload.sha256};
 const root=await sdk.createReceizProofHistoryNode({artifactId:portable.payload.sha256,registryDigest:sdk.RECEIZ_CURRENT_REGISTRY_DIGEST,
  parentDigests:[],kaiPulse:coordinate.kaiPulse,receipt,event:{type:'ownership.transition',fromOwnerReceizId:null,toOwnerReceizId:owner},namespaceData:{'receiz.kks-v1':JSON.parse(sdk.canonicalizeReceizV122(coordinate))}});
 const history=await sdk.normalizeReceizProofHistory({artifactId:portable.payload.sha256,registryDigest:sdk.RECEIZ_CURRENT_REGISTRY_DIGEST,nodes:[root],
  verifyReceipt:async(value,digest)=>await sdk.digestReceizAuthority('receipt','receiz.proof-history-receipt.v111',value)===digest});
 return sdk.replaceReceizPortableProofHistoryBytes(sdk.serializeReceizPortableAssetDocument(portable),history);
}

export async function exactRegisterFile(wire:Awaited<ReturnType<typeof import('@receiz/sdk').transportReceizSealedArtifactV124>>) {
 const sdk=await loadReceiz(),bytes=sdk.receizBase64UrlDecode(wire.exactBytesB64u);
 if(await sdk.sha256ReceizBytes(bytes)!==wire.artifactSha256)throw Error('The retained register file differs from its digest.');
 return new File([new Uint8Array(bytes)],wire.filename,{type:wire.mimeType});
}
