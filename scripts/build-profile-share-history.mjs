import {mkdir,readFile,readdir,unlink,writeFile} from 'node:fs/promises';
/** Partition already-public, already-shipped display records. No remote reads
 * or repricing. Runtime composition checks each against its exact asset/proof. */
export async function buildProfileShareHistory(){
 const root=new URL('../server/profile-runtime/share-history/',import.meta.url),source=JSON.parse(await readFile(new URL('../public/receiz-public-market.json',import.meta.url),'utf8'));
 const originals=new Map(source.transport.publicOriginals.map(row=>[row.id,row])),profiles=new Map(),moments=new Map();
 for(const row of originals.values()){
  const profile=row.profileOriginal;
  if(!/^profile:[a-z0-9_]{3,24}:/.test(row.id)||!/^[a-z0-9_]{3,24}$/.test(row.ownerUsername??'')||!(profile?.media===null||profile?.mediaKind==='moment')||!/^[a-f0-9]{64}$/i.test(profile?.recordCardMediaSha256Hex??''))continue;
  let verifyUrl;try{verifyUrl=new URL(row.verifyHref,'https://receiz.com').href;}catch{continue;}
  const hints=moments.get(row.ownerUsername)??[];hints.push({id:row.id,assetId:row.receizId,ownerUsername:row.ownerUsername,category:'proof',mediaKind:'moment',pulse:row.pulse,verifyUrl,originalDigest:null,...(profile.nativeAsset?{nativeAsset:profile.nativeAsset}:{}),proofManifestSource:{mediaKind:'moment',code:profile.code,pulse:profile.pulse,verifyPath:profile.verifyPath,claimHashHex:profile.claimHashHex,pbiReceiptHash:profile.pbiReceiptHash,recordCardMediaSha256Hex:profile.recordCardMediaSha256Hex,recordMediaSha256Hex:profile.recordMediaSha256Hex??null,proof:profile.proof,media:null,attachments:[]}});
  moments.set(row.ownerUsername,hints);profiles.set(row.ownerUsername,[]);
 }
 for(const quote of source.snapshot?.data?.liveMarkets??[]){
  const row=originals.get(quote.itemId),inventory=quote.shareInventory;
  if(!row||quote.visibility!=='public'||!inventory||inventory.marketItemId!==row.id||inventory.assetId!==row.receizId||!/^profile:[a-z0-9_]{3,24}:/.test(row.id)||!/^[a-z0-9_]{3,24}$/.test(row.ownerUsername??''))continue;
  const rows=profiles.get(row.ownerUsername)??[];rows.push(inventory);profiles.set(row.ownerUsername,rows);
 }
 await mkdir(root,{recursive:true});
 const names=new Set([...profiles.keys()].map(name=>name+'.json'));
 for(const name of await readdir(root))if(name.endsWith('.json')&&!names.has(name))await unlink(new URL(name,root));
 for(const [username,rows] of profiles)await writeFile(new URL(username+'.json',root),JSON.stringify({schema:'bankeiz.profile-share-history.v1',username,rows,...(moments.has(username)?{momentManifests:moments.get(username)}:{})}));
 return profiles;
}
