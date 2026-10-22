import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import type {LegacyNoteReceivingVerifier} from '../../src/receiz/note-proof-portability';

/** Compile the unchanged receiving entry with this public synthetic fixture's
 * trust policy. Native funding/source/opaque-handle admission remains real. */
export async function legacyNoteReceiver(roots:unknown[]):Promise<LegacyNoteReceivingVerifier>{
 const root=fileURLToPath(new URL('../../',import.meta.url)),native=`${root}native/receiz`;
 const manifest=JSON.parse(readFileSync(`${root}native/manifest.json`,'utf8'));
 const alias:Record<string,string>={'@':native};
 for(const slug of Object.values(manifest.placements)as string[]){const path=`${root}native/npm/${slug}`;alias[JSON.parse(readFileSync(`${path}/package.json`,'utf8')).name]=path;}
 for(const [name,file]of Object.entries({'receiz-native-note-source':'fundedNote','receiz-native-note-credit':'credit','receiz-native-note-compression':'compression','receiz-native-note-account-deposit':'accountDeposit','receiz-native-connected-note':'connectedNote','receiz-native-connected-note-image':'connectedNoteImage'}))alias[name]=`${native}/app/lib/wallet/bankNotes/${file}.ts`;
 alias.snarkjs=`${root}native/npm/snarkjs@0.7.6/build/browser.esm.js`;alias.ffjavascript=`${root}native/npm/ffjavascript@0.3.1/build/browser.esm.js`;
 const result=await build({absWorkingDir:root,entryPoints:[`${root}institution/receiver-verifier.entry.mjs`],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false,external:['node:*'],alias,
  plugins:[{name:'synthetic-note-roots',setup(plugin){
   plugin.onResolve({filter:/^receiz-native-note-image$/},()=>({path:'fixture-note-image',namespace:'fixture'}));
   plugin.onLoad({filter:/.*/,namespace:'fixture'},()=>({resolveDir:root,loader:'ts',contents:`import {openBankNoteImage as open} from ${JSON.stringify(`${native}/app/lib/wallet/bankNotes/noteImage.ts`)};const roots=new Map(${JSON.stringify(roots)}.map(root=>[root.kid,root]));export const openBankNoteImage=bytes=>open(bytes,{roots});`}));
  }}],
 });
 return import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
}
