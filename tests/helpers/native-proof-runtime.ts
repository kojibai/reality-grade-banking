import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {vi} from 'vitest';

const NativeURL=URL;
const snarkjs=createRequire(import.meta.url)('snarkjs');
/** Only the Code transport changes in Node tests. The same emitted IIFE and
 * its actual private SDK custody execute through the existing app loader. */
export function useEmittedNativeProofRuntime(){
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 // Happy DOM does not execute appended script tags. Supply the exact locked
 // cryptographic Code that the browser loads from /snarkjs.min.js instead.
 vi.stubGlobal('snarkjs',snarkjs);
 vi.stubGlobal('URL',class extends NativeURL{
  constructor(input:string|URL,base?:string|URL){
   super(input,base);
   if(this.pathname==='/proof-verifier/v129/verifier.js')return pathToFileURL(resolve('public/proof-verifier/v129/verifier.js'));
  }
 });
}
