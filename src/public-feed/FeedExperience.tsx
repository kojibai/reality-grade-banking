import {lazy,Suspense,useEffect,useState} from 'react';
import {ArrowUpRight,BookOpen,RotateCcw} from 'lucide-react';
import type {PublicMarketItem} from '../receiz/public-market';
import {readPublicProofReading,retainedPublicReading,type ProofReading} from '../receiz/proof-reading';
import {ProofMedia} from '../features/media/ProofMedia';
import {ProofImageCanvas} from '../features/media/ProofImageCanvas';
import {InlineOpening} from '../components/InlineOpening';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import {feedKind,feedText} from './feed-items';
const Pdf=lazy(()=>import('../features/media/ProofPdfReader'));
export default function FeedExperience({item,readingOnly=false}:{item:PublicMarketItem;readingOnly?:boolean}){
 const kind=feedKind(item),post=item.readingUrl??item.verifyUrl,[reading,setReading]=useState<ProofReading|null>(()=>post&&item.originalDigest?retainedPublicReading(post,item.originalDigest):null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[font,setFont]=useState(19);
 useEffect(()=>{if(!item.hasLongForm||!post||!item.originalDigest||reading)return;const abort=new AbortController();setError(false);void readPublicProofReading(post,item.originalDigest,abort.signal).then(value=>{if(!abort.signal.aborted)setReading(value);},()=>{if(!abort.signal.aborted)setError(true);});return()=>abort.abort();},[item.id,retry]);
 if(kind==='image'&&item.artworkUrl&&!item.hasLongForm)return <ProofImageCanvas url={item.artworkUrl} label={item.title} expanded onExpand={()=>{}} prioritize/>;
 if(readingOnly||kind==='essay'||kind==='moment'||kind==='image'&&item.hasLongForm)return <div className="feed-reading"><div className="feed-reading-tools"><span>{reading?'Verified carried text':readingOnly?'Lyrics':kind==='moment'?/…$|\.\.\.$/.test(feedText(item))?'Carried excerpt':'This happened':'Essay'}</span><div><button aria-label="Smaller text" onClick={()=>setFont(n=>Math.max(16,n-1))}>A</button><button aria-label="Larger text" onClick={()=>setFont(n=>Math.min(27,n+1))}>A</button></div></div><article className="feed-reading-paper" style={{fontSize:font}} tabIndex={0}><h2>{reading?.title??item.title}</h2><div>{reading?.text??(readingOnly?'':feedText(item))}</div></article>{item.hasLongForm&&!reading&&(error?<button className="text-button" onClick={()=>setRetry(n=>n+1)}><RotateCcw size={14}/>Open full text</button>:<InlineOpening compact label="Preparing the carried text"/>)}{!reading&&item.sourceUrl&&<a className="feed-reader-source" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Complete Original<ArrowUpRight size={14}/></a>}<a className="feed-reader-source" href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>Full asset &amp; source<ArrowUpRight size={14}/></a></div>;
 if(item.originalUrl&&item.originalDigest)return <ProofMedia autoOpen title={item.title} artworkUrl={item.artworkUrl} publicDocument={item.documentUrl?{url:item.documentUrl,assetId:item.assetId}:null} publicAudio={item.mediaKind==='audio'&&item.playback?{...item.playback,assetId:item.assetId}:null} publicVideo={item.mediaKind==='video'&&item.playback?{...item.playback,assetId:item.assetId}:null} source={{kind:'public',url:item.originalUrl,digest:item.originalDigest,...(post?{postUrl:post,hasLongForm:item.hasLongForm}:{})}}/>;
 if(item.documentUrl)return <Suspense fallback={<InlineOpening compact label="Preparing document"/>}><Pdf url={item.documentUrl} title={item.title}/></Suspense>;
 return <div className="feed-reading"><BookOpen size={28}/><h2>{item.title}</h2><p>{item.summary}</p><a href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>Open the complete asset<ArrowUpRight size={14}/></a></div>;
}
