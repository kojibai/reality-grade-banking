import {readFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export const baselineRoot=new URL('../',import.meta.url);
export const baselineHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function baselineInputs(){
 const directories=['src','server','api','institution','tests','native','scripts','public','branding','docs','conformance','verify','receipt','ledger','explore','pay','.github'];
 const paths=new Set(['package.json','package-lock.json','tsconfig.json','vite.config.ts','vercel.json','index.html','README.md','CONFORMANCE.md','CONTRIBUTING.md','LICENSE','NOTICE','LICENSING.md','LICENSE-PROPOSAL.md','SOURCE.md','THIRD_PARTY_NOTICES.md','TRADEMARKS.md','GOVERNANCE.md','SECURITY.md','CHANGELOG.md','.gitignore','.gitattributes']);
 // Tests also execute deterministic generated public verifier resources. Git
 // ignores those outputs, so inspect the actual shipped tree as well.
 async function walk(path){for(const entry of await readdir(new URL(path,baselineRoot),{withFileTypes:true})){
  if(entry.name==='.DS_Store')continue;
  if(entry.isSymbolicLink())throw Error(`BASELINE_REJECTS_SYMLINK:${path}${entry.name}`);
  const next=path+entry.name;
  if(entry.isDirectory())await walk(next+'/');else if(entry.isFile())paths.add(next);
 }}
 for(const directory of directories)await walk(directory+'/');
 // These generated evidence outputs bind assessed inputs and cannot hash themselves.
 paths.delete('src/content/conformance-baseline.json');
 paths.delete('src/content/conformance-certificate.json');
 paths.delete('public/conformance/bankeiz-public-conformance.png');
 // Server presentation bundles include the baseline itself. Hash their source
 // and build scripts above; the production build and source-archive checks
 // verify the derived bundles without creating a circular evidence digest.
 for(const path of paths)if(/^server\/(?:profile|receipt|asset)-runtime\/.*\.mjs$/.test(path))paths.delete(path);
 return Promise.all([...paths].sort().map(async path=>{
  const url=new URL(path,baselineRoot),before=await stat(url),bytes=await readFile(url),after=await stat(url);
  if(before.mtimeMs!==after.mtimeMs||before.size!==after.size)throw Error(`SOURCE_CHANGED_DURING_HASH:${path}`);
  return {path,sha256:baselineHash(bytes),mtimeMs:after.mtimeMs};
 }));
}
