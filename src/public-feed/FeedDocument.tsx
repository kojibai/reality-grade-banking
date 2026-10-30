import {useEffect,useState} from 'react';
import {FileText} from 'lucide-react';
import {ProofPdfPreview} from '../features/media/ProofPdfPreview';
import {openProofMedia} from '../receiz/proof-media';
import {publicDocumentReaderUrl} from '../receiz/public-document';
import type {PublicMarketItem} from '../receiz/public-market';
/** Actual public document pages, or bytes opened by the existing canonical reader. */
export default function FeedDocument({item}:{item:PublicMarketItem}){
 const direct=item.documentUrl?publicDocumentReaderUrl(item.documentUrl,item.assetId):null,[url,setUrl]=useState(direct),[text,setText]=useState('');
 useEffect(()=>{if(direct||!item.originalUrl||!item.originalDigest)return;const abort=new AbortController();let objectUrl:string|undefined;const post=item.readingUrl??item.verifyUrl;void openProofMedia({kind:'public',url:item.originalUrl,digest:item.originalDigest,...(post?{postUrl:post,hasLongForm:item.hasLongForm}:{})},abort.signal).then(opened=>{if(abort.signal.aborted)return;const pdf=opened.files.find(file=>file.kind==='pdf');if(pdf){objectUrl=URL.createObjectURL(new Blob([new Uint8Array(pdf.bytes)],{type:'application/pdf'}));setUrl(objectUrl);}else{const carried=opened.files.find(file=>file.kind==='text');if(carried?.text)setText(carried.text);}}).catch(()=>{});return()=>{abort.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};},[item.id,direct]);
 return <div className="feed-document">{url?<ProofPdfPreview url={url} title={item.title} cacheKey={'feed:'+item.id+':'+(item.originalDigest??direct)}/>:<div className="feed-document-paper"><FileText size={22} strokeWidth={1.2}/><h2>{item.title}</h2>{text&&<p>{text.slice(0,1800)}</p>}</div>}</div>;
}
