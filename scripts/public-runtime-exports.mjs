import {resolve} from 'node:path';

/** The public intent loader imports the emitted HTML entry itself. Preserve
 * only its existing mount API through Vite's generated bare-import facade. */
export function publicRuntimeExportsPlugin(){
 const entries=new Map();
 const sources={feed:'/src/public-feed/main.tsx',explore:'/src/public-explorer/main.tsx'};
 return {
  name:'bankeiz-public-runtime-exports',apply:'build',enforce:'post',
  configResolved(config){for(const runtime of ['feed','explore'])entries.set(resolve(config.root,runtime,'index.html').replaceAll('\\','/'),runtime);},
  buildStart(){for(const [id,name]of entries)this.emitFile({type:'chunk',id,name,preserveSignature:'strict'});},
  transform(code,id){const runtime=entries.get(id);if(runtime)return code+`\nexport {mountHeldPublicDocument,mountPublicDocument} from "${sources[runtime]}";`;},
 };
}
