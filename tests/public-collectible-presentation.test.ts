import {expect,it} from 'vitest';
import {projectPublicCollectiblePresentation,publicCollectibleManifest,readPublicCollectiblePresentation} from '../src/receiz/public-collectible-presentation';
import type {PublicMarketItem} from '../src/receiz/public-market';
const id='rsc_0123456789abcdef',claim='a'.repeat(64);
it('keeps public card fields bounded and drops private or malformed source fields',()=>{
 const result=projectPublicCollectiblePresentation({collectibleId:id,claimHash:claim,rarity:'Rare',card:{rating:NaN,currentScore:0,position:'P',liveLine:'x'.repeat(1025),playerBio:{height:'6 ft 2',email:'private@example.test'},baseCard:{basisHash:'b'.repeat(64)}}})!;
 expect(result.facts).toContainEqual({label:'Live score',value:'0'});expect(result.facts).toContainEqual({label:'Height',value:'6 ft 2'});
 expect(JSON.stringify(result)).not.toMatch(/NaN|private@example|xxxxxxxx/);
 expect(readPublicCollectiblePresentation({...result,facts:[...result.facts,{label:'Email',value:'private@example.test'}]},id,claim)).toBeUndefined();
 expect(readPublicCollectiblePresentation(result,id,'c'.repeat(64))).toBeUndefined();
});
it('does not attribute a representative card’s facts or claim to another owned copy',()=>{
 const presentation={collectibleId:id,claimHash:claim,facts:[{label:'Issue',value:'#1 / 5 issued'}]},other='rsc_abcdef0123456789',otherClaim='c'.repeat(64);
 const item={assetId:other,cardClaimHash:claim,sourceUrl:`https://receiz.com/game/sports/card/${other}?claimHash=${otherClaim}`,collectiblePresentation:presentation,priceUsd:null} as PublicMarketItem;
 const rows=publicCollectibleManifest(item);
 expect(rows).toContainEqual({label:'Claim SHA-256',value:otherClaim.toUpperCase()});expect(rows.some(row=>row.label==='Issue')).toBe(false);
 expect(rows.some(row=>row.value===claim.toUpperCase()||/Unavailable|pending/.test(row.value))).toBe(false);
});
