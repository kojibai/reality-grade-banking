import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {PublicProfile} from '../src/receiz/public-profile.js';
import {compatibleShareInventory,mergeShareInventory,type PublicShareInventory} from '../src/receiz/market-share-inventory.js';
import {retainPublicMomentManifest,type PublicMomentManifestHint} from '../src/receiz/public-asset-manifest.js';

/** This is the already-shipped public Market tape, partitioned at build time.
 * It supplies chart operands, never ownership or a financial quote. Newer live
 * observations win; a different asset or invalid release cannot fill a gap. */
export function withProfileShareHistory(profile:PublicProfile,rows:readonly PublicShareInventory[],moments:readonly PublicMomentManifestHint[]=[]):PublicProfile{
 const byAsset=new Map<string,PublicShareInventory>(),conflicts=new Set<string>(),momentHints=new Map<string,PublicMomentManifestHint>(),momentConflicts=new Set<string>();
 for(const row of rows){const prior=byAsset.get(row.assetId);if(prior&&(prior.observedAtKaiUPulse!==row.observedAtKaiUPulse||prior.outstandingShareQuantityMicro!==row.outstandingShareQuantityMicro||prior.availableShareQuantityMicro!==row.availableShareQuantityMicro))conflicts.add(row.assetId);else byAsset.set(row.assetId,row);}
 for(const hint of moments){if(momentHints.has(hint?.id))momentConflicts.add(hint.id);else if(hint&&typeof hint.id==='string')momentHints.set(hint.id,hint);}
 const items=profile.items.map(item=>{
  const presented=momentConflicts.has(item.id)?item:retainPublicMomentManifest(item,momentHints.get(item.id));
  if(conflicts.has(item.assetId))return presented;
  const current=compatibleShareInventory(item,item.shareInventory),share=compatibleShareInventory(item,byAsset.get(item.assetId));if(!share)return presented;
  if(current&&current.observedAtKaiUPulse===share.observedAtKaiUPulse&&(current.outstandingShareQuantityMicro!==share.outstandingShareQuantityMicro||current.availableShareQuantityMicro!==share.availableShareQuantityMicro))return presented;
  const shareInventory=mergeShareInventory(share,current??null);
  return shareInventory===item.shareInventory?presented:{...presented,shareInventory};
 });
 return items.some((item,index)=>item!==profile.items[index])?{...profile,items}:profile;
}
const captures=new Map<string,Promise<{rows:readonly PublicShareInventory[];moments:readonly PublicMomentManifestHint[]}>>();
export async function reuseShippedProfileShareHistory(profile:PublicProfile):Promise<PublicProfile>{
 if(!/^[a-z0-9_]{3,24}$/.test(profile.username)||profile.items.every(item=>item.shareInventory&&(item.mediaKind!=='moment'||item.proofManifestSource?.recordCardMediaSha256Hex)))return profile;
 let pending=captures.get(profile.username);
 if(!pending){pending=readFile(resolve('server/profile-runtime/share-history',profile.username+'.json'),'utf8').then(text=>{
  const value=JSON.parse(text);return value.schema==='bankeiz.profile-share-history.v1'&&value.username===profile.username&&Array.isArray(value.rows)&&value.rows.length<=10000?{rows:value.rows as PublicShareInventory[],moments:Array.isArray(value.momentManifests)&&value.momentManifests.length<=10000?value.momentManifests as PublicMomentManifestHint[]:[]}:{rows:[],moments:[]};
 }).catch(()=>({rows:[],moments:[]}));captures.set(profile.username,pending);if(captures.size>12)captures.delete(captures.keys().next().value!);}
 const captured=await pending;return withProfileShareHistory(profile,captured.rows,captured.moments);
}
