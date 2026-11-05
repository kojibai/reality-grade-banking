import {beforeAll,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
// @ts-expect-error Build-only native composition.
import {buildBuildDemo} from '../scripts/build-build-demo.mjs';
type Result={fixture:string;synthetic:true;verified:boolean;amountUsdCents?:string;deliveryAuthorityBound?:boolean;error?:string;currentSpendabilityChecked:false;creditAuthorized:false};
let verifier:{verifySyntheticDemoFixture(bytes:Uint8Array):Promise<Result>};
const root='output/build-demo-test',fixture=(name:string)=>new Uint8Array(gunzipSync(readFileSync(`tests/fixtures/connected-note-delivery/${name}.gz`)));
beforeAll(async()=>{await buildBuildDemo(root);verifier=await import(/* @vite-ignore */ pathToFileURL(resolve(root,'verifier.mjs')).href);},30000);
it('actually verifies the sealed synthetic Original and copied bytes, refusing substituted Note authority with the same valid Source',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_API_OR_NETWORK')),sign=vi.spyOn(crypto.subtle,'sign').mockRejectedValue(Error('NO_SIGNING')),generate=vi.spyOn(crypto.subtle,'generateKey').mockRejectedValue(Error('NO_IDENTITY_CREATION'));
 try{
  const original=fixture('note.png'),positive=await verifier.verifySyntheticDemoFixture(original);
  expect(positive).toMatchObject({fixture:'authentic',synthetic:true,verified:true,amountUsdCents:'200',carriedSourceVerified:true,deliveryAuthorityBound:true,currentSpendabilityChecked:false,creditAuthorized:false});
  expect(await verifier.verifySyntheticDemoFixture(original.slice())).toEqual(positive);
  expect(await verifier.verifySyntheticDemoFixture(fixture('wrong-note-authority.png'))).toMatchObject({fixture:'wrong-delivery-authority',synthetic:true,verified:false,error:'BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH',currentSpendabilityChecked:false,creditAuthorized:false});
  expect(fetch).not.toHaveBeenCalled();expect(sign).not.toHaveBeenCalled();expect(generate).not.toHaveBeenCalled();
  expect(Object.keys(verifier)).toEqual(['verifySyntheticDemoFixture']);expect(JSON.stringify(positive)).not.toMatch(/privateKey|noteIdentity|owner|userId|keyId/);
 }finally{fetch.mockRestore();sign.mockRestore();generate.mockRestore();}
});
it('refuses unknown or changed bytes before exposing any general custom-root inspection capability',async()=>{
 const changed=fixture('note.png');changed[changed.length-1]^=1;
 await expect(verifier.verifySyntheticDemoFixture(changed)).rejects.toThrow('SYNTHETIC_DEMO_FIXTURE_REQUIRED');
 await expect(verifier.verifySyntheticDemoFixture(new Uint8Array(32769))).rejects.toThrow('SYNTHETIC_DEMO_FIXTURE_REQUIRED');
});
it('packages exact existing synthetic fixtures and complete corresponding sources/licenses without a signer or funding export',()=>{
 const manifest=JSON.parse(readFileSync(root+'/build.json','utf8')),map=JSON.parse(readFileSync(root+'/verifier.mjs.map','utf8'));
 expect(manifest).toMatchObject({schema:'bankeiz.synthetic-note-demo-build.v1',sdk:'129.0.0',synthetic:true,creditAuthorized:false});
 for(const name of ['note.png.gz','wrong-note-authority.png.gz'])expect(readFileSync(root+'/'+name).equals(readFileSync('tests/fixtures/connected-note-delivery/'+name))).toBe(true);
 expect(map.sources.length).toBe(map.sourcesContent.length);expect(map.sourcesContent.every((value:unknown)=>typeof value==='string')).toBe(true);
 expect(readFileSync(root+'/verifier.mjs.map.bin').equals(readFileSync(root+'/verifier.mjs.map'))).toBe(true);
 for(const [name,info]of Object.entries(manifest.files)as[string,{sha256:string}][])expect(createHash('sha256').update(readFileSync(root+'/'+name)).digest('hex')).toBe(info.sha256);
 for(const name of ['LICENSE.txt','NOTICE.txt','THIRD_PARTY_NOTICES.md','snarkjs-GPL-3.0.txt','ffjavascript-GPL-3.0.txt'])expect(readFileSync(root+'/'+name).length).toBeGreaterThan(100);
 const imports=Object.values(manifest.outputs)as {exports:string[]}[];expect(imports.flatMap(output=>output.exports)).toEqual(['verifySyntheticDemoFixture']);
 const paths=manifest.inputs.map((input:{path:string})=>input.path);for(const path of ['src/receiz/native-identity.ts','src/receiz/identity-vault.ts','src/receiz/pbi-account.ts'])expect(paths).not.toContain(path);
 expect(readFileSync(root+'/verifier.mjs','utf8')).not.toMatch(/indexedDB|localStorage/);
});
