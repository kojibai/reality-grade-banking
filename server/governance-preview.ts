import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {rows as sampleRows} from '../src/features/voting/example/collection';
import {governanceCard,governanceCardImage,type GovernanceCard} from '../src/receiz/governance-share';
import {governancePath,governanceSections} from '../src/receiz/governance-links';
import {governanceSchema,governanceNamespace,type GovernanceTerms} from '../src/receiz/governance-documents';
import {BANK_APPLICATION_ID,BANK_PUBLIC_ORIGIN} from '../src/receiz/config';

type Kind=GovernanceTerms['kind'];
type Target={kind:Kind;id:string;example:boolean;image:boolean};
const hex=/^[a-f0-9]{64}$/;
const examples=new Map(sampleRows.map(row=>[row.digest,row]));
const cached=new Map<string,GovernanceCard>();
function kindOf(section:string){return (Object.keys(governanceSections) as Kind[]).find(k=>governanceSections[k]===section);}
export function governancePreviewTarget(url:URL):Target|null{
  const parts=url.pathname.split('/').filter(Boolean);
  let section='',id='',sample=false,image=false;
  if(url.pathname==='/api/governance'){
    section=url.searchParams.get('section')??'';id=url.searchParams.get('digest')??url.searchParams.get('record')??'';
    sample=url.searchParams.get('example')==='harbor-tool-library';image=url.searchParams.get('image')==='1';
  }else if(parts[0]==='vote'&&parts.length===1&&url.searchParams.get('example')==='harbor-tool-library'){
    sample=true;id=url.searchParams.get('record')??'';
  }else if(parts[0]==='vote'&&parts[1]==='example-images'&&parts.length===3&&parts[2].endsWith('.png')){
    sample=true;image=true;id=parts[2].slice(0,-4);
  }else if(parts[0]==='vote'&&(parts.length===3||parts.length===4&&parts[3]==='og.png')){
    section=parts[1];id=parts[2];image=parts.length===4;
  }else return null;
  if(!hex.test(id))return null;
  const kind=sample?examples.get(id)?.document.terms.kind:kindOf(section);
  return kind?{kind,id,example:sample,image}:null;
}
function sampleCard(id:string){
  const row=examples.get(id)!,terms=row.document.terms,parent=terms.kind==='charter'?null:examples.get(terms.charter)?.document.terms;
  return governanceCard(row,parent?.kind==='charter'?parent.rules.name:'',true);
}
async function readPublished(id:string){
  const [{publicClient,loadReceiz},{openGovernanceTransportSource}]=await Promise.all([import('../src/receiz/client'),import('../src/receiz/governance-directory')]);
  const record=(await (await publicClient()).appState.byId('bankeiz-voting-'+id)).record;
  if(!record||record.appProjectionClientId!==BANK_APPLICATION_ID||record.appNamespace!==governanceNamespace||record.appObjectId!=='bankeiz-voting-'+id)return null;
  const sdk=await loadReceiz(),data=sdk.extractReceizAppStateData(record,{schema:governanceSchema,state:'published',requiredDataKey:'source'});
  if(!data||data.digest!==id)return null;
  const source=await openGovernanceTransportSource(data);
  return {digest:source.digest,pulse:source.pulse,document:source.document,profileUid:null};
}
async function readCard(target:Target){
  const key=target.kind+':'+target.id,known=cached.get(key);if(known)return known;
  const row=await readPublished(target.id);if(!row||row.document.terms.kind!==target.kind)return null;
  const t=row.document.terms;
  const parent=t.kind==='charter'?null:(await readPublished(t.charter).catch(()=>null))?.document.terms;
  const card=governanceCard(row,parent?.kind==='charter'?parent.rules.name:'');
  if(cached.size>=128)cached.delete(cached.keys().next().value!);cached.set(key,card);return card;
}
const esc=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const kindLabel=(kind:string)=>kind.charAt(0).toUpperCase()+kind.slice(1);
export async function handleGovernancePreview(request:Request,options:{page?:(sample:boolean)=>Promise<string>;origin?:string}={}){
  const target=governancePreviewTarget(new URL(request.url));
  if(!target)return new Response('Record not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const {id,kind,example,image}=target,origin=options.origin??BANK_PUBLIC_ORIGIN;
  const path=example?'/vote/?example=harbor-tool-library&record='+id:governancePath(kind,id),canonical=origin+path;
  // Opening a held document never waits for Source. Preview clients can ask for
  // its verified title and poster before fetching the application.
  const previewAgent=/Twitterbot|facebookexternalhit|Facebot|Applebot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|iMessagePreview/i.test(request.headers.get('user-agent')??'');
  const card=example?sampleCard(id):cached.get(kind+':'+id)??(image||previewAgent?await readCard(target).catch(()=>null):null);
  const label=kindLabel(kind),fallback:GovernanceCard={kind:label,title:label+' Original',charter:'',description:'Public governance record',digest:id,example:false};
  const data=card??fallback,headers=new Headers({'X-Content-Type-Options':'nosniff','Cache-Control':image&&card?'public,max-age=86400,immutable':card?'public,max-age=60,s-maxage=300':'no-store'});
  if(!example&&!image)headers.set('Vary','User-Agent');
  if(image){
    headers.set('Content-Type','image/png');
    if(request.method==='HEAD')return new Response(null,{headers});
    const png=await (await import('./governance-share-art')).renderGovernanceCard(data);
    return new Response(new Uint8Array(png),{headers});
  }
  const title=esc(data.title),description=esc((example?'Practice example. ':'')+data.description.slice(0,280));
  const poster=esc(origin+governanceCardImage(path,id)),alt=esc([data.kind,data.title,data.charter].filter(Boolean).join(' · '));
  const metadata=`<title>${title} · Public voting</title><meta name="description" content="${description}"><link rel="canonical" href="${esc(canonical)}"><link rel="apple-touch-icon" href="/icon-192.png"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${poster}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${alt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${poster}"><meta name="twitter:image:alt" content="${alt}">`;
  headers.set('Content-Type','text/html; charset=utf-8');
  if(request.method==='HEAD')return new Response(null,{headers});
  const html=await (options.page??(sample=>readFile(resolve('dist/vote',sample?'index.html':'record.html'),'utf8')))(example);
  return new Response(html.replace(/<title>[^<]*<\/title>|<meta\s+name="description"[^>]*>|<link\s+rel="canonical"[^>]*>/gi,'').replace('</head>',()=>metadata+'</head>'),{headers});
}
