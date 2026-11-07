import type {HeldPublicOperandRequest,HeldPublicOperandResult} from './held-public-market-operands.js';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {PublicMarketRenderInput} from './public-market-document';
import {preparedPublicPagePath,publicMarketPreparedPath} from '../src/receiz/prepared-public-page-path.js';
import {readPreparedPublicMaterial,preparedPublicMaterialSelection} from './prepared-public-material.js';
import type {PublicSportsParts} from './public-sports-parts.js';
import type {PublicOriginalPartInput,PublicOriginalParts} from './public-original-parts.js';
import type {PublicHistoryTransitionInput,PublicHistoryTransitionResult} from './public-history-transition.js';
import type {PublicMarketOperandRequest,PublicMarketOperandResult} from './public-market-operands.js';
import type {PublicMarketOperand} from './public-market-preparation.js';

const MAX=32*1024*1024,POST_MAX=4*1024*1024,DIGEST=/^[a-f0-9]{64}$/;
const headers={'content-type':'text/html; charset=utf-8','cache-control':'no-store, no-transform','x-content-type-options':'nosniff'};
const materialHeaders=['x-receiz-public-material-revision','x-receiz-public-render-build','x-receiz-public-html-sha256'] as const;
let renderBuild:Promise<string>|undefined;
async function publicRenderBuild():Promise<string>{
 return renderBuild??=import('node:fs/promises').then(async({readFile})=>{
  const value=JSON.parse(await readFile('server/profile-runtime/public-market-render-build.json','utf8'));
  if(value.schema!=='bank.public-market.render-build.v1'||!DIGEST.test(value.sha256))throw Error('PUBLIC_MARKET_RENDER_BUILD_REQUIRED');return value.sha256 as string;
 }).catch(error=>{renderBuild=undefined;throw error;});
}
export type PreparedPublicPageRenderInput={material:string;generation:string;path:string;template:string};
type RenderInput=Omit<PreparedPublicPageRenderInput,'template'>;
type InputPreparation={selectionKey:string;history?:unknown;previousMaterial?:string;previousGeneration?:string;refreshMarket?:true;membershipGeneration?:string;membership?:Record<string,unknown>;changedQuotes?:Array<Record<string,unknown>>;currentLedgerHeads?:unknown;requestOptionsSha256?:string};
type Dependencies={prepareHeldOperand?:(input:HeldPublicOperandRequest,build:string)=>Promise<HeldPublicOperandResult>;prepared:(method:'GET'|'HEAD',path:string,build:string)=>Promise<Response>;render:(input:RenderInput)=>Promise<string>;prepareInput?:(input:InputPreparation)=>Promise<{material:string;generation:string}>;prepareSportsParts?:(input:unknown)=>Promise<PublicSportsParts>|PublicSportsParts;prepareOriginalParts?:(input:PublicOriginalPartInput)=>Promise<PublicOriginalParts>|PublicOriginalParts;prepareHistoryTransition?:(input:PublicHistoryTransitionInput)=>Promise<PublicHistoryTransitionResult>;prepareOperand?:(input:PublicMarketOperandRequest,selected?:Readonly<Record<PublicMarketOperand,unknown>>)=>Promise<PublicMarketOperandResult>;readMaterial?:(generation:string)=>Promise<string>;build?:string};
async function readMaterial(generation:string):Promise<string>{return readPreparedPublicMaterial(generation);}
async function prepareSportsParts(input:unknown):Promise<PublicSportsParts>{const module=await import(pathToFileURL(resolve('server/profile-runtime/public-page-preparation.mjs')).href) as typeof import('./public-page-preparation');return module.preparePublicSportsParts(input);}
async function prepareOriginalParts(input:PublicOriginalPartInput):Promise<PublicOriginalParts>{
 const module=await import(pathToFileURL(resolve('server/profile-runtime/public-page-preparation.mjs')).href) as typeof import('./public-page-preparation');return module.preparePublicOriginalParts(input);
}
async function prepareHistoryTransition(input:PublicHistoryTransitionInput):Promise<PublicHistoryTransitionResult>{const module=await import(pathToFileURL(resolve('server/profile-runtime/public-page-preparation.mjs')).href) as typeof import('./public-page-preparation');return module.preparePublicHistoryTransition(input);}
async function prepareOperand(input:PublicMarketOperandRequest,selected?:Readonly<Record<PublicMarketOperand,unknown>>):Promise<PublicMarketOperandResult>{const module=await import(pathToFileURL(resolve('server/profile-runtime/public-page-preparation.mjs')).href) as typeof import('./public-page-preparation');return module.preparePublicMarketOperand(input,selected);}
function streamedText(value:string):ReadableStream<Uint8Array>{const bytes=new TextEncoder().encode(value);let offset=0;return new ReadableStream({pull(controller){if(offset===bytes.byteLength){controller.close();return;}const end=Math.min(offset+32768,bytes.byteLength);controller.enqueue(bytes.subarray(offset,end));offset=end;}});}
const preparingInputs=new Map<string,Promise<{material:string;generation:string}>>();
async function prepareInput(input:InputPreparation):Promise<{material:string;generation:string}>{
 const key=input.requestOptionsSha256??createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const held=preparingInputs.get(key);if(held)return held;
 if(preparingInputs.size>=4)throw Error('PUBLIC_MARKET_RENDER_BUSY');
 const job=(import(pathToFileURL(resolve('server/profile-runtime/public-page-preparation.mjs')).href) as Promise<typeof import('./public-page-preparation')>).then(module=>module.preparePublicMarketRenderMaterial({...input,prepareMarket:module.preparePublicMarketState,prepareLedger:previous=>module.preparePublicLedgerDisplay({previous:previous as NonNullable<Parameters<typeof module.preparePublicLedgerDisplay>[0]>['previous'],currentHeads:input.currentLedgerHeads as NonNullable<Parameters<typeof module.preparePublicLedgerDisplay>[0]>['currentHeads']})}));
 preparingInputs.set(key,job);void job.finally(()=>{if(preparingInputs.get(key)===job)preparingInputs.delete(key);}).catch(()=>{});return job;
}
async function bounded(request:Request):Promise<string>{
 if(Number(request.headers.get('content-length'))>POST_MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
 const chunks:Uint8Array[]=[];let size=0;const reader=request.body?.getReader();if(!reader)throw Error('PUBLIC_MARKET_RENDER_INPUT_INVALID');
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>POST_MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(chunks).toString('utf8');
}
async function render(input:RenderInput):Promise<string>{
 const bank=input.path==='bank',bankEntry=input.path==='bank-entry',market=publicMarketPreparedPath(input.path),module=bank||bankEntry||market?'public-market-document':'prepared-dependent-documents';
 const templatePath=market?input.path:input.path==='ledger'||input.path==='ledger/proofs'?'ledger':input.path==='feed'||input.path==='discover'?input.path:input.path.startsWith('receipt/')?'receipt':'explore';
 const [{readFile},runtime]=await Promise.all([import('node:fs/promises'),import(pathToFileURL(resolve('server/profile-runtime/'+module+'.mjs')).href)]);
 const value={...input,renderBuild:await publicRenderBuild(),template:bank?'':await readFile(bankEntry?'dist/index.html':'dist/'+templatePath+'/index.html','utf8')};
 return bank?runtime.renderPreparedBankDocument(value satisfies PublicMarketRenderInput):bankEntry?runtime.renderPreparedBankEntryDocument(value satisfies PublicMarketRenderInput):market?runtime.renderPublicMarketDocument(value satisfies PublicMarketRenderInput):runtime.renderPreparedDependentDocument(value satisfies PreparedPublicPageRenderInput);
}
/** Public display rendering cannot store, promote, admit or sign anything. */
export async function handlePreparedPublicMarket(request:Request,provided?:Dependencies):Promise<Response>{
 const url=new URL(request.url),operation=url.searchParams.get('prepare'),prepare=url.pathname==='/api/explore'&&operation==='1',inputPreparation=url.pathname==='/api/explore'&&operation==='input';
 const selectedPath=preparedPublicPagePath(url.searchParams.get('path')??(url.pathname==='/api/explore'?'explore':url.pathname.replace(/^\//,'').replace(/\/$/,'').replace(/^explorer$/,'explore')));
 const deps=provided??{prepared:(method:'GET'|'HEAD',path:string,build:string)=>fetch('https://receiz.com/api/market/prepared-page?'+new URLSearchParams({path,build}),{method,credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(8000)]),headers:{accept:'text/html'}}),render};
 let build:string;try{build=provided?provided.build??'local':await publicRenderBuild();}catch{return new Response(null,{status:503,headers});}
 const passiveBuild=!url.searchParams.has('prepare')&&url.pathname==='/api/explore'&&['GET','HEAD'].includes(request.method)&&url.searchParams.getAll('build').length===1&&DIGEST.test(url.searchParams.get('build')??'');
 const linkedLedger=!url.searchParams.has('prepare')&&['GET','HEAD'].includes(request.method)&&(selectedPath==='ledger'||selectedPath==='ledger/proofs');
 if(!selectedPath||[...url.searchParams.keys()].some(key=>!['prepare','path'].includes(key)&&!(linkedLedger&&key==='source')&&!(passiveBuild&&key==='build'))||url.searchParams.getAll('path').length>1||url.searchParams.getAll('prepare').length>1||url.searchParams.has('source')&&(url.searchParams.getAll('source').length!==1||!DIGEST.test(url.searchParams.get('source')!)))return new Response(null,{status:404,headers});
 if(passiveBuild)build=url.searchParams.get('build')!;
 if(inputPreparation){
  const jsonHeaders={...headers,'content-type':'application/json; charset=utf-8',[materialHeaders[1]]:build};
  if(request.method==='HEAD')return new Response(null,{status:204,headers:jsonHeaders});
  if(request.method!=='POST')return new Response(null,{status:405,headers:{...jsonHeaders,allow:'POST, HEAD'}});
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return new Response(null,{status:415,headers:jsonHeaders});
  try{
   const requestOptions=await bounded(request),input=JSON.parse(requestOptions);
   if(input?.projectHeldOperand!==undefined){
    if(!DIGEST.test(input.selectionKey)||Object.keys(input).some(key=>!['selectionKey','projectHeldOperand'].includes(key))||!['membership','quotes','sports','capitalization','history','preparedLedger','pricingMetadata'].includes(input.projectHeldOperand))return new Response(null,{status:400,headers:jsonHeaders});
    const result=await(provided?.prepareHeldOperand??(await import('./held-public-market-operands.js')).prepareHeldPublicMarketOperand)(input,build),body=JSON.stringify(result);if(Buffer.byteLength(body)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
    return new Response(streamedText(body),{headers:jsonHeaders});
   }
   if(input?.projectOperand!==undefined){
    if(!DIGEST.test(input.selectionKey)||Object.keys(input).some(key=>!['selectionKey','projectOperand','operands'].includes(key))||!['membership','quotes','sports','capitalization','preparedLedger','history','pricing'].includes(input.projectOperand))return new Response(null,{status:400,headers:jsonHeaders});
    let selected:Record<PublicMarketOperand,unknown>|undefined,selectedText:Map<string,string>|undefined;
    if(input.operands!==undefined){const operands=input.operands;if(!['history','pricing'].includes(input.projectOperand)||!operands||typeof operands!=='object'||Array.isArray(operands)||Object.keys(operands).sort().join(',')!=='capitalization,membership,quotes,sports'||Object.values(operands).some(id=>typeof id!=='string'||!DIGEST.test(id)))return new Response(null,{status:400,headers:jsonHeaders});const read=provided?.readMaterial??readMaterial;selectedText=new Map();selected={} as Record<PublicMarketOperand,unknown>;for(const kind of ['membership','quotes','sports','capitalization'] as const){const body=await read(operands[kind]);selectedText.set(operands[kind],body);selected[kind]=JSON.parse(body);}}
    const prepare=provided?.prepareOperand??prepareOperand,result=await prepare(input,selected);
    if(selectedText)for(const [id,text]of selectedText)if(await(provided?.readMaterial??readMaterial)(id)!==text)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');
    const body=JSON.stringify({...result,build});if(Buffer.byteLength(body)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return new Response(streamedText(body),{headers:jsonHeaders});
   }
   if(input?.historyTransition!==undefined){
    const transition=input.historyTransition;
    if(!DIGEST.test(input.selectionKey)||Object.keys(input).some(key=>!['selectionKey','historyTransition'].includes(key))||!transition||typeof transition!=='object'||Array.isArray(transition)||Object.keys(transition).some(key=>!['previousGeneration','currentGeneration','changedKeys','asOfPulse'].includes(key))||!DIGEST.test(transition.previousGeneration)||!DIGEST.test(transition.currentGeneration)||transition.previousGeneration===transition.currentGeneration||!Number.isSafeInteger(transition.asOfPulse)||transition.asOfPulse<0||transition.asOfPulse>1e10||transition.changedKeys!==undefined&&(!Array.isArray(transition.changedKeys)||transition.changedKeys.length>32||transition.changedKeys.some((key:unknown)=>typeof key!=='string'||!key||key.length>4096)||new Set(transition.changedKeys).size!==transition.changedKeys.length))return new Response(null,{status:400,headers:jsonHeaders});
    const readPart=provided?.readMaterial??preparedPublicMaterialSelection({root:transition.currentGeneration,role:'history-transition'}).read,readPreviousPart=provided?.readMaterial??preparedPublicMaterialSelection({root:transition.previousGeneration,selection:transition.currentGeneration,role:'history-predecessor'}).read,previousMaterial=await readPreviousPart(transition.previousGeneration),currentMaterial=await readPart(transition.currentGeneration);
    const result=await(provided?.prepareHistoryTransition??prepareHistoryTransition)({...input,previousMaterial,currentMaterial,readPart,readPreviousPart});
    if(await readPreviousPart(transition.previousGeneration)!==previousMaterial||await readPart(transition.currentGeneration)!==currentMaterial)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');
    const body=JSON.stringify({...result,build});if(Buffer.byteLength(body)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');return new Response(streamedText(body),{headers:jsonHeaders});
   }
   if(input?.projectSports!==undefined){
    if(Object.keys(input).some(key=>key!=='projectSports')||!input.projectSports||Object.keys(input.projectSports).some(key=>key!=='generation')||!DIGEST.test(input.projectSports.generation))return new Response(null,{status:400,headers:jsonHeaders});
    const original=JSON.parse(await(provided?.readMaterial??readMaterial)(input.projectSports.generation)),projected=await(provided?.prepareSportsParts??prepareSportsParts)(original);
    return new Response(streamedText(JSON.stringify({...projected,build})),{headers:jsonHeaders});
   }
   if(input?.projectOriginals!==undefined){
    if(!DIGEST.test(input.selectionKey)||Object.keys(input).some(key=>!['selectionKey','projectOriginals'].includes(key))||!Array.isArray(input.projectOriginals)||!input.projectOriginals.length||input.projectOriginals.length>32)return new Response(null,{status:400,headers:jsonHeaders});
    const projected=await(provided?.prepareOriginalParts??prepareOriginalParts)(input),body=JSON.stringify({...projected,build});if(Buffer.byteLength(body)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
    return new Response(streamedText(body),{headers:jsonHeaders});
   }
   if(!DIGEST.test(input?.selectionKey)||Object.keys(input).some(key=>!['selectionKey','history','previousGeneration','refreshMarket','membershipGeneration','membership','changedQuotes','currentLedgerHeads'].includes(key))||input.previousGeneration!==undefined&&!DIGEST.test(input.previousGeneration)||input.refreshMarket!==undefined&&(input.refreshMarket!==true||!input.previousGeneration||input.membershipGeneration!==undefined||input.membership!==undefined||input.changedQuotes!==undefined)||input.membershipGeneration!==undefined&&!DIGEST.test(input.membershipGeneration)||input.membership!==undefined&&(!input.membership||typeof input.membership!=='object'||Array.isArray(input.membership))||input.changedQuotes!==undefined&&!Array.isArray(input.changedQuotes))return new Response(null,{status:400,headers:jsonHeaders});
   input.requestOptionsSha256=createHash('sha256').update(requestOptions).digest('hex');
   if(input.previousGeneration)input.previousMaterial=await (provided?.readMaterial??readMaterial)(input.previousGeneration);
   if(input.membershipGeneration)input.membership=JSON.parse(await (provided?.readMaterial??readMaterial)(input.membershipGeneration));
   const result=await (provided?.prepareInput??prepareInput)(input),raw=request.headers.get('accept')==='application/octet-stream',body=raw?result.material:JSON.stringify({schema:'bank.public-market.render-material.v1',...result,build});
   if(Buffer.byteLength(body)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
   return new Response(streamedText(body),{headers:{...jsonHeaders,...(raw?{'content-type':'application/octet-stream'}:{}),[materialHeaders[0]]:result.generation}});
  }catch(error){return new Response(null,{status:error instanceof SyntaxError?400:error instanceof Error&&error.message==='PUBLIC_MARKET_RENDER_CAPACITY'?413:503,headers:jsonHeaders});}
 }
 if(prepare){
  if(request.method==='HEAD')return new Response(null,{status:204,headers:{...headers,[materialHeaders[1]]:build}});
  if(request.method!=='POST')return new Response(null,{status:405,headers:{...headers,allow:'POST'}});
  if(request.headers.get('content-type')?.split(';')[0].trim()!=='application/json')return new Response(null,{status:415,headers});
  try{
   const input=JSON.parse(await bounded(request));
   if(input?.schema!=='bank.public-market.render-input.v1')return new Response(null,{status:400,headers});
   if(input.materialGeneration){if(!DIGEST.test(input.materialGeneration))return new Response(null,{status:400,headers});input.generation=input.materialGeneration;input.material=await(provided?.readMaterial??readMaterial)(input.materialGeneration);}
   if(input?.schema!=='bank.public-market.render-input.v1'||typeof input.material!=='string'||!DIGEST.test(input.generation)||createHash('sha256').update(input.material).digest('hex')!==input.generation)return new Response(null,{status:400,headers});
   // Inline JSON and its matching hash cannot grant access to retained parts.
   // A referenced root is selected by the fixed Source before any graph/cache
   // body can be opened. This endpoint runs during publication preparation.
   const referenced=JSON.parse(input.material)?.schema==='bank.public-market.render-material.refs.v1';
   if(referenced&&!input.materialGeneration&&await(provided?.readMaterial??readMaterial)(input.generation)!==input.material)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');
   const html=await deps.render({material:input.material,generation:input.generation,path:selectedPath});
   if(Buffer.byteLength(html)>MAX)throw Error('PUBLIC_MARKET_RENDER_CAPACITY');
   if(referenced&&await(provided?.readMaterial??readMaterial)(input.generation)!==input.material)throw Error('PUBLIC_MATERIAL_UNAVAILABLE');
   return new Response(streamedText(html),{headers:{...headers,[materialHeaders[0]]:input.generation,[materialHeaders[1]]:build,[materialHeaders[2]]:createHash('sha256').update(html).digest('hex')}});
  }catch(error){return new Response(null,{status:error instanceof SyntaxError?400:error instanceof Error&&error.message==='PUBLIC_MARKET_RENDER_CAPACITY'?413:503,headers});}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,allow:'GET, HEAD'}});
 if(url.searchParams.has('prepare')||url.pathname!=='/api/explore'&&url.searchParams.has('path'))return new Response(null,{status:404,headers});
 try{
  const prepared=await deps.prepared(request.method as 'GET'|'HEAD',selectedPath,build);
  if(prepared.status===503&&prepared.headers.get('x-receiz-public-html-withdrawn')==='1'){await prepared.body?.cancel();return new Response(null,{status:503,headers:{...headers,'x-receiz-public-html-withdrawn':'1'}});}
  if(!prepared.ok||!/^text\/html(?:;|$)/i.test(prepared.headers.get('content-type')??'')){await prepared.body?.cancel();return new Response('Public collection preparation is unavailable. Please try again.',{status:503,headers});}
  const revision=prepared.headers.get(materialHeaders[0]),preparedBuild=prepared.headers.get(materialHeaders[1]),bodyHash=prepared.headers.get(materialHeaders[2]);
  if(!revision||!DIGEST.test(revision)||!preparedBuild||!/^[A-Za-z0-9._:-]{1,160}$/.test(preparedBuild)||preparedBuild!==build||!bodyHash||!DIGEST.test(bodyHash)||Number(prepared.headers.get('content-length'))>MAX){await prepared.body?.cancel();return new Response(null,{status:503,headers});}
  const delivered:Record<string,string>={...headers};for(const key of materialHeaders){const value=prepared.headers.get(key);if(value)delivered[key]=value;}
  for(const key of ['x-receiz-public-html-state','x-receiz-public-state-coordinate','x-receiz-public-pending-state-coordinate']){const value=prepared.headers.get(key);if(value&&value.length<=200)delivered[key]=value;}
  let size=0;
  const body=request.method==='HEAD'?null:prepared.body?.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){size+=chunk.byteLength;if(size>MAX)throw Error('PUBLIC_MARKET_PREPARED_CAPACITY');controller.enqueue(chunk);}}));
  return new Response(body,{headers:delivered});
 }catch{return new Response('Public collection preparation is unavailable. Please try again.',{status:503,headers});}
}
