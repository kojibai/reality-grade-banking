function destination(raw:string):{url:string;suffix:string}|null{
 let value=raw;
 for(;;){const previous=value;value=value.replace(/[.,!?;:]+$/,'');for(const [open,close]of [['(',')'],['[',']'],['{','}']])while(value.endsWith(close)&&value.split(close).length>value.split(open).length)value=value.slice(0,-1);if(value===previous)break;}
 if(!value||/[\\\x00-\x20]/.test(value))return null;
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;return {url:url.href,suffix:raw.slice(value.length)};}catch{return null;}
}
/** Caption metadata remains plain text. Only explicit web destinations become links. */
export function splitProofCaption(text:string):{text:string;links:string[]}{
 const links:string[]=[],seen=new Set<string>();
 const prose=text.replace(/\b(?!https?:)[a-z][a-z0-9+.-]*:[^\s]+|\[([^\]\n]+)\]\((https?:\/\/[^\s<>]+)\)|(^|[\s([{"'])(https?:\/\/[^\s<>"']+)/gim,(all,label:string|undefined,markdown:string|undefined,prefix:string|undefined,raw:string|undefined)=>{
  const target=destination(markdown??raw??'');if(!target)return all;if(!seen.has(target.url)){seen.add(target.url);links.push(target.url);}return (markdown?label:prefix??'')+target.suffix;
 });
 return {text:links.length?prose.replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/[ \t]{2,}/g,' ').replace(/[ \t]+([.,!?;:)\]}])/g,'$1').replace(/\n{3,}/g,'\n\n').trim():text,links};
}
