import {isShareTrackingKey} from './share-tracking.js';
import {profilePagePath,profilePageUsername,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
import {readPublicProfile,PublicProfileError} from './public-profile.js';
import {publicProfileArtwork} from '../src/content/public-asset-titles.js';
import {safeReceizArtworkUrl} from '../src/receiz/public-market.js';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function profilePageTemplate(html:string){return html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');}
export function profilePreviewHtml(html:string,username:string,profile:PublicProfile|null,error?:string,content?:string){
 const name=profile?.displayName??'Profile',title=name+' | Bankeiz',description=profile?.bio??`Explore @${username}'s public assets and activity.`,canonical='https://bankeiz.com'+profilePagePath(username);
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${profile?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="profile"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">${profile?.bannerUrl||profile?.avatarUrl?`<meta property="og:image" content="${escape((profile.bannerUrl??profile.avatarUrl)!)}"><meta name="twitter:image" content="${escape((profile.bannerUrl??profile.avatarUrl)!)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
 const seed=profile?`<script id="public-profile-seed" type="application/json">${JSON.stringify(profile).replaceAll('<','\\u003c')}</script>`:error?`<script id="public-profile-error" type="application/json">${JSON.stringify({username,code:error,at:Date.now()})}</script>`:'';
 const images=[...new Set([profile?.bannerUrl,profile?.avatarUrl,...(profile?.items.slice(0,4).map(item=>item.artworkUrl)??[])].filter((value):value is string=>!!value))];
 const hints=images.map((src,index)=>`<link rel="preload" as="image" href="${escape(src)}" referrerpolicy="no-referrer"${src.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':''}${index<2?' fetchpriority="high"':''}>`).join('');
 const navigationSeed=html.includes('<script id="receiz-navigation"');
 const initial=content??`<main class="public-entry-placeholder"><a href="/explore/">Explore</a><h1>${escape(name)}</h1><p>@${username}</p><p>${escape(description)}</p></main>`;
 return profilePageTemplate(html)
 .replace('</head>',()=>tags+hints+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,end)=>start+initial+end).replace(navigationSeed?'<script id="receiz-navigation"':'</body>',()=>seed+(navigationSeed?'<script id="receiz-navigation"':'</body>'));
}
export async function prepareProfileDocument(){const path=pathToFileURL(resolve('server/profile-runtime/profile-document.mjs')).href;return import(path);}
export async function renderProfileDocument(profile:PublicProfile):Promise<string>{return(await prepareProfileDocument()).renderPublicProfile(profile);}
type Dependencies={profile:typeof readPublicProfile;page():Promise<string>;render?:(profile:PublicProfile)=>Promise<string>;prepareRender?:()=>Promise<unknown>};
export async function handleProfilePreview(request:Request,deps?:Dependencies){
 const url=new URL(request.url),username=url.pathname.replace(/\/$/,'')==='/api/profile'?profileUsername(url.searchParams.get('username')):profilePageUsername(url.pathname),headers={'Cache-Control':'no-store, no-transform','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(!username||url.hash||[...url.searchParams.keys()].some(key=>!isShareTrackingKey(key)&&(key!=='username'||url.searchParams.getAll(key).length!==1))||url.searchParams.has('username')&&url.searchParams.get('username')!==username)return new Response('Profile not found.',{status:404,headers});
 if(request.method==='HEAD')return new Response(null,{headers});
 const dependencies=deps??{profile:readPublicProfile,page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8'),render:renderProfileDocument,prepareRender:prepareProfileDocument};
 // Start independent reads together. Settle the rejection immediately so a
 // source refusal cannot become unhandled while the static document is read.
 const renderer=dependencies.prepareRender?.();void renderer?.catch(()=>{});
 const source=dependencies.profile(username).then(async profile=>{await renderer;return {profile,content:await dependencies.render?.(profile),error:null};}).catch(error=>({profile:null,content:undefined,error}));
 let html:string;try{html=await dependencies.page();}catch{return new Response('This profile could not be opened. Please try again.',{status:503,headers});}
 const render=(result:Awaited<typeof source>)=>{const status=result.error instanceof PublicProfileError?result.error.status:result.error?503:200,code=status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE';return {status,html:profilePreviewHtml(html,username,result.profile,result.error?code:undefined,result.content)};};
 const browser=request.headers.get('accept')?.includes('text/html')&&!/bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack/i.test(request.headers.get('user-agent')??'');
 if(!browser){const result=render(await source);return new Response(result.html,{status:result.status,headers});}
 // Stream only the settled static head before the source arrives. This starts
 // CSS/module downloads immediately, with no fabricated profile or second read.
 // Exact metadata, public seed and body follow within this same document.
 const template=profilePageTemplate(html),end=template.indexOf('</head>');
 if(end<0){const result=render(await source);return new Response(result.html,{status:result.status,headers});}
 const prefix=template.slice(0,end),encoder=new TextEncoder();let closed=false;
 // Known public Market media can prepare during the profile read. These hints
 // confer no identity/visibility authority and are never painted as a profile.
 const earlyImages=(publicProfileArtwork[username]??[]).slice(0,4).map(safeReceizArtworkUrl).filter((url):url is string=>!!url);
 const earlyHints=earlyImages.map(src=>`<link rel="preload" as="image" href="${escape(src)}" referrerpolicy="no-referrer"${src.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':''}>`).join('');
 return new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(encoder.encode(prefix+earlyHints));void source.then(value=>{if(closed)return;controller.enqueue(encoder.encode(render(value).html.slice(prefix.length)));controller.close();closed=true;}).catch(()=>{if(!closed){closed=true;controller.error(Error('Profile stream interrupted.'));}});},cancel(){closed=true;}}),{headers:{...headers,'X-Accel-Buffering':'no'}});
}
