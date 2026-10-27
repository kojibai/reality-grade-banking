import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {CollectionPanel} from '../../src/features/collectibles/CollectionPanel';
import {projectHeldCollectibles} from '../../src/receiz/collectibles';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';

// Synthetic native-shaped account, never connected to a verifier, real owner or
// execution port. The application components receive their ordinary held input.
const owner='899f2652-1fe5-45b7-a8af-1b4dfe1b794c',hash='a'.repeat(64);
const cards=Array.from({length:new URLSearchParams(location.search).has('large')?10000:5},(_,index)=>{
 const collectibleId=`rsc_${index.toString(16).padStart(16,'0')}`;
 return {owner_user_id:owner,collectible_id:collectibleId,claim_hash:hash,sport:index%2?'soccer':'baseball',card_json:{schema:'receiz.sports_arena.card_claim.v1',collectibleId,claimHash:hash,sport:index%2?'soccer':'baseball',cardId:`player-${index}`,athlete:`Collection specimen ${index+1}`,teamCode:'SAMPLE',position:index%2?'Forward':'Pitcher',rarity:index%2?'rare':'gold',rating:88+index%10,projectedScore:45,issue:{variantIssueNumber:index+1,overallIssueNumber:index+15},pack:{packName:'Sample pack',oddsLine:'Recorded pack odds'},proof:{rule:'Synthetic source fixture only'}},asset_json:{schema:'receiz.sports_arena.vault_card_asset.v1',ownershipHistory:[{kind:'issue',ownerUsername:'sample-owner',kaiPulse:'14800000'}],causalOwnershipProofs:[{eventKind:'transfer',fundingSource:'transfer',hash:'b'.repeat(64),anchors:{previousCausalProofHash:'c'.repeat(64)},steps:[{kind:'ownership_append',label:'Ownership recorded',sourceId:'sample-source',kaiPulse:'14800001'}]}]}};
});
const signal={owner_user_id:owner,collectible_id:'src_0123456789abcdef',claim_hash:hash,claim_json:{schema:'receiz.signal_run.card.v1',collectibleId:'src_0123456789abcdef',claimHash:hash,title:'First light',cardKind:'character',rarity:'rare',edition:'genesis',rank:'Explorer',stats:{score:250,level:12},provenance:{source:'earned',kaiPulse:'14800000'}},asset_json:{appends:[]}};
const identity={binding:{keyId:'fixture-key',identityOwnerReceizId:'fixture-owner'},knownWallet:()=>null,listDeposits:async()=>{throw Error('COLLECTION_MUST_NOT_READ');},localHistory:{schema:'receiz.sdk.identity_account_projection.v1',keyId:'fixture-key',owner:{uid:'fixture-owner'},authority:'verified-identity-portable-state',portableStateVerified:true,portableStateStatus:'verified',completeAtSealedHead:true,domains:{sports:true,signalVault:true},verifiedState:{schema:'receiz.account.state.v3',account:{userId:owner},sports:{schema:'receiz.sports.account-portable.v1',vaultCardCount:cards.length,vaultCards:cards},signalVault:{schema:'receiz.signal-run.account-portable.v1',ownerUserId:owner,cardCount:1,cards:[signal],arts:[]}}}} as unknown as OpenIdentity;
const collection=projectHeldCollectibles(identity.localHistory,identity.binding);
function Fixture(){const [open,setOpen]=useState(true);return <main className="main-panel"><p className="body-copy small-copy">Interface fixture · synthetic held collection. No account or financial operations connected.</p><button className="text-button" onClick={()=>setOpen(true)}>Open retained collection</button>{open&&<CollectionPanel collection={collection} onClose={()=>setOpen(false)}/>}</main>;}
createRoot(document.getElementById('root')!).render(<Fixture/>);
