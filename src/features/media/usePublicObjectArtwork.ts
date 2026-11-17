import {useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';
import {safeReceizArtworkUrl,type PublicMarketItem} from '../../receiz/public-market';
import {retainedAssetPublicationArtwork} from '../../receiz/asset-publication-adoption';
import {safeImportedSourceUrl} from '../../receiz/imported-source-url';
const subscribeHydration=()=>()=>{},clientPaint=()=>false,serverPaint=()=>true;
/** Bank's React lifetime binds the existing native material plane. Exact held
 * Source roles resolve before their remote URL; no collection/history opens. */
export function usePublicObjectArtwork(artworkUrl:PublicMarketItem['artworkUrl'],item?:Pick<PublicMarketItem,'originalDigest'>&Partial<Pick<PublicMarketItem,'ownerUsername'>>):string|null|undefined{
 const local=item?.originalDigest?retainedAssetPublicationArtwork(item.originalDigest,item.ownerUsername??undefined):null,remote=safeReceizArtworkUrl(artworkUrl),coordinate=remote?safeImportedSourceUrl(remote,'media'):null;
 // React supplies the same server snapshot during initial hydration. Keep
 // that exact carried image while its local Source projection warms hidden.
 const serverFrame=useSyncExternalStore(subscribeHydration,clientPaint,serverPaint),servedCoordinate=useRef(serverFrame?coordinate:null),served=coordinate&&servedCoordinate.current===coordinate?remote:undefined;
 const [held,setHeld]=useState<{key:string;url:string|null}|null>(null);
 const reference=coordinate?JSON.parse(new URL(coordinate).searchParams.get('reference')!):null,matched=!reference||!item?.originalDigest||reference.artifactSha256===item.originalDigest,localCustody=typeof indexedDB!=='undefined';
 useLayoutEffect(()=>{
  if(local||!coordinate||!matched||!localCustody)return;
  let active=true,release:(()=>void)|undefined;
  const display=async(resource:{payloadObjectUrl:string;payloadMimeType:string}|null)=>{
   if(resource&&served&&resource.payloadMimeType.startsWith('image/')){const image=new Image();image.src=resource.payloadObjectUrl;await image.decode();}
   if(active)setHeld({key:coordinate,url:resource?.payloadObjectUrl??coordinate});
  };
  void import('../../receiz/asset-publication-runtime').then(async({loadAssetPublicationRuntime})=>{
   const native=await loadAssetPublicationRuntime();if(!active)return;release=native.retainMountedMaterial(coordinate);
   const known=native.peekHeldProfileOriginalMaterial(coordinate,reference.artifactSha256);if(known){await display(known);return;}
   const query=new URL(coordinate).searchParams,resource=await native.readHeldImportedProfileOriginalMaterial(reference,coordinate,{...(query.has('file')?{file:query.get('file')!}:{}),...(query.has('assetFile')?{assetFile:Number(query.get('assetFile'))}:{})});
   await display(resource);
  }).catch(()=>{/* Failed proof or unavailable local bytes cannot replace settled media. */});
  return()=>{active=false;release?.();};
 },[local,coordinate,matched,served,localCustody]);
 if(local)return local;if(!matched)return null;return coordinate?held?.key===coordinate?held.url:served??(!localCustody?remote:undefined):remote;
}
