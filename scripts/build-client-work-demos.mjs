import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {relative,resolve} from 'node:path';
import {transform} from 'esbuild';
import {bundleCssFiles,scopeProductCss} from './scope-product-css.mjs';
import {clientWorkScenarios} from '../src/content/client-work-scenarios.mjs';

// These are presentation samples, never account state or admitted Originals.
// Render the same component and identifier prefix that the browser hydrates.
export const clientWorkIntents=['proposal','invoice','document','agreement','communication','management'];
export async function buildClientWorkDemos({check=false}={}){
 const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
 try{
  const {ClientWorkDemo}=await server.ssrLoadModule('/src/presentation/ClientWorkDemo.tsx');
  const screens={};
  for(const scenario of clientWorkScenarios)for(const intent of clientWorkIntents){
   screens[scenario.id+':'+intent]=renderToString(createElement(ClientWorkDemo,{scenarioId:scenario.id,intent,idPrefix:'client-work-example'}),{identifierPrefix:'client-work-example-'});
  }
  const files=['src/styles/tokens.css','src/components/form-controls.css','src/styles/app.css','src/styles/features.css','src/features/messages/messages.css'];
  const imported=[...server.environments.ssr.moduleGraph.idToModuleMap.values()].map(module=>module.file).filter(file=>file?.endsWith('.css')&&file.startsWith(resolve('src')+'/')).map(file=>relative(process.cwd(),file));
  const shared=await bundleCssFiles([...new Set([...files,...imported.filter(file=>file!=='src/presentation/client-work-demo.css'),'src/features/media/proof-pdf-reader.css'])]);
  const own=await readFile('src/presentation/client-work-demo.css','utf8');
  const css=(await transform(scopeProductCss(shared)+own,{loader:'css',minify:true,target:['safari16','chrome100']})).code;
  const result=JSON.stringify({notice:'Real shared presentation; fictional local examples, scripted Twin replies, no proof or account authority.',screens,css})+'\n';
  const path='src/content/client-work-demo.generated.json';
  if(check){if(await readFile(path,'utf8')!==result)throw Error('CLIENT_WORK_DEMOS_OUT_OF_DATE');}else await writeFile(path,result);
  console.log(`${check?'Verified':'Rendered'} ${clientWorkScenarios.length} interactive client scenarios in ${clientWorkIntents.length} task entrances.`);
 }finally{await server.close();}
}
if(process.argv[1]?.endsWith('build-client-work-demos.mjs'))await buildClientWorkDemos({check:process.argv.includes('--check')});
