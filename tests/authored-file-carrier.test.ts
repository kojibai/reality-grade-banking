import {expect,it} from 'vitest';
import {zipSync,unzipSync} from 'fflate';
import {carryAuthoredFile,openAuthoredFileCarrier} from '../native/receiz/packages/receiz-sdk/src/verifier/authoredFileCarrier';
import {appendReceizTrailer,authoredFileCarrier as native} from '../native/receiz/packages/receiz-sdk/src/verifier/canonicalImplementation.js';
const encode=new TextEncoder(),body={kind:'receiz.carried-file-authorship.v1',sourceBase64Url:'AQID',proof:{existing:true}};
it('keeps EPUB entries and the exact earlier sealed ZIP prefix readable with one metadata append',()=>{
 const zip=zipSync({'mimetype':encode.encode('application/epub+zip'),'OEBPS/chapter.xhtml':encode.encode('<html><body>Retained chapter</body></html>')});
 const original=appendReceizTrailer({basisBytes:zip,bundle:{existing:'sealed evidence'}}),saved=carryAuthoredFile(original,body);
 expect(saved.subarray(0,original.length)).toEqual(original);
 expect(new TextDecoder().decode(unzipSync(saved)['OEBPS/chapter.xhtml'])).toContain('Retained chapter');
 expect(openAuthoredFileCarrier(saved)).toEqual({original,body});
 expect(carryAuthoredFile(openAuthoredFileCarrier(saved)!.original,body)).toEqual(saved);
});
it('preserves the exact HEIC native proof box while carrying the signed Source',()=>{
 const bytes=new Uint8Array(40),view=new DataView(bytes.buffer);view.setUint32(0,24);bytes.set(encode.encode('ftypheic'),4);bytes.set(encode.encode('heicmif1'),16);view.setUint32(24,8);bytes.set(encode.encode('meta'),28);view.setUint32(32,8);bytes.set(encode.encode('mdat'),36);
 const original=native.appendReceizHeicProof({basisBytes:bytes,bundle:{existing:'sealed evidence'}}),saved=carryAuthoredFile(original,body);
 expect(openAuthoredFileCarrier(saved)).toEqual({original,body:{...body,previousCarrier:Buffer.from(original.subarray(bytes.length)).toString('base64url')}});
 expect(carryAuthoredFile(openAuthoredFileCarrier(saved)!.original,body)).toEqual(saved);
});
it('does not reinterpret ordinary native proofs as an authored-file transport',()=>{
 for(const bytes of [new Uint8Array([1,2,3]),appendReceizTrailer({basisBytes:new Uint8Array([1,2]),bundle:{kind:'receiz.proof_bundle'}}),zipSync({'file.txt':encode.encode('exact bytes')})])expect(openAuthoredFileCarrier(bytes)).toBeNull();
});
