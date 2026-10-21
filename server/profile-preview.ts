import {profilePagePath,profilePageUsername,profileUsername,type PublicProfile} from '../src/receiz/public-profile.js';
import {readPublicProfile,PublicProfileError} from './public-profile.js';
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function profilePreviewHtml(html:string,username:string,profile:PublicProfile|null,error?:string){
 const name=profile?.displayName??'Profile',title=name+' | Bankeiz',description=profile?.bio??`Explore @${username}'s public assets and activity.`,canonical='https://bankeiz.com'+profilePagePath(username);
 const tags=`<title>${escape(title)}</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${profile?'index,follow,max-image-preview:large':'noindex,follow'}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="profile"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}">${profile?.bannerUrl||profile?.avatarUrl?`<meta property="og:image" content="${escape((profile.bannerUrl??profile.avatarUrl)!)}"><meta name="twitter:image" content="${escape((profile.bannerUrl??profile.avatarUrl)!)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}">`;
 const seed=profile?`<script id="public-profile-seed" type="application/json">${JSON.stringify(profile).replaceAll('<','\\u003c')}</script>`:error?`<script id="public-profile-error" type="application/json">${JSON.stringify({username,code:error,at:Date.now()})}</script>`:'';
 const navigationSeed=html.includes('<script id="receiz-navigation"');
 const initial=`<main class="public-entry-placeholder"><a href="/explore/">Explore</a><h1>${escape(name)}</h1><p>@${username}</p><p>${escape(description)}</p></main>`;
 return html.replace(/<title>[\s\S]*?<\/title>/gi,'').replace(/<meta\b[^>]*(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,'').replace(/<link\b[^>]*rel="canonical"[^>]*>/gi,'').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi,'')
 .replace('</head>',()=>tags+'</head>').replace(/(<div id="public-explore-root"[^>]*>)[\s\S]*?(<\/div>\s*(?:<noscript>[\s\S]*?<\/noscript>\s*)?<script id="receiz-navigation")/,(_whole,start,end)=>start+initial+end).replace(navigationSeed?'<script id="receiz-navigation"':'</body>',()=>seed+(navigationSeed?'<script id="receiz-navigation"':'</body>'));
}
type Dependencies={profile:typeof readPublicProfile;page():Promise<string>};
export async function handleProfilePreview(request:Request,deps?:Dependencies){
 const url=new URL(request.url),username=url.pathname.replace(/\/$/,'')==='/api/profile'?profileUsername(url.searchParams.get('username')):profilePageUsername(url.pathname),headers={'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8','Content-Disposition':'inline','X-Content-Type-Options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, HEAD'}});
 if(!username||url.hash||[...url.searchParams.keys()].some(key=>key!=='username'||url.searchParams.getAll(key).length!==1)||url.searchParams.has('username')&&url.searchParams.get('username')!==username)return new Response('Profile not found.',{status:404,headers});
 if(request.method==='HEAD')return new Response(null,{headers});
 const dependencies=deps??{profile:readPublicProfile,page:async()=>(await import('node:fs/promises')).readFile('dist/explore/index.html','utf8')};
 try{const profile=await dependencies.profile(username);return new Response(profilePreviewHtml(await dependencies.page(),username,profile),{headers});}
 catch(cause){const status=cause instanceof PublicProfileError?cause.status:503,code=status===403?'PROFILE_PRIVATE':status===404?'PROFILE_NOT_FOUND':'PROFILE_UNAVAILABLE';try{return new Response(profilePreviewHtml(await dependencies.page(),username,null,code),{status,headers});}catch{return new Response('This profile could not be opened. Please try again.',{status,headers});}}
}
