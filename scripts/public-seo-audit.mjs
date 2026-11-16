// Separately invoked public HTTP diagnostic. Never imported by page entry.
const decode=value=>value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(entity,key)=>{
 if(key[0]!=='#')return{amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'}[key.toLowerCase()];
 const point=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return point>0&&point<=0x10ffff?String.fromCodePoint(point):'\uFFFD';
});
const attribute=(tag,name)=>{
 const attributes=tag.replace(/^<\s*[\w:-]+/,'');
 for(const match of attributes.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g))if(match[1].toLowerCase()===name)return decode(match[2]??match[3]??match[4]??'');
 return null;
};
const tags=(html,name)=>html.match(new RegExp('<'+name+'\\b(?:[^>"\\\']|"[^"]*"|\\\'[^\\\']*\\\')*>','gi'))??[];
const excluded=value=>(value??'').split(/[;,]/).some(part=>{
 const directive=part.trim().replace(/^(?:googlebot|bingbot)\s*:\s*/i,'');
 return!directive.includes(':')&&directive.split(/\s+/).some(token=>/^(?:noindex|none)$/i.test(token));
});

export async function auditPublicPage(origin,path,{timeoutMs=20000,maxHeadBytes=2_000_000,canonicalOrigin='https://bankeiz.com'}={}){
 const result={path,status:null,canonical:null,title:null,description:null,httpRobots:null,htmlRobots:[],headBytes:0,issues:[],ok:false};
 let reader;
 try{
  const response=await fetch(new URL(path,origin),{credentials:'omit',redirect:'manual',signal:AbortSignal.timeout(timeoutMs),headers:{accept:'text/html','user-agent':'BankeizSEOAudit/1.0'}});
  result.status=response.status;result.httpRobots=response.headers.get('x-robots-tag');
  if(response.status!==200)result.issues.push('http_status_'+response.status);
  if(excluded(result.httpRobots))result.issues.push('http_noindex');
  if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')??''))result.issues.push('not_html');
  if(response.status!==200){await response.body?.cancel();return result;}
  reader=response.body?.getReader();const decoder=new TextDecoder();let html='';
  while(reader){
   const {value,done}=await reader.read();if(done)break;
   result.headBytes+=value.byteLength;html+=decoder.decode(value,{stream:true});
   if(/<\/head\s*>/i.test(html))break;
   if(result.headBytes>=maxHeadBytes){result.issues.push('head_limit');break;}
  }
  const end=html.search(/<\/head\s*>/i);if(end<0)result.issues.push('incomplete_head');else html=html.slice(0,end);
  const titles=[...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  result.title=titles[0]?.[1]?.trim()??null;
  if(!result.title)result.issues.push('missing_title');if(titles.length>1)result.issues.push('duplicate_title');
  const metas=tags(html,'meta');
  result.description=metas.filter(tag=>attribute(tag,'name')?.toLowerCase()==='description').map(tag=>attribute(tag,'content'))[0]??null;
  if(!result.description?.trim())result.issues.push('missing_description');
  result.htmlRobots=metas.filter(tag=>['robots','googlebot','bingbot'].includes(attribute(tag,'name')?.toLowerCase())).map(tag=>attribute(tag,'content')??'');
  if(result.htmlRobots.some(excluded))result.issues.push('html_noindex');
  const canonicals=tags(html,'link').filter(tag=>attribute(tag,'rel')?.toLowerCase().split(/\s+/).includes('canonical')).map(tag=>attribute(tag,'href'));
  result.canonical=canonicals[0]??null;
  if(canonicals.length!==1)result.issues.push('canonical_count_'+canonicals.length);
  if(canonicals.length===1&&!result.canonical?.trim())result.issues.push('canonical_missing_href');
  if(result.canonical&&result.canonical!==new URL(path,canonicalOrigin).href)result.issues.push('canonical_mismatch');
  result.ok=result.issues.length===0;
 }catch(error){result.issues.push('request_error_'+(error?.name??'Error'));}
 finally{try{await reader?.cancel();}catch{}}
 return result;
}
