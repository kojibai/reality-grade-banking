import {lazy,Suspense,useEffect,useState} from 'react';
import {BookOpen,RotateCcw} from 'lucide-react';
import {readPublicBook,retainedPublicBook} from '../../receiz/public-book-reader';
import type {PublicBookSource} from '../../receiz/public-book';
import {InlineOpening} from '../../components/InlineOpening';
import {ExpandedMedia} from './ExpandedMedia';
const Reader=lazy(()=>import('./ProofBookReader'));
/** A public reading experience; the separately sold Original stays separate. */
export function PublicBookMedia({source,title,autoOpen=false}:{source:PublicBookSource;title:string;autoOpen?:boolean}){
 const [file,setFile]=useState(()=>retainedPublicBook(source)),[requested,setRequested]=useState(autoOpen),[expanded,setExpanded]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;const held=retainedPublicBook(source);setFile(held);setError('');if(requested&&!held)void readPublicBook(source).then(book=>{if(current)setFile(book);},cause=>{if(current)setError(cause instanceof Error?cause.message:'The book could not be opened.');});return()=>{current=false;};},[source.url,source.payloadDigest,requested,retry]);
 const bookTitle=file?.book?.title,reader=(full:boolean)=><Suspense fallback={<InlineOpening compact label="Preparing book"/>}><Reader file={file!} title={!bookTitle||/^(?:unknown|untitled|original)$/i.test(bookTitle)?title:bookTitle} expanded={full} onExpand={()=>setExpanded(true)}/></Suspense>;
 return <section className="proof-media" aria-label="Object media"><div className="proof-media-topline"><span>Book</span><span>Public reading</span></div>{file?expanded?<p>Book open</p>:reader(false):!requested?<button className="text-button" onClick={()=>setRequested(true)}><BookOpen size={16}/>Read book</button>:error?<div className="proof-media-fallback"><p>{error}</p><button className="text-button" onClick={()=>setRetry(value=>value+1)}><RotateCcw size={15}/>Try again</button></div>:<InlineOpening compact label="Preparing book"/>}{expanded&&file&&<ExpandedMedia title={title} label="Public reading" onClose={()=>setExpanded(false)}><div className="proof-media-expanded-body">{reader(true)}</div><footer><span>Public reading</span></footer></ExpandedMedia>}</section>;
}
