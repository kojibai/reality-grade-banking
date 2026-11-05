import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {compactNavigation} from '../scripts/compact-navigation.mjs';
import {profileNavigationHtml} from '../server/profile-navigation';

const discoverHead='<title>Discover | Bankeiz</title><link rel="canonical" href="https://bankeiz.com/discover/"><style data-public-page-style="discover">.discover-shell{color:navy}</style>';
const feedHead='<title>Feed | Bankeiz</title><link rel="canonical" href="https://bankeiz.com/feed/"><style data-public-page-style="feed">.feed-stage{color:navy}</style>';
const pages={
 '/explore/':{runtime:'explore',entry:'/assets/explore-held.js',head:'<title>Explore</title>',content:'Held Explore body'},
 '/discover/':{runtime:'discover',entry:'/assets/discover-held.js',title:'Discover | Bankeiz',head:discoverHead,content:'<main>OLDER DISCOVER BODY</main><script id="public-discovery-seed">OLD CATALOG</script>'},
 '/feed/':{runtime:'feed',entry:'/assets/feed-held.js',head:feedHead,content:'Older Feed body'},
 '/learn/guide/':{head:'<title>Guide</title><style>.guide{color:blue}</style>',content:'<main>Unvisited static guide</main>'},
};
const builder=readFileSync('scripts/build-public-pages.mjs','utf8');
const statement=(name:string)=>builder.split('\n').find(line=>line.startsWith(`const ${name}`))!;
const read=(html:string)=>JSON.parse(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]);
const expand=(value:unknown,styles:string[])=>Array.isArray(value)?value.map(part=>typeof part==='number'?styles[part]:part).join(''):value;

it('ships only existing Discover and Feed heads and module descriptors beside Bank and static guides',()=>{
 const bundle=new Function('publicPages','compactNavigation','feedState','publicRouteAliases','bankHead','bankEntry','bankStyles','bankCss','bankContent','exampleBanks',statement('bundle =')+';return bundle;')(pages,compactNavigation,{profileNames:[]},{},'<title>Bank</title>','/assets/bank-held.js',[],{},'Frozen Bank content',{shared:''});
 const value=read(bundle),discover=value.pages['/discover/'];
 expect(discover).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',title:'Discover | Bankeiz',content:''});
 expect(expand(discover.head,value.styles)).toBe(discoverHead);
 expect(bundle).not.toContain('OLDER DISCOVER BODY');expect(bundle).not.toContain('OLD CATALOG');expect(value.pages['/feed/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',content:''});expect(expand(value.pages['/feed/'].head,value.styles)).toBe(feedHead);expect(bundle).not.toContain('Older Feed body');
 expect(expand(value.bank.content,value.styles)).toBe('Frozen Bank content');expect(expand(value.pages['/learn/guide/'].content,value.styles)).toBe('<main>Unvisited static guide</main>');
});

it('keeps Discover and Feed styles in lightweight workspace metadata while static guide hashes stay compact',()=>{
 const value=new Function('publicPages','createHash','sharedExampleSha256',statement('navigationMetadata=')+';return navigationMetadata;')(pages,createHash,'a'.repeat(64));
 expect(value['/discover/']).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',head:discoverHead,content:''});
 expect(value['/feed/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',head:feedHead,content:''});
 expect(value['/learn/guide/']).toMatchObject({content:'',head:'',headLength:53,headSha256:createHash('sha256').update(pages['/learn/guide/'].head).digest('hex'),contentSha256:createHash('sha256').update('<main>Unvisited static guide</main>').digest('hex')});
 expect(JSON.stringify(value)).not.toContain('OLDER DISCOVER BODY');expect(JSON.stringify(value)).not.toContain('OLD CATALOG');
});

it('preserves a lightweight Discover runtime head losslessly through lean profile compaction',()=>{
 const input={styles:[discoverHead,feedHead],pages:{'/explore/':pages['/explore/'],'/search/':{...pages['/discover/'],head:[0]},'/watch/':{...pages['/feed/'],head:[1]},'/learn/guide/':pages['/learn/guide/']},bank:{head:'<title>Bank</title>',entry:'/assets/bank-held.js',content:'Frozen Bank content'}};
 const value=read(profileNavigationHtml('<script id="receiz-navigation" type="application/json">'+JSON.stringify(input).replaceAll('<','\\u003c')+'</script>'));
 expect(value.pages['/search/']).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',content:''});expect(expand(value.pages['/search/'].head,value.styles)).toBe(discoverHead);
 expect(value.pages['/watch/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',content:''});expect(expand(value.pages['/watch/'].head,value.styles)).toBe(feedHead);
 expect(value.pages['/learn/guide/']).toMatchObject({content:'',head:'',headSha256:expect.stringMatching(/^[a-f0-9]{64}$/)});expect(value.bank).toEqual(input.bank);
 expect(JSON.stringify(value)).not.toContain('OLDER DISCOVER BODY');expect(JSON.stringify(value)).not.toContain('OLD CATALOG');
});
