import {bankMarkSvg} from '../branding/bank-mark.mjs';
import {isShareTrackingKey} from './share-tracking.js';
import {publicProfileSocialImage,profilePagePath,profilePageUsername,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
import {readPublicProfile,PublicProfileError} from './public-profile.js';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicReadingLinks} from './public-reading-links.js';
import {profileNavigationHtml} from './profile-navigation.js';
import {fullReceivingProfileName,fullReceivingProfilePath,readPublicProfileAlias} from './profile-alias.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function profilePageTemplate(html:string){return profileNavigationHtml(html).replace(/<script\b[^>]*>/gi,tag=>/\btype="module"/.test(tag)&&/\bsrc="(?:\/assets\/explore-[^"]+\.js|\/src\/public-explorer\/main\.tsx)"/.test(tag)&&! /\basync(?:\s|>)/.test(tag)?tag.replace('type="module"','type="module" async'):tag).replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*(?:rel="canonical"|data-public-reading="(?:html|text)")[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');}
export function profilePreviewHtml(html:string,username:string,profile:PublicProfile|null,error?:string,content?:string,carryFamily=false){
 const name=profile?.displayName??'Profile',title=name+' | Bankeiz',description=profile?.bio??`Explore @${username}'s public assets and activity.`,canonical='https://bankeiz.com'+profilePagePath(username);
 const socialImage=profile?publicProfileSocialImage(profile):null;
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${profile?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="profile"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">${socialImage?`<meta property="og:image" content="${escape(socialImage)}"><meta name="twitter:image" content="${escape(socialImage)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
 const seed=profile?`<script id="public-profile-seed" type="application/json">${JSON.stringify(profile).replaceAll('<','\\u003c')}</script>`:error?`<script id="public-profile-error" type="application/json">${JSON.stringify({username,code:error,at:Date.now()})}</script>`:'';
 const images=[...new Set([profile?.bannerUrl,profile?.avatarUrl,...(profile?.items.slice(0,2).map(item=>item.artworkUrl)??[])].filter((value):value is string=>!!value&&!value.startsWith('data:')))];
 const hints=images.map((src,index)=>`<link rel="preload" as="image" href="${escape(src)}" referrerpolicy="no-referrer"${src.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':''}${index<2?' fetchpriority="high"':''}>`).join('');
 const navigationSeed=html.includes('<script id="receiz-navigation"');
 // Only genuinely missing compiled profiles use the existing page chrome;
 // known profiles arrive as their actual HTML, without a transition screen.
 const initial=content??`<div class="console public-explorer is-profile"><header class="app-header"><a class="bank-home-mark" href="/" aria-label="Bankeiz home">${bankMarkSvg}</a><div class="header-tools"><a href="/discover/" class="icon-button" aria-label="Discover people and their work" title="Discover"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></a><a class="avatar explorer-account" href="/" aria-label="Open your account"><span class="profile-avatar" aria-hidden="true"><span>ID</span></span></a></div></header><main class="main-panel" id="explorer-main"><section class="public-profile-page"><header class="profile-hero"><h1>@${escape(username)}</h1></header></section></main></div>`;
 const family=carryFamily?html.match(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>/)?.[0]??'':'';
 const withoutSeed=html.replace(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>\s*/g,'');
 return profilePageTemplate(withoutSeed)
 .replace('</head>',()=>tags+hints+(profile?publicReadingLinks('profile',username):'')+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,end)=>(family?start.replace('>',` data-public-profile-entry="${username}"${content?' data-public-profile-rendered="true"':''}>`):start)+initial+end).replace(navigationSeed?'<script id="receiz-navigation"':'</body>',()=>family+seed+(navigationSeed?'<script id="receiz-navigation"':'</body>'));
}
export async function prepareProfileDocument(){const path=pathToFileURL(resolve('server/profile-runtime/profile-document.mjs')).href;return import(/* @vite-ignore */ path);}
export async function renderProfileDocument(profile:PublicProfile):Promise<string>{return(await prepareProfileDocument()).renderPublicProfile(profile);}
type Dependencies={profile:typeof readPublicProfile;page():Promise<string>;render?:(profile:PublicProfile)=>Promise<string>;prepareRender?:()=>Promise<unknown>;profileContent?:(username:string)=>Promise<string|null>;alias?:(username:string)=>Promise<string|null>};
export async function handleProfilePreview(request:Request,deps?:Dependencies){
 const url=new URL(request.url),username=url.pathname.replace(/\/$/,'')==='/api/profile'?profileUsername(url.searchParams.get('username'))??fullReceivingProfileName(url.searchParams.get('username')):profilePageUsername(url.pathname)??fullReceivingProfilePath(url.pathname),headers={'Cache-Control':'no-store, no-transform','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(!username||url.hash||[...url.searchParams.keys()].some(key=>!isShareTrackingKey(key)&&(key!=='username'||url.searchParams.getAll(key).length!==1))||url.searchParams.has('username')&&url.searchParams.get('username')!==username)return new Response('Profile not found.',{status:404,headers});
 const resolveAlias=async()=>{
  try{const canonical=await(deps?.alias??readPublicProfileAlias)(username);if(!canonical)return new Response('Profile not found.',{status:404,headers});
   if(canonical!==username){if(!profileUsername(canonical))throw Error('PROFILE_ALIAS_UNAVAILABLE');const tracking=new URLSearchParams([...url.searchParams].filter(([key])=>isShareTrackingKey(key))),suffix=tracking.size?'?'+tracking:'';return new Response(null,{status:307,headers:{...headers,Location:profilePagePath(canonical)+suffix}});}
   return null;
  }catch{return new Response('This profile could not be opened. Please try again.',{status:503,headers});}
 };
 if(request.method==='HEAD'){if(username.length===25)return await resolveAlias()??new Response(null,{status:404,headers});return new Response(null,{headers});}
 // Browser entry uses the complete existing document. Its public reader can
 // show local state immediately and resolve only missing metadata afterward.
 const browser=request.headers.get('accept')?.includes('text/html')&&!/bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack/i.test(request.headers.get('user-agent')??'');
 const dependencies:Dependencies=deps??{profile:readPublicProfile,
  // The held complete family opens synchronously with the static interface.
  // A visit does not check another server document before displaying it.
  page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8'),
  profileContent:async name=>{try{return await(await import('node:fs/promises')).readFile('server/profile-runtime/profile-pages/'+name+'.html','utf8');}catch{return null;}},
  render:renderProfileDocument,prepareRender:prepareProfileDocument};
 const compiled=browser?dependencies.profileContent?.(username).catch(()=>null):undefined;
 if(!browser&&fullReceivingProfileName(username)){const redirect=await resolveAlias();if(redirect)return redirect;}
 const renderer=browser?undefined:dependencies.prepareRender?.();void renderer?.catch(()=>{});
 const source=browser?null:dependencies.profile(username).then(async profile=>{await renderer;return {profile,content:await dependencies.render?.(profile),error:null};}).catch(error=>({profile:null,content:undefined,error}));
 let html:string;try{html=await dependencies.page();}catch{return new Response('This profile could not be opened. Please try again.',{status:503,headers});}
 if(!source){
  const content=await compiled,match=content?.match(/^<!-- bank\.profile\.document\.v1 ([a-f0-9]{64}) ([a-z0-9_]{3,24}) -->/),generation=html.match(/<script id="public-market-seed" type="application\/json">([^<]{1,512})/)?.[1].match(/"generation":"([a-f0-9]{64})"/)?.[1];
  const selected=match&&match[1]===generation&&match[2]===username?content!.slice(match[0].length):undefined;
  if(!selected&&fullReceivingProfileName(username)){const redirect=await resolveAlias();if(redirect)return redirect;}
  return new Response(profilePreviewHtml(html,username,null,undefined,selected,true),{headers});
 }
 // Crawlers keep one exact public profile, its rendered body and refusal status.
 const result=await source,status=result.error instanceof PublicProfileError?result.error.status:result.error?503:200,code=status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE';
 return new Response(profilePreviewHtml(html,username,result.profile,result.error?code:undefined,result.content),{status,headers});
}
