import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
// Read existing public native captures only. This tool performs no fetch.
const paths=process.argv.slice(2);if(!paths.length)throw Error('Pass existing native public sports economy capture files.');
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {enrichLedgerCausalHistory}=await server.ssrLoadModule('/src/receiz/ledger-causal-enrichment.ts');
 const {parsePublicNetworkCache}=await server.ssrLoadModule('/src/receiz/public-network-cache.ts');
 const target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url),original=JSON.parse(gunzipSync(await readFile(target)));
 let rows=parsePublicNetworkCache(original).records;const captures=[];
 for(const path of paths){const bytes=await readFile(path);rows=enrichLedgerCausalHistory(rows,JSON.parse(bytes));captures.push({sha256:createHash('sha256').update(bytes).digest('hex')});}
 const byId=new Map(rows.map(row=>[row.id,row])),next={...original,records:original.records.map(row=>{const lineage=byId.get(row.id)?.details?.causalLineage;return lineage?{...row,details:{...row.details,causalLineage:lineage}}:row;})};
 const bytes=Buffer.from(JSON.stringify(next));if(bytes.length>32*1024*1024)throw Error('PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED');parsePublicNetworkCache(next);
 const compressed=gzipSync(bytes,{level:9}),temp=new URL(`../public/.ledger-causal-${process.pid}.tmp`,import.meta.url);
 try{await writeFile(temp,compressed);await rename(temp,target);}finally{await rm(temp,{force:true});}
 console.log(JSON.stringify({records:rows.length,withCausalHistory:rows.filter(row=>row.details?.causalLineage).length,captures,decodedBytes:bytes.length,compressedBytes:compressed.length,extraRuntimeRequests:0}));
}finally{await server.close();}
