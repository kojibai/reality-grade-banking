import {readReceizPublicMarketSource} from './public-market.js';
import {completeSports,type PublicMarketOperand} from './public-market-preparation.js';
import {preparePublicMarketState} from './prepared-public-market-state.js';
import {preparePublicLedgerDisplay} from './public-ledger-preparation.js';
import {preparePublicPricingCatalogInput} from './public-pricing-checkpoint.js';
import {parseMarketHistory} from '../src/receiz/market-projection/history.js';
export type PreparedPublicMarketOperand=PublicMarketOperand|'preparedLedger'|'history'|'pricing';
export type PublicMarketBootstrapOperands=Readonly<Record<PublicMarketOperand,string>>;
export type PublicMarketOperandRequest={selectionKey:string;projectOperand:PreparedPublicMarketOperand;operands?:PublicMarketBootstrapOperands};
export type PublicMarketOperandResult={schema:'bank.public-market.operand.v1';selectionKey:string;operand:PreparedPublicMarketOperand;body:unknown;asOfPulse?:number;operands?:PublicMarketBootstrapOperands;profileHeads?:readonly unknown[]};
type Ports={read?:(kind:PublicMarketOperand,selectionKey:string)=>Promise<unknown>;completeSports?:(input:unknown)=>Promise<unknown>;prepareLedger?:()=>Promise<unknown>;prepareMarket?:(input:Record<string,unknown>)=>Promise<{history:unknown;asOfPulse:number}>;parseHistory?:(input:unknown)=>unknown};
/** Explicit first bootstrap only, when no accepted retained material exists.
 * Each family keeps its own existing representation and size boundary. The
 * selected Source coordinator owns coherence/currentness before promotion;
 * selectionKey is only an in-process display-work coordinate here. */
export function createPublicMarketOperandPreparer(ports:Ports={}){
 const selections=new Map<string,Map<PreparedPublicMarketOperand,Promise<PublicMarketOperandResult>>>();
 const rawHeads=new Map<string,readonly unknown[]>();
 const read=ports.read??((kind,key)=>readReceizPublicMarketSource(kind,undefined,{fresh:true,selectionKey:key,onPublicProfileHeads:heads=>{rawHeads.set(key,heads);while(rawHeads.size>2)rawHeads.delete(rawHeads.keys().next().value!);}}));
 async function prepare(input:PublicMarketOperandRequest,selectedOperands?:Readonly<Record<PublicMarketOperand,unknown>>):Promise<PublicMarketOperandResult>{
  if(!/^[a-f0-9]{64}$/.test(input.selectionKey)||!['membership','quotes','sports','capitalization','preparedLedger','history','pricing'].includes(input.projectOperand))throw Error('PUBLIC_MARKET_OPERAND_INPUT_INVALID');
  const coordinate=input.selectionKey+(input.operands?':'+JSON.stringify(input.operands):'');let jobs=selections.get(coordinate);if(!jobs){jobs=new Map();selections.set(coordinate,jobs);while(selections.size>2)selections.delete(selections.keys().next().value!);}const held=jobs.get(input.projectOperand);if(held)return held;
  const selected=jobs,job=(async()=>{const result:PublicMarketOperandResult={schema:'bank.public-market.operand.v1',selectionKey:input.selectionKey,operand:input.projectOperand,body:null};
   if(input.projectOperand==='preparedLedger')result.body=await(ports.prepareLedger??preparePublicLedgerDisplay)();
   else if(input.projectOperand==='history'||input.projectOperand==='pricing'){
    if(input.operands&&!selectedOperands)throw Error('PUBLIC_MARKET_OPERAND_SELECTION_REQUIRED');
    const family=(projectOperand:PublicMarketOperand)=>selectedOperands?Promise.resolve(selectedOperands[projectOperand]):prepare({selectionKey:input.selectionKey,projectOperand}).then(value=>value.body),[membership,snapshot,sports,capitalization]=await Promise.all([family('membership'),family('quotes'),family('sports'),family('capitalization')]);
    if(input.projectOperand==='pricing')result.body=await preparePublicPricingCatalogInput(membership,snapshot,sports);
    else{const state=await(ports.prepareMarket??preparePublicMarketState)({membership,snapshot,sports,capitalization});result.body=(ports.parseHistory??parseMarketHistory)(state.history);result.asOfPulse=state.asOfPulse;}
    if(input.operands)result.operands=input.operands;
   }else{const raw=await read(input.projectOperand,input.selectionKey);result.body=input.projectOperand==='sports'?await(ports.completeSports??completeSports)(raw):raw;}
   if(input.projectOperand==='membership'&&rawHeads.has(input.selectionKey))result.profileHeads=rawHeads.get(input.selectionKey);
   return result;
  })();selected.set(input.projectOperand,job);void job.catch(()=>{if(selected.get(input.projectOperand)===job)selected.delete(input.projectOperand);});return job;
 }
 return prepare;
}
export const preparePublicMarketOperand=createPublicMarketOperandPreparer();
