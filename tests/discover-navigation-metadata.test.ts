import {navigationScript,decodeNavigationEnvelope} from '../scripts/navigation-envelope.mjs';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {compactNavigation} from '../scripts/compact-navigation.mjs';
import {bankOwnedStyles} from '../scripts/public-bank-styles.mjs';
import {profileNavigationHtml} from '../server/profile-navigation';

const discoverHead='<title>Discover | Bankeiz</title><link rel="canonical" href="https://bankeiz.com/discover/"><style data-public-page-style="discover">.discover-shell{color:navy}</style>';
const feedHead='<title>Feed | Bankeiz</title><link rel="canonical" href="https://bankeiz.com/feed/"><style data-public-page-style="feed">.feed-stage{color:navy}</style>';
const vote={runtime:'vote',entry:'/assets/vote-held.js',title:'Public voting · Bankeiz',head:'<title>Public voting · Bankeiz</title>',content:'<main>Held Vote</main>'};
const pages={
 '/explore/':{runtime:'explore',entry:'/assets/explore-held.js',head:'<title>Explore</title>',content:'Held Explore body'},
 '/discover/':{runtime:'discover',entry:'/assets/discover-held.js',title:'Discover | Bankeiz',head:discoverHead,content:'<main>OLDER DISCOVER BODY</main><script id="public-discovery-seed">OLD CATALOG</script>'},
 '/feed/':{runtime:'feed',entry:'/assets/feed-held.js',head:feedHead,content:'Older Feed body'},
 '/vote/':vote,
 '/learn/guide/':{head:'<title>Guide</title><style>.guide{color:blue}</style>',content:'<main>Unvisited static guide</main>'},
};
const builder=readFileSync('scripts/build-public-pages.mjs','utf8');
const statement=(name:string)=>builder.split('\n').find(line=>line.startsWith(`const ${name}`))!;
const read=(html:string)=>decodeNavigationEnvelope(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]).navigation;
const expand=(value:unknown,styles:string[])=>Array.isArray(value)?value.map(part=>typeof part==='number'?styles[part]:part).join(''):value;
const bankStyles=['/assets/bank.css','/assets/public-host.css'],bankCss={'/assets/bank.css':'.console{display:grid}','/assets/public-host.css':'.form-field{display:grid}'};
const privateBankStyles=bankOwnedStyles(bankStyles,{host:{name:'PublicAssetTradeHost',file:'assets/public-host.js',css:['assets/public-host.css']}});

it('carries the existing small Discover body beside Bank while Feed stays lightweight',()=>{
 const builderStatements=['navigationPages=','bankRuntime=','navigation=','bundle=','bankBundle='].map(statement).join('\n');
 const [bundle,bankBundle]=new Function('navigationScript','publicPages','compactNavigation','feedState','publicRouteAliases','bankHead','bankEntry','bankStyles','privateBankStyles','bankCss','bankContent','exampleBanks',builderStatements+';return [bundle,bankBundle];')(navigationScript,pages,compactNavigation,{profileNames:[]},{},'<title>Bank</title>','/assets/bank-held.js',bankStyles,privateBankStyles,bankCss,'Frozen Bank content',{shared:''});
 const value=read(bundle),discover=value.pages['/discover/'];
 expect(discover).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',title:'Discover | Bankeiz'});
 expect(expand(discover.head,value.styles)).toBe(discoverHead);
 expect(expand(discover.content,value.styles)).toBe(pages['/discover/'].content);expect(value.pages['/feed/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',content:''});expect(expand(value.pages['/feed/'].head,value.styles)).toBe(feedHead);expect(bundle).not.toContain('Older Feed body');
 expect(expand(value.bank.content,value.styles)).toBe('Frozen Bank content');expect(expand(value.pages['/learn/guide/'].content,value.styles)).toBe('<main>Unvisited static guide</main>');
 expect(value.bank.styles).toEqual(['/assets/bank.css']);expect(Object.keys(value.bank.css)).toEqual(bankStyles);
 const home=read(bankBundle);
 expect(home.bank.css).toBeUndefined();expect(home.bank.styles).toEqual(value.bank.styles);
 expect(expand(home.pages['/discover/'].content,home.styles)).toBe(pages['/discover/'].content);
 expect(expand(home.pages['/vote/'].content,home.styles)).toBe(vote.content);
});

it('keeps the exact Discover descriptor in workspace metadata while static guide hashes stay compact',()=>{
 const value=new Function('publicPages','createHash','sharedExampleSha256',statement('navigationMetadata=')+';return navigationMetadata;')(pages,createHash,'a'.repeat(64));
 expect(value['/discover/']).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',head:discoverHead,content:pages['/discover/'].content});
 expect(value['/feed/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',head:feedHead,content:''});
 expect(value['/learn/guide/']).toMatchObject({content:'',head:'',headLength:53,headSha256:createHash('sha256').update(pages['/learn/guide/'].head).digest('hex'),contentSha256:createHash('sha256').update('<main>Unvisited static guide</main>').digest('hex')});
 expect(value['/discover/'].content).toBe(pages['/discover/'].content);
});

