import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
const outdir='server/receipt-runtime';
await mkdir(outdir,{recursive:true});
for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
// Bundle the same typed client readers for Node, preserving lazy PNG loading.
// Package imports remain external so native resvg and React use their own Node
// entries. No second receipt schema or copied financial implementation.
await build({entryPoints:['server/receipt-preview.ts'],outdir,entryNames:'receipt-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning'});
console.log('Built shared receipt readers for Node with lazy PNG presentation.');
