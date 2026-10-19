import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createServer} from 'vite';
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
const {enrichLedgerCardValuations}=await server.ssrLoadModule('/src/receiz/ledger-card-enrichment.ts');
const {parsePublicNetworkCache}=await server.ssrLoadModule('/src/receiz/public-network-cache.ts');
const {indexLedgerValues,ledgerValueForRecord}=await server.ssrLoadModule('/src/receiz/ledger-value.ts');
const {parseMarketCapSource}=await server.ssrLoadModule('/src/receiz/market-projection/source.ts');
const path=process.argv[2];if(!path)throw Error('Pass the complete native public sports economy capture path.');
const bytes=await readFile(path),input=JSON.parse(bytes),target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url);
const original=JSON.parse(gunzipSync(await readFile(target))),cache=parsePublicNetworkCache(original),records=enrichLedgerCardValuations(cache.records,input),byId=new Map(records.map(record=>[record.id,record]));
// Preserve every original wire field and shared context reference byte-for-byte
// at the JSON value level. The build only adds the curated per-copy model.
let enriched=0;
const next={...original,records:original.records.map(record=>{const value=byId.get(record.id)?.valueOperands?.cardValuation;if(!value)return record;enriched++;return {...record,valueOperands:{...record.valueOperands,cardValuation:value}};})};
const decoded=Buffer.from(JSON.stringify(next));if(decoded.length>32*1024*1024)throw Error('PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED');
const checked=parsePublicNetworkCache(next),index=indexLedgerValues(parseMarketCapSource(JSON.parse(await readFile(new URL('../public/receiz-public-capitalization.json',import.meta.url),'utf8'))));
const transfers=checked.records.filter(record=>/card[._-]transfer/i.test(record.kind)),coverage={};for(const record of transfers){const basis=ledgerValueForRecord(record,index).basis;coverage[basis]=(coverage[basis]??0)+1;}
const compressed=gzipSync(decoded,{level:9}),temporary=new URL(`../public/.receiz-public-ledger-${process.pid}.tmp`,import.meta.url);
try{await writeFile(temporary,compressed);await rename(temporary,target);}finally{await rm(temporary,{force:true});}
console.log(JSON.stringify({source:'Existing Receiz native public sports economy route',captureSha256:createHash('sha256').update(bytes).digest('hex'),observedAt:input.generatedAt,enriched,coverage,decodedBytes:decoded.length,compressedBytes:compressed.length,originalRecords:original.records.length,records:checked.records.length,extraRuntimeRequests:0}));
}finally{await server.close();}
