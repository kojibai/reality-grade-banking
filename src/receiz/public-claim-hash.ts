import {sha256} from '../../native/npm/noble--hashes@2.3.0/sha2.js';
import {bytesToHex} from '../../native/npm/noble--hashes@2.3.0/utils.js';
const held=new WeakMap<object,{claim:string;hash:string}>();
/** Public display only. The exact carried description is the claim text; its
 * digest does not rewrite a proof, attach authorship or authorize any action.
 * Preserve a separately carried digest; derive only an omitted display field. */
export function publicClaimHash(source:unknown):string|null{
 if(!source||typeof source!=='object'||Array.isArray(source))return null;
 const value=source as Record<string,unknown>,recorded=value.claimHashHex;
 if(typeof recorded==='string'&&recorded.length)return /^[a-f0-9]{64}$/i.test(recorded)?recorded.toLowerCase():null;
 const claim=value.claim;
 if(typeof claim!=='string'||!claim.length||claim.length>100000)return null;
 const known=held.get(source);if(known?.claim===claim)return known.hash;
 const hash=bytesToHex(sha256(new TextEncoder().encode(claim)));held.set(source,{claim,hash});return hash;
}
