// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { PublicAssetDetail } from '../src/features/market/PublicAssetDetail';
import { parsePublicMarket } from '../src/receiz/public-market';
const verify = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/proof-media', () => ({ openProofMedia: verify }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('places ownership actions, original media and source links below the valuation chart in order', () => {
  const item = parsePublicMarket({ ok: true, transport: { publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', canonicalHref: '/artist/verified/a', verifyHref: '/v/20261018_1200/AB12CD34/14700000', profileOriginal: { media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original', originalDownloadSha256Hex: 'a'.repeat(64) } } }] } }).items[0];
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<PublicAssetDetail item={{ ...item, chart: [1, 2] }} />));
    const chart = host.querySelector('.value-chart')!, actions = host.querySelector('.dual-actions')!, object = host.querySelector('.proof-media')!, links = host.querySelector('.asset-actions')!;
    for (const [before, after] of [[chart, actions], [actions, object], [object, links]]) expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect([...links.querySelectorAll('a')].map(link => link.textContent)).toEqual(['Open public source', 'Inspect proof']);
  } finally { act(() => root.unmount()); }
});
it('discards verification completion after the selected source digest changes', async () => {
  const item = parsePublicMarket({ ok: true, transport: { publicMembership: {}, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', profileOriginal: { media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original', originalDownloadSha256Hex: 'a'.repeat(64) } } }] } }).items[0];
  let finish!: (value: unknown) => void; verify.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2]))));
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<PublicAssetDetail item={item} />));
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Experience the original'))!.click(); });
    act(() => root.render(<PublicAssetDetail item={{ ...item, originalDigest: 'b'.repeat(64) }} />));
    await act(async () => { finish({ artifactDigest: 'a'.repeat(64),files:[] }); });
    expect(host.textContent).not.toContain('Original verified');
  } finally { act(() => root.unmount()); vi.unstubAllGlobals(); }
});
it('remounts an already-open reading when a different post carries the same image',async()=>{
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'a',receizId:'a',title:'A',verifyHref:'/v/20261018_1200/AB12CD34/14700000?a=deadbeef&ms=1791828092396',profileOriginal:{hasLongForm:true,media:{originalDownloadSrc:'/api/profile/originals/download?receizId=a&kind=original',originalDownloadSha256Hex:'a'.repeat(64)}}}]}}).items[0];
 verify.mockResolvedValue({artifactDigest:item.originalDigest,files:[],readText:async()=>({title:'First post essay',text:'First post complete carried text.',sha256:'b'.repeat(64),artifactDigest:'c'.repeat(64)})});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<PublicAssetDetail item={item}/>));await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());expect(host.textContent).toContain('First post complete carried text.');const first=host.querySelector('.proof-media');
  act(()=>root.render(<PublicAssetDetail item={{...item,verifyUrl:item.verifyUrl!.replace('deadbeef','12345678'),readingUrl:undefined}}/>));expect(host.querySelector('.proof-media')).not.toBe(first);expect(host.textContent).not.toContain('First post complete carried text.');expect(host.querySelector('dialog')).toBeNull();
 }finally{act(()=>root.unmount());vi.restoreAllMocks();}
});
