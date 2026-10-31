import type {PublicMarketItem} from '../../receiz/public-market';
import {useMemo} from 'react';
import {safeReceizArtworkUrl} from '../../receiz/public-market';
import {readPublicCollectiblePresentation} from '../../receiz/public-collectible-presentation';
import './public-collectible-artwork.css';

/** The native sports face: its exact public portrait and carried card fields.
 * No embedded page, image generation, price calculation or source read. */
export function PublicCollectibleArtwork({item,eager=false}:{item:PublicMarketItem;eager?:boolean}){
 const artwork=safeReceizArtworkUrl(item.artworkUrl),facts=useMemo(()=>new Map(readPublicCollectiblePresentation(item.collectiblePresentation,item.assetId,item.cardClaimHash)?.facts.map(fact=>[fact.label,fact.value])),[item.collectiblePresentation,item.assetId,item.cardClaimHash]);
 const rarity=facts.get('Rarity'),issue=facts.get('Issue'),rating=facts.get('Rating'),team=facts.get('Team code'),position=facts.get('Position');
 const stats=[['Projected score','proj'],['Live score','live'],['Recorded events','history']].filter(([key])=>facts.has(key));
 return <div className="public-collectible-artwork" data-rarity={rarity}>
  <div className="public-collectible-card-face">
   {(rating||team)&&<span className="public-collectible-card-top">{rating&&<b>{rating}</b>}{team&&<strong>{team}</strong>}</span>}
   <div className="public-collectible-portrait">{artwork&&<img src={artwork} alt={item.title} loading={eager?'eager':'lazy'} decoding="async" referrerPolicy="no-referrer" draggable={false}/>}</div>
   <div className="public-collectible-card-copy">{(issue||rarity)&&<span className="public-collectible-card-badges">{issue&&<small>{issue}</small>}{rarity&&<small>{rarity}</small>}</span>}
    <strong className="public-collectible-card-name">{item.title}</strong>{(position||team)&&<span className="public-collectible-card-meta">{[position,team].filter(Boolean).join(' · ')}</span>}
    {stats.length>0&&<span className="public-collectible-card-stats">{stats.map(([key,label])=><span key={key}><b>{facts.get(key)}</b><small>{label}</small></span>)}</span>}
   </div>
  </div>
 </div>;
}
