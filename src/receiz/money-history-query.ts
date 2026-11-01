export type MoneyHistoryQuery={query?:string;from?:string;to?:string;direction?:'in'|'out'|'all';offset?:number;limit?:number};
export function readMoneyHistoryQuery(input:MoneyHistoryQuery){
 const invalid=():never=>{throw Error('MONEY_QUERY_INVALID');};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['query','from','to','direction','offset','limit'].includes(key)))invalid();
 const {query='',direction='all',offset=0,limit=10}=input;
 const date=(value:string|undefined)=>{if(value===undefined)return undefined;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))invalid();return Date.parse(value);};
 const from=date(input.from),to=date(input.to);
 if(typeof query!=='string'||query.length>160||!['in','out','all'].includes(direction)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>20||from!==undefined&&to!==undefined&&from>=to)invalid();
 return{query,direction,offset,limit,from,to};
}
