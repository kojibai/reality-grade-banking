import {ArrowUpRight,LockKeyhole} from 'lucide-react';
import type {PublicMarketItem} from '../../receiz/public-market';
import {safeImportedSourceUrl} from '../../receiz/imported-source-url';
import {publicDocumentReaderUrl} from '../../receiz/public-document';
import {usePublicObjectArtwork} from '../media/usePublicObjectArtwork';
import './original-purchase.css';

export function OriginalPurchase({item,checkout,price,locked}:{item:PublicMarketItem;checkout:string;price:number;locked:boolean}){
 const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(price/100);
 const artwork=usePublicObjectArtwork(locked?item.artworkUrl:null,locked?item:undefined);
 const excerpt=locked&&['epub','pdf'].includes(item.mediaKind??'')?item.proofManifestSource?.attachments.find(file=>file.id==='collection-excerpt'):null;
 const excerptUrl=safeImportedSourceUrl(excerpt?.src,'media');
 const readExcerpt=excerptUrl&&publicDocumentReaderUrl(excerptUrl,item.assetId);
 const preview=locked&&item.playback;
 const action=locked?'Unlock Original':'Purchase Original';
 return <section className={locked?'asset-original-purchase is-locked':'asset-original-purchase'} aria-label="Original purchase">
  {preview&&<div className="asset-original-preview"><span>{item.mediaKind==='audio'?'Audio preview':'Video preview'}</span>{item.mediaKind==='audio'
   ?<audio aria-label={item.title+' audio preview'} src={preview.url} controls preload="none"/>
   :<video aria-label={item.title+' video preview'} src={preview.url} poster={artwork??undefined} controls playsInline preload="none"/>}</div>}
  {readExcerpt&&<a className="asset-original-excerpt" href={readExcerpt} target="_blank" rel="noreferrer">Read the preview <ArrowUpRight size={14}/></a>}
  <a className="asset-original-checkout" href={checkout}>
   {locked&&artwork&&!preview&&<img src={artwork} alt="" loading="lazy" decoding="async"/>}
   <span className="asset-original-purchase-action">
    <LockKeyhole size={17} strokeWidth={1.6}/>
    <span><strong>{action}</strong><small>{locked?'Full content with purchase':'Collect the verifiable file'}</small></span>
    <span className="asset-original-price">{amount}</span><ArrowUpRight size={16} strokeWidth={1.6}/>
   </span>
  </a>
 </section>;
}
