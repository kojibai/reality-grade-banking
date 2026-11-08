import {bankMarkSvg} from '../branding/bank-mark.mjs';
import {isShareTrackingKey} from './share-tracking.js';
import {publicProfileSocialImage,profilePagePath,profilePageUsername,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
import {readPublicProfile,PublicProfileError} from './public-profile.js';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {publicReadingLinks} from './public-reading-links.js';
import {profileNavigationHtml} from './profile-navigation.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function profilePageTemplate(html:string){return profileNavigationHtml(html).replace(/<script\b[^>]*>/gi,tag=>/\btype="module"/.test(tag)&&/\bsrc="(?:\/assets\/explore-[^"]+\.js|\/src\/public-explorer\/main\.tsx)"/.test(tag)&&! /\basync(?:\s|>)/.test(tag)?tag.replace('type="module"','type="module" async'):tag).replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*(?:rel="canonical"|data-public-reading="(?:html|text)")[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');}
// This first-frame shell is present before module/CSS delivery. It never
// hides content, waits for a timer, or delays mounting the held profile.
const profileOpeningStyle=`<style data-profile-opening-style>
[data-profile-opening]{box-sizing:border-box;display:grid;grid-template-rows:40px 1fr 40px;min-height:100dvh;max-width:1160px;margin:0 auto;padding:28px 24px;background:#FCFBF8;color:#172B45;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
[data-profile-opening] *{box-sizing:border-box}[data-profile-opening] nav{display:flex;align-items:center;justify-content:space-between;min-height:40px;gap:24px}[data-profile-opening] a{color:#244DCB;font-size:14px;text-decoration:none}[data-profile-opening] a:focus-visible{outline:3px solid #809df0;outline-offset:4px}[data-profile-opening] .profile-opening-brand{display:inline-flex;color:#172B45}[data-profile-opening] svg{width:34px;height:34px}
[data-profile-opening] section{align-self:center;width:100%;max-width:440px;margin:40px auto;text-align:center}[data-profile-opening] .profile-opening-emblem{position:relative;display:grid;place-items:center;width:104px;height:104px;margin:0 auto 42px;border:1px solid #ceddf5;border-radius:32px;background:linear-gradient(145deg,#fff 3%,#f3f7ff 48%,#dce9ff);box-shadow:inset 0 1px 1px #fff,0 16px 44px #244dcb12;color:#244DCB}
[data-profile-opening] .profile-opening-emblem:before{content:"";position:absolute;inset:-12px;border:1px solid #e5ebf7;border-radius:42px}[data-profile-opening] .profile-opening-emblem:after{content:"";position:absolute;inset:-25px;border:1px solid #eff1f6;border-radius:54px}[data-profile-opening] .profile-opening-emblem svg{width:52px;height:52px;filter:drop-shadow(0 2px 0 #ffffff)}
[data-profile-opening] .profile-opening-label{margin:0 0 12px;color:#8797af;font-size:10px;line-height:1.5;letter-spacing:2.6px;font-weight:600;text-transform:uppercase}[data-profile-opening] p{margin:18px auto 0;max-width:300px;font-size:14px;line-height:1.65;color:#667386;overflow-wrap:anywhere}
[data-profile-opening] .profile-opening-handle{display:inline-block;max-width:100%;margin-top:0;padding:5px 13px;border:1px solid #e3e9f4;border-radius:30px;background:#f5f7fb;color:#5b7192;font-size:13px;line-height:1.5}
@media(prefers-reduced-motion:no-preference){[data-profile-opening] .profile-opening-emblem{animation:profile-opening-arrive 180ms cubic-bezier(.2,.8,.2,1)}}
@keyframes profile-opening-arrive{from{transform:translateY(2px) scale(.98);box-shadow:inset 0 1px 1px #fff,0 8px 24px #244dcb08}to{transform:none;box-shadow:inset 0 1px 1px #fff,0 16px 44px #244dcb12}}
@media(min-width:720px){[data-profile-opening]{min-height:calc(100dvh - 32px);margin:16px auto;border-radius:24px;padding:36px 44px}}
</style>`;
export function profilePreviewHtml(html:string,username:string,profile:PublicProfile|null,error?:string,content?:string,carryFamily=false){
 const name=profile?.displayName??'Profile',title=name+' | Bankeiz',description=profile?.bio??`Explore @${username}'s public assets and activity.`,canonical='https://bankeiz.com'+profilePagePath(username);
 const socialImage=profile?publicProfileSocialImage(profile):null;
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${profile?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="profile"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">${socialImage?`<meta property="og:image" content="${escape(socialImage)}"><meta name="twitter:image" content="${escape(socialImage)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
 const seed=profile?`<script id="public-profile-seed" type="application/json">${JSON.stringify(profile).replaceAll('<','\\u003c')}</script>`:error?`<script id="public-profile-error" type="application/json">${JSON.stringify({username,code:error,at:Date.now()})}</script>`:'';
 const images=[...new Set([profile?.bannerUrl,profile?.avatarUrl,...(profile?.items.slice(0,2).map(item=>item.artworkUrl)??[])].filter((value):value is string=>!!value&&!value.startsWith('data:')))];
 const hints=images.map((src,index)=>`<link rel="preload" as="image" href="${escape(src)}" referrerpolicy="no-referrer"${src.includes('/api/proof-material/packages/')?' crossorigin="anonymous"':''}${index<2?' fetchpriority="high"':''}>`).join('');
 const navigationSeed=html.includes('<script id="receiz-navigation"');
 const initial=content??`<main class="public-entry-placeholder" data-profile-opening><nav aria-label="Profile navigation"><a class="profile-opening-brand" href="/" aria-label="Bankeiz home">${bankMarkSvg}</a><a href="/explore/">Explore</a></nav><section><div class="profile-opening-emblem" aria-hidden="true">${bankMarkSvg}</div><h1 class="profile-opening-label">${escape(profile?name:'Public profile')}</h1><p class="profile-opening-handle">@${escape(username)}</p><p>${escape(profile?description:'Originals and public activity.')}</p></section></main>`;
 const family=carryFamily?html.match(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>/)?.[0]??'':'';
 const withoutSeed=html.replace(/<script id="public-market-seed" type="application\/json">[\s\S]*?<\/script>\s*/g,'');
 return profilePageTemplate(withoutSeed)
 .replace('</head>',()=>tags+hints+(content===undefined?profileOpeningStyle:'')+(profile?publicReadingLinks('profile',username):'')+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,end)=>(family?start.replace('>',` data-public-profile-entry="${username}">`):start)+initial+end).replace(navigationSeed?'<script id="receiz-navigation"':'</body>',()=>family+seed+(navigationSeed?'<script id="receiz-navigation"':'</body>'));
}
export async function prepareProfileDocument(){const path=pathToFileURL(resolve('server/profile-runtime/profile-document.mjs')).href;return import(/* @vite-ignore */ path);}
export async function renderProfileDocument(profile:PublicProfile):Promise<string>{return(await prepareProfileDocument()).renderPublicProfile(profile);}
type Dependencies={profile:typeof readPublicProfile;page():Promise<string>;render?:(profile:PublicProfile)=>Promise<string>;prepareRender?:()=>Promise<unknown>};
export async function handleProfilePreview(request:Request,deps?:Dependencies){
 const url=new URL(request.url),username=url.pathname.replace(/\/$/,'')==='/api/profile'?profileUsername(url.searchParams.get('username')):profilePageUsername(url.pathname),headers={'Cache-Control':'no-store, no-transform','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(!username||url.hash||[...url.searchParams.keys()].some(key=>!isShareTrackingKey(key)&&(key!=='username'||url.searchParams.getAll(key).length!==1))||url.searchParams.has('username')&&url.searchParams.get('username')!==username)return new Response('Profile not found.',{status:404,headers});
 if(request.method==='HEAD')return new Response(null,{headers});
 // Browser entry uses the complete existing document. Its public reader can
 // show local state immediately and resolve only missing metadata afterward.
 const browser=request.headers.get('accept')?.includes('text/html')&&!/bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegram|discord|slack/i.test(request.headers.get('user-agent')??'');
 const dependencies:Dependencies=deps??{profile:readPublicProfile,
  // The held complete family opens synchronously with the static interface.
  // A visit does not check another server document before displaying it.
  page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8'),
  render:renderProfileDocument,prepareRender:prepareProfileDocument};
 const renderer=browser?undefined:dependencies.prepareRender?.();void renderer?.catch(()=>{});
 const source=browser?null:dependencies.profile(username).then(async profile=>{await renderer;return {profile,content:await dependencies.render?.(profile),error:null};}).catch(error=>({profile:null,content:undefined,error}));
 let html:string;try{html=await dependencies.page();}catch{return new Response('This profile could not be opened. Please try again.',{status:503,headers});}
 if(!source)return new Response(profilePreviewHtml(html,username,null,undefined,undefined,true),{headers});
 // Crawlers keep one exact public profile, its rendered body and refusal status.
 const result=await source,status=result.error instanceof PublicProfileError?result.error.status:result.error?503:200,code=status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE';
 return new Response(profilePreviewHtml(html,username,result.profile,result.error?code:undefined,result.content),{status,headers});
}
