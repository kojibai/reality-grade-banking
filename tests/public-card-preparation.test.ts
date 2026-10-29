import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {PublicMarketItem} from '../src/receiz/public-market';
const id='rsc_0123456789abcdef',claim='a'.repeat(64),url=`https://receiz.com/game/sports/card/${id}?claimHash=${claim}`;
const item=(extra:Partial<PublicMarketItem>={})=>({category:'sports',assetId:id,sourceUrl:url,circulationCount:1,...extra}) as PublicMarketItem;
const packet=(hash=claim)=>({ok:true,cardId:id,claimHash:hash,count:1,provenance:[{eventKind:'issue',collectibleId:id,claimHash:hash,appendHash:'b'.repeat(64),occurredAt:'2026-10-01T12:00:00Z',owner:{username:'first',displayName:'First'}}]});
function gate(){let open!:()=>void;return{wait:new Promise<void>(resolve=>open=resolve),open:()=>open()};}
beforeEach(()=>vi.resetModules());afterEach(()=>vi.restoreAllMocks());
it('shares one exact history request and retains the existing parsed owner and seal time',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),g=gate(),fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{await g.wait;return Response.json(packet());});
 const a=read(item(),new AbortController().signal),b=read(item(),new AbortController().signal);g.open();const [one,two]=await Promise.all([a,b]);expect(one).toBe(two);expect(one).toMatchObject({ownerUsername:'first',sealedAt:'2026-10-01T12:00:00Z'});expect(fetcher).toHaveBeenCalledOnce();expect(await read(item(),new AbortController().signal)).toBe(one);expect(fetcher).toHaveBeenCalledOnce();
});
it('dismissing one history reader cannot cancel the other one',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),g=gate(),controller=new AbortController();const signals:AbortSignal[]=[];
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{signals.push(init!.signal!);await g.wait;init!.signal!.throwIfAborted();return Response.json(packet());});
 const a=read(item(),controller.signal),refused=expect(a).rejects.toThrow('dismissed'),b=read(item(),new AbortController().signal);controller.abort(Error('dismissed'));const aborted=signals[0].aborted;g.open();await refused;expect((await b).ownerUsername).toBe('first');expect(aborted).toBe(false);expect(fetcher).toHaveBeenCalledOnce();
});
it('last-reader cancellation abandons the request without retaining it or deleting its replacement',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),old=gate(),fresh=gate(),controller=new AbortController();let signal!:AbortSignal;
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementationOnce(async(_url,init)=>{signal=init!.signal!;await old.wait;return Response.json(packet());}).mockImplementation(async()=>{await fresh.wait;return Response.json(packet());});
 const a=read(item(),controller.signal),refused=expect(a).rejects.toThrow('dismissed');controller.abort(Error('dismissed'));const b=read(item(),new AbortController().signal);old.open();await refused;await new Promise(resolve=>setTimeout(resolve,0));expect(signal.aborted).toBe(true);
 const c=read(item(),new AbortController().signal);fresh.open();const [one,two]=await Promise.all([b,c]);expect(one).toBe(two);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not reuse an individual-copy owner for an edition, in-flight or retained',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json(packet()));
 const [one,edition]=await Promise.all([read(item(),new AbortController().signal),read(item({circulationCount:2}),new AbortController().signal)]);expect(one.ownerUsername).toBe('first');expect(edition.ownerUsername).toBeNull();expect((await read(item({circulationCount:2}),new AbortController().signal)).ownerUsername).toBeNull();expect((await read(item(),new AbortController().signal)).ownerUsername).toBe('first');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('keeps a changed claim isolated and failed reads retryable',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),other='c'.repeat(64),fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>Response.json(packet(String(input).includes(other)?other:claim)));
 await Promise.all([read(item(),new AbortController().signal),read(item({sourceUrl:url.replace(claim,other)}),new AbortController().signal)]);expect(fetcher).toHaveBeenCalledTimes(2);
 vi.resetModules();const fresh=await import('../src/receiz/public-card-details');fetcher.mockResolvedValueOnce(new Response(null,{status:503}));await expect(fresh.fetchPublicCardDetails(item(),new AbortController().signal)).rejects.toThrow('PUBLIC_CARD_HISTORY_UNAVAILABLE');expect((await fresh.fetchPublicCardDetails(item(),new AbortController().signal)).ownerUsername).toBe('first');
});
it('rejects mismatched source or incomplete history without publishing a retained result',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),fetcher=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(Response.json({...packet(),count:200})).mockImplementation(async()=>Response.json(packet()));
 await expect(read(item({assetId:'rsc_fedcba9876543210'}),new AbortController().signal)).rejects.toThrow('PUBLIC_CARD_HISTORY_INVALID');expect(fetcher).not.toHaveBeenCalled();await expect(read(item(),new AbortController().signal)).rejects.toThrow('PUBLIC_CARD_HISTORY_INCOMPLETE');expect((await read(item(),new AbortController().signal)).ownerUsername).toBe('first');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('keeps the existing 16-entry bound and 60-second lifetime for completed public history',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details');let now=10_000;vi.spyOn(Date,'now').mockImplementation(()=>now);
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const cardId=new URL(String(input),'https://bankeiz.com').searchParams.get('collectibleId')!,value=packet();return Response.json({...value,cardId,provenance:value.provenance.map(row=>({...row,collectibleId:cardId}))});});
 const row=(n:number)=>{const assetId='rsc_'+n.toString(16).padStart(16,'0');return item({assetId,sourceUrl:url.replace(id,assetId)});};
 for(let n=0;n<16;n++)await read(row(n),new AbortController().signal);await read(row(0),new AbortController().signal);expect(fetcher).toHaveBeenCalledTimes(16);
 await read(row(16),new AbortController().signal);await read(row(0),new AbortController().signal);expect(fetcher).toHaveBeenCalledTimes(18);now=70_001;await read(row(16),new AbortController().signal);expect(fetcher).toHaveBeenCalledTimes(19);
});
it('keeps the circulation projection selected at request start even if its caller updates the item later',async()=>{
 const {fetchPublicCardDetails:read}=await import('../src/receiz/public-card-details'),g=gate(),selected=item(),fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{await g.wait;return Response.json(packet());});
 const work=read(selected,new AbortController().signal);selected.circulationCount=2;g.open();expect((await work).ownerUsername).toBe('first');expect((await read(item(),new AbortController().signal)).ownerUsername).toBe('first');expect(fetcher).toHaveBeenCalledOnce();
});
