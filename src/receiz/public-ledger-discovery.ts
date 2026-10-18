import {readPublicLedgerBytes} from './public-ledger-transfer';
export type PublicLedgerDiscovery={artifactSha256:string;kind:'ledger'|'proof';kaiPulse:string};
export function isPublicLedgerDiscovery(value:unknown):value is PublicLedgerDiscovery{
 if(!value||typeof value!=='object')return false;const v=value as Partial<PublicLedgerDiscovery>;
 return typeof v.artifactSha256==='string'&&/^[a-f0-9]{64}$/.test(v.artifactSha256)&&['ledger','proof'].includes(v.kind??'')&&typeof v.kaiPulse==='string'&&/^[1-9][0-9]{0,39}$/.test(v.kaiPulse);
}
/** Read only new global index entries. Digests remain locators until originals verify. */
export async function readPublicLedgerDiscoveries(afterCount?:number,signal?:AbortSignal){
 if(afterCount!==undefined&&(!Number.isSafeInteger(afterCount)||afterCount<0||afterCount>1000000))throw Error('PUBLIC_LEDGER_QUERY_INVALID');
 const read=async(cursor?:number)=>{
  const response=await fetch(`/api/bank/ledger-proof?discovery=1&limit=12${cursor===undefined?'':`&cursor=${cursor}`}`,{credentials:'omit',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('PUBLIC_LEDGER_DISCOVERY_UNAVAILABLE');
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await readPublicLedgerBytes(response,1024*1024)));
  if(!value||!Array.isArray(value.entries)||value.entries.length>100)throw Error('PUBLIC_LEDGER_DISCOVERY_INVALID');
  const count=Number.isSafeInteger(value.count)&&value.count>=0&&value.count<=1000000?Number(value.count):null;
  const nextCursor=Number.isSafeInteger(value.nextCursor)&&value.nextCursor>(cursor??0)&&value.nextCursor<=1000000&&(count===null||value.nextCursor<=count)?Number(value.nextCursor):null;
  return {entries:value.entries.filter(isPublicLedgerDiscovery) as PublicLedgerDiscovery[],count,nextCursor,watchCursor:nextCursor??count};
 };
 const page=await read(afterCount);
 // The existing native index is ascending. Jump to its tail if additions
 // exceed the first window, retaining the ordinary history cursor separately.
 if(page.count!==null&&page.count>(afterCount??0)+12){const tail=await read(page.count-12);const entries=new Map([...page.entries,...tail.entries].map(row=>[row.artifactSha256,row]));return {...page,entries:[...entries.values()],count:tail.count??page.count,watchCursor:tail.watchCursor};}
 return page;
}
