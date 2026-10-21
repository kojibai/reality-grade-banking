import type {BookBlock,BookChapter} from './proof-media';
export type BookPage={chapter:number;blocks:BookBlock[]};
/** A small local reading window. All text is retained; only one page mounts. */
export function paginateBook(chapters:BookChapter[]):BookPage[]{
 const pages:BookPage[]=[],max=2200;
 chapters.forEach((chapter,index)=>{
  let blocks:BookBlock[]=[],cost=0;
  const flush=()=>{if(blocks.length){pages.push({chapter:index,blocks});blocks=[];cost=0;}};
  const source=chapter.blocks?.length?chapter.blocks:chapter.text.split(/\n\s*\n/).filter(Boolean).map(text=>({kind:'paragraph' as const,text}));
  for(const block of source){
   if(block.kind==='image'){flush();pages.push({chapter:index,blocks:[block]});continue;}
   if(block.kind==='heading'&&cost>900)flush();
   let remaining=block.text;
   while(remaining.length){
    if(cost>=max||blocks.length>=24)flush();
    const room=max-cost;
    if(remaining.length>room&&cost>1000){flush();continue;}
    let at=Math.min(remaining.length,max-cost);
    if(at<remaining.length){const space=remaining.lastIndexOf(' ',at);if(space>at/2)at=space+1;if(at>0&&/[\uD800-\uDBFF]/.test(remaining[at-1]))at--;}
    blocks.push({...block,text:remaining.slice(0,at)});cost+=at;remaining=remaining.slice(at);
    if(remaining)flush();
   }
  }
  flush();
 });
 return pages;
}
