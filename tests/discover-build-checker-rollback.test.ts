import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {compactNavigation} from '../scripts/compact-navigation.mjs';
import {decodeNavigationEnvelope,navigationScript} from '../scripts/navigation-envelope.mjs';
const source=readFileSync('scripts/check-public-pages.mjs','utf8'),start=source.indexOf('const feedNavigationPacket='),end=source.indexOf('assert.ok(feedNavigation.reserved',start);
assert.ok(start>=0&&end>start,'The test must execute the production Feed navigation assertions.');
const check=new Function('assert','feedDocument','navigationPattern','navigation','decodeNavigationEnvelope',source.slice(start,end));
const discover={runtime:'discover',entry:'/assets/discover-static.js',title:'Discover | Bankeiz',head:'<title>Discover | Bankeiz</title><style>.discover-shell{color:navy}</style>',content:'<main>Carried static Discover</main><script id="public-discovery-seed" type="application/json">[]</script>'};
const pages={'/explore/':{runtime:'explore',head:'<title>Explore</title>',content:'Held Explore'},'/feed/':{runtime:'feed',head:'<title>Feed</title>',content:''},'/discover/':discover,'/learn/':{head:'',headSha256:'a'.repeat(64),content:'',contentSha256:'b'.repeat(64)}};
function run(overrides:Record<string,unknown>={}){const feed=compactNavigation({pages:{...pages,'/discover/':{...discover,content:''},...overrides},bank:{head:'<title>Bank</title>',content:'Frozen Bank'}});return check(assert,navigationScript(feed),/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/,{pages},decodeNavigationEnvelope);}
it('accepts exact Discover metadata in immersive Feed without duplicating the globally carried static body',()=>{expect(()=>run()).not.toThrow();});
it('refuses duplicated Discover content or changed CSS and entry metadata',()=>{for(const entry of [{...discover},{...discover,content:discover.content+'CHANGED'},{...discover,content:'',head:discover.head+'CHANGED'},{...discover,content:'',entry:'/assets/discover-other.js'}])expect(()=>run({'/discover/':entry})).toThrow();});
it('still rejects an unrelated carried guide body and a duplicated current Feed body',()=>{expect(()=>run({'/learn/':{...pages['/learn/'],content:'Unexpected duplicate'}})).toThrow();expect(()=>run({'/feed/':{...pages['/feed/'],content:'Duplicated Feed'}})).toThrow();});
