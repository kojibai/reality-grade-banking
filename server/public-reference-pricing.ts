import type {PublicMarketPricingCatalog} from '../src/receiz/market-projection/pricing-inputs.js';
import type {PublicMarketCatalog} from '../src/receiz/public-market.js';
import type {createPublicMaterialWindowReader} from './public-material-window.js';
import {readPublicPricingCheckpoint,PUBLIC_PRICING_METADATA_FIELDS} from './public-pricing-checkpoint.js';
/** The fixed Source part transport must separately qualify historical numeric
 * operands against its financial captured prefix. A previous root/hash alone
 * never permits opening a withdrawn Original, header or content body. */
export async function readPublicReferencePricing(reader:ReturnType<typeof createPublicMaterialWindowReader>,current:PublicMarketCatalog,currentSportsGeneration:string|null|undefined):Promise<PublicMarketPricingCatalog>{
 const selected=reader.root.history.pricing;if(!selected||selected.count!==reader.root.membership.count||reader.root.sports!==currentSportsGeneration)throw Error('PUBLIC_HISTORY_TRANSITION_PRICING_CAPTURE_CHANGED');
 const raw=await reader.readPart(selected.metadata) as {schema?:unknown;catalog?:PublicMarketPricingCatalog;sportsGeneration?:unknown};
 const metadata=raw?.catalog;if(raw?.schema!=='bank.public-market.pricing-metadata.v1'||raw.sportsGeneration!==(reader.root.sports??null)||!metadata||typeof metadata!=='object'||Array.isArray(metadata)||Object.keys(metadata).some(key=>!PUBLIC_PRICING_METADATA_FIELDS.includes(key as typeof PUBLIC_PRICING_METADATA_FIELDS[number]))||Object.hasOwn(metadata,'items')||Object.hasOwn(metadata,'publicProfileHeads')||Object.hasOwn(metadata,'publicProfileHeadsRevision')||metadata.complete!==true||typeof metadata.revision!=='string'||metadata.observedAt!==null&&!Number.isFinite(Date.parse(metadata.observedAt))||!Number.isSafeInteger(metadata.sourceCount)||metadata.sourceCount<0)throw Error('PUBLIC_HISTORY_PRICING_METADATA_INVALID');
 const entries=await reader.indexEntries({root:selected.byId,count:selected.count}),positioned:{position:string;item:ReturnType<typeof readPublicPricingCheckpoint>}[]=[];
 for(const [logicalKey,encoded]of entries){let key:unknown,locator:{generation?:unknown;position?:unknown};try{key=JSON.parse(logicalKey);locator=JSON.parse(encoded);}catch{throw Error('PUBLIC_HISTORY_PRICING_METADATA_INVALID');}
  if(!Array.isArray(key)||key.length!==2||key.some(value=>typeof value!=='string'||!value)||!locator||typeof locator!=='object'||Array.isArray(locator)||Object.keys(locator).sort().join(',')!=='generation,position'||typeof locator.position!=='string'||!locator.position||locator.position.length>1024||typeof locator.generation!=='string'||!/^[a-f0-9]{64}$/.test(locator.generation))throw Error('PUBLIC_HISTORY_PRICING_METADATA_INVALID');
  const item=readPublicPricingCheckpoint(await reader.readPart(locator.generation as string));if(item.assetId!==key[1])throw Error('PUBLIC_HISTORY_PRICING_METADATA_INVALID');positioned.push({item,position:locator.position as string});
 }
 const items=positioned.sort((a,b)=>a.position<b.position?-1:a.position>b.position?1:0).map(row=>row.item);
 if(new Set(positioned.map(row=>row.position)).size!==positioned.length||items.length!==selected.count||new Set(items.map(item=>item.id)).size!==items.length)throw Error('PUBLIC_HISTORY_PRICING_METADATA_INVALID');
 return{...metadata,items:[...items,...current.items.filter(item=>item.category==='sports')]};
}
