// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicObjectRow} from '../src/features/market/PublicObjectRow';
import {parsePublicMarket,publicMediaArtworkUrl} from '../src/receiz/public-market';
import {Investments} from '../src/features/assets/Investments';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const decoded=vi.hoisted(()=>({urls:[] as string[]}));
vi.mock('../src/features/media/ProofPdfReader',async()=>{
 const {useEffect}=await import('react');
 return {default:({url,onCover}:{url:string;onCover?:(image:string)=>void})=>{useEffect(()=>{decoded.urls.push(url);onCover?.('data:image/webp;base64,'+btoa(url));},[url,onCover]);return <span>Actual PDF renderer boundary</span>;}};
});
afterEach(()=>{vi.unstubAllGlobals();decoded.urls=[];});
const receipt='/api/receiz/download?a=abcd1234&ms=1791892800000&p=14610000&c=AB12CD34&name=record.png';
const preview='/api/profile/originals/media?receizId=document&slot=preview';
function documentItem(extra:Record<string,unknown>={}){
 return parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:document',receizId:'document',title:'The actual document',profileOriginal:{media:{kind:'pdf',src:preview,gateAudioPlayback:false,receiptDownloadSrc:receipt,...extra}}}]}}).items[0];
}
it('uses the carried public PDF page preview in Market instead of its receipt image, without opening an Original on row render',async()=>{
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 const fetcher=vi.spyOn(globalThis,'fetch'),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicObjectRow item={documentItem()} onOpen={()=>{}}/>));
  expect(host.querySelector('.market-object-document .proof-pdf-preview')).not.toBeNull();
  expect(host.querySelector('img[src*="/api/receiz/download"]')).toBeNull();
  expect(host.querySelector('.market-object-moment')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetcher.mockRestore();}
});
it('prefers an explicit document cover over the receipt without decoding the PDF',async()=>{
 const cover='/artwork/document-cover.webp',value=documentItem({epubCoverSrc:cover}),host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicObjectRow item={value} onOpen={()=>{}}/>));
  expect(host.querySelector('img')?.getAttribute('src')).toBe('https://receiz.com'+cover);
  expect(host.querySelector('.proof-pdf-preview')).toBeNull();
 }finally{act(()=>root.unmount());}
});

it('reuses the Market PDF cover in Investments and its reopened detail without another PDF decode or fetch',async()=>{
 vi.stubGlobal('IntersectionObserver',class{constructor(private notify:(rows:unknown[])=>void){}observe(target:Element){this.notify([{target,isIntersecting:true}]);}disconnect(){}});
 const fetcher=vi.spyOn(globalThis,'fetch'),host=document.createElement('div'),root=createRoot(host),value={...documentItem(),id:'profile:artist:work'},input=portfolioFixture();input.positions=input.positions.slice(0,1);
 const portfolio=parseMarketPortfolio(input,portfolioUid);
 try{
  await act(async()=>root.render(<PublicObjectRow item={value} onOpen={()=>{}}/>));
  await vi.waitFor(()=>expect(host.querySelector('.proof-pdf-preview img')).not.toBeNull());
  const cover=host.querySelector('img')!.getAttribute('src');expect(decoded.urls).toHaveLength(1);
  const render=()=>root.render(<Investments portfolio={portfolio} items={[value]} active pulse={15000000} history={null} onTrade={()=>{}}/>);
  await act(render);expect(host.querySelector('.investment-row .proof-pdf-preview img')?.getAttribute('src')).toBe(cover);
  for(let i=0;i<2;i++){
   await act(()=>host.querySelector<HTMLButtonElement>('.investment-row')!.click());
   expect(host.querySelector('dialog .investment-detail-heading .proof-pdf-preview img')?.getAttribute('src')).toBe(cover);
   await act(render);expect(host.querySelector('dialog .investment-detail-heading img')?.getAttribute('src')).toBe(cover);
   await act(()=>host.querySelector<HTMLButtonElement>('dialog [aria-label="Close"]')!.click());
  }
  expect(host.querySelector('img[src*="/api/receiz/download"]')).toBeNull();expect(decoded.urls).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());fetcher.mockRestore();}
});
it('uses the same source-carried cover field for PDF and generic document offerings',()=>{
 for(const kind of ['pdf','file'])expect(publicMediaArtworkUrl({kind,epubCoverSrc:'/artwork/document-cover.webp',receiptDownloadSrc:receipt})).toBe('https://receiz.com/artwork/document-cover.webp');
});
it('replaces the cover when a listing carries a different document source instead of keeping the previous PDF image',async()=>{
 vi.stubGlobal('IntersectionObserver',class{constructor(private notify:(rows:unknown[])=>void){}observe(target:Element){this.notify([{target,isIntersecting:true}]);}disconnect(){}});
 const host=document.createElement('div'),root=createRoot(host),value=documentItem();
 const first={...value,id:'changing-document',originalDigest:'a'.repeat(64),documentUrl:'https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact'},next={...first,originalDigest:'b'.repeat(64),documentUrl:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact'};
 try{
  await act(async()=>root.render(<PublicObjectRow item={first} onOpen={()=>{}}/>));
  await vi.waitFor(()=>expect(host.querySelector('img')?.getAttribute('src')).toBeTruthy());const before=host.querySelector('img')!.getAttribute('src');
  await act(async()=>root.render(<PublicObjectRow item={next} onOpen={()=>{}}/>));
  await vi.waitFor(()=>expect(host.querySelector('img')?.getAttribute('src')).not.toBe(before));
  expect(decoded.urls).toHaveLength(2);expect(decoded.urls[1]).toContain(encodeURIComponent(next.documentUrl));
 }finally{act(()=>root.unmount());}
});
