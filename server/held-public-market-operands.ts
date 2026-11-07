import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {curatePublicMarketMembership} from './public-market.js';
import {publicMarketSeedQuotes} from './public-market-preparation.js';
import {parsePublicMarket} from '../src/receiz/public-market.js';
import {mergePublicSports} from '../src/receiz/public-sports.js';
import {parseMarketCapSource} from '../src/receiz/market-projection/source.js';
import {parseMarketHistory} from '../src/receiz/market-projection/history.js';
import {prepareHeldPublicLedgerDisplay} from './public-ledger-preparation.js';
import {preparePublicPricingCatalogInput} from './public-pricing-checkpoint.js';
export const HELD_PUBLIC_OPERANDS=['membership','quotes','sports','capitalization','history','preparedLedger','pricingMetadata'] as const;
export type HeldPublicOperand=typeof HELD_PUBLIC_OPERANDS[number];
export type HeldPublicOperandRequest={selectionKey:string;projectHeldOperand:HeldPublicOperand};
export type HeldPublicFamily=Readonly<{schema:'bank.public-market.held-family.v1';generation:string;build:string;marketGeneration:string;ledgerGeneration:string;proofCount:number;sportsCount:number}>;
export type HeldPublicOperandResult={schema:'bank.public-market.operand.v1';selectionKey:string;operand:HeldPublicOperand;body:unknown;generation:string;build:string;heldFamily:HeldPublicFamily};
const DIGEST=/^[a-f0-9]{64}$/,MAX=32*1024*1024,sha=(value:string|Uint8Array)=>createHash('sha256').update(value).digest('hex');
function seed(html:string,id:string,schema:string){
 const entries=[...html.matchAll(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>','g'))];
 if(entries.length!==1)throw Error('PUBLIC_HELD_FAMILY_DOCUMENT_REQUIRED');
 const value=JSON.parse(entries[0][1]);if(value.schema!==schema||!DIGEST.test(value.generation))throw Error('PUBLIC_HELD_FAMILY_DOCUMENT_REQUIRED');return value;
}
type Ports={read?:(path:string)=>Promise<Uint8Array>};
/** Bootstrap representation of the complete family this deployment already
 * ships. The fixed preparer binds every operand to its compiled documents.
 * No caller hash grants rights, and no Source/account/financial reader runs. */
export function createHeldPublicMarketOperandPreparer(ports:Ports={}){
 const read=ports.read??(async path=>new Uint8Array(await readFile(path))),families=new Map<string,Promise<{heldFamily:HeldPublicFamily;bodies:Record<HeldPublicOperand,unknown>}>>();
 async function capture(build:string){
  const held=families.get(build);if(held)return held;
  const job=(async()=>{
   const paths=['public/receiz-public-market.json','public/receiz-public-sports.json','public/receiz-public-capitalization.json','public/receiz-public-share-chart-history.json','public/receiz-public-ledger.json.gz.bin','dist/explore/index.html','dist/ledger/index.html'];
   const parts=await Promise.all(paths.map(read));if(parts.some((bytes,index)=>bytes.byteLength>(index===4?12*1024*1024:MAX)))throw Error('PUBLIC_HELD_FAMILY_CAPACITY');
   const [market,sports,capitalization,history]=parts.slice(0,4).map(bytes=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))),explore=seed(new TextDecoder().decode(parts[5]),'public-market-seed','bank.public-market.document.v1'),ledger=seed(new TextDecoder().decode(parts[6]),'public-ledger-document-seed','bank.public-ledger.document.v1');
   const marketHash=createHash('sha256').update('bank.public-market.static.v1');for(const bytes of parts.slice(0,4))marketHash.update('\0').update(bytes);
   const {snapshot,...rawMembership}=market,ledgerGeneration=sha(JSON.stringify({membership:rawMembership,snapshot,ledgerCacheGzipB64u:Buffer.from(parts[4]).toString('base64url')}));
   if(explore.path!=='explore'||ledger.path!=='ledger'||marketHash.digest('hex')!==explore.generation||ledgerGeneration!==ledger.generation)throw Error('PUBLIC_HELD_FAMILY_COHORT_MISMATCH');
   const membership=curatePublicMarketMembership(rawMembership),catalog=parsePublicMarket(membership,snapshot);if(!catalog.complete)throw Error('PUBLIC_HELD_FAMILY_COMPLETE_REQUIRED');
   parseMarketCapSource(capitalization);parseMarketHistory(history);
   const quotes=publicMarketSeedQuotes(snapshot,new Set(catalog.items.map(item=>item.id))),preparedLedger=prepareHeldPublicLedgerDisplay(Buffer.from(parts[4]).toString('base64url'));
   const pricing=await preparePublicPricingCatalogInput(membership,quotes,sports),sportsCount=mergePublicSports(catalog,sports).items.length-catalog.items.length,heldFamily:HeldPublicFamily=Object.freeze({schema:'bank.public-market.held-family.v1',generation:sha('bank.public-market.held-family.v1\0'+JSON.stringify([build,explore.generation,ledger.generation])),build,marketGeneration:explore.generation,ledgerGeneration:ledger.generation,proofCount:catalog.items.length,sportsCount});
   return {heldFamily,bodies:{membership,quotes,sports,capitalization,history,preparedLedger,pricingMetadata:pricing.metadata}};
  })();families.set(build,job);while(families.size>2)families.delete(families.keys().next().value!);void job.catch(()=>{if(families.get(build)===job)families.delete(build);});return job;
 }
 return async(input:HeldPublicOperandRequest,build:string):Promise<HeldPublicOperandResult>=>{
  if(!DIGEST.test(input.selectionKey)||!DIGEST.test(build)||!HELD_PUBLIC_OPERANDS.includes(input.projectHeldOperand))throw Error('PUBLIC_HELD_OPERAND_INPUT_INVALID');
  const {heldFamily,bodies}=await capture(build),body=bodies[input.projectHeldOperand],text=JSON.stringify(body);if(Buffer.byteLength(text)>MAX)throw Error('PUBLIC_HELD_FAMILY_CAPACITY');
  return {schema:'bank.public-market.operand.v1',selectionKey:input.selectionKey,operand:input.projectHeldOperand,body,generation:sha(text),build,heldFamily};
 };
}
export const prepareHeldPublicMarketOperand=createHeldPublicMarketOperandPreparer();
