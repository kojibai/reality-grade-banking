type RecordExcerpt={id:string;title:string;text:string};
/** Explicit owner selection comes first and is never shortened or silently
 * dropped. Optional native-result excerpts use only the remaining bounds. */
export function composeTwinOwnerContext(selected:readonly RecordExcerpt[],additional:readonly RecordExcerpt[]):RecordExcerpt[]{
 const result=[...selected],ids=new Set(selected.map(row=>row.id));let size=selected.reduce((sum,row)=>sum+row.id.length+row.title.length+row.text.length,0);
 for(const row of additional){const next=row.id.length+row.title.length+row.text.length;if(result.length>=12)break;if(ids.has(row.id)||row.id.length>160||row.title.length>160||row.text.length>2400||size+next>16000)continue;result.push(row);ids.add(row.id);size+=next;}
 return result;
}

/** Working excerpts from already held account records. The agent's existing
 * history tools retrieve exact sources or older records when needed. */
export function automaticTwinOwnerContext(question:string,records:readonly RecordExcerpt[],results:readonly RecordExcerpt[]):RecordExcerpt[]{
 const stop=new Set('a an and are as at be been but by can could did do does explain for from had has have help how i in is it me my of on or our please show tell that the their them there these they this to was were what when where which who why will with would you your'.split(' '));
 const terms=[...new Set((question.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(word=>word.length>1&&!stop.has(word)))];
 const relevant=records.map((row,index)=>{const title=row.title.toLowerCase(),body=row.text.toLowerCase();return{row,index,score:terms.reduce((sum,term)=>sum+(title.includes(term)?3:body.includes(term)?1:0),0)};}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(item=>item.row);
 // Current-thread execution results remain ahead of excerpts so a follow-up
 // never drops what just happened. No record becomes proof or permission here.
 return composeTwinOwnerContext([], [...results,...relevant]);
}
