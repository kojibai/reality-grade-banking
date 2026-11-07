import {build} from 'esbuild';
import {mkdir,readdir,unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function buildInvitationPreview(outdir='server/invitation-runtime'){
 await mkdir(outdir,{recursive:true});
 for(const name of await readdir(outdir))if(name.endsWith('.mjs'))await unlink(`${outdir}/${name}`);
 // Use the same bounded public capture reader for HTML and image presentation.
 // PNG rendering remains lazy; no account, profile or financial readers enter.
 await build({entryPoints:['server/invitation-preview.ts'],outdir,entryNames:'invitation-preview',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 await buildInvitationPreview();
 console.log('Built digest-bound public invitation previews with lazy branded PNG presentation.');
}
