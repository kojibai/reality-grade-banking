import {expect,it,vi} from 'vitest';
import type {ReceizIdentityAccountProjection,ReceizIdentityPublicBinding} from '@receiz/sdk';
import {projectHeldCollectibles,collectionBranch} from '../src/receiz/collectibles';
import type {PublicMarketItem} from '../src/receiz/public-market';

const owner='899f2652-1fe5-45b7-a8af-1b4dfe1b794c',other='c464937b-9e99-40b6-a5cd-9d1ba1b847d4',hash='a'.repeat(64);
const binding={keyId:'key-a',identityOwnerReceizId:'identity-owner'} as ReceizIdentityPublicBinding;
function sports(id='rsc_0123456789abcdef'){
 return {owner_user_id:owner,collectible_id:id,claim_hash:hash,sport:'baseball',card_json:{schema:'receiz.sports_arena.card_claim.v1',collectibleId:id,claimHash:hash,sport:'baseball',cardId:'player-1',athlete:'A player',teamCode:'NY',position:'P',rarity:'gold',rating:88,ownerUserId:other,media:{imageUrl:'/api/game/sports/baseball/player-image/123'},pack:{packName:'Opening pack',oddsLine:'1 in 20'},issue:{variantIssueNumber:7,overallIssueNumber:44}},asset_json:{schema:'receiz.sports_arena.vault_card_asset.v1',ownershipHistory:[{kind:'transfer',fromUserId:other,toUserId:owner}]},listing_status:'active',list_price_usd_cents:'2500',listed_at:'2026-10-27T01:00:00Z'};
}
function signal(){return {owner_user_id:owner,collectible_id:'src_0123456789abcdef',claim_hash:hash,claim_json:{schema:'receiz.signal_run.card.v1',collectibleId:'src_0123456789abcdef',claimHash:hash,title:'First light',cardKind:'character',rarity:'rare',season:'signal-run-s01',edition:'genesis',rank:'Explorer',stats:{score:250},character:{name:'Nova'},provenance:{source:'earned'}},asset_json:{schema:'receiz.signal_run.card.asset.v1',appends:[]}};}
function projection(rows:unknown[]=[sports()],signals:unknown[]=[signal()]){return {schema:'receiz.sdk.identity_account_projection.v1',keyId:'key-a',owner:{uid:'identity-owner'},portableStateVerified:true,portableStateStatus:'verified',authority:'verified-identity-portable-state',completeAtSealedHead:true,domains:{sports:true,signalVault:true},verifiedState:{schema:'receiz.account.state.v3',account:{userId:owner},sports:{schema:'receiz.sports.account-portable.v1',vaultCardCount:rows.length,vaultCards:rows},signalVault:{schema:'receiz.signal-run.account-portable.v1',ownerUserId:owner,cardCount:signals.length,cards:signals,arts:[]}}} as unknown as ReceizIdentityAccountProjection;}
it('projects the same-account held cards once with nested source taxonomy and original references intact',()=>{
 const source=projection(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 try{
  const view=projectHeldCollectibles(source,binding),again=projectHeldCollectibles(source,binding);
  expect(again).toBe(view);expect(projectHeldCollectibles(source,binding,[])).toBe(view);expect(projectHeldCollectibles(source,binding,[])).toBe(view);expect(view.status).toBe('ready');expect(view.cards).toHaveLength(2);
  expect(view.cards[0]).toMatchObject({family:'sports',collectibleId:'rsc_0123456789abcdef',claimHash:hash,title:'A player',taxonomy:['Sports','Baseball','Gold'],ownerUserId:owner});
  expect(view.cards[0].source).toBe((source.verifiedState as any).sports.vaultCards[0]);
  expect(view.cards[1].taxonomy).toEqual(['Signal Run','Genesis','Character','Rare']);
  expect(collectionBranch(view.cards,[]).categories.map(c=>c.label)).toEqual(['Signal Run','Sports']);
  expect(collectionBranch(view.cards,['Sports','Baseball']).cards).toHaveLength(1);
  expect(view.cards[0].capabilities).toEqual([]);expect(fetcher).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('does not confuse the birth owner with the current source-row owner or a group value with an exact card value',()=>{
 const item={id:'group',category:'sports',priceUsd:9999,chart:[1,9999],cardClaimHash:hash,sportsValuation:{sealedCopies:[{collectibleId:'rsc_0123456789abcdef',claimHash:hash,currentValueUsd:12.5,proofValueUsd:10,birthUsdValue:10,sealedAt:'2026-10-01T00:00:00Z',valueHistory:[{at:'2026-10-01T00:00:00Z',usdValue:10,basis:'sealed-birth'}]}]}} as unknown as PublicMarketItem;
 const view=projectHeldCollectibles(projection(),binding,[item]);
 expect(view.cards[0].value?.usd).toBe(12.5);expect(view.cards[0].value?.history[0].usdValue).toBe(10);
 expect(projectHeldCollectibles(projection(),binding,[{...item,sportsValuation:undefined}]).cards[0].value).toBeNull();
});
it('rejects foreign, unverified or mismatched carried accounts before projecting any cards',()=>{
 const source=projection();
 for(const changed of [{keyId:'wrong'},{owner:{uid:'wrong'}},{portableStateVerified:false},{authority:'identity-only'},{portableStateStatus:'invalid'}])expect(projectHeldCollectibles({...source,...changed} as ReceizIdentityAccountProjection,binding).cards).toEqual([]);
 expect(projectHeldCollectibles(source,binding,[],other).cards).toEqual([]);
 expect(projectHeldCollectibles(projection([{...sports(),owner_user_id:other}],[]),binding).cards).toEqual([]);
 expect(projectHeldCollectibles(projection([{...sports(),card_json:{...sports().card_json,claimHash:'b'.repeat(64)}}],[]),binding).cards).toEqual([]);
});
it('deduplicates identical originals but withholds conflicting current rows rather than choosing a convenient owner or listing',()=>{
 expect(projectHeldCollectibles(projection([sports(),sports()],[]),binding).cards).toHaveLength(1);
 const conflict={...sports(),owner_user_id:other};
 expect(projectHeldCollectibles(projection([sports(),conflict],[]),binding).cards).toEqual([]);
 expect(projectHeldCollectibles(projection([sports(),{...sports(),claim_hash:'b'.repeat(64)}],[]),binding).cards).toEqual([]);
 expect(projectHeldCollectibles(projection([sports(),{...sports(),hidden_at:'2026-10-27'}],[]),binding).cards).toEqual([]);
 expect(projectHeldCollectibles(projection([sports(),{...sports(),asset_json:{schema:'receiz.sports_arena.vault_card_asset.v1',ownershipHistory:[]}}],[]),binding).cards).toEqual([]);
});
it('keeps private membership available to its owner without declaring it publicly shareable, and marks incomplete held state',()=>{
 const source=projection([{...sports(),hidden_at:'2026-10-27T00:00:00Z'}],[]);
 expect(projectHeldCollectibles(source,binding).cards[0].publiclyVisible).toBe(false);
 expect(projectHeldCollectibles({...source,completeAtSealedHead:false},binding).status).toBe('partial');
 expect(projectHeldCollectibles(projection([],[]),binding).cards).toEqual([]);
});
it('retains only source-bound card appends and pack acquisition records without copying the private account into a card',()=>{
 const source=projection(),state=source.verifiedState as any;
 state.sports.vaultCards[0].card_json.pack.purchaseId='pack-1';
 const append={owner_user_id:owner,collectible_id:'rsc_0123456789abcdef',claim_hash:hash,append_json:{appendHash:'b'.repeat(64),eventKind:'game'}};
 const purchase={id:'pack-1',owner_user_id:owner,funding_source:'reserve'};
 state.sports.cardAppends=[append,{...append,claim_hash:'c'.repeat(64)},{...append,owner_user_id:other}];state.sports.packPurchases=[purchase,{...purchase,id:'pack-2'}];
 const view=projectHeldCollectibles(source,binding);
 expect(view.cards[0].appends).toEqual([append]);expect(view.cards[0].acquisitions).toEqual([purchase]);expect(view.cards[0].appends[0]).toBe(append);
 expect(view.cards[0]).not.toHaveProperty('verifiedState');
});
