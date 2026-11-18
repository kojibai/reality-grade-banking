import {build} from 'esbuild';
import {zipSync,strToU8} from 'fflate';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const source='src/features/voting/qualification/';
const target='public/vote/qualifications/';
const bundle=await build({entryPoints:[source+'verify-offline.mjs'],outfile:'verify.mjs',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,
 sourcemap:'external',sourcesContent:true,external:['node:*'],write:false});
const shared=Object.fromEntries(bundle.outputFiles.map(file=>[file.path.split('/').at(-1),file.contents]));
shared.LICENSE=await readFile('LICENSE');shared.NOTICE=await readFile('NOTICE');
shared['README.txt']=strToU8('Bankeiz governance qualification\n\nUnzip this folder and run node verify.mjs with Node.js 22 or later. All sources and verification code are included. The verifier checks the packaged test key, each enclosing Original, electoral closure, register custody and signed successor. The treasury package also checks the rollback-only SQL receipt and seeded balances against the approved installment. Two-sided signed Settlement recovery is separate.\n\nqualification.json carries every exact Original. originals/ contains their identical decoded bytes. verify.mjs.map includes the corresponding verifier sources.\n');
await mkdir(target,{recursive:true});
for(const name of ['election','treasury']){
 const contents=await readFile(source+name+'.json'),p=JSON.parse(contents),files={...shared,'qualification.json':contents};
 if(name==='treasury')for(const item of ['approved-intent.json','settlement.json'])files[item]=await readFile(source+item);
 for(const wire of [p.predecessor,p.successor,...p.sources.originals])files['originals/'+wire.artifactSha256+'.receizbundle']=Buffer.from(wire.exactBytesB64u,'base64url');
 const zip=zipSync(files,{level:9,mtime:new Date(2026,0,1)});await writeFile(target+name+'.zip',zip);
 console.log(name+': '+(p.sources.originals.length+2)+' enclosing Originals, '+zip.length+' bytes');
}
