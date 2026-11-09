import { readFile,writeFile } from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
// Application TS imports use the same build host as the existing seed tools;
// plain Node must not try to resolve their emitted .js specifiers as source.
async function seedRuntime(run){
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
 try{const runtime=Object.assign({},...await Promise.all(['/server/public-market-preparation.ts','/server/public-market.ts','/src/receiz/public-market.ts','/src/receiz/public-asset-manifest.ts'].map(path=>server.ssrLoadModule(path))));return await run(runtime);}
 finally{await server.close();}
}

async function previousSeed(){try{return JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));}catch{return undefined;}}
async function seedMembershipOnly(args,{buildMembershipOnlyPublicMarketState,readReceizPublicMarketSource,parsePublicMarket}){
 const local=name=>args.find(arg=>arg.startsWith('--'+name+'-file='))?.slice(name.length+8),read=(kind,file)=>file?readFile(file,'utf8').then(JSON.parse):readReceizPublicMarketSource(kind,undefined,{fresh:true});
 const held=name=>readFile(new URL('../public/receiz-public-'+name+'.json',import.meta.url),'utf8').then(JSON.parse);
 const selected=args.includes('--selected'),membershipWork=read('membership',local('membership'));
 const [membership,snapshot,previous,sports,capitalization,history,shareHistory]=await Promise.all([membershipWork,selected?membershipWork.then(input=>input.snapshot):read('quotes',local('quotes')),previousSeed(),held('sports'),held('capitalization'),held('chart-history'),held('share-chart-history')]);
 if(!previous)throw Error('PUBLIC_MARKET_HISTORY_PREFIX_REQUIRED');
 const state=await buildMembershipOnlyPublicMarketState({membership,snapshot,previous,sports,capitalization,history,shareHistory}),source=state.source,bytes=JSON.stringify(source),historyBytes=JSON.stringify(state.history),shareHistoryBytes=JSON.stringify(state.shareHistory),catalog=parsePublicMarket(source,source.snapshot);
 if([bytes,historyBytes,shareHistoryBytes].some(value=>Buffer.byteLength(value)>32*1024*1024))throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
 await writeFile(new URL('../public/receiz-public-market.json',import.meta.url),bytes);
 await writeFile(new URL('../public/receiz-public-chart-history.json',import.meta.url),historyBytes);
 await writeFile(new URL('../public/receiz-public-share-chart-history.json',import.meta.url),shareHistoryBytes);
 await (await import('./build-asset-title-index.mjs')).writeAssetTitleIndex();
 console.log(JSON.stringify({source:'https://receiz.com/api/market/public-membership',mode:'membership-only',count:catalog.items.length,observedAt:catalog.observedAt,bytes:Buffer.byteLength(bytes),historyPulse:state.history.summary.serverPulse,shareHistoryPulse:state.shareHistory.summary.serverPulse,authority:'projection-only'}));
}
async function seedFullPublicMarket({publicMarketSeedQuotes,readReceizPublicMarketSource,parsePublicMarket,retainPublicMomentManifest}){
const [membership, snapshot, sports, capitalization] = await Promise.all([
  readReceizPublicMarketSource('membership'),
  readReceizPublicMarketSource('quotes'),
  readReceizPublicMarketSource('sports'),
  readReceizPublicMarketSource('capitalization'),
]);
const catalog = parsePublicMarket(membership, snapshot);
if (!catalog.complete) throw new Error('The public source did not return its complete collection; seed not replaced.');
const wanted = new Set(catalog.items.map(item => item.id));
const quotes = publicMarketSeedQuotes(snapshot,wanted);
// A thinner membership response must not discard an already-carried receipt
// basis. Reuse the same exact binding checks as the live catalog.
let previous=null;try{const held=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));previous=new Map(parsePublicMarket(held,held.snapshot).items.map(item=>[item.id,item]));}catch{/* First capture has no retained public inputs. */}
if(previous){const rows=new Map(membership.transport.publicOriginals.map(row=>[row.id,row]));for(const item of catalog.items){const retained=retainPublicMomentManifest(item,previous.get(item.id));if(retained!==item)rows.get(item.id).profileOriginal.recordCardMediaSha256Hex=retained.proofManifestSource.recordCardMediaSha256Hex;}}
const source = { ...membership, snapshot: quotes };
const bytes = JSON.stringify(source);
await writeFile(new URL('../public/receiz-public-market.json', import.meta.url), bytes);
await (await import('./build-asset-title-index.mjs')).writeAssetTitleIndex();
console.log(JSON.stringify({ source: 'https://receiz.com/api/market/public-membership', count: catalog.items.length, observedAt: catalog.observedAt, bytes: Buffer.byteLength(bytes), authority: 'projection-only' }));

await writeFile(new URL('../public/receiz-public-sports.json', import.meta.url), JSON.stringify(sports));
await writeFile(new URL('../public/receiz-public-capitalization.json', import.meta.url), JSON.stringify(capitalization));

}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const args=process.argv.slice(2);
 if(args.some(arg=>arg!=='--membership-only'&&arg!=='--selected'&&!/^--(?:membership|quotes)-file=.+/.test(arg))||args.length&&!args.includes('--membership-only'))throw Error('Use --membership-only with optional --membership-file= and --quotes-file= inputs.');
 const membershipOnly=args.includes('--membership-only');
 await seedRuntime(runtime=>membershipOnly?seedMembershipOnly(args,runtime):seedFullPublicMarket(runtime));
 if(!membershipOnly)await import('./seed-market-history.mjs');
}
