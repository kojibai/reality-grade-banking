type RecordExcerpt={id:string;title:string;text:string};
/** Explicit owner selection comes first and is never shortened or silently
 * dropped. Optional native-result excerpts use only the remaining bounds. */
export function composeTwinOwnerContext(selected:readonly RecordExcerpt[],additional:readonly RecordExcerpt[]):RecordExcerpt[]{
 const result=[...selected],ids=new Set(selected.map(row=>row.id));let size=selected.reduce((sum,row)=>sum+row.id.length+row.title.length+row.text.length,0);
 for(const row of additional){const next=row.id.length+row.title.length+row.text.length;if(result.length>=12)break;if(ids.has(row.id)||row.id.length>160||row.title.length>160||row.text.length>2400||size+next>16000)continue;result.push(row);ids.add(row.id);size+=next;}
 return result;
}
