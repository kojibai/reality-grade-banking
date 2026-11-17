import build from '../../public/native/invoice-source.v129.manifest.json';
import type {ReceizMaterialCompositeManifest} from '@receiz/sdk';
type Resolved={manifest:ReceizMaterialCompositeManifest;capsuleBytes:Uint8Array};
export interface InvoiceSourceRuntime {
 canonicalizeReceizConstitution(value:unknown):string;
 holdReceizMaterialSourceFamily(input:{headUrl:string;sourceUrls:readonly string[]}):Promise<unknown>;
 resolveReceizMaterialCompositeLocalFirst(input:{headUrl:string;sourceUrls?:readonly string[];resolveRemote(input:{packageDigest:string;origin:string}):Promise<Resolved>}):Promise<Resolved&{source:'held'|'remote'}>;
}
let runtime:Promise<InvoiceSourceRuntime>|undefined;
/** Exact existing native custody; isolated from all account and asset entry. */
export function loadInvoiceSourceRuntime():Promise<InvoiceSourceRuntime>{const url=new URL(`/native/invoice-source.v129.mjs?build=${build.moduleSha256}`,location.origin).href;return runtime??=import(/* @vite-ignore */url).catch(error=>{runtime=undefined;throw error;});}
