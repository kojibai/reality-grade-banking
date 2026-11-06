import {createHash} from 'node:crypto';
import type {PreparedPublicMaterialReferences,PublicMaterialIndexNode} from '../../src/receiz/public-material-references';
export type Row=Record<string,unknown>&{id:string;receizId:string;ownerUserId:string};
export function fixture(rows:Row[],observations:ReadonlyMap<string,Record<string,unknown>>=new Map()){
 const objects=new Map<string,string>(),reads=new Map<string,number>();
 const put=(value:unknown)=>{const body=JSON.stringify(value),generation=createHash('sha256').update(body).digest('hex');objects.set(generation,body);return generation;};
 function index(entries:[string,string][]):{root:string|null;count:number}{
  const ordered=entries.slice().sort(([a],[b])=>a<b?-1:a>b?1:0);
  function tree(values:[string,string][]):{root:string|null;count:number;height:number}{if(!values.length)return{root:null,count:0,height:0};const at=Math.floor(values.length/2),left=tree(values.slice(0,at)),right=tree(values.slice(at+1)),node:PublicMaterialIndexNode={entry:{name:JSON.stringify(values[at]),directory:false,references:1},left:left.root,right:right.root,height:1+Math.max(left.height,right.height),count:1+left.count+right.count,digestNames:false};return{root:put(node),count:node.count,height:node.height};}return tree(ordered);
 }
 const generations=rows.map(put),order=index(rows.map((_,i)=>[String(i).padStart(8,'0'),generations[i]])),ids=index(rows.map((row,i)=>[JSON.stringify([row.ownerUserId,row.receizId]),JSON.stringify({generation:generations[i],position:String(i).padStart(8,'0'),facets:['All','Images']})]));
 const quotes=rows.map(row=>observations.get(row.id)??{itemId:row.id,visibility:'public',priceUsd:12.34,shareInventory:{existing:'carried observation'}}),quoteIndex=index(rows.map((row,i)=>[JSON.stringify([row.ownerUserId,row.receizId]),put(quotes[i])]));
 const neverRead=put({retainedHistory:'this body must not be opened for a row window'}),metadata=put({ok:true,transport:{publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length,revision:'fixture'}}});
 const root:PreparedPublicMaterialReferences={schema:'bank.public-market.render-material.refs.v1',publicDisplayPolicy:'bank.public-market.curated-display.v3',selectionKey:'qualified test display selection',membership:{metadata,byId:ids.root,byOrder:order.root,byFacet:Object.fromEntries(['All','Music','Images','Videos','Books','Essays','Moments','Collectibles','Documents'].map(key=>[key,key==='All'||key==='Images'?order:{root:null,count:0}])) as PreparedPublicMaterialReferences['membership']['byFacet'],byOwner:null,headsByOwner:null,count:rows.length},snapshot:{metadata:put({ok:true,data:{schema:'receiz.market.public-snapshot.v1'}}),byId:quoteIndex.root,count:rows.length},sports:null,sportsCount:0,sportsIndex:null,capitalization:null,history:{header:neverRead,series:Object.fromEntries(['ALL','1D','1W','1M','3M','1Y'].map(key=>[key,{root:null,count:0}])) as PreparedPublicMaterialReferences['history']['series'],events:null},marketPrepared:{schema:'bank.public-market.prepared.v1',asOfPulse:12345},preparedLedger:neverRead};
 const material=JSON.stringify(root),generation=createHash('sha256').update(material).digest('hex');
 const readPart=async(id:string)=>{reads.set(id,(reads.get(id)??0)+1);const body=objects.get(id);if(body===undefined)throw Error('Missing test public part');return body;};
 return{root,material,generation,readPart,reads,objects,generations,neverRead,quotes,put,index};
}
