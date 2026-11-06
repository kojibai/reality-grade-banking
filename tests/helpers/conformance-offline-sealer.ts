import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../../src/conformance/assessment';
import type {EvidenceIdentitySource,EvidenceSealPorts,EvidenceFile} from '../../src/conformance/receiz-evidence-seal';
const encode=(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url');
/** Entirely synthetic in-memory certificate/identity. Full preferred SDK sealing
 * and verification execute under an explicit ephemeral fixture root policy. */
export async function conformanceOfflineFixture(options:{financial?:boolean;composer?:boolean;previousComposer?:boolean;account?:boolean;vault?:boolean}={}){
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
 const financialExports=options.financial?`export * as financialSource from '${sdk}/accountFinancialSource.ts';export * as financialCommit from '${sdk}/accountFinancialCommit.ts';export * as financialPublication from '${sdk}/accountFinancialPublication.ts';export * as financialExecution from '${sdk}/accountFinancialExecution.ts';export * as financialMath from '${sdk}/accountFinancialMath.generated.js';export * as financialReceipt from '${sdk}/accountFinancialReceipt.ts';export * as financialKaiBridge from '${sdk}/v124KaiBridge.generated.ts';export * as identityTools from '${sdk}/identity.ts';export * as portable from '${sdk}/portableAsset.ts';export * as stores from '${sdk}/admissionStore.ts';export {projectGlyphEconomy} from '${native}/app/lib/wallet/glyphEconomyProjection.ts';`:'';
 const composerExports=options.composer?`export {createAcceptedPublicationReceiver} from '${root}tests/helpers/accepted-publication-receiver.fixture.ts';export * as profileSourceSdk from '${sdk}/artifactAdmission.ts';export * as profilePersistentState from '${sdk}/profileShowcasePersistentState.ts';export * as profileComposite from '${sdk}/compositeProofTransport.ts';export * as sourceAuthorship from '${native}/app/lib/profile/showcase/importedSourceAuthorship.ts';export * as composer from '${native}/app/lib/profile/composerPreparation.client.ts';export * as publicationOutbox from '${native}/app/lib/offline/localSignedActionOutbox.ts';export * as showcaseTransport from '${native}/app/lib/profile/showcase/completeSourceTransport.ts';export * as showcaseMigration from '${native}/app/lib/profile/showcase/migration.ts';export * as showcaseVault from '${native}/app/lib/profile/showcase/boundedEdgeVault.ts';export * as showcaseRetainer from '${native}/app/lib/profile/showcase/acceptedPredecessorCustody.ts';export * as showcasePlacement from '${native}/app/lib/profile/showcase/importedSourcePlacement.client.ts';export * as showcaseAdmission from '${native}/app/lib/profile/showcase/appendTransportAdmission.ts';export * as connectedComposer from '${native}/app/lib/profile/showcase/connectedAssetPublication.client.ts';export {createImportedProofSourceCustody} from '${native}/app/lib/profile/showcase/importedSourceCustody.client.ts';export {createBankNativeNoteSealer} from '${native}/app/lib/wallet/bankNotes/browser.ts';export {openImportedProofSource} from '${native}/app/lib/profile/showcase/importedSource.ts';`:'';
 const hiddenExports=(options.account?`export {createReceizClient,receizBase64UrlEncode,receizBase64UrlDecode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,digestReceizCanonicalV122,receizKaiNow,sha256ReceizBytes} from '${sdk}/index.ts';`:'')+(options.previousComposer?`export {readReceizIdentityArtifact} from '${sdk}/index.ts';export * as showcaseAuthority from '${native}/app/lib/profile/showcase/authorityProvider.ts';export * as showcaseTransitions from '${native}/app/lib/profile/showcase/boundedTransitionPublication.ts';export * as showcaseComposerPublication from '${native}/app/lib/profile/showcase/composerPublication.ts';export * as showcaseTransitionStore from '${native}/app/lib/profile/showcase/browserTransitionStore.ts';`:'');
 const previousExports=(options.vault?`export {createBankNativeNoteSealer} from '${native}/app/lib/wallet/bankNotes/browser.ts';export * as vaultPublic from '${root}native/vault/app/lib/wallet/bankVault/publicRecord.ts';export {deriveVaultCustodyAccountId,vaultCustodyReceivingAddress} from '${root}native/vault/app/lib/wallet/bankVault/custody.ts';`:'')+(options.previousComposer?`export * as previousConnectedComposer from '${native}/app/lib/profile/showcase/connectedAssetPublication.previous.fixture.ts';`:'');
 const built=await build({absWorkingDir:root,stdin:{resolveDir:root,contents:`${financialExports}${composerExports}${previousExports}${hiddenExports}export * as offline from '${sdk}/offlineSeal.ts';export {verifyReceizArtifact} from '${sdk}/artifactVerification.ts';export {createReceizArtifactAdmissionEngine,readReceizIdentityPublicBinding} from '${sdk}/artifactAdmission.ts';export {readVerifiedReceizDocumentBytesCanonical as openPayload} from '${sdk}/verifier/canonical.ts';`},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,...(options.composer||options.vault?{define:{'process.env.NEXT_PUBLIC_RECEIZ_SIGNING_V4_ROOT_PUBLIC_KEYS_JSON':JSON.stringify(JSON.stringify(roots))}}:{}),external:['node:*'],alias,plugins:[{name:'ephemeral-conformance-roots',setup(plugin){
  plugin.onResolve({filter:/accepted-publication-receiver\.fixture\.ts$/},args=>({path:args.path,namespace:'bounded-publication-fixture'}));
  plugin.onLoad({filter:/.*/,namespace:'bounded-publication-fixture'},()=>({loader:'ts',resolveDir:`${root}tests/helpers`,contents:readFileSync(`${root}tests/helpers/accepted-publication-receiver.fixture.ts.txt`,'utf8')}));
  plugin.onLoad({filter:/receiz-sdk\/src\/verifier\/roots\.ts$/},()=>({loader:'ts',contents:`export const receizCurrentPinnedSignatureV4Roots=()=>new Map(${JSON.stringify(roots)}.map(root=>[root.kid,root]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;`}));
  if(options.previousComposer){
   plugin.onResolve({filter:/connectedAssetPublication\.previous\.fixture\.ts$/},args=>({path:args.path,namespace:'previous-publication-fixture'}));
   plugin.onLoad({filter:/.*/,namespace:'previous-publication-fixture'},()=>{
    const path=`${native}/app/lib/profile/showcase/connectedAssetPublication.client.ts`,source=readFileSync(`${root}tests/fixtures/connected-asset-publication-f5cc4d06.ts.txt`,'utf8'),before='if(!authorizeMarket){const result=await withProfileShowcaseCausalAppendLock(artifactId,()=>incremental.publish(opened));';
    if(!source.includes(before))throw Error('Previous publication fixture must select the existing contextual publisher');
    // Exercise the genuine previous publisher/SDK/store, not a permissive
    // substitute. Only selection of the newer incremental path is disabled.
    return{loader:'ts',resolveDir:path.slice(0,path.lastIndexOf('/')),contents:source.replace(before,before.replace('if(!authorizeMarket)','if(false)'))};
   });
  }
 }}]});
 const runtimeUrl=`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].contents).toString('base64')}`;
 const runtime=await import(/* @vite-ignore */runtimeUrl);
 // A fresh bundled module has no publication module memo. Persistent IDB and
 // exact sealed bytes stay held; browser-realm verification is separate.
 const reloadRuntime=()=>import(/* @vite-ignore */`${runtimeUrl}#cold-publication-${crypto.randomUUID()}`);
 const resources={wasm:new Uint8Array(readFileSync(`${root}public/zk/document-seal.wasm`)),zkey:new Uint8Array(readFileSync(`${root}public/zk/document-seal.zkey`))};
 const store=runtime.offline.createReceizMemorySealStore();await store.save({cert,privateKey:device.privateKey});
 const deny=async()=>{throw Error('SYNTHETIC_FIXTURE_NETWORK_FORBIDDEN');};
 const identitySealer=runtime.offline.createReceizOfflineSealer({store,resources,fetch:deny});
 const phrase='synthetic-conformance-local-identity-phrase';
 const identityArtifact=await identitySealer.createIdentity({passphrase:phrase}).catch((error:Error)=>{throw Error(error.message);});
 const identity:EvidenceIdentitySource={bytes:identityArtifact.artifactBytes,phrase};
 const ports:EvidenceSealPorts={offline:async()=>runtime.offline,sdk:async()=>runtime,store,resources:async()=>resources,verifyOffline:runtime.offline.verifyReceizOfflineSealedFile,openPayload:async(input:EvidenceFile)=>{const opened=await runtime.openPayload({fileBytes:input.bytes,filename:input.filename,mime:'image/png',signatureV4RootPublicKeys:new Map(roots.map(root=>[root.kid,root]))});if(!opened.ok)throw Error('CANONICAL_FIXTURE_OPEN_REFUSED:'+opened.verification.errors.join(','));return{bytes:opened.payloadBytes,verification:opened.verification};}};
 return{runtime,reloadRuntime,store,ports,identity,resources,roots,signFinancial:async(bytes:Uint8Array)=>({kid:roots[0].kid,alg:'Ed25519' as const,sig:encode(new Uint8Array(await crypto.subtle.sign('Ed25519',issuer.privateKey,bytes.slice().buffer))),signedAtMs:Date.now()}),async otherIdentity(){const phrase='another-synthetic-private-identity-phrase';const sealed=await identitySealer.createIdentity({passphrase:phrase});return{bytes:new Uint8Array(sealed.artifactBytes),phrase};}};
}
