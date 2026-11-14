/** A display projection of external email, never its exact MIME or proof.
 * Recipient-only Receiz capabilities must not be redistributed in a thread. */
export const EMAIL_REPLY_EMPTY='No new reply text.';
const knownHosts=new Set(['receiz.com','www.receiz.com','bankeiz.com','www.bankeiz.com']);
const urlPattern=/(?:https?:[\\/]+|[\\/]{2})[^\s<>"'`]+/gi;
function entities(value:string):string{return value.replace(/&(?:#(x[0-9a-f]+|[0-9]+)|(amp|lt|gt|quot|apos|nbsp|colon|sol|quest|equals|percnt));?/gi,(whole,numeric:string|undefined,name:string|undefined)=>{if(numeric){const n=numeric[0]?.toLowerCase()==='x'?parseInt(numeric.slice(1),16):Number(numeric);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):whole;}return({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',colon:':',sol:'/',quest:'?',equals:'=',percnt:'%'}as Record<string,string>)[name!.toLowerCase()]??whole;});}
function decoded(value:string):string{let result=value;for(let i=0;i<3;i++){const next=entities(result).replace(/%([a-f0-9]{2})/gi,(_all,hex:string)=>String.fromCharCode(parseInt(hex,16)));if(next===result)break;result=next;}return result;}
function capability(raw:string,depth=0):boolean{
 if(depth>3)return false;
 try{const normalized=raw.replace(/\\/g,'/'),url=new URL(normalized.startsWith('//')?'https:'+normalized:normalized);if(!['http:','https:'].includes(url.protocol))return false;
  const path=decoded(url.pathname).toLowerCase().replace(/\/+$/,'');
  if(knownHosts.has(url.hostname.toLowerCase().replace(/\.$/,''))&&['/auth/verify','/api/bank/native/email-message/start','/api/bank/native/email-meeting/start'].includes(path)&&[...url.searchParams].some(([key,value])=>key.toLowerCase()==='token'&&!!value))return true;
  for(const value of url.searchParams.values())if(containsRecipientCapability(value,depth+1))return true;
 }catch{}return false;
}
export function containsRecipientCapability(value:string,depth=0):boolean{
 if(depth>3)return false;
 const text=decoded(value).replace(/[\x00-\x20\x7f\u200b-\u200f\ufeff]/g,'');
 // Keep each URL start separate even after normalizing folded whitespace.
 // Otherwise a preceding ordinary URL can swallow the recipient capability.
 const starts=Array.from(text.matchAll(/(?:https?:[\\/]+|[\\/]{2})/gi));
 for(let i=0;i<starts.length;i++){const start=starts[i]!.index!,end=starts[i+1]?.index??text.length,candidate=text.slice(start,end).match(new RegExp('^'+urlPattern.source,'i'))?.[0];if(candidate&&capability(candidate,depth))return true;}
 return false;
}
export function redactRecipientCapabilities(value:string):string{
 if(!containsRecipientCapability(value))return value;
 const notice='[Recipient-only sign-in link removed.]';
 let result=decoded(value).replace(/[\u200b-\u200f\ufeff]/g,'').replace(new RegExp(urlPattern.source,'gi'),url=>capability(url)?notice:url);
 // Browser URL parsing discards ASCII controls. Unknown folded/encoded forms
 // must not survive merely because a display tokenizer cannot isolate them.
 if(containsRecipientCapability(result))result=result.split(/\n\s*\n/).map(part=>containsRecipientCapability(part)?notice:part).join('\n\n');
 return containsRecipientCapability(result)?notice:result;
}
export function authoredReplyText(value:string,reply=false):string{
 const lines=value.replace(/\r\n?/g,'\n').split('\n'),kept:string[]=[];
 for(let i=0;i<lines.length;i++){
  const line=lines[i]!;
  if(reply&&/^\s*(?:[-_]{2,}\s*(?:Original Message|Forwarded message)|Begin forwarded message\s*:)/i.test(line))break;
  if(reply&&/^\s*On\s+/i.test(line)&&lines.slice(i,i+(reply?5:1)).some((_value,offset)=>/^\s*On\s+.{1,500}\bwrote\s*:\s*$/i.test(lines.slice(i,i+offset+1).join(' '))))break;
  if(reply&&/^\s*From\s*:/i.test(line)&&lines.slice(i+1,i+7).some(v=>/^\s*(?:Sent|Date)\s*:/i.test(v))&&lines.slice(i+1,i+9).some(v=>/^\s*(?:To|Subject)\s*:/i.test(v)))break;
  if(reply&&/^\s*>/.test(line))continue;
  kept.push(line);
 }
 return redactRecipientCapabilities(kept.join('\n')).replace(/\0/g,'').trim();
}
const voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const blockTags=new Set(['p','div','li','h1','h2','h3','h4','h5','h6','tr','blockquote']);
function attribute(tag:string,name:string):string{const match=new RegExp('\\b'+name+'\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))','i').exec(tag);return entities(match?.[1]??match?.[2]??match?.[3]??'');}
function authoredHtml(value:string,reply:boolean):{body:string;quoted:boolean}{
 const html=value.slice(0,2_000_000),parts:string[]=[],links:string[]=[],skip:string[]=[];let anchor:string|null=null;let quoted=false;
 for(const token of html.matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+|</g)){
  const raw=token[0];if(raw.startsWith('<!--'))continue;
  if(raw[0]!=='<'){if(!skip.length)parts.push(entities(raw));continue;}
  const tag=/^<\/?([a-z][a-z0-9]*)/i.exec(raw)?.[1]?.toLowerCase();if(!tag)continue;
  const closing=raw.startsWith('</');
  if(skip.length){if(closing){const at=skip.lastIndexOf(tag);if(at>=0)skip.splice(at);}else if(!voidTags.has(tag)&&!raw.endsWith('/>'))skip.push(tag);continue;}
  if(closing){if(tag==='a'&&anchor){if(!parts.join('').includes(anchor))parts.push('\n'+anchor+'\n');anchor=null;}if(blockTags.has(tag))parts.push('\n');continue;}
  const classes=attribute(raw,'class').toLowerCase().split(/\s+/),id=attribute(raw,'id').toLowerCase();
  if(id==='divrplyfwdmsg'||classes.includes('moz-cite-prefix')){quoted=true;break;}
  const quote=classes.some(name=>['gmail_quote','gmail_quote_container','yahoo_quoted','protonmail_quote','moz-forward-container'].includes(name))||tag==='blockquote'&&(reply||attribute(raw,'type').toLowerCase()==='cite');
  if(quote||['script','style','template','head'].includes(tag)){if(quote)quoted=true;if(!voidTags.has(tag))skip.push(tag);continue;}
  if(tag==='br'||tag==='hr')parts.push('\n');
  if(tag==='a')anchor=null;
  if(tag==='a'&&links.length<20){const href=attribute(raw,'href').trim();try{const url=new URL(href);if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&href.length<=2048&&!/[\r\n\0]/.test(href)&&!containsRecipientCapability(href)&&!links.includes(href)){links.push(href);anchor=href;}}catch{}}
 }
 const body=authoredReplyText(parts.join('').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n'),reply||quoted);
 return{body,quoted};
}
export function projectEmailReplyBody(input:Readonly<{text:string|null;html:string|null;subject?:string;reply?:boolean}>):string{
 const parsed=input.html?authoredHtml(input.html,!!input.reply):null;
 let body=parsed?.quoted?parsed.body:input.text?.trim()?authoredReplyText(input.text,!!input.reply):parsed?.body??'';
 if(!body)body=input.reply||parsed?.quoted?EMAIL_REPLY_EMPTY:redactRecipientCapabilities(input.subject?.trim()??'')||'Email received.';
 body=redactRecipientCapabilities(body).replace(/\0/g,'').trim();
 return body.length>4000?body.slice(0,3900)+'\n[Full email retained privately.]':body;
}
