export const docsOrigin='https://docs.bankeiz.com';
export const docsEdition={reviewed:'2026-10-28',packages:'129.0.0',ruleset:'127.0.0',sourceRevision:'62e4753'};
export const source=(path,label)=>[label,`https://github.com/kojibai/reality-grade-banking/blob/${docsEdition.sourceRevision}/${path}`];
export const p=text=>({type:'paragraph',text});
export const list=(...items)=>({type:'list',items});
export const steps=(...items)=>({type:'steps',items});
export const table=(caption,columns,rows)=>({type:'table',caption,columns,rows});
export const note=(title,text)=>({type:'note',title,text});
export const code=(language,text,caption)=>({type:'code',language,text,caption});
export const flow=(caption,...items)=>({type:'flow',caption,items});
export const links=(...items)=>({type:'links',items});
export const section=(title,...blocks)=>({title,blocks});
export function blockText(block){return [block.text,block.title,block.caption,...(block.columns??[]),...(block.rows??[]).flat(),...(block.items??[]).flat()].filter(x=>typeof x==='string').join(' ');}
export function articleText(article){return [article.title,article.summary,article.group,...article.sections.flatMap(s=>[s.title,...s.blocks.map(blockText)])].join(' ');}
