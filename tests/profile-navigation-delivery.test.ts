// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import {profilePreviewHtml} from '../server/profile-preview';
import {parsePublicProfile,publicProfileReservedNames} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';

const profile=parsePublicProfile(profileFixture(),'alexmorgan');
const explorerHead='<title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/"><style data-public-page-style="explore">.profile{color:navy}</style>';
const navigation={pages:{
 '/explore/':{runtime:'explore',entry:'/explore.js',head:[explorerHead],content:'<main>Explore public assets</main>'},
 '/feed/':{runtime:'feed',entry:'/feed.js',head:'<title>Feed</title>',content:'<main>For you</main>'},
 '/discover/':{runtime:'discover',entry:'/discover.js',head:'<title>Discover</title>',content:'<main>Discover</main>'},
 '/standards/':{head:[1],content:['<main><h1>Standards</h1>',2,'</main>']},
 '/legal/':{head:'<title>Legal</title>',content:'<main>Legal notices</main>'},
 '/learn/account-access/':{head:'<title>Identity & access</title>',content:'<main>Identity & access</main>'},
 '/schemas/':{head:'<title>Schemas</title>',content:'<main>'+('UNRELATED_GUIDE'.repeat(80_000))+'</main>'},
},aliases:{'/explorer/':'/explore/'},bank:{head:'<title>Bank</title>',entry:'/bank.js',content:'<main>Bank</main>',styles:['/bank.css'],css:{'/bank.css':[3]}},
 styles:['UNRELATED_STYLE'.repeat(60_000),'<title>Standards</title><style data-public-page-style="standards">.standard{color:blue}</style>','<a href="/alexmorgan/">Return to Alex</a>','.bank{color:navy}']};
const html='<html><head><title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/"></head><body><div id="public-explore-root" data-public-runtime="explore"><main>Old collection</main></div><script id="receiz-navigation" type="application/json">'+JSON.stringify(navigation).replaceAll('<','\\u003c')+'</script><template data-shared-example-views>'+('UNRELATED_EXAMPLE'.repeat(80_000))+'</template></body></html>';
const content='<main><h1>Alex Morgan</h1><input value="Retained search"><a href="/standards/">Standard</a><a href="/schemas/">Schemas</a></main>';
const rendered=()=>profilePreviewHtml(html,'alexmorgan',profile,undefined,content);
const readNavigation=(value:string)=>JSON.parse(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/.exec(value)![1]);
afterEach(()=>{document.body.innerHTML='';document.head.innerHTML='';history.replaceState({},'','/');vi.restoreAllMocks();});

it('carries the complete profile with its linked destinations instead of unrelated guides and walkthroughs',()=>{
 const result=rendered(),held=readNavigation(result);
 expect(result.length).toBeLessThan(30_000);
 expect(result).not.toContain('UNRELATED_GUIDE');expect(result).not.toContain('UNRELATED_STYLE');expect(result).not.toContain('UNRELATED_EXAMPLE');
 expect(Object.keys(held.pages).sort()).toEqual(Object.keys(navigation.pages).sort());
 expect(held.pages['/schemas/']).toMatchObject({content:'',head:'',contentSha256:expect.stringMatching(/^[a-f0-9]{64}$/),headSha256:expect.stringMatching(/^[a-f0-9]{64}$/)});
 expect(held.aliases).toEqual({'/explorer/':'/explore/'});
 expect(held.reserved).toEqual(expect.arrayContaining([...publicProfileReservedNames,'schemas']));
 const seed=JSON.parse(/<script id="public-profile-seed" type="application\/json">([\s\S]*?)<\/script>/.exec(result)![1]);
 expect(seed).toEqual(profile);expect(result).toContain(content);expect(result).toContain('Alex Morgan | Bankeiz');
 const decode=(value:unknown)=>Array.isArray(value)?value.map(part=>typeof part==='number'?held.styles[part]:part).join(''):value;
 expect(decode(held.pages['/standards/'].head)).toBe('<title>Standards</title><style data-public-page-style="standards">.standard{color:blue}</style>');
 expect(decode(held.pages['/standards/'].content)).toBe('<main><h1>Standards</h1><a href="/alexmorgan/">Return to Alex</a></main>');
 expect(decode(held.bank.css['/bank.css'])).toBe('.bank{color:navy}');
});

it('retains the same profile through its carried footer and routes known omitted bodies through the existing intent loader',async()=>{
 const result=rendered();history.replaceState({},'','/alexmorgan/');
 document.head.innerHTML=/<head>([\s\S]*?)<\/head>/.exec(result)![1];document.body.innerHTML=/<body>([\s\S]*?)<\/body>/.exec(result)![1];
 const root=document.getElementById('public-explore-root')!,input=root.querySelector('input'),open=vi.fn(),load=vi.fn().mockResolvedValue({init:()=>open}),scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
 new Function('loadModule',source.replaceAll('import(','loadModule('))(load);
 const schemas=root.querySelector<HTMLAnchorElement>('a[href="/schemas/"]')!;let intercepted:boolean|undefined;
 const observe=(event:Event)=>{intercepted=event.defaultPrevented;event.preventDefault();};document.addEventListener('click',observe);
 try{schemas.click();expect(intercepted).toBe(true);await Promise.resolve();expect(load).toHaveBeenCalledExactlyOnceWith('/learn/discover.js');expect(open).toHaveBeenCalledOnce();expect(open.mock.calls[0][0].pathname).toBe('/schemas/');expect(location.pathname).toBe('/alexmorgan/');}finally{document.removeEventListener('click',observe);}
 root.querySelector<HTMLAnchorElement>('a[href="/standards/"]')!.click();
 expect(location.pathname).toBe('/standards/');expect(document.querySelector('#public-learn-root h1')?.textContent).toBe('Standards');
 expect(document.querySelector('style[data-public-page-style="standards"]')?.textContent).toBe('.standard{color:blue}');
 document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
 expect(location.pathname).toBe('/alexmorgan/');expect(document.getElementById('public-explore-root')).toBe(root);expect(root.querySelector('input')).toBe(input);expect(input?.value).toBe('Retained search');expect(root.hidden).toBe(false);
 expect(load).toHaveBeenCalledOnce();scroll.mockRestore();
});
