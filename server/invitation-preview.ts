import type {ReceivingInvitation} from '../src/adoption/invitation';
import {readInvitationSnapshot} from '../src/adoption/invitation-snapshot';

const origin='https://bankeiz.com',hex=/^[a-f0-9]{64}$/;
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const clean=(value:string)=>value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
export function invitationPreviewText(invitation:ReceivingInvitation){
 const recipient=clean(invitation.recipientName??''),sender=clean(invitation.senderName??'');
 return{title:recipient?`${recipient}, your receiving invitation | Bankeiz`:'Your receiving invitation | Bankeiz',description:sender?`A receiving invitation from ${sender}. Choose your receiving path and keep the proof connected.`:'Choose your receiving path and keep the proof connected.',alt:recipient?`A receiving invitation for ${recipient}${sender?' from '+sender:''}.`:'Your receiving invitation.'};
}
function attributes(value:string,hidden:boolean){const attributes=value.replace(/\s+hidden(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?(?=\s|$)/g,'');return attributes+(hidden?' hidden':'');}
function leaf(html:string,tag:string,key:string,text:string,additional=''){
 return html.replace(new RegExp(`<${tag}\\b([^>]*\\bdata-receiving-${key}(?=\\s|=|>)[^>]*)>[\\s\\S]*?<\\/${tag}>`),(_match,attrs:string)=>`<${tag}${attributes(attrs,!text)}${additional}>${escape(text)}</${tag}>`);
}
/** Render the exact accepted public display capture. It supplies presentation,
 * never identity, payment, receiving capability or financial authority. */
export function invitationPreviewHtml(template:string,invitation:ReceivingInvitation,digest:string){
 if(!hex.test(digest))throw Error('INVITATION_INVALID');
 const canonical=`${origin}/invitation/${digest}/`,image=canonical+'og.png',text=invitationPreviewText(invitation);
 const tags=`<title>${escape(text.title)}</title><meta name="description" content="${escape(text.description)}"><meta name="robots" content="noindex,nofollow,max-image-preview:large"><meta name="referrer" content="no-referrer"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:site_name" content="Bankeiz"><meta property="og:title" content="${escape(text.title)}"><meta property="og:description" content="${escape(text.description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1730"><meta property="og:image:height" content="909"><meta property="og:image:alt" content="${escape(text.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(text.title)}"><meta name="twitter:description" content="${escape(text.description)}"><meta name="twitter:image" content="${image}"><meta name="twitter:image:alt" content="${escape(text.alt)}">`;
 let html=template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name|property)\s*=\s*["'](?:description|robots|referrer|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'').replace(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi,'').replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'').replace(/<\/head>/i,()=>tags+'</head>');
 html=html.replace(/<section\b([^>]*\bdata-receiving-entry(?=\s|=|>)[^>]*)>/,(_match,attrs:string)=>`<section${attributes(attrs,true)}>`).replace(/<section\b([^>]*\bdata-receiving-invitation(?=\s|=|>)[^>]*)>/,(_match,attrs:string)=>`<section${attributes(attrs,false)}>`);
 html=leaf(html,'p','recipient',invitation.recipientName?'Prepared for '+invitation.recipientName:'');html=leaf(html,'p','sender',invitation.senderName?'From '+invitation.senderName:'');html=leaf(html,'p','message',invitation.message);
 html=leaf(html,'a','sender-profile',invitation.senderUsername?'View @'+invitation.senderUsername+'’s profile':'',invitation.senderUsername?` href="/u/${escape(invitation.senderUsername)}/"`:'');
 const rows:Array<[string,string]>=[];
 if(invitation.amountUsdCents){const cents=BigInt(invitation.amountUsdCents);rows.push(['Proposed payment','$'+(cents/100n).toLocaleString('en-US')+'.'+String(cents%100n).padStart(2,'0')]);}
 if(invitation.purpose)rows.push(['Purpose',invitation.purpose]);if(invitation.institution)rows.push(['Institution',invitation.institution.name]);
 html=html.replace(/<dl\b([^>]*\bdata-receiving-details(?=\s|=|>)[^>]*)>[\s\S]*?<\/dl>/,(_match,attrs:string)=>`<dl${attributes(attrs,!rows.length)}>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`);
 html=leaf(html,'p','institution-context',invitation.institution?'Receiving context: '+invitation.institution.name:'');
 if(invitation.institution)html=html.replace(/<input\b([^>]*\bdata-receiving-institution-name(?=\s|=|>)[^>]*)>/,(_match,attrs:string)=>`<input${attrs.replace(/\svalue="[^"]*"/g,'')} value="${escape(invitation.institution!.name)}">`);
 const seed=`<script type="application/json" id="receiving-invitation-snapshot" data-digest="${digest}">${JSON.stringify(invitation).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>`;
 return html.replace(/<script id="receiz-navigation"|<\/body>/i,match=>seed+match);
}
type Dependencies={read(digest:string):Promise<ReceivingInvitation>;page():Promise<string>;image(invitation:ReceivingInvitation):Promise<Uint8Array>};
export async function handleInvitationPreview(request:Request,dependencies?:Partial<Dependencies>):Promise<Response>{
 const headers=new Headers({'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});
 if(!['GET','HEAD'].includes(request.method)){headers.set('Allow','GET, HEAD');return new Response(null,{status:405,headers});}
 const url=new URL(request.url),match=/^\/invitation\/([a-f0-9]{64})(\/og\.png|\/?)$/.exec(url.pathname),api=url.pathname==='/api/invitation',selected=url.searchParams.get('digest'),digest=match?.[1]??(api?selected:null),image=match?.[2]==='/og.png'||url.searchParams.get('image')==='1';
 if(!digest||!hex.test(digest)||url.hash||selected!==null&&selected!==digest||[...url.searchParams.keys()].some(key=>!['digest','image'].includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.has('image')&&url.searchParams.get('image')!=='1')return new Response(null,{status:400,headers});
 headers.set('Content-Type',image?'image/png':'text/html; charset=utf-8');
 if(request.method==='HEAD')return new Response(null,{headers});
 const deps:Dependencies={read:dependencies?.read??readInvitationSnapshot,page:dependencies?.page??(async()=>(await import('node:fs/promises')).readFile('dist/invitation/index.html','utf8')),image:dependencies?.image??(async(invitation:ReceivingInvitation)=>(await import('./invitation-share-art')).renderInvitationImage(invitation))};
 try{
  const invitation=await deps.read(digest);
  if(image){const bytes=await deps.image(invitation);headers.set('Cache-Control','public, max-age=31536000, immutable');return new Response(bytes as Uint8Array<ArrayBuffer>,{headers});}
  const html=invitationPreviewHtml(await deps.page(),invitation,digest);headers.set('Cache-Control','public, max-age=60, s-maxage=300');return new Response(html,{headers});
 }catch(cause){headers.set('Content-Type','text/plain; charset=utf-8');return new Response(cause instanceof Error&&cause.message==='INVITATION_NOT_FOUND'?'Invitation not found.':'This receiving invitation is temporarily unavailable.',{status:cause instanceof Error&&cause.message==='INVITATION_NOT_FOUND'?404:503,headers});}
}
