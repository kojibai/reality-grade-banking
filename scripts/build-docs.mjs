import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDocs} from '../docs-app/build.mjs';
export {buildDocs};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildDocs(process.argv.includes('--mirror')?{root:'dist/docs',base:'/docs/'}:{root:'docs-dist'});
