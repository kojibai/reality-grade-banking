import {isShareTrackingKey} from './share-tracking.js';
import {publicProfileSocialImage,profilePagePath,profilePageUsername,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
import {readPublicProfile,PublicProfileError} from './public-profile.js';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicReadingLinks} from './public-reading-links.js';
import {profileNavigationHtml} from './profile-navigation.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function profilePageTemplate(html:string){return profileNavigationHtml(html).replace(/<script\b[^>]*>/gi,tag=>/\btype="module"/.test(tag)&&/\bsrc="(?:\/assets\/explore-[^"]+\.js|\/src\/public-explorer\/main\.tsx)"/.test(tag)&&! /\basync(?:\s|>)/.test(tag)?tag.replace('type="module"','type="module" async'):tag).replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*(?:rel="canonical"|data-public-reading="(?:html|text)")[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');}
export function profilePreviewHtml(html:string,username:string,profile:PublicProfile|null,error?:string,content?:string){
 const name=profile?.displayName??'Profile',title=name+' | Bankeiz',description=profile?.bio??`Explore @${username}'s public assets and activity.`,canonical='https://bankeiz.com'+profilePagePath(username);
 const socialImage=profile?publicProfileSocialImage(profile):null;
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${profile?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="profile"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">${socialImage?`<meta property="og:image" content="${escape(socialImage)}"><meta name="twitter:image" content="${escape(socialImage)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
 const seed=profile?`<script id="public-profile-seed" type="application/json">${JSON.stringify(profile).replaceAll('<','\\u003c')}</script>`:error?`<script id="public-profile-error" type="application/json">${JSON.stringify({username,code:error,at:Date.now()})}</script>`:'';
 const images=[...new Set([profile?.bannerUrl,profile?.avatarUrl,...(profile?.items.slice(0,2).map(item=>item.artworkUrl)??[])].filter((value):value is string=>!!value&&!value.startsWith('data:')))];
 const hints=images.map((src,index)=>`<link rel="preload" as="image" href="${escape(src)}" referrerpolicy="no-referrer"${src.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':''}${index<2?' fetchpriority="high"':''}>`).join('');
 const navigationSeed=html.includes('<script id="receiz-navigation"');
 const initial=content??`<main class="public-entry-placeholder"><a href="/explore/">Explore</a><h1>${escape(name)}</h1><p>@${username}</p><p>${escape(description)}</p></main>`;
 return profilePageTemplate(html)
 .replace('</head>',()=>tags+hints+(profile?publicReadingLinks('profile',username):'')+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,end)=>start+initial+end).replace(navigationSeed?'<script id="receiz-navigation"':'</body>',()=>seed+(navigationSeed?'<script id="receiz-navigation"':'</body>'));
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
 // Browser entry uses the complete existing document. Its public reader can
 // show local state immediately and resolve only missing metadata afterward.
 const browser=request.headers.get('accept')?.includes('text/html')&&!/bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack/i.test(request.headers.get('user-agent')??'');
 const renderer=browser?undefined:dependencies.prepareRender?.();void renderer?.catch(()=>{});
 const source=browser?null:dependencies.profile(username).then(async profile=>{await renderer;return {profile,content:await dependencies.render?.(profile),error:null};}).catch(error=>({profile:null,content:undefined,error}));
 let html:string;try{html=await dependencies.page();}catch{return new Response('This profile could not be opened. Please try again.',{status:503,headers});}
 if(!source)return new Response(profilePreviewHtml(html,username,null),{headers});
 // Crawlers keep one exact public profile, its rendered body and refusal status.
 const result=await source,status=result.error instanceof PublicProfileError?result.error.status:result.error?503:200,code=status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE';
 return new Response(profilePreviewHtml(html,username,result.profile,result.error?code:undefined,result.content),{status,headers});
}
