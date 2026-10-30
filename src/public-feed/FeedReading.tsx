import {useEffect,useState} from 'react';
import {ArrowUpRight,RotateCcw} from 'lucide-react';
import type {PublicMarketItem} from '../receiz/public-market';
import {readPublicProofReading,retainedPublicReading,type ProofReading} from '../receiz/proof-reading';
import {publicCarriedText} from '../receiz/public-carried-text';
import {InlineOpening} from '../components/InlineOpening';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import {feedKind,feedText} from './feed-items';
/** Text opens directly. No media player, decoder or second source is loaded. */
export function FeedReading({item,readingOnly=false}:{item:PublicMarketItem;readingOnly?:boolean}){
 const kind=feedKind(item),post=item.readingUrl??item.verifyUrl,carried=publicCarriedText(item.carriedText),[reading,setReading]=useState<ProofReading|null>(()=>post&&item.originalDigest?retainedPublicReading(post,item.originalDigest):null),[error,setError]=useState(false),[retry,setRetry]=useState(0),[font,setFont]=useState(19);
 useEffect(()=>{if(carried||!item.hasLongForm||!post||!item.originalDigest||reading)return;const abort=new AbortController();setError(false);void readPublicProofReading(post,item.originalDigest,abort.signal).then(value=>{if(!abort.signal.aborted)setReading(value);},()=>{if(!abort.signal.aborted)setError(true);});return()=>abort.abort();},[item.id,retry]);
 return <div className="feed-reading"><div className="feed-reading-tools"><span>{reading?'Verified carried text':readingOnly?'Lyrics':kind==='moment'?/…$|\.\.\.$/.test(feedText(item))?'Carried excerpt':'This happened':'Essay'}</span><div><button aria-label="Smaller text" onClick={()=>setFont(n=>Math.max(16,n-1))}>A</button><button aria-label="Larger text" onClick={()=>setFont(n=>Math.min(27,n+1))}>A</button></div></div><article className="feed-reading-paper" style={{fontSize:font}} tabIndex={0}><h2>{reading?.title??carried?.title??item.title}</h2><div>{reading?.text??carried?.text??(readingOnly?'':feedText(item))}</div></article>{item.hasLongForm&&!reading&&!carried&&(error?<button className="text-button" onClick={()=>setRetry(n=>n+1)}><RotateCcw size={14}/>Open full text</button>:<InlineOpening compact label="Preparing the carried text"/>)}{!reading&&item.sourceUrl&&<a className="feed-reader-source" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Complete Original<ArrowUpRight size={14}/></a>}<a className="feed-reader-source" href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>Full asset &amp; source<ArrowUpRight size={14}/></a></div>;
}
