export type MoneyHistoryQuery={query?:string|null;from?:string|null;to?:string|null;direction?:'in'|'out'|'all'|null;offset?:number|null;limit?:number|null};
export function readMoneyHistoryQuery(input:MoneyHistoryQuery){
 const invalid=():never=>{throw Error('MONEY_QUERY_INVALID');};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['query','from','to','direction','offset','limit'].includes(key)))invalid();
 const query=input.query??'',direction=input.direction??'all',offset=input.offset??0,requestedLimit=input.limit??10;
 const date=(value:string|null|undefined)=>{if(value==null)return undefined;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))invalid();return Date.parse(value);};
 const from=date(input.from),to=date(input.to);
 if(typeof query!=='string'||query.length>160||!['in','out','all'].includes(direction)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(requestedLimit)||requestedLimit<1||from!==undefined&&to!==undefined&&from>=to)invalid();
 // A larger read request still uses the existing bounded page and nextOffset.
 const limit=Math.min(requestedLimit,20);
 return{query,direction,offset,limit,from,to};
}
