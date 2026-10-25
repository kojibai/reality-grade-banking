import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=await build({absWorkingDir:root,entryPoints:['scripts/provision-business-dns.ts'],bundle:true,platform:'node',format:'esm',packages:'external',write:false,target:'node24'});
try{await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].contents).toString('base64'));}catch(cause){console.error(cause instanceof Error?cause.message:'DNS_PROVISION_UNCONFIRMED');process.exitCode=1;}
