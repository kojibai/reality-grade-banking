/** Bank's existing per-source custody budget, applied only to PNG originals.
 * This is a local reading limit, never a verification or admission verdict. */
export const ORIGINAL_PNG_MAX_BYTES=32*1024*1024;
const signature=[137,80,78,71,13,10,26,10];
export const isOriginalPng=(bytes:Uint8Array)=>signature.every((byte,index)=>bytes[index]===byte);
export function originalReadLimit(bytes:Uint8Array,otherMax:number,verifiedMime?:string){
 return isOriginalPng(bytes)&&(verifiedMime===undefined||verifiedMime.split(';')[0].trim().toLowerCase()==='image/png')?ORIGINAL_PNG_MAX_BYTES:otherMax;
}
