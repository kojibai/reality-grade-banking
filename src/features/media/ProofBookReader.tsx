import {useEffect,useLayoutEffect,useMemo,useRef,useState,type TouchEvent} from 'react';
import {ChevronLeft,ChevronRight,List,Maximize2,Moon,Sun,X} from 'lucide-react';
import type {MediaFile} from '../../receiz/proof-media';
import {paginateBook} from '../../receiz/book-pages';
import './proof-book-reader.css';
type Place={page:number;font:number;dark:boolean};
const places=new Map<string,Place>();
export default function ProofBookReader({file,title,expanded,onExpand}:{file:MediaFile;title?:string;expanded:boolean;onExpand:()=>void}){
 const pages=useMemo(()=>paginateBook(file.chapters??[]),[file]),[place,setPlace]=useState<Place>(()=>places.get(file.payloadDigest)??{page:0,font:18,dark:false}),[contents,setContents]=useState(false),paper=useRef<HTMLElement>(null),contentButton=useRef<HTMLButtonElement>(null);
 const pageIndex=Math.min(place.page,Math.max(0,pages.length-1)),page=pages[pageIndex],chapter=file.chapters?.[page?.chapter??0],images=useMemo(()=>new Map(file.book?.images.map(image=>[image.path,image])??[]),[file]);
 const [imageUrls,setImageUrls]=useState<Map<string,string>>(()=>new Map());
 const gesture=useRef<{id:number;x:number;y:number;at:number;page:number}|null>(null);
 useEffect(()=>{const urls=new Map<string,string>();for(const block of page?.blocks??[]){const image=block.path&&images.get(block.path);if(image&&!urls.has(image.path))urls.set(image.path,URL.createObjectURL(new Blob([new Uint8Array(image.bytes)],{type:image.mimeType})));}setImageUrls(urls);return()=>{for(const url of urls.values())URL.revokeObjectURL(url);};},[page,images]);
 useLayoutEffect(()=>{if(paper.current)paper.current.scrollTop=0;},[pageIndex]);
 function update(next:Partial<Place>){setPlace(previous=>{const value={...previous,...next};places.delete(file.payloadDigest);places.set(file.payloadDigest,value);while(places.size>32)places.delete(places.keys().next().value!);return value;});}
 function turn(direction:number){update({page:Math.max(0,Math.min(pages.length-1,pageIndex+direction))});}
 function startSwipe(event:TouchEvent<HTMLElement>){
  gesture.current=null;
  if(event.touches.length!==1||window.getSelection()?.isCollapsed===false)return;
  const point=event.touches[0];gesture.current={id:point.identifier,x:point.clientX,y:point.clientY,at:Date.now(),page:pageIndex};
 }
 function moveSwipe(event:TouchEvent<HTMLElement>){
  const start=gesture.current;if(!start)return;
  const point=Array.from(event.touches).find(point=>point.identifier===start.id);
  if(event.touches.length!==1||!point||Math.abs(point.clientY-start.y)>12&&Math.abs(point.clientY-start.y)>Math.abs(point.clientX-start.x))gesture.current=null;
 }
 function endSwipe(event:TouchEvent<HTMLElement>){
  const start=gesture.current;gesture.current=null;
  if(!start||event.touches.length||start.page!==pageIndex||Date.now()-start.at>1000||window.getSelection()?.isCollapsed===false)return;
  const point=Array.from(event.changedTouches).find(point=>point.identifier===start.id);if(!point)return;
  const dx=point.clientX-start.x,dy=point.clientY-start.y;
  if(Math.abs(dx)<56||Math.abs(dx)<Math.abs(dy)*1.6)return;
  turn(dx<0?1:-1);
 }
 function closeContents(){setContents(false);contentButton.current?.focus({preventScroll:true});}
 return <section className={`proof-book-reader${expanded?' is-expanded':''}${place.dark?' is-dark':''}`} aria-label="EPUB reader" onKeyDown={event=>{if(contents){if(event.key==='Escape'){event.stopPropagation();closeContents();}return;}if(!(event.target instanceof HTMLElement)||event.target.closest('button,input,select,textarea'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();turn(event.key==='ArrowRight'?1:-1);}}}>
  <header className="proof-book-heading"><div><span>Book</span><strong>{title??file.book?.title??file.filename.replace(/\.epub$/i,'')}</strong>{file.book?.author&&<small>{file.book.author}</small>}</div>{!expanded&&<button aria-label="Read book" title="Read book" onClick={onExpand}><Maximize2 size={16}/></button>}</header>
  <nav className="proof-book-tools" aria-label="Book controls"><button ref={contentButton} aria-expanded={contents} aria-label="Book contents" onClick={()=>setContents(value=>!value)}><List size={16}/><span>Contents</span></button><div><button aria-label="Smaller book text" disabled={place.font<=16} onClick={()=>update({font:place.font-2})}>A</button><button className="proof-book-type-large" aria-label="Larger book text" disabled={place.font>=26} onClick={()=>update({font:place.font+2})}>A</button><button aria-label={place.dark?'Use light paper':'Use dark paper'} onClick={()=>update({dark:!place.dark})}>{place.dark?<Sun size={15}/>:<Moon size={15}/>}</button></div></nav>
  {contents?<nav className="proof-book-contents" aria-label="Book chapters"><div><strong>Contents</strong><button aria-label="Close book contents" onClick={closeContents}><X size={17}/></button></div>{file.chapters?.map((item,index)=><button key={index} aria-current={page?.chapter===index?'location':undefined} onClick={()=>{const at=pages.findIndex(p=>p.chapter===index);if(at>=0)update({page:at});closeContents();}}><span>{String(index+1).padStart(2,'0')}</span><span>{item.title}</span><ChevronRight size={13}/></button>)}</nav>:<article ref={paper} tabIndex={0} className="proof-book-paper" data-asset-no-swipe onTouchStart={startSwipe} onTouchMove={moveSwipe} onTouchEnd={endSwipe} onTouchCancel={()=>{gesture.current=null;}} aria-label={chapter?.title??'Book page'} style={{fontSize:place.font}}><div className="proof-book-page" key={pageIndex}>{page?.blocks.map((block,index)=>block.kind==='image'?imageUrls.has(block.path!)?<figure key={index}><img src={imageUrls.get(block.path!)} alt={block.text||'Book illustration'} draggable={false}/></figure>:<div className="proof-book-image-space" key={index}/>:block.kind==='heading'?<h3 key={index}>{block.text}</h3>:block.kind==='quote'?<blockquote key={index}>{block.text}</blockquote>:<p key={index}>{block.text}</p>)}{!page&&<p>This book has no readable pages.</p>}</div></article>}
  <footer className="proof-book-paging"><button aria-label="Previous book page" disabled={!pageIndex} onClick={()=>turn(-1)}><ChevronLeft size={18}/></button><div><span>{chapter?.title??'Book'}</span><small aria-live="polite">{pageIndex+1} / {pages.length||1} <span>· {Math.round((pageIndex+1)/Math.max(1,pages.length)*100)}%</span></small></div><button aria-label="Next book page" disabled={pageIndex>=pages.length-1} onClick={()=>turn(1)}><ChevronRight size={18}/></button></footer>
  <div className="proof-book-progress" aria-hidden="true"><span style={{width:`${(pageIndex+1)/Math.max(1,pages.length)*100}%`}}/></div>
 </section>;
}
