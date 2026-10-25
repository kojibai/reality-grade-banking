import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),source=resolve(root,'native/receiz'),output=resolve(root,'public/native/business-seal.v129.mjs'),manifestPath=resolve(root,'public/native/business-seal.v129.manifest.json');
const pinned=JSON.parse(await readFile(resolve(root,'native/manifest.json'),'utf8')),aliases={'@':source};
for(const slug of Object.values(pinned.placements)){const folder=resolve(root,'native/npm',slug),pkg=JSON.parse(await readFile(resolve(folder,'package.json'),'utf8'));aliases[pkg.name]=typeof pkg.exports?.['.']?.browser==='string'?resolve(folder,pkg.exports['.'].browser):folder;}
const result=await build({absWorkingDir:source,stdin:{contents:'export {prepareConnectedComposerSource} from "./app/lib/profile/composerPreparation.client.ts";',resolveDir:source,sourcefile:'bank-business-seal-entry.ts'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,treeShaking:true,alias:aliases,external:['node:*'],write:false,metafile:true,legalComments:'inline'});
const bytes=result.outputFiles[0].contents,sha=content=>createHash('sha256').update(content).digest('hex'),inputs=await Promise.all(Object.keys(result.metafile.inputs).filter(path=>path!=='bank-business-seal-entry.ts').sort().map(async path=>({path,sha256:sha(await readFile(resolve(source,path)))})));
const manifest={schema:'bankeiz.native-business-seal.v129',entry:'app/lib/profile/composerPreparation.client.ts',moduleSha256:sha(bytes),sourceTreeSha256:sha(JSON.stringify(inputs)),inputs:inputs.length,bytes:bytes.length};
if(process.argv.includes('--check')){if(sha(await readFile(output))!==manifest.moduleSha256||JSON.stringify(JSON.parse(await readFile(manifestPath,'utf8')))!==JSON.stringify(manifest))throw Error('Business sealing runtime differs from canonical source.');}else{await writeFile(output,bytes);await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');}
console.log('Canonical private sealing runtime verified:',inputs.length,'inputs,',bytes.length,'bytes.');
