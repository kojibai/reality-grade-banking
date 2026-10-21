// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
it('opens a retained asset in the shared public runtime and updates its metadata without a document request',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const request=vi.fn();vi.stubGlobal('fetch',request);history.replaceState({},'','/explore/');
 document.head.innerHTML='<title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/">';
 document.body.innerHTML='<div id="public-explore-root" data-public-runtime="explore"><main><h1>Explore</h1><a href="/asset/profile%3Aartist%3Asource/">Asset page</a></main></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/explore/':{runtime:'explore',entry:'/already-loaded.js',content:'<main>Explore</main>',head:'<title>Explore</title><meta name="description" content="Explore"><meta name="robots" content="index,follow"><meta property="og:title" content="Explore"><meta property="og:url" content="https://bankeiz.com/explore/"><link rel="canonical" href="https://bankeiz.com/explore/">'}},bank:{styles:[],head:'',entry:'/unused.js'}});document.body.append(data);
 try{new Function(readFileSync('public/learn/learn.js','utf8'))();const root=document.getElementById('public-explore-root');dispatchEvent(new CustomEvent('bankeiz:asset-metadata',{detail:{id:'profile:artist:source',title:'An original',description:'A moment.',oembed:'https://bankeiz.com/oembed?url=https%3A%2F%2Fbankeiz.com%2Fasset%2Fprofile%253Aartist%253Asource%2F',media:{'og:type':'music.song','twitter:card':'player','twitter:player':'https://bankeiz.com/asset/profile%3Aartist%3Asource/player/','twitter:player:width':1280,'twitter:player:height':376,'og:audio':'https://receiz.com/audio/song.mp3','og:audio:type':'audio/mpeg'}}}));document.querySelector<HTMLAnchorElement>('a')!.click();
 expect(location.pathname).toBe('/asset/profile%3Aartist%3Asource/');expect(document.title).toBe('An original | Bankeiz');expect(document.getElementById('public-explore-root')).toBe(root);expect(request).not.toHaveBeenCalled();
 expect(document.querySelector('meta[name="twitter:player"]')?.getAttribute('content')).toBe('https://bankeiz.com/asset/profile%3Aartist%3Asource/player/');
 expect(document.querySelector('meta[property="og:audio"]')?.getAttribute('content')).toBe('https://receiz.com/audio/song.mp3');expect(document.querySelector('link[type="application/json+oembed"]')).not.toBeNull();
 history.replaceState({},'','/explore/');dispatchEvent(new PopStateEvent('popstate'));
 expect(document.querySelector('meta[name="twitter:player"]')).toBeNull();expect(document.querySelector('link[type="application/json+oembed"]')).toBeNull();
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.documentElement.className='';}
});
