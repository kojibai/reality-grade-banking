import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../../src/conformance/assessment';
import type {EvidenceIdentitySource,EvidenceSealPorts,EvidenceFile} from '../../src/conformance/receiz-evidence-seal';
const encode=(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url');
/** Entirely synthetic in-memory certificate/identity. Full preferred SDK sealing
 * and verification execute under an explicit ephemeral fixture root policy. */
export async function conformanceOfflineFixture(options:{financial?:boolean}={}){
 const root=fileURLToPath(new URL('../../',import.meta.url)),native=`${root}native/receiz`,sdk=`${native}/packages/receiz-sdk/src`;
 const issuer=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']),device=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']);
 const issuerKey=encode(new Uint8Array(await crypto.subtle.exportKey('raw',issuer.publicKey))),deviceKey=encode(new Uint8Array(await crypto.subtle.exportKey('raw',device.publicKey)));
 const roots=[{kid:'receiz.v4.test.conformance',alg:'Ed25519',status:'active',publicKeyRawB64u:issuerKey}];
 const basis={version:1,certType:'receiz.device.v1',issuerKid:roots[0].kid,alg:'Ed25519',subjectPublicKeyRawB64u:deviceKey,issuedAtMs:Date.now()-1000,expiresAtMs:Date.now()+86400000};
 const certId=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(basis))))].map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,32);
 const payload={...basis,certId};
 const cert={...payload,sig:encode(new Uint8Array(await crypto.subtle.sign('Ed25519',issuer.privateKey,new TextEncoder().encode(canonicalJson(payload)))))};
 const manifest=JSON.parse(readFileSync(`${root}native/manifest.json`,'utf8')),alias:Record<string,string>={'@':native};
 for(const slug of Object.values(manifest.placements)as string[]){const path=`${root}native/npm/${slug}`;alias[JSON.parse(readFileSync(`${path}/package.json`,'utf8')).name]=path;}
 alias.snarkjs=`${root}native/npm/snarkjs@0.7.6/build/browser.esm.js`;alias.ffjavascript=`${root}native/npm/ffjavascript@0.3.1/build/browser.esm.js`;
 const financialExports=options.financial?`export * as financialSource from '${sdk}/accountFinancialSource.ts';export * as financialCommit from '${sdk}/accountFinancialCommit.ts';export * as financialPublication from '${sdk}/accountFinancialPublication.ts';export * as financialExecution from '${sdk}/accountFinancialExecution.ts';export * as financialMath from '${sdk}/accountFinancialMath.generated.js';export * as identityTools from '${sdk}/identity.ts';export * as portable from '${sdk}/portableAsset.ts';export * as stores from '${sdk}/admissionStore.ts';export {projectGlyphEconomy} from '${native}/app/lib/wallet/glyphEconomyProjection.ts';`:'';
 const built=await build({absWorkingDir:root,stdin:{resolveDir:root,contents:`${financialExports}export * as offline from '${sdk}/offlineSeal.ts';export {verifyReceizArtifact} from '${sdk}/artifactVerification.ts';export {createReceizArtifactAdmissionEngine,readReceizIdentityPublicBinding} from '${sdk}/artifactAdmission.ts';export {readVerifiedReceizDocumentBytesCanonical as openPayload} from '${sdk}/verifier/canonical.ts';`},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,external:['node:*'],alias,plugins:[{name:'ephemeral-conformance-roots',setup(plugin){plugin.onLoad({filter:/receiz-sdk\/src\/verifier\/roots\.ts$/},()=>({loader:'ts',contents:`export const receizCurrentPinnedSignatureV4Roots=()=>new Map(${JSON.stringify(roots)}.map(root=>[root.kid,root]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;`}));}}]});
 const runtime=await import(/* @vite-ignore */`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString('base64')}`);
 const resources={wasm:new Uint8Array(readFileSync(`${root}public/zk/document-seal.wasm`)),zkey:new Uint8Array(readFileSync(`${root}public/zk/document-seal.zkey`))};
 const store=runtime.offline.createReceizMemorySealStore();await store.save({cert,privateKey:device.privateKey});
 const deny=async()=>{throw Error('SYNTHETIC_FIXTURE_NETWORK_FORBIDDEN');};
 const identitySealer=runtime.offline.createReceizOfflineSealer({store,resources,fetch:deny});
 const phrase='synthetic-conformance-local-identity-phrase';
 const identityArtifact=await identitySealer.createIdentity({passphrase:phrase}).catch((error:Error)=>{throw Error(error.message);});
 const identity:EvidenceIdentitySource={bytes:identityArtifact.artifactBytes,phrase};
 const ports:EvidenceSealPorts={offline:async()=>runtime.offline,sdk:async()=>runtime,store,resources:async()=>resources,verifyOffline:runtime.offline.verifyReceizOfflineSealedFile,openPayload:async(input:EvidenceFile)=>{const opened=await runtime.openPayload({fileBytes:input.bytes,filename:input.filename,mime:'image/png',signatureV4RootPublicKeys:new Map(roots.map(root=>[root.kid,root]))});if(!opened.ok)throw Error('CANONICAL_FIXTURE_OPEN_REFUSED:'+opened.verification.errors.join(','));return{bytes:opened.payloadBytes,verification:opened.verification};}};
 return{runtime,store,ports,identity,resources,roots,signFinancial:async(bytes:Uint8Array)=>({kid:roots[0].kid,alg:'Ed25519' as const,sig:encode(new Uint8Array(await crypto.subtle.sign('Ed25519',issuer.privateKey,bytes.slice().buffer))),signedAtMs:Date.now()}),async otherIdentity(){const phrase='another-synthetic-private-identity-phrase';const sealed=await identitySealer.createIdentity({passphrase:phrase});return{bytes:new Uint8Array(sealed.artifactBytes),phrase};}};
}
