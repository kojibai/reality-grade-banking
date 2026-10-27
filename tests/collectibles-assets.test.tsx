// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveAssets} from '../src/features/assets/LiveAssets';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows Collectibles only for a qualified held collection, reusing supplied sources without another read',async()=>{
 const listDeposits=vi.fn(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const owner='899f2652-1fe5-45b7-a8af-1b4dfe1b794c',hash='a'.repeat(64),row={owner_user_id:owner,collectible_id:'rsc_0123456789abcdef',claim_hash:hash,sport:'baseball',card_json:{schema:'receiz.sports_arena.card_claim.v1',collectibleId:'rsc_0123456789abcdef',claimHash:hash,sport:'baseball',athlete:'A player',rarity:'gold'}};
 const identity={listDeposits,binding:{keyId:'key',identityOwnerReceizId:'identity-owner'},knownWallet:()=>null,localHistory:{schema:'receiz.sdk.identity_account_projection.v1',keyId:'key',owner:{uid:'identity-owner'},authority:'verified-identity-portable-state',portableStateVerified:true,portableStateStatus:'verified',domains:{sports:true,signalVault:true},verifiedState:{schema:'receiz.account.state.v3',account:{userId:owner},sports:{schema:'receiz.sports.account-portable.v1',vaultCards:[row]},signalVault:{schema:'receiz.signal-run.account-portable.v1',ownerUserId:owner,cards:[]}}}} as unknown as OpenIdentity;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),source={sources:[],busy:false,error:''};
 const render=(id:OpenIdentity)=>root.render(<LiveAssets identity={id} active revision={0} source={source} onOpen={()=>{}}/>);
 try{
  await act(async()=>render(identity));expect(host.querySelector('.collection-entry')?.textContent).toContain('Collectibles');
  await act(async()=>host.querySelector<HTMLButtonElement>('.collection-entry')!.click());
  await vi.waitFor(()=>expect(host.querySelector('[data-collection-catalog]')).not.toBeNull());
  expect(listDeposits).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Go back"]')!.click());
  await act(async()=>render({...identity,localHistory:{...identity.localHistory,portableStateVerified:false}}));
  expect(host.querySelector('.collection-entry')).toBeNull();
 }finally{act(()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
