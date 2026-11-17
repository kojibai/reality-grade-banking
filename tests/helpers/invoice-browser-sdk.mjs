import {build} from 'esbuild';
import {resolve} from 'node:path';
/** Real canonical SDK with an explicit synthetic public root policy. This
 * changes no production trust root and never replaces an admission guard. */
export async function invoiceBrowserSdk(roots){
 const root=process.cwd(),native=resolve('native/receiz'),sdk=resolve(native,'packages/receiz-sdk/src/index.ts');
 const result=await build({absWorkingDir:root,stdin:{resolveDir:root,contents:`export {createReceizClient,digestReceizCanonicalV122,encodeReceizMaterialCapsuleBytes,buildReceizMaterialCompositeTransport,createReceizMaterialSourceFamily,publishReceizMaterialCompositeTransport,resolveReceizMaterialCompositeTransport,decodeReceizRawMaterialCapsuleBytes,decodeReceizMaterialCapsuleBytes} from ${JSON.stringify(sdk)};`},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,external:['node:*'],alias:{'@':native},plugins:[{name:'invoice-fixture-policy',setup(plugin){plugin.onLoad({filter:/receiz-sdk\/src\/verifier\/roots\.ts$/},()=>({loader:'ts',contents:`export const receizCurrentPinnedSignatureV4Roots=()=>new Map(${JSON.stringify(roots)}.map(root=>[root.kid,root]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;`}));}}]});return result.outputFiles[0].contents;
}
