import type {MouseEvent,ReactNode} from 'react';
export type TwinRecordLink=(id:string)=>{href:string;onClick(event:MouseEvent<HTMLAnchorElement>):void}|null;
/** Text stays text. Only supported links become anchors; HTML is never parsed. */
export function TwinMessageText({text,recordLink}:{text:string;recordLink?:TwinRecordLink}){
 const parts:ReactNode[]=[];let cursor=0;
 for(const match of text.matchAll(/\[([^\]\n]{1,240})\]\(([^\s)]+)\)/g)){
  parts.push(text.slice(cursor,match.index));const [raw,label,target]=match;let link:ReturnType<TwinRecordLink>=null;
  if(target.startsWith('bank-record:')){try{link=recordLink?.(decodeURIComponent(target.slice(12)))??null;}catch{/* Unknown coordinates remain plain text. */}}
  else try{const url=new URL(target,'https://bankeiz.com');if(['https://bankeiz.com','https://receiz.com'].includes(url.origin)&&!url.username&&!url.password)link={href:target,onClick(){}};}catch{/* Unsupported links remain plain text. */}
  parts.push(link?<a key={match.index} className="bank-twin-inline-link" href={link.href} onClick={link.onClick}>{label}</a>:target.startsWith('bank-record:')?label:raw);cursor=match.index+raw.length;
 }
 parts.push(text.slice(cursor));return <p>{parts}</p>;
}
