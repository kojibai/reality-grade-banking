import {beforeAll,expect,it,vi} from 'vitest';
import {deflateSync} from 'fflate';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {verifyReceizOfflineSealedFile} from '@receiz/sdk/offline';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
import {prepareCreatedAssetPrimary} from '../src/receiz/created-asset-file';
import {openSealedConformanceEvidenceObject} from '../src/conformance/receiz-evidence-seal';
import {authoredFileCarrier} from '../native/receiz/packages/receiz-sdk/src/verifier/canonicalImplementation.js';
let verifier:typeof globalThis.ReceizOfflineVerifier;
beforeAll(async()=>{await import(/* @vite-ignore */pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')).href);verifier=globalThis.ReceizOfflineVerifier;});
const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64'));
it('native carrier bounds aggregate selected metadata without altering exact retained bytes',()=>{
 const bytes=insertPngTextChunks(png,[{keyword:'one',text:'12345678'},{keyword:'two',text:'abcdefgh'}]),before=new Uint8Array(bytes);
 expect(()=>authoredFileCarrier.readPngTextChunks(bytes,{maxTotalTextBytes:15})).toThrow('VERIFICATION_RESOURCE_UNAVAILABLE');
 expect(authoredFileCarrier.readPngTextChunks(bytes,{keyword:'one',maxTotalTextBytes:8})).toEqual([{keyword:'one',text:'12345678'}]);expect(bytes).toEqual(before);
});
it.each(['c1','raw'])('installed SDK and actual generated verifier refuse %s capacity operationally before another seal or projection',async encoding=>{
 const payload=new TextEncoder().encode(JSON.stringify({padding:'x'.repeat(1024*1024)})),token=(encoding==='c1'?'c1:':'')+Buffer.from(encoding==='c1'?deflateSync(payload):payload).toString('base64url'),bytes=insertPngTextChunks(png,[{keyword:'receiz.proof_bundle',text:token}]);
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('RESOURCE_TEST_NETWORK_FORBIDDEN')),seal=vi.fn(async()=>{throw Error('MUST_NOT_RESEAL');});
 try{
  const result=await verifyReceizOfflineSealedFile({bytes,filename:'capacity.png',mimeType:'image/png'});expect(result.denial?.code).toBe('VERIFICATION_RESOURCE_UNAVAILABLE');expect(result.errors).toEqual([]);
  await expect(verifier.readArtifact(bytes,'capacity.png')).rejects.toThrow('PROOF_INSPECTION_CAPACITY');
  const draft={title:'held',kind:'image',files:[{id:'primary',role:'primary',file:new File([new Uint8Array(bytes)],'capacity.png',{type:'image/png'})}]};
  await expect(prepareCreatedAssetPrimary({draft:draft as never,assertCurrent(){},seal})).rejects.toThrow('ORIGINAL_FILE_PROOF_UNAVAILABLE');expect(seal).not.toHaveBeenCalled();
  await expect(openSealedConformanceEvidenceObject(bytes)).rejects.toThrow('CONFORMANCE_PROOF_CAPACITY');expect(network).not.toHaveBeenCalled();
 }finally{network.mockRestore();}
});
it('keeps the production historical native transaction and exact current composer Original verifiable',async()=>{
 const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('RESOURCE_TEST_NETWORK_FORBIDDEN'));
 try{for(const name of ['public-transaction-native.png','public-composer-original.receizbundle']){const bytes=new Uint8Array(readFileSync('tests/fixtures/'+name));expect((await verifyReceizOfflineSealedFile({bytes,filename:name})).ok).toBe(true);expect((await verifier.readArtifact(bytes,name)).report.artifactSha256).toBe(await verifier.sha256Hex(bytes));}expect(network).not.toHaveBeenCalled();}finally{network.mockRestore();}
});
