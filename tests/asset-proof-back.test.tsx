// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicMarket} from '../src/receiz/public-market';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
import {retainProofInspection,type ProofInspection} from '../src/receiz/proof-inspection';
import {mergePublicSports} from '../src/receiz/public-sports';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
const hash='ab'.repeat(32),verifyPath='/v/20261020_1200/ABCD1234/12345678';
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:original',receizId:'original',title:'A complete original',pulse:'12345678',verifyHref:verifyPath,profileOriginal:{code:'ABCD1234',pulse:'12345678',verifyPath,proof:{groth16Id:'ABCDEF0123456789',poseidon:'12345678901234567890'},claimHashHex:hash,pbiReceiptHash:hash,media:{sha256Hex:hash},attachments:[{name:'Appendix.pdf',sha256Hex:hash}]}}]}}).items[0];
it.each([false,true])('reveals the entire live-player manifest on %s standalone without IO',async standalone=>{
 const fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={item} standalone={standalone}/>));const count=fetch.mock.calls.length;
  expect(host.querySelector('.asset-proof-back-body')).toBeNull();act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());
  expect(host.querySelectorAll('.asset-proof-back-body>dl>div')).toHaveLength(13);expect(host.textContent).toContain('Appendix.pdf');expect(host.textContent).toContain(hash.toUpperCase());expect(host.textContent).toContain('PBI Signature');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show front"]')!.click());expect(host.querySelector('.asset-proof-back-body')).toBeNull();expect(fetch.mock.calls.length).toBe(count);
 }finally{act(()=>root.unmount());}
});
it('reuses an already opened original report to fill an older catalogue without inspecting twice',async()=>{
 const digest='c'.repeat(64),bundle={code:'ABCD1234',kaiPulseEternal:'12345678',verifyPath,groth16ProofDigest:hash,zkPoseidonHash:'987654321'};
 retainProofInspection({artifactSha256:digest,verification:{bundle},groth16:null} as unknown as ProofInspection,new Uint8Array([1]),'original.receiz');
 const selected={...item,proofManifest:undefined,proofManifestSource:undefined,originalDigest:digest},fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={selected}/>));const requests=fetch.mock.calls.length;act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());expect(host.textContent).toContain('ABCD1234/12345678');expect(host.textContent).toContain('987654321');expect(host.textContent).toContain(hash.slice(0,16).toUpperCase());expect(fetch.mock.calls.length).toBe(requests);}finally{act(()=>root.unmount());}
});

it('shows the carried Moment image basis from an already verified receipt without another read',async()=>{
 const digest='d'.repeat(64),basis='ef'.repeat(32),bundle={code:'ABCD1234',kaiPulseEternal:'12345678',verifyPath,artifactSha256Basis:basis};
 retainProofInspection({artifactSha256:digest,verification:{kind:'png',bundle},groth16:null} as unknown as ProofInspection,new Uint8Array([1]),'moment.png');
 const selected={...item,mediaKind:'moment' as const,proofManifest:undefined,proofManifestSource:undefined,originalDigest:digest},fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={selected}/>));const requests=fetch.mock.calls.length;act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());const row=[...host.querySelectorAll('.asset-proof-back-body>dl>div')].find(row=>row.querySelector('dt')?.textContent==='Media SHA-256');expect(row?.querySelector('dd')?.textContent).toBe(basis.toUpperCase());expect(fetch.mock.calls.length).toBe(requests);}finally{act(()=>root.unmount());}
});

it('shows the collectible artwork and its carried card record instead of an unrelated Original manifest, without reads on flip',async()=>{
 const collectibleId='rsc_0123456789abcdef',claimHash='e'.repeat(64),imageUrl='/api/game/sports/baseball/player-image/694819',fetch=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetch);
 const selected=mergePublicSports({items:[],complete:true,revision:'',observedAt:null,sourceCount:0},{ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId,claimHash,athlete:'Public athlete',sport:'baseball',rarity:'Rare',issueLine:'#2 / 10 issued',imageUrl,liveValueUsd:25,totalValueUsd:25,issuedCount:1,vaultCount:1,pricedCount:1,sealedBirths:[{collectibleId,claimHash,sealedAt:'2026-10-01T12:00:00Z',birthUsdValue:10,ownerUsername:'holder'}],presentation:{collectibleId,claimHash,facts:[{label:'Position',value:'Pitcher'},{label:'Rating',value:'94'},{label:'Base seal',value:'rsc_mlb_694819'}]}}]}).items[0];
 const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicAssetDetail item={selected} standalone/>));
  expect(host.querySelector('.public-collectible-artwork img')?.getAttribute('src')).toBe('https://receiz.com'+imageUrl);
  expect(host.querySelector('.public-collectible-artwork')?.textContent).toContain('94');
  expect(host.querySelector('.public-collectible-artwork')?.textContent).toContain('Pitcher');
  const reads=fetch.mock.calls.length;act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());
  const back=host.querySelector('.asset-proof-back-body')!;
  expect(back.textContent).toContain('Collectible record');expect(back.textContent).toContain(claimHash.toUpperCase());expect(back.textContent).toContain('Pitcher');expect(back.textContent).toContain('94');expect(back.textContent).toContain('rsc_mlb_694819');expect(back.textContent).toContain('$25.00');
  expect(back.textContent).not.toMatch(/Unavailable|pending|Groth16|Poseidon/);
  expect(fetch.mock.calls.length).toBe(reads);
 }finally{act(()=>root.unmount());}
});
