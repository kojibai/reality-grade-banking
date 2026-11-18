import type {BuiltReceizMaterialCompositeTransport, ReceizMaterialCompositeManifest} from '@receiz/sdk';
import {loadReceiz} from './client';
import {loadInvoiceSourceRuntime} from './invoice-source-runtime';
import {openCanonicalProofFile} from './proof-capture';

const origin = 'https://receiz.com';
const transportFetch = (fetcher:typeof fetch):typeof fetch => (input,init) => fetcher(input,{...init,signal:init?.signal??AbortSignal.timeout(30000)});

function transportFrom(manifest:ReceizMaterialCompositeManifest,capsuleBytes:Uint8Array,canonicalManifest:string):BuiltReceizMaterialCompositeTransport {
  return {manifest,manifestBytes:new TextEncoder().encode(canonicalManifest),segments:manifest.segments.map(s=>capsuleBytes.subarray(s.offset,s.offset+s.byteLength)),token:`${manifest.capsuleEncoding==='rma3/raw'?'rmc2':'rmc1'}:${manifest.packageDigest}`};
}
async function retainFamily(transport:BuiltReceizMaterialCompositeTransport) {
  const [sdk,runtime]=await Promise.all([loadReceiz(),loadInvoiceSourceRuntime()]);
  const family=sdk.createReceizMaterialSourceFamily({proofUrl:origin+transport.manifest.verifyPath,transport});
  await runtime.holdReceizMaterialSourceFamily({headUrl:family.headUrl,sourceUrls:[family.manifestUrl,...family.segmentUrls]});
  return family.headUrl;
}
export async function prepareProofMaterial(original:File) {
  const [sdk,opened]=await Promise.all([loadReceiz(),openCanonicalProofFile(original)]);
  const artifact=opened.sealedArtifact,bundle=artifact.verification.bundle,pulse=String(bundle.kaiPulseEternal);
  if(!/^\d+$/.test(pulse))throw Error('The Original is missing its Kai coordinate.');
  const raw=bundle.kaiUPulse??bundle.kaiUpulse??bundle.issuedAtKaiUPulse;
  const capsuleBytes=sdk.encodeReceizMaterialCapsuleBytes({exactArtifactBytes:new Uint8Array(await original.arrayBuffer()),filename:original.name,mimeType:original.type});
  const transport=await sdk.buildReceizMaterialCompositeTransport({capsuleBytes,sealedArtifactSha256:artifact.artifactSha256,sealedArtifactByteLength:original.size,sealedFilename:original.name,sealedMimeType:original.type,verifyPath:artifact.continuity.verifyPath,issuedAtKaiPulse:pulse,issuedAtKaiUPulse:String(raw??BigInt(pulse)*1000000n)});
  return {headUrl:await retainFamily(transport),transport};
}
export async function publishProofMaterial(headUrl:string,check:()=>void,transport?:BuiltReceizMaterialCompositeTransport,fetcher:typeof fetch=fetch) {
  const sdk=await loadReceiz();
  if(!transport){
    const runtime=await loadInvoiceSourceRuntime();
    const held=await runtime.resolveReceizMaterialCompositeLocalFirst({headUrl,resolveRemote:async()=>{throw Error('The attachment Original is missing on this device.');}});
    transport=transportFrom(held.manifest,held.capsuleBytes,runtime.canonicalizeReceizConstitution(held.manifest));
  }
  check();
  await sdk.publishReceizMaterialCompositeTransport({transport,receizOrigin:origin,fetcher:transportFetch(fetcher)});
  check();
}
export async function readProofMaterial(headUrl:string,fetcher:typeof fetch=fetch) {
  const [sdk,runtime]=await Promise.all([loadReceiz(),loadInvoiceSourceRuntime()]);
  const resolved=await runtime.resolveReceizMaterialCompositeLocalFirst({headUrl,resolveRemote:({packageDigest})=>sdk.resolveReceizMaterialCompositeTransport({packageDigest,receizOrigin:origin,fetcher:transportFetch(fetcher)})});
  const {manifest,capsuleBytes}=resolved;
  const capsule=manifest.capsuleEncoding==='rma3/raw'?sdk.decodeReceizRawMaterialCapsuleBytes({capsuleBytes,manifest}):sdk.decodeReceizMaterialCapsuleBytes(capsuleBytes);
  const original=new File([new Uint8Array(capsule.exactArtifactBytes)],capsule.filename,{type:capsule.mimeType});
  const opened=await openCanonicalProofFile(original);
  if(original.size!==manifest.sealedArtifactByteLength||opened.sealedArtifact.artifactSha256!==manifest.sealedArtifactSha256||new URL(headUrl).pathname!==manifest.verifyPath||opened.sealedArtifact.continuity.verifyPath!==manifest.verifyPath)throw Error('The attachment does not match its proof.');
  let offlineRetained=true;
  if(resolved.source==='remote')try{await retainFamily(transportFrom(manifest,capsuleBytes,runtime.canonicalizeReceizConstitution(manifest)));}catch{offlineRetained=false;}
  return {original,opened,offlineRetained};
}
