import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(),source=resolve('native/receiz'),output='public/native/invoice-source.v129.mjs',manifestPath='public/native/invoice-source.v129.manifest.json';
const contents='export {canonicalizeReceizConstitution} from "./packages/receiz-sdk/src/constitution.ts";export {holdReceizMaterialSourceFamily} from "./app/lib/documentSeal/materialSourceCustody.client.ts";export {resolveReceizMaterialCompositeLocalFirst} from "./app/lib/documentSeal/materialSourceFamily.client.ts";';
const result=await build({absWorkingDir:source,stdin:{contents,resolveDir:source,sourcefile:'bank-invoice-source-entry.ts'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,treeShaking:true,alias:{'@':source},external:['node:*'],write:false,metafile:true,legalComments:'inline'});
const bytes=result.outputFiles[0].contents,sha=data=>createHash('sha256').update(data).digest('hex'),inputs=await Promise.all(Object.keys(result.metafile.inputs).filter(p=>p!=='bank-invoice-source-entry.ts').sort().map(async path=>({path,sha256:sha(await readFile(resolve(source,path)))})));
const manifest={schema:'bankeiz.native-invoice-source.v129',moduleSha256:sha(bytes),sourceTreeSha256:sha(JSON.stringify(inputs)),inputs:inputs.length,bytes:bytes.length};
if(process.argv.includes('--check')){if(sha(await readFile(output))!==manifest.moduleSha256||JSON.stringify(JSON.parse(await readFile(manifestPath,'utf8')))!==JSON.stringify(manifest))throw Error('Invoice source runtime differs from canonical native source.');}else{await writeFile(output,bytes);await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
console.log('Canonical invoice source custody:',inputs.length,'inputs,',bytes.length,'bytes.');
