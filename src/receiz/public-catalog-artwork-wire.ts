import type {PublicMarketCatalog,PublicMarketItem} from './public-market';
type WireItem=PublicMarketItem&{ownerAvatarFromProfile?:string};
/** Lossless display transport only. The selected header already carries the
 * exact owner portrait; repeat its UID rather than the image bytes per row. */
export function packPublicCatalogArtwork(catalog:PublicMarketCatalog):PublicMarketCatalog{
 const heads=new Map((catalog.publicProfileHeads??[]).map(head=>[head.profile.userId,head.profile]));
 return {...catalog,items:catalog.items.map(item=>{
  const owner=item.ownerIdentity,head=owner?heads.get(owner.userId):undefined;
  if(!owner||owner.username!==item.ownerUsername||head?.username!==owner.username||typeof item.ownerAvatarUrl!=='string'||head.avatarUrl!==item.ownerAvatarUrl)return item;
  const {ownerAvatarUrl:_portrait,...row}=item;return {...row,ownerAvatarFromProfile:owner.userId};
 })};
}
export function unpackPublicCatalogArtwork(catalog:PublicMarketCatalog):PublicMarketCatalog{
 if(!catalog||!Array.isArray(catalog.items))return catalog;
 const heads=new Map((catalog.publicProfileHeads??[]).map(head=>[head.profile.userId,head.profile]));
 for(const item of catalog.items as WireItem[]){
  if(!Object.hasOwn(item,'ownerAvatarFromProfile'))continue;
  const uid=item.ownerAvatarFromProfile,owner=item.ownerIdentity,head=heads.get(uid);
  if(typeof uid!=='string'||Object.hasOwn(item,'ownerAvatarUrl')||owner?.userId!==uid||owner.username!==item.ownerUsername||head?.username!==owner.username||typeof head.avatarUrl!=='string')throw Error('PUBLIC_CATALOG_ARTWORK_BINDING_INVALID');
  item.ownerAvatarUrl=head.avatarUrl;delete item.ownerAvatarFromProfile;
 }
 return catalog;
}
