import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,dirname,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

const directory=dirname(fileURLToPath(import.meta.url)),root=resolve(directory,'../..');
const pkg=JSON.parse(await readFile(resolve(directory,'package.json'),'utf8'));
export async function buildPayments(){
 await mkdir(resolve(directory,'dist'),{recursive:true});
 const result=await build({absWorkingDir:root,entryPoints:{index:'integrations/payments/src/index.ts',sqlite:'integrations/payments/src/sqlite.ts'},outdir:'integrations/payments/dist',bundle:true,platform:'node',format:'esm',target:'node24',external:['@receiz/sdk'],sourcemap:true,sourcesContent:true,metafile:true});
 execFileSync(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'-p',resolve(directory,'tsconfig.json')],{cwd:root,stdio:'inherit'});
 for(const name of ['index','sqlite','types','webhook'])await copyFile(resolve(directory,`dist/types/integrations/payments/src/${name}.d.ts`),resolve(directory,`dist/${name}.d.ts`));
 await rm(resolve(directory,'dist/types'),{recursive:true,force:true});
 await copyFile(resolve(root,'LICENSE'),resolve(directory,'LICENSE'));
 // Exact source inputs accompany the bundle and complete source maps. They are
 // explanatory/corresponding source, never runtime imports from the Bank repo.
 await rm(resolve(directory,'source'),{recursive:true,force:true});
 for(const path of Object.keys(result.metafile.inputs)){
  const destination=resolve(directory,'source',path);await mkdir(dirname(destination),{recursive:true});await copyFile(resolve(root,path),destination);
 }
 await copyFile(fileURLToPath(import.meta.url),resolve(directory,'source/build.mjs'));
 const destination=resolve(root,'public/integrations');await mkdir(destination,{recursive:true});
 execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',destination,'--cache',resolve(tmpdir(),'bankeiz-payments-pack-cache')],{cwd:directory,stdio:'pipe'});
 const filename=`bankeiz-payments-${pkg.version}.tgz`,bytes=await readFile(resolve(destination,filename));
 const manifest={schema:'bankeiz.payments.distribution.v1',version:pkg.version,sdkVersion:'129.5.0',url:`/integrations/${filename}`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};
 await writeFile(resolve(destination,'index.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(`Built ${pkg.name}@${pkg.version}: ${bytes.length} bytes; SDK external; ${Object.keys(result.metafile.inputs).length} exact source inputs.`);
 return{...manifest,path:resolve(destination,filename),directory:relative(root,directory)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildPayments();
