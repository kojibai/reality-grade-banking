import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createServer} from 'vite';
// One-time source replay. No source requests, balance writes or custody effects.
const path=process.argv[2];if(!path)throw Error('Pass the held v1 source capture.');
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{
 const {reconstructWalletProofCohort}=await server.ssrLoadModule('/src/receiz/ledger-wallet-cohorts.ts');
 const {parsePublicNetworkCache}=await server.ssrLoadModule('/src/receiz/public-network-cache.ts');
 const {PUBLIC_NETWORK_INSPECTION_VERSION}=await server.ssrLoadModule('/src/receiz/public-network.ts');
 const {readLedgerCausalLineage}=await server.ssrLoadModule('/src/receiz/ledger-causal-source.ts');
 const bytes=await readFile(path),capture=JSON.parse(bytes);if(!Array.isArray(capture.seeds)||capture.seeds.length>100)throw Error('LEGACY_SEED_CAPTURE_INVALID');
 const cohorts=capture.seeds.map(reconstructWalletProofCohort);if(cohorts.some(value=>!value)||new Set(cohorts.map(value=>value.creditSourceId)).size!==cohorts.length)throw Error('LEGACY_MEMBERSHIP_REPLAY_INCOMPLETE');
 const target=new URL('../public/receiz-public-ledger.json.gz.bin',import.meta.url),held=JSON.parse(gunzipSync(await readFile(target))),parsed=parsePublicNetworkCache(held),records=new Map(parsed.records.map(record=>[record.id,record])),detailContexts=[...(held.detailContexts??[])],contexts=new Map(detailContexts.map((value,index)=>[JSON.stringify(value),index]));
 let linked=0;const next={...held,inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,detailContexts,records:held.records.map(wire=>{
  const record=records.get(wire.id),details=record.details??{},attribution=details.fundingAttribution,history=details.fundingHistory??[];
  const refs=new Set([...(attribution?.parts?.flatMap(part=>part.sources.map(source=>source.sourceId))??[]),...history.flatMap(entry=>entry.parent.parts.flatMap(part=>part.sources.map(source=>source.sourceId))),...(readLedgerCausalLineage(details.causalLineage)?.steps.map(step=>step.sourceId)??[])]);
  const selected=cohorts.filter(cohort=>refs.has(cohort.creditSourceId));if(!selected.length)return wire;
  const context={...detailContexts[wire.detailsRef],fundingCohorts:selected},key=JSON.stringify(context);let index=contexts.get(key);if(index===undefined){index=detailContexts.length;contexts.set(key,index);detailContexts.push(context);}
  const inline={...wire.details};delete inline.fundingCohorts;linked++;return {...wire,details:inline,detailsRef:index};
 })};
 const output=Buffer.from(JSON.stringify(next));if(output.length>32*1024*1024)throw Error('PUBLIC_LEDGER_SEED_DECODED_CAPACITY_EXCEEDED');parsePublicNetworkCache(next);
 const compressed=gzipSync(output,{level:9});if(process.argv.includes('--apply')){const temp=new URL(`../public/.ledger-cohorts-${process.pid}.tmp`,import.meta.url);try{await writeFile(temp,compressed);await rename(temp,target);}finally{await rm(temp,{force:true});}}
 console.log(JSON.stringify({captureSha256:createHash('sha256').update(bytes).digest('hex'),cohorts:cohorts.length,members:cohorts.reduce((sum,cohort)=>sum+cohort.members.length,0),linkedRecords:linked,decodedBytes:output.length,compressedBytes:compressed.length,extraRuntimeRequests:0,applied:process.argv.includes('--apply')}));
}finally{await server.close();}
