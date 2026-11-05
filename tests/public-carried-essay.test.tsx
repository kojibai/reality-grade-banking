// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
import original from './fixtures/created-original-public.json';
import {curatePublicMarketMembership} from '../server/public-market';
import {preparePublicMarketRenderMaterial} from '../server/public-market-preparation';
import {parsePublicMarket} from '../src/receiz/public-market';
import {FeedReading} from '../src/public-feed/FeedReading';
import * as proofReading from '../src/receiz/proof-reading';
import * as client from '../src/receiz/client';

const text=readFileSync('tests/fixtures/created-original-essay.txt','utf8'),sha256Hex='321fe0ccf9225ed73a3f1e7ffe75c1fbf55c4aaff06343b3dca0e6172b0a78e9';
const longForm={title:original.original.assetTitle,text,sha256Hex};
function membership(kind='image',long:unknown=longForm){return{ok:true,transport:{generatedAt:'2026-11-05T17:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'synthetic-text-projection'},publicOriginals:[{id:original.original.id,receizId:original.original.id,title:original.original.assetTitle,summary:original.original.claim,visibility:'public',ownerUsername:'bjklock',verifyHref:original.original.verifyUrl,canonicalHref:'https://receiz.com/bjklock/verified/'+original.original.id,profileOriginal:{...original.original,hasLongForm:true,longForm:long,media:{...original.original.media,kind}}}]}};}
function selected(kind='image',long:unknown=longForm){return parsePublicMarket(curatePublicMarketMembership(membership(kind,long))).items[0];}
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
it('first paints the complete actual carried essay and opens no network or proof reader',async()=>{
 expect(text).toHaveLength(22483);expect(createHash('sha256').update(text).digest('hex')).toBe(sha256Hex);
 const item=selected(),markup=renderToStaticMarkup(<FeedReading item={item}/>),html=new DOMParser().parseFromString(markup,'text/html');
 expect(html.querySelector('.feed-reading-paper>div')?.textContent).toBe(text);expect(html.body.textContent).not.toContain('Open full text');
 const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Known carried essay must not be fetched again.')),open=vi.spyOn(proofReading,'readPublicProofReading'),sdk=vi.spyOn(client,'loadReceiz');
 const root=createRoot(document.createElement('div'));try{await act(async()=>root.render(<FeedReading item={item}/>));expect(fetcher).not.toHaveBeenCalled();expect(open).not.toHaveBeenCalled();expect(sdk).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});
it.each(['image','audio','video','pdf','epub','file'])('retains only valid public text through repeated %s curation',kind=>{
 const first=curatePublicMarketMembership(membership(kind));expect(parsePublicMarket(first).items[0].carriedText).toEqual(longForm);expect(curatePublicMarketMembership(structuredClone(first))).toEqual(first);
 for(const invalid of [null,{...longForm,text:''},{...longForm,text:'x'.repeat(100001)},{...longForm,sha256Hex:'not-a-digest'}])expect(selected(kind,invalid).carriedText).toBeUndefined();
});
it('repairs an already-marked v2 text-thin representation once while retaining exact financial operands',async()=>{
 const previous={publicDisplayPolicy:'bank.public-market.curated-display.v2',membership:curatePublicMarketMembership(membership('image',undefined)),snapshot:{ok:true,data:{schema:'receiz.market.public-snapshot.v1',liveMarkets:[]}},capitalization:{existing:'qualified-capitalization'},history:{existing:'accepted-chart-history'},preparedLedger:{existing:'accepted-financial-prefix'}};
 delete (previous.membership.transport as {publicOriginals:Array<{profileOriginal:Record<string,unknown>}>}).publicOriginals[0].profileOriginal.longForm;
 const read=vi.fn(async(kind:string)=>{if(kind!=='membership')throw Error('Do not reopen retained financial operands.');return membership();});
 const repaired=await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify(previous),read}),value=JSON.parse(repaired.material);
 expect(read.mock.calls).toEqual([['membership']]);expect(value.publicDisplayPolicy).toBe('bank.public-market.curated-display.v3');expect(parsePublicMarket(value.membership).items[0].carriedText).toEqual(longForm);
 for(const key of ['snapshot','capitalization','history','preparedLedger']as const)expect(value[key]).toEqual(previous[key]);
 read.mockClear();expect((await preparePublicMarketRenderMaterial({previousMaterial:repaired.material,read})).material).toBe(repaired.material);expect(read).not.toHaveBeenCalled();
});
it('keeps the existing proof-reader fallback for genuinely missing text instead of fabricating it',async()=>{
 const item=selected('image',null),fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(null,{status:400})),open=vi.spyOn(proofReading,'readPublicProofReading'),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<FeedReading item={item}/>));expect(open).toHaveBeenCalledOnce();expect(fetcher).toHaveBeenCalledOnce();expect(host.textContent).toContain('Open full text');expect(host.querySelector('.feed-reading-paper>div')?.textContent).toBe(original.original.claim);}finally{act(()=>root.unmount());}
});
