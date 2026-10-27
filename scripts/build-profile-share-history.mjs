import {mkdir,readFile,readdir,unlink,writeFile} from 'node:fs/promises';
/** Partition already-public, already-shipped share records. No remote reads or
 * repricing. Runtime admission still checks each record against its exact asset. */
export async function buildProfileShareHistory(){
 const root=new URL('../server/profile-runtime/share-history/',import.meta.url),source=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));
 const originals=new Map(source.transport.publicOriginals.map(row=>[row.id,row])),profiles=new Map();
 for(const quote of source.snapshot?.data?.liveMarkets??[]){
  const row=originals.get(quote.itemId),inventory=quote.shareInventory;
  if(!row||quote.visibility!=='public'||!inventory||inventory.marketItemId!==row.id||inventory.assetId!==row.receizId||!/^profile:[a-z0-9_]{3,24}:/.test(row.id)||!/^[a-z0-9_]{3,24}$/.test(row.ownerUsername??''))continue;
  const rows=profiles.get(row.ownerUsername)??[];rows.push(inventory);profiles.set(row.ownerUsername,rows);
 }
 await mkdir(root,{recursive:true});
 const names=new Set([...profiles.keys()].map(name=>name+'.json'));
 for(const name of await readdir(root))if(name.endsWith('.json')&&!names.has(name))await unlink(new URL(name,root));
 for(const [username,rows] of profiles)await writeFile(new URL(username+'.json',root),JSON.stringify({schema:'bankeiz.profile-share-history.v1',username,rows}));
 return profiles;
}
