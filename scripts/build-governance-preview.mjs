import {build} from 'esbuild';
await build({entryPoints:['server/governance-preview.ts'],outfile:'server/governance-runtime/governance-preview.mjs',bundle:true,packages:'external',platform:'node',target:'node24',format:'esm',logLevel:'warning'});
