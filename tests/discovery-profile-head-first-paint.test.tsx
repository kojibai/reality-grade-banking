import {expect,it,vi} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderDiscoveryState} from '../scripts/discover-page.mjs';
import {publicProfileHeadThumbnails} from '../scripts/public-owner-thumbnails.mjs';
import {publicProfileAvatar} from '../src/receiz/profile-artwork';
import {Discover} from '../src/public-discover/Discover';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicOwnerSealAvatar} from '../src/public-explorer/PublicOwnerAvatar';
import {buildDiscoveryIndex,orderDiscoveryItems} from '../src/public-discover/discovery-index';
import sharp from 'sharp';
const head=(i:number)=>({profile:{userId:'owner-'+i,username:'person_'+i,displayName:'Person '+i,isPrivate:false,createdAt:'2026-11-09T13:00:00Z',avatarUrl:null},viewer:{canView:true},stats:{originals:0,originalViews:0,streams:0,witnessedSeconds:0,streamCompletionRatePct:0}});
it('the actual Discover writer keeps eighty-two profiles while rendering twenty header-only people with bounded local portraits and no request',async()=>{
 const pixels=Buffer.alloc(192*192*3);
 let value=314159;
 for(let i=0;i<pixels.length;i++){value=(Math.imul(value,1664525)+1013904223)>>>0;pixels[i]=value>>>24;}
 const portrait='data:image/png;base64,'+(await sharp(pixels,{raw:{width:192,height:192,channels:3}}).png().toBuffer()).toString('base64');
 expect(portrait.length).toBeGreaterThan(88_607);
 const heads=Array.from({length:82},(_,i)=>head(i));
 Object.assign(heads[0].profile,{avatarUrl:portrait});
 const membership={ok:true,transport:{publicMembership:{version:1,source:'canonical-complete',scope:'whole-market-visible-showcase',isComplete:true,itemCount:1,revision:'held'},publicOriginals:[{id:'one',receizId:'one',title:'Existing Original',profileOriginal:{media:null}}],publicProfileHeads:heads}};
 const before=JSON.stringify(membership),fetcher=vi.fn(()=>{throw Error('No network belongs in first paint');});vi.stubGlobal('fetch',fetcher);
 const previous=process.cwd(),root=await mkdtemp(join(tmpdir(),'discover-header-paint-'));
 const modules={'/src/public-discover/Discover.tsx':{Discover},'/src/public-discover/discovery-index.ts':{orderDiscoveryItems,buildDiscoveryIndex},'/src/receiz/public-market.ts':{parsePublicMarket},'/src/public-explorer/PublicOwnerAvatar.tsx':{publicOwnerSealAvatar},'/src/receiz/profile-artwork.ts':{publicProfileAvatar}};
 try{
  await mkdir(join(root,'public'));await writeFile(join(root,'public/receiz-public-market.json'),before);process.chdir(root);
  const prepared=await renderDiscoveryState({ssrLoadModule:async(path:string)=>{expect(path in modules).toBe(true);return modules[path as keyof typeof modules];}});
  const people=buildDiscoveryIndex([],prepared.seedHeads).people;expect(people).toHaveLength(20);expect(people.every(p=>p.items.length===0&&p.avatarUrl?.startsWith('data:image/webp;base64,'))).toBe(true);
  expect(prepared.content.match(/href="\/person_\d+\//g)).toHaveLength(20);expect(prepared.content).not.toContain('data:image/svg+xml');expect(prepared.content.length+JSON.stringify(prepared.seedHeads).length).toBeLessThan(100000);
  expect(prepared.content).not.toContain(portrait);
  const custom=people.find(person=>person.username==='person_0')!.avatarUrl!;
  expect(custom.length).toBeLessThan(8000);
  expect((await sharp(Buffer.from(custom.split(',')[1],'base64')).metadata()).width).toBe(80);
  expect((await sharp(Buffer.from(prepared.seedHeads[1].avatarFallback!.split(',')[1],'base64')).metadata()).width).toBe(80);
  expect(prepared.seed.map((row:{id:string})=>row.id)).toEqual(['one']);expect(await readFile(join(root,'public/receiz-public-market.json'),'utf8')).toBe(before);expect(fetcher).not.toHaveBeenCalled();
 }finally{process.chdir(previous);await rm(root,{recursive:true,force:true});vi.unstubAllGlobals();}
 // This integration renders twenty real codec-backed portraits during the
 // build. Its byte/count/no-request budgets remain exact on shared CI CPUs.
},20_000);
it('keeps a selected custom portrait ahead of its default thumbnail',async()=>{
 const custom={...head(1),profile:{...head(1).profile,avatarUrl:'https://receiz.com/artwork/custom.png'},avatarFallback:'data:image/webp;base64,YQ=='};
 const server={ssrLoadModule:async()=>({publicProfileAvatar:vi.fn(()=>{throw Error('Custom portrait must be reused');})})};
 const prepared=await publicProfileHeadThumbnails([custom],server);expect(prepared[0]).toBe(custom);expect(buildDiscoveryIndex([],prepared).people[0].avatarUrl).toBe(custom.profile.avatarUrl);
});
