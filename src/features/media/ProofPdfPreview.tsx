import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
const Reader=lazy(()=>import('./ProofPdfReader'));
const covers=new Map<string,string>();
/** Load the PDF engine only near an actual document card, outside initial
 * profile rendering. Its public document is shared with the opened reader. */
export function ProofPdfPreview({url,title,cacheKey=url}:{url:string;title:string;cacheKey?:string}){
 const frame=useRef<HTMLSpanElement>(null),[near,setNear]=useState(false),[image,setImage]=useState(()=>covers.get(cacheKey)??null),retain=useCallback((value:string)=>{covers.delete(cacheKey);covers.set(cacheKey,value);while(covers.size>32)covers.delete(covers.keys().next().value!);setImage(value);},[cacheKey]);
 useEffect(()=>{
  if(image)return;
  const node=frame.current;if(!node)return;
  if(typeof IntersectionObserver==='undefined'){setNear(true);return;}
  // Pending readers leave with their card; completed covers remain held.
  const observer=new IntersectionObserver(entries=>{
   for(let index=entries.length-1;index>=0;index--)if(entries[index].target===node){setNear(entries[index].isIntersecting);break;}
  },{rootMargin:'500px'});
  observer.observe(node);return()=>observer.disconnect();
 },[image]);
 return <span className="proof-pdf-preview" ref={frame}>{image?<img src={image} alt={title+' · first page'} draggable={false}/>:near&&<Suspense fallback={<span className="proof-pdf-cover-label">PDF</span>}><Reader url={url} title={title} cover onCover={retain}/></Suspense>}</span>;
}
