import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {PublicProfile} from '../src/receiz/public-profile.js';
import {compatibleShareInventory,mergeShareInventory,type PublicShareInventory} from '../src/receiz/market-share-inventory.js';

/** This is the already-shipped public Market tape, partitioned at build time.
 * It supplies chart operands, never ownership or a financial quote. Newer live
 * observations win; a different asset or invalid release cannot fill a gap. */
export function withProfileShareHistory(profile:PublicProfile,rows:readonly PublicShareInventory[]):PublicProfile{
 const byAsset=new Map<string,PublicShareInventory>(),conflicts=new Set<string>();let changed=false;
 for(const row of rows){const prior=byAsset.get(row.assetId);if(prior&&(prior.observedAtKaiUPulse!==row.observedAtKaiUPulse||prior.outstandingShareQuantityMicro!==row.outstandingShareQuantityMicro||prior.availableShareQuantityMicro!==row.availableShareQuantityMicro))conflicts.add(row.assetId);else byAsset.set(row.assetId,row);}
 const items=profile.items.map(item=>{
  if(conflicts.has(item.assetId))return item;
  const current=compatibleShareInventory(item,item.shareInventory),share=compatibleShareInventory(item,byAsset.get(item.assetId));if(!share)return item;
  if(current&&current.observedAtKaiUPulse===share.observedAtKaiUPulse&&(current.outstandingShareQuantityMicro!==share.outstandingShareQuantityMicro||current.availableShareQuantityMicro!==share.availableShareQuantityMicro))return item;
  const shareInventory=mergeShareInventory(share,current??null);
  if(shareInventory===item.shareInventory)return item;changed=true;return {...item,shareInventory};
 });
 return changed?{...profile,items}:profile;
}
const captures=new Map<string,Promise<readonly PublicShareInventory[]>>();
export async function reuseShippedProfileShareHistory(profile:PublicProfile):Promise<PublicProfile>{
 if(!/^[a-z0-9_]{3,24}$/.test(profile.username)||profile.items.every(item=>item.shareInventory))return profile;
 let pending=captures.get(profile.username);
 if(!pending){pending=readFile(resolve('server/profile-runtime/share-history',profile.username+'.json'),'utf8').then(text=>{
  const value=JSON.parse(text);return value.schema==='bankeiz.profile-share-history.v1'&&value.username===profile.username&&Array.isArray(value.rows)&&value.rows.length<=10000?value.rows as PublicShareInventory[]:[];
 }).catch(()=>[]);captures.set(profile.username,pending);if(captures.size>12)captures.delete(captures.keys().next().value!);}
 return withProfileShareHistory(profile,await pending);
}
