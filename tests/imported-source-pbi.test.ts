import {readFileSync} from 'node:fs';import ts from 'typescript';import {expect,it} from 'vitest';
import * as verification from '@receiz/sdk';
import {createRequire} from 'node:module';import {dirname,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const context=await import(/* @vite-ignore */pathToFileURL(resolve(dirname(createRequire(import.meta.url).resolve('@receiz/sdk')),'pbiProofObjectVerification.js')).href);
import * as authorship from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import * as verifier from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
import {canonicalizeReceizV122} from '@receiz/sdk';
const encode=(bytes:Uint8Array|ArrayBuffer)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');
const code=ts.transpileModule(readFileSync('native/receiz/app/lib/profile/showcase/importedSourceAuthorship.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded:Record<string,any>={};new Function('require','exports',code)((name:string)=>{
 if(name.endsWith('/artifactVerification'))return verification;if(name.endsWith('/pbiProofObjectVerification'))return context;if(name.endsWith('/pbiLocalAuthorship'))return authorship;if(name.endsWith('/pbiLocalVerifier'))return verifier;if(name.endsWith('/jcs'))return{jcsCanonicalize:canonicalizeReceizV122};if(name==='./importedSourceProjection')return{projectImportedSourceOriginal:()=>({id:'exact-original',hasPbiSignature:false,pbiReceiptHash:null})};throw Error('UNEXPECTED_IMPORT:'+name);
},loaded);
it('admits real PBI over a canonically verified original and rejects a detached or altered source binding',async()=>{
 const bytes=new Uint8Array(readFileSync('tests/fixtures/public-essay-record.png')),opened=await verification.verifyReceizArtifact(bytes);
 expect(opened.status).toBe('verified-artifact');const exact=context.verifiedArtifactContext(opened);expect(exact).not.toBeNull();
 const source={exactArtifact:new Blob([bytes]),descriptor:{artifactSha256:exact!.artifactSha256}};
 const input=await loaded.importedSourceAuthorshipInput(source,'a'.repeat(64),'14750000000000');
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',keys.publicKey),credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`};
 const proof=await authorship.createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload);
  return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(signature)};
 },verifyAssertion:args=>verifier.verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 const signed=await loaded.projectPbiSignedImportedSourceOriginal(source,{},proof);expect(signed).toMatchObject({id:'exact-original',hasPbiSignature:true,pbiReceiptHash:proof.pbiReceiptHash});expect(signed.pbiAuthorshipProof).toEqual(proof);
 await expect(loaded.projectPbiSignedImportedSourceOriginal(source,{}, {...proof,input:{...input,claimHashHex:'f'.repeat(64)}})).rejects.toThrow('PBI_PROOF_INVALID');
 await expect(loaded.projectPbiSignedImportedSourceOriginal(source,{}, {...proof,pbiReceiptHash:'f'.repeat(64)})).rejects.toThrow('PBI_PROOF_INVALID');
 await expect(loaded.importedSourceAuthorshipInput({...source,descriptor:{artifactSha256:'f'.repeat(64)}},'a'.repeat(64),'14750000000000')).rejects.toThrow('PBI_SOURCE_REQUIRED');
 expect(new Uint8Array(await source.exactArtifact.arrayBuffer())).toEqual(bytes);
},20000);
