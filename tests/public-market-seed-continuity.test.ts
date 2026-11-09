import {mkdtemp,mkdir,copyFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {profileFixture} from './fixtures/public-profile';
import {buildMembershipOnlyPublicMarketSeed} from '../server/public-market-preparation';
const uid='account-1',username='alexmorgan',createdAt='2026-01-10T12:00:00Z';
const row=(id:string)=>({id,receizId:'asset-'+id,title:id,visibility:'public',valueUsd:3,ownerUsername:username,ownerUserId:uid,ownerCreatedAt:createdAt,pulse:'12345678',verifyHref:'/v/20261020_1200/ABCD1234/12345678',profileOriginal:{mediaKind:'image',media:{originalDownloadSha256Hex:'a'.repeat(64)}}});
function membership(rows:unknown[],heads:unknown[]=[]){return{ok:true,transport:{generatedAt:'2026-11-06T18:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:rows.length,revision:'accepted-display'},publicOriginals:rows,publicProfileHeads:heads}};}
const snapshot=(rows:unknown[])=>({ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:rows}});
function inventory(id:string,quantity='2000000',at='2000000'){return{schema:'receiz.market.share-inventory.v1',marketItemId:id,assetId:'asset-'+id,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:at,outstandingShareQuantityMicro:quantity,availableShareQuantityMicro:'3000000',maxPurchaseShareQuantityMicro:'3000000',availability:'quote-capacity',positionsMicro:quantity,certificatesMicro:'0',reservedBuyMicro:'0',history:[{kaiUPulse:'1000000',outstandingShareQuantityMicro:'1000000'},{kaiUPulse:at,outstandingShareQuantityMicro:quantity}]};}
function head(fields:Record<string,unknown>={}){const f=profileFixture().profile;return{profile:{...f.profile,userId:uid,createdAt,...fields},viewer:f.viewer,stats:f.stats};}
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Seed preparation must use supplied operands');})));
afterEach(()=>{expect(fetch).not.toHaveBeenCalled();vi.unstubAllGlobals();});
it('rejects an unsupported quote transport before preparing a replacement seed',()=>{expect(()=>buildMembershipOnlyPublicMarketSeed({membership:membership([row('one')]),snapshot:{ok:true,data:{liveMarkets:[]}}})).toThrow('unsupported response');});
it('appends a priced Original, preserves compatible held shares and header, and removes withdrawn members and quotes',async()=>{
 const build=buildMembershipOnlyPublicMarketSeed,heldInventory=inventory('one'),prior={...membership([row('one'),row('withdrawn')],[head()]),snapshot:snapshot([{itemId:'one',visibility:'public',priceUsd:11,quoteUsdPerPhi:2,chart:[{value:5}],shareInventory:heldInventory},{itemId:'withdrawn',visibility:'public',priceUsd:9}])};
 const result=build({membership:membership([row('new'),row('one')]),snapshot:snapshot([{itemId:'new',visibility:'public',priceUsd:22,quoteUsdPerPhi:2,chart:[{value:11}],shareInventory:inventory('new')}]),previous:prior}),catalog=parsePublicMarket(result,result.snapshot);
 expect(catalog.items.map(item=>item.id)).toEqual(['new','one']);expect(catalog.items[0]).toMatchObject({priceUsd:22,shareInventory:{availableShareQuantityMicro:'3000000'}});expect(catalog.items[1]).toMatchObject({priceUsd:11,chart:[10],shareInventory:heldInventory});expect(catalog.publicProfileHeads?.[0].profile.bannerUrl).toBe('https://receiz.com/artwork/cover.png');
 expect(result.snapshot.data.liveMarkets.map((quote:{itemId:string})=>quote.itemId)).toEqual(['one','new']);expect(JSON.stringify(result)).not.toMatch(/private@example|secret/);
});
it('merges a new share observation without replacing the held quantity history',async()=>{
 const build=buildMembershipOnlyPublicMarketSeed,previous={...membership([row('one')]),snapshot:snapshot([{itemId:'one',visibility:'public',priceUsd:11,shareInventory:inventory('one')}])},incoming=inventory('one','3000000','3000000');incoming.history=[{kaiUPulse:'3000000',outstandingShareQuantityMicro:'3000000'}];
 const result=build({membership:membership([row('one')]),snapshot:snapshot([{itemId:'one',visibility:'public',priceUsd:12,shareInventory:incoming}]),previous}),item=parsePublicMarket(result,result.snapshot).items[0];
 expect(item.priceUsd).toBe(12);expect(item.shareInventory?.history).toEqual([{kaiUPulse:'1000000',outstandingShareQuantityMicro:'1000000'},{kaiUPulse:'2000000',outstandingShareQuantityMicro:'2000000'},{kaiUPulse:'3000000',outstandingShareQuantityMicro:'3000000'}]);
});
it('does not inherit held quotes or quantities when the asset binding changes',async()=>{
 const build=buildMembershipOnlyPublicMarketSeed,previous={...membership([row('one')]),snapshot:snapshot([{itemId:'one',visibility:'public',priceUsd:11,shareInventory:inventory('one')}])},result=build({membership:membership([{...row('one'),receizId:'different-asset'}]),snapshot:snapshot([]),previous}),item=parsePublicMarket(result,result.snapshot).items[0];
 expect(item.assetId).toBe('different-asset');expect(item.priceUsd).toBe(3);expect(item.shareInventory).toBeUndefined();expect(result.snapshot.data.liveMarkets).toEqual([]);
});
it('preserves exact compatible artwork and Moment receipt basis without carrying an older signing receipt',async()=>{
 const build=buildMembershipOnlyPublicMarketSeed,image={...row('one'),profileOriginal:{...row('one').profileOriginal,artworkUrl:'https://receiz.com/artwork/held.png'}},profile={code:'ABCD1234',pulse:'12345678',verifyPath:'/v/20261020_1200/ABCD1234/12345678',claimHashHex:'a'.repeat(64),pbiReceiptHash:'b'.repeat(64),proof:{circuit:'Groth16',groth16Id:'original-proof',poseidon:'123456789'},media:null},moment={...row('moment'),profileOriginal:{...profile,recordCardMediaSha256Hex:'c'.repeat(64)}},previous={...membership([image,moment]),snapshot:snapshot([])},thin={...moment,profileOriginal:profile};
 const result=build({membership:membership([row('one'),thin]),snapshot:snapshot([]),previous}),catalog=parsePublicMarket(result,result.snapshot);
 expect(catalog.items[0].artworkUrl).toBe('https://receiz.com/artwork/held.png');expect(catalog.items[1].proofManifestSource?.recordCardMediaSha256Hex).toBe('C'.repeat(64));
 const changed=build({membership:membership([{...thin,profileOriginal:{...profile,pbiReceiptHash:'d'.repeat(64)}}]),snapshot:snapshot([]),previous});expect(parsePublicMarket(changed,changed.snapshot).items[0].proofManifestSource?.recordCardMediaSha256Hex).toBeNull();
});
it('carries changed public headers and respects an explicit private header refusal',async()=>{
 const build=buildMembershipOnlyPublicMarketSeed,previous={...membership([row('one')],[head()]),snapshot:snapshot([])},changed=build({membership:membership([row('one')],[head({bannerUrl:'https://receiz.com/artwork/new.png'})]),snapshot:snapshot([]),previous});
 expect(parsePublicMarket(changed,changed.snapshot).publicProfileHeads?.[0].profile.bannerUrl).toBe('https://receiz.com/artwork/new.png');const refused=build({membership:membership([row('one')],[head({isPrivate:true})]),snapshot:snapshot([]),previous});expect(parsePublicMarket(refused,refused.snapshot).publicProfileHeads).toBeUndefined();
});
it('refuses an incomplete membership instead of replacing the shipped complete seed',async()=>{const build=buildMembershipOnlyPublicMarketSeed,incomplete=membership([{...row('one'),visibility:'private'}]);expect(()=>build({membership:incomplete,snapshot:snapshot([])})).toThrow('complete collection');});

it('imports the CLI driver without opening a Vite app host or requiring application sources',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-seed-driver-import-'));try{await mkdir(join(root,'scripts'));await symlink(resolve('node_modules'),join(root,'node_modules'),'dir');const script=join(root,'scripts/seed-public-market.mjs');await copyFile(new URL('../scripts/seed-public-market.mjs',import.meta.url),script);const result=await promisify(execFile)(process.execPath,['--input-type=module','-e','globalThis.fetch=()=>{throw Error("Unexpected seed fetch")};await import('+JSON.stringify(pathToFileURL(script).href)+');console.log("Driver import settled without app inputs");']);expect(result.stdout).toContain('Driver import settled without app inputs');}finally{await rm(root,{recursive:true,force:true});}
});

it('retains the exact held full receiving name for the same owner and Original, without guessing a missing character',()=>{
 const full='mxbzkeil5wvisanfxz',old={...row('one'),ownerUsername:'receiz_'+full.slice(0,17),ownerReceivingUsername:full},thin={...old};delete (thin as Partial<typeof old>).ownerReceivingUsername;
 const previous={...membership([old]),snapshot:snapshot([])};
 const build=(r:unknown)=>buildMembershipOnlyPublicMarketSeed({membership:membership([r]),snapshot:snapshot([]),previous});
 expect(parsePublicMarket(build(thin)).items[0].ownerReceivingUsername).toBe(full);
 for(const changed of [{...thin,ownerUserId:'another-owner'},{...thin,receizId:'different-Original'},{...thin,ownerUsername:'renamed'}])expect(parsePublicMarket(build(changed)).items[0].ownerReceivingUsername).toBeUndefined();
});
