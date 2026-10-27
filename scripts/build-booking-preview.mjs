import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
const outdir='server/booking-runtime';await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
await build({entryPoints:['server/booking-preview.ts'],outdir,entryNames:'booking-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning'});
console.log('Built personalized public booking invitations; portrait and PNG rendering stay off normal booking entry.');
