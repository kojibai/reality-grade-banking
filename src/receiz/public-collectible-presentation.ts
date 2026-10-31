import type {PublicMarketItem} from './public-market';
import type {PublicAssetManifestRow} from './public-asset-manifest';

/** Public card display fields, never a claim, ownership or valuation admission. */
export interface PublicCollectiblePresentation {collectibleId:string;claimHash:string;facts:{label:string;value:string}[];}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const value=(input:unknown)=>typeof input==='string'&&input.trim()&&input.length<=1024?input.trim():typeof input==='number'&&Number.isFinite(input)?String(input):null;
const cardFields={team:'Team',teamCode:'Team code',opponentCode:'Opponent',position:'Position',side:'Role',rating:'Rating',projectedScore:'Projected score',currentScore:'Live score',historyCount:'Recorded events',statLine:'Stat basis',liveLine:'Live basis'};
const bioFields={jerseyNumber:'Jersey',birthDate:'Born',age:'Age',height:'Height',weight:'Weight',bats:'Bats',throws:'Throws',mlbDebutDate:'Debut',rosterStatus:'Roster status',club:'Club',division:'Division',event:'Event',opponent:'Opponent'};
const mediaFields={source:'Media source',sourceId:'Media source ID',deterministicAssetId:'Media ID'};
const baseFields={sealedCardId:'Base seal',basisHash:'Basis SHA-256',issueLine:'Base issue'};
const labels=new Set(['Sport','Rarity','Issue','Pack',...Object.values(cardFields),...Object.values(bioFields),...Object.values(mediaFields),...Object.values(baseFields)]);
const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});

/** Curate only fields already present in the native public inventory response. */
export function projectPublicCollectiblePresentation(input:unknown):PublicCollectiblePresentation|undefined{
 const row=object(input),card=object(row.card),collectibleId=row.collectibleId,claimHash=row.claimHash;
 if(typeof collectibleId!=='string'||!/^rsc_[a-f0-9]{16}$/i.test(collectibleId)||typeof claimHash!=='string'||!/^[a-f0-9]{64}$/i.test(claimHash))return;
 const facts:PublicCollectiblePresentation['facts']=[],seen=new Set<string>();
 const add=(label:string,input:unknown)=>{const text=value(input);if(text&&!seen.has(label)){facts.push({label,value:text});seen.add(label);}};
 add('Sport',row.sport);add('Rarity',row.rarity);add('Issue',row.issueLine);add('Pack',row.pulledFromPack);
 for(const [source,fields]of [[card,cardFields],[object(card.playerBio),bioFields],[object(card.media),mediaFields],[object(card.baseCard),baseFields]]as const)for(const [key,label]of Object.entries(fields))add(label,source[key]);
 return {collectibleId:collectibleId.toLowerCase(),claimHash:claimHash.toLowerCase(),facts};
}

export function readPublicCollectiblePresentation(input:unknown,collectibleId:unknown,claimHash:unknown):PublicCollectiblePresentation|undefined{
 const row=object(input);
 if(typeof collectibleId!=='string'||typeof claimHash!=='string'||row.collectibleId!==collectibleId.toLowerCase()||row.claimHash!==claimHash.toLowerCase()||!Array.isArray(row.facts)||row.facts.length>48)return;
 const facts:PublicCollectiblePresentation['facts']=[],seen=new Set<string>();
 for(const entry of row.facts){const fact=object(entry),text=value(fact.value);if(typeof fact.label!=='string'||!labels.has(fact.label)||seen.has(fact.label)||!text)return;seen.add(fact.label);facts.push({label:fact.label,value:text});}
 return {collectibleId:row.collectibleId as string,claimHash:row.claimHash as string,facts};
}

/** Only the selected reverse side allocates display rows. No source reads. */
export function publicCollectibleManifest(item:PublicMarketItem):PublicAssetManifestRow[]{
 const rows:PublicAssetManifestRow[]=[{label:'Collectible',value:item.assetId}];
 const source=(()=>{try{const url=new URL(item.sourceUrl??'');return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&url.pathname===`/game/sports/card/${item.assetId}`&&url.searchParams.size===1?url.searchParams.get('claimHash'):null;}catch{return null;}})();
 const claim=source&&/^[a-f0-9]{64}$/i.test(source)?source:item.cardClaimHash;
 if(claim)rows.push({label:'Claim SHA-256',value:claim.toUpperCase()});
 const presentation=readPublicCollectiblePresentation(item.collectiblePresentation,item.assetId,claim);
 if(presentation)rows.push(...presentation.facts);
 if(item.priceUsd!==null)rows.push({label:'Current recorded value',value:money.format(item.priceUsd)});
 if(item.circulationCount!==undefined)rows.push({label:'Issued copies',value:String(item.circulationCount)});
 if(item.pricedCount!==undefined)rows.push({label:'Priced copies',value:String(item.pricedCount)});
 if(item.ownerUsername||item.ownerDisplayName)rows.push({label:'Owner',value:item.ownerUsername?`@${item.ownerUsername}`:item.ownerDisplayName!});
 if(item.sealedAt)rows.push({label:'Sealed',value:item.sealedAt});
 return rows;
}