it('preserves a lightweight Discover runtime head losslessly through lean profile compaction',()=>{
 const input={styles:[discoverHead,feedHead],pages:{'/explore/':pages['/explore/'],'/search/':{...pages['/discover/'],head:[0]},'/watch/':{...pages['/feed/'],head:[1]},'/learn/guide/':pages['/learn/guide/']},bank:{head:'<title>Bank</title>',entry:'/assets/bank-held.js',content:'Frozen Bank content'}};
 const value=read(profileNavigationHtml('<script id="receiz-navigation" type="application/json">'+JSON.stringify(input).replaceAll('<','\\u003c')+'</script>'));
 expect(value.pages['/search/']).toMatchObject({runtime:'discover',entry:'/assets/discover-held.js',content:''});expect(expand(value.pages['/search/'].head,value.styles)).toBe(discoverHead);
 expect(value.pages['/watch/']).toMatchObject({runtime:'feed',entry:'/assets/feed-held.js',content:''});expect(expand(value.pages['/watch/'].head,value.styles)).toBe(feedHead);
 expect(value.pages['/learn/guide/']).toMatchObject({content:'',head:'',headSha256:expect.stringMatching(/^[a-f0-9]{64}$/)});expect(value.bank).toEqual(input.bank);
 expect(JSON.stringify(value)).not.toContain('OLDER DISCOVER BODY');expect(JSON.stringify(value)).not.toContain('OLD CATALOG');
});

it('carries Discover unchanged on a cold profile with no Bank family, while unrelated bodies remain compact',()=>{
 const html='<script id="receiz-navigation" type="application/json">'+JSON.stringify({pages,styles:[],bank:{entry:'/assets/bank.js',head:'<title>Bank</title>',content:'Frozen Bank content'}}).replaceAll('<','\\u003c')+'</script>';
 const value=read(profileNavigationHtml(html));
 expect(expand(value.pages['/discover/'].content,value.styles)).toBe(pages['/discover/'].content);
 expect(expand(value.pages['/discover/'].head,value.styles)).toBe(discoverHead);
 expect(expand(value.pages['/vote/'].content,value.styles)).toBe(vote.content);
 expect(expand(value.pages['/vote/'].head,value.styles)).toBe(vote.head);
 expect(value.pages['/discover/'].preparedBuild).toBeUndefined();expect(value.pages['/discover/'].preparedRevision).toBeUndefined();
 expect(value.pages['/learn/guide/'].content).toBe('');expect(value.bank.content).toBe('Frozen Bank content');
});

it('retains Discover metadata without duplicate body in immersive Feed and Discover documents, preserving global carried content',()=>{
 const metadata=new Function('publicPages','createHash','sharedExampleSha256',statement('navigationMetadata=')+';return navigationMetadata;')(pages,createHash,'a'.repeat(64));
 const workspaces={
  '/explore/':pages['/explore/'],
  '/ledger/':{runtime:'ledger',head:'<title>Ledger</title>',content:'Held ledger'},
  '/analytics/':{runtime:'ledger',head:'<title>Analytics</title>',content:'Held analytics'},
  '/vote/':vote,
 };
 for(const runtime of ['feed','discover']){
  const name=runtime+'Bundle';
  const line=builder.split('\n').find(row=>row.trimStart().startsWith('const '+name+'='))!;
  const html=new Function('page','compactNavigation','feedState','navigationMetadata','publicPages','bankHead','bankEntry','bankStyles','privateBankStyles','bankCss','bankContent','navigationScript','discoveryWorkspacePages',line+';return '+name+';')({runtime},compactNavigation,{profileNames:[]},metadata,pages,'<title>Bank</title>','/assets/bank.js',bankStyles,privateBankStyles,bankCss,'Frozen Bank',navigationScript,workspaces);
  const value=read(html);expect(value.pages['/discover/'].content).toBe('');expect(expand(value.pages['/discover/'].head,value.styles)).toBe(discoverHead);expect(value.pages['/discover/'].entry).toBe(pages['/discover/'].entry);
  expect(expand(value.pages['/explore/'].content,value.styles)).toBe(pages['/explore/'].content);
  if(runtime==='discover'){
   expect(expand(value.pages['/ledger/'].content,value.styles)).toBe('Held ledger');
   expect(expand(value.pages['/analytics/'].content,value.styles)).toBe('Held analytics');
   expect(expand(value.pages['/vote/'].content,value.styles)).toBe(vote.content);
  }else expect(value.pages['/vote/'].content).toBe('');
  expect(value.bank.styles).toEqual(['/assets/bank.css']);expect(Object.keys(value.bank.css)).toEqual(bankStyles);
 }
 expect(metadata['/discover/'].content).toBe(pages['/discover/'].content);
});
