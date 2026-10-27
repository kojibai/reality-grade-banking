import {expect,it,vi} from 'vitest';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {updatePrivateHistory} from '../src/receiz/private-history-restore';
import {projectPersonalHistory} from '../src/receiz/personal-history';
import {readHeldTwinMind} from '../src/receiz/twin-mind-display';
const uid='owner';
function fixture(){
 const original={id:'original',title:'My original',summary:'Exact carried source',kaiPulse:'14812345'};
 const event={id:'appointment',ownerUserId:uid,title:'Meet Sam',note:'Bring the original',startAt:'2026-10-20T12:00:00Z',source:'manual',metadata:{pulse:'14812346'} as Record<string,unknown>};
 const snapshot={schema:'receiz.account.state.v3',account:{userId:uid},profileView:{originals:[original]},world:{twinMemory:[]}};
 const organizer={accountUid:uid,contacts:[{id:'person',fullName:'Sam',notes:'Our next steps'}],events:[event]};
 const identity={binding:{keyId:'key',identityOwnerReceizId:'signer'},localHistory:{schema:'receiz.sdk.identity_account_projection.v1',keyId:'key',owner:{uid:'signer'},authority:'verified-identity-portable-state',portableStateVerified:true,verifiedState:snapshot},accountUsername:()=> 'maya',knownOrganizerDisplay:()=>organizer,knownProfile:()=>({userId:uid,username:'maya',displayName:'Maya'}),organizer:vi.fn(()=>{throw Error('Must not open');}),readPrivateHistory:vi.fn(()=>{throw Error('Must not read');}),knownMessagingDisplay:()=>null} as unknown as OpenIdentity;
 return{identity,event,original,snapshot,organizer};
}
it('indexes already held originals and Calendar without reading, verifying or copying their payloads',()=>{
 const f=fixture(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);try{
 const view=readHeldTwinMind(f.identity,uid);expect(view.graph.sources.map(n=>n.label)).toEqual(['Meet Sam','Sam','My original']);
 expect(view.graph.sources.find(n=>n.label==='My original')?.record).toBe(f.original);expect(view.graph.sources.find(n=>n.label==='Meet Sam')?.record).toBe(f.event);
 expect(view.graph.sources.find(n=>n.label==='My original')?.pulse).toBe('14812345');expect(view.graph.sources.find(n=>n.label==='Meet Sam')?.pulse).toBe('14812346');
 expect(view.graph.sources.find(n=>n.label==='Sam')?.pulse).toBeUndefined();expect(fetch).not.toHaveBeenCalled();expect(f.identity.organizer).not.toHaveBeenCalled();expect(f.identity.readPrivateHistory).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});
it('reuses exact Ledger originals and deduplicates their Calendar representations by original reference, never amount or text',()=>{
 const f=fixture(),row={id:'wallet:one',sourceId:'one',source:'wallet',title:'Money Sent',detail:'Paid Sam',time:'2026-10-20T12:00:00Z',pulse:'14812347',evidence:{entryHash:'a'.repeat(64)},authority:'account-source-projection'};
 updatePrivateHistory(f.identity,uid,{schema:'bank.private-history-cache.v1',accountUid:uid,observedAt:'2026-10-20T12:00:00Z',records:[row],nextCursor:null} as never);
 f.organizer.events.push({...f.event,id:'wallet-event',source:'system',metadata:{entryHash:'a'.repeat(64)}});
 const view=readHeldTwinMind(f.identity,uid);expect(view.graph.sources.find(n=>n.label==='Money Sent')?.record).toBe(row);expect(view.graph.sources.find(n=>n.record===row)?.href).toBe('/#ledger');expect(view.graph.sources.some(n=>n.record.id==='wallet-event')).toBe(false);expect(view.graph.sources.some(n=>n.record===f.event)).toBe(true);
});
it('never borrows another account, unadmitted state or date-derived Kai, and keeps exact repeated conversation turns',()=>{
 const f=fixture();f.snapshot.account.userId='foreign';f.organizer.accountUid='foreign';
 const entries=[{id:'q',role:'user',body:'Hello',createdAt:'2026-10-20T12:00:00Z'},{id:'a',role:'assistant',body:'Hello',createdAt:'2026-10-20T12:01:00Z'}];
 const value=readHeldTwinMind(f.identity,uid,[{threadKey:'api:owner',entries},{threadKey:'api:other',entries}]);
 expect(value.graph.sources).toHaveLength(0);expect(value.graph.memory).toHaveLength(2);expect(value.graph.memory.every(n=>n.pulse===undefined)).toBe(true);
 expect(value.graph.edges).toContainEqual({from:'conversation:api:owner:q',to:'conversation:api:owner:a',kind:'conversation'});
});

it('keeps a sealed micro-pulse and distinct same-text records without date-based reconstruction',()=>{
 const f=fixture();f.snapshot.profileView.originals.push({...f.original,id:'other-original',kaiPulse:'14812345'});
 const event=f.event as unknown as Record<string,unknown>;event.metadata={kaiUpulse:'14812346999999'};
 const view=readHeldTwinMind(f.identity,uid);expect(view.graph.sources.filter(n=>n.label==='My original')).toHaveLength(2);expect(view.graph.sources.find(n=>n.record===f.event)?.pulse).toBe('14812346');
});
it('refuses unadmitted and differently bound portable sources rather than verifying them again',()=>{
 const f=fixture(),projection=f.identity.localHistory as unknown as Record<string,unknown>;
 projection.portableStateVerified=false;expect(readHeldTwinMind(f.identity,uid).graph.sources.some(n=>n.record===f.original)).toBe(false);
 projection.portableStateVerified=true;projection.keyId='other-key';expect(readHeldTwinMind(f.identity,uid).graph.sources.some(n=>n.record===f.original)).toBe(false);
});
it('shows actual carried contact-array and contactsProjection shapes before Contacts has ever been opened',()=>{
 const f=fixture();f.identity.knownOrganizerDisplay=()=>null;
 Object.assign(f.snapshot,{contacts:[{id:'carried-person',fullName:'Jordan'}]});
 expect(readHeldTwinMind(f.identity,uid).graph.sources.some(n=>n.label==='Jordan')).toBe(true);
 Object.assign(f.snapshot,{contactsProjection:{contacts:[{id:'carried-person',fullName:'Jordan'}]}});
 expect(readHeldTwinMind(f.identity,uid).graph.sources.filter(n=>n.label==='Jordan')).toHaveLength(1);
});

it('uses the same prepared Ledger rows as the account, retaining native aliases, source details and original Kai',()=>{
 const f=fixture();Object.assign(f.snapshot,{walletLedgerEntries:[{id:'wallet-row',user_id:uid,direction:'credit',entry_kind:'deposit',amount_usd_cents:'100',created_at:'2026-05-01T00:00:00Z',kai_upulse:'14812347000000'}],ledgerActions:[{entryHash:'b'.repeat(64),actionKind:'custom.action',payload:{summary:'Exact action description'},kai_upulse:'14812348000000',occurred_at:'2026-05-01T00:00:00Z'}]});
 const prepared=projectPersonalHistory(f.identity.localHistory,uid),view=readHeldTwinMind(f.identity,uid,[],{accountUid:uid,records:prepared.records});
 expect(prepared.records).toHaveLength(2);for(const row of prepared.records){const node=view.graph.sources.find(n=>n.record===(row as unknown as Record<string,unknown>));expect(node).toBeTruthy();expect(node!.pulse).toBe((BigInt(row.kaiUpulse!)/1000000n).toString());expect(node!.label).toBe(row.title);}
});
it('keeps district conversation boundaries rather than making a new relationship from shared text',()=>{
 const f=fixture();(f.snapshot.world.twinMemory as unknown[])=[{id:'one',role:'user',body:'Hello',scope:'relationship',visitorKey:'same',districtSlug:'first'},{id:'two',role:'assistant',body:'Hello',scope:'relationship',visitorKey:'same',districtSlug:'second'}];
 const view=readHeldTwinMind(f.identity,uid);expect(view.graph.memory).toHaveLength(2);expect(view.graph.edges.filter(e=>e.kind==='conversation')).toHaveLength(0);
});
