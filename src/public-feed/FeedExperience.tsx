import {lazy,Suspense} from 'react';
import {ArrowUpRight,BookOpen} from 'lucide-react';
import type {PublicMarketItem} from '../receiz/public-market';
import {FeedReading} from './FeedReading';
import {ProofMedia} from '../features/media/ProofMedia';
import {ProofImageCanvas} from '../features/media/ProofImageCanvas';
import {InlineOpening} from '../components/InlineOpening';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import {feedKind} from './feed-items';
const Pdf=lazy(()=>import('../features/media/ProofPdfReader'));
export default function FeedExperience({item,readingOnly=false}:{item:PublicMarketItem;readingOnly?:boolean}){
 const kind=feedKind(item),post=item.readingUrl??item.verifyUrl;
 if(kind==='image'&&item.artworkUrl&&!item.hasLongForm)return <ProofImageCanvas url={item.artworkUrl} label={item.title} expanded onExpand={()=>{}} prioritize/>;
 if(readingOnly||kind==='essay'||kind==='moment'||kind==='image'&&item.hasLongForm)return <FeedReading item={item} readingOnly={readingOnly}/>;
 if(item.originalUrl&&item.originalDigest)return <ProofMedia autoOpen title={item.title} artworkUrl={item.artworkUrl} publicDocument={item.documentUrl?{url:item.documentUrl,assetId:item.assetId}:null} publicAudio={item.mediaKind==='audio'&&item.playback?{...item.playback,assetId:item.assetId}:null} publicVideo={item.mediaKind==='video'&&item.playback?{...item.playback,assetId:item.assetId}:null} source={{kind:'public',url:item.originalUrl,digest:item.originalDigest,...(post?{postUrl:post,hasLongForm:item.hasLongForm}:{})}}/>;
 if(item.documentUrl)return <Suspense fallback={<InlineOpening compact label="Preparing document"/>}><Pdf url={item.documentUrl} title={item.title}/></Suspense>;
 return <div className="feed-reading"><BookOpen size={28}/><h2>{item.title}</h2><p>{item.summary}</p><a href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>Open the complete asset<ArrowUpRight size={14}/></a></div>;
}
