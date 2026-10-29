import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const bytes=new Uint8Array(readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url)));
const image='d4e40d9ececcc01cd5de77dc340081cb386dbcb68a42c5a7040a7ec1edeab8b1';
const post='https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396';
const gate=()=>{let open!:()=>void;return{wait:new Promise<void>(resolve=>open=resolve),open:()=>open()};};
beforeEach(()=>vi.resetModules());afterEach(()=>vi.restoreAllMocks());
it('downloads and canonically verifies one exact public reading for overlapping readers',async()=>{
 const {readPublicProofReading,retainedPublicReading}=await import('../src/receiz/proof-reading'),g=gate(),fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>{await g.wait;return new Response(bytes);});
 const a=readPublicProofReading(post,image),b=readPublicProofReading(post,image);g.open();
 const [one,two]=await Promise.all([a,b]);expect(one).toBe(two);expect(one.text).toHaveLength(17952);expect(one.sha256).toBe('d0f7264aaff25046560310af2d082d0ea6bf270e74c66be7dcdc800f29a07620');expect(fetcher).toHaveBeenCalledOnce();expect(retainedPublicReading(post,image)).toBe(one);
});
it('one dismissed reader cannot cancel the other reader or publish unverified text',async()=>{
 const {readPublicProofReading,retainedPublicReading}=await import('../src/receiz/proof-reading'),g=gate(),controller=new AbortController();let sourceSignal!:AbortSignal;
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async(_url,init)=>{sourceSignal=init!.signal!;await g.wait;sourceSignal.throwIfAborted();return new Response(bytes);});
 const a=readPublicProofReading(post,image,controller.signal),rejected=expect(a).rejects.toThrow('dismissed'),b=readPublicProofReading(post,image);
 controller.abort(Error('dismissed'));const aborted=sourceSignal.aborted,retained=retainedPublicReading(post,image);g.open();await rejected;expect(aborted).toBe(false);expect(retained).toBeNull();expect((await b).text.length).toBe(17952);expect(fetcher).toHaveBeenCalledOnce();
});
it('abandons the source when the last reader leaves, and a new reader can retry immediately',async()=>{
 const {readPublicProofReading,retainedPublicReading}=await import('../src/receiz/proof-reading'),g=gate(),controller=new AbortController();let abandoned!:AbortSignal;
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementationOnce(async(_url,init)=>{abandoned=init!.signal!;await g.wait;abandoned.throwIfAborted();return new Response(bytes);}).mockImplementation(async()=>new Response(bytes));
 const old=readPublicProofReading(post,image,controller.signal),rejected=expect(old).rejects.toThrow('dismissed');controller.abort(Error('dismissed'));expect(abandoned.aborted).toBe(true);expect(retainedPublicReading(post,image)).toBeNull();
 const fresh=readPublicProofReading(post,image);g.open();await rejected;expect((await fresh).text.length).toBe(17952);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('does not share a different selected original or post, and failed reads remain retryable',async()=>{
 const {readPublicProofReading}=await import('../src/receiz/proof-reading');const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(bytes));
 await Promise.all([expect(readPublicProofReading(post,'b'.repeat(64))).rejects.toThrow('selected original'),expect(readPublicProofReading(post.replace('0C19C291','AB12CD34'),image)).rejects.toThrow('selected post')]);expect(fetcher).toHaveBeenCalledTimes(2);
 fetcher.mockResolvedValueOnce(new Response(null,{status:503}));await expect(readPublicProofReading(post,image)).rejects.toThrow('could not be opened');expect((await readPublicProofReading(post,image)).text.length).toBe(17952);expect(fetcher).toHaveBeenCalledTimes(4);
});
it('an abort-ignoring late source cannot retain text or remove the replacement preparation',async()=>{
 const {readPublicProofReading,retainedPublicReading}=await import('../src/receiz/proof-reading'),old=gate(),fresh=gate(),controller=new AbortController();
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementationOnce(async()=>{await old.wait;return new Response(bytes);}).mockImplementation(async()=>{await fresh.wait;return new Response(bytes);});
 const abandoned=readPublicProofReading(post,image,controller.signal),refused=expect(abandoned).rejects.toThrow('dismissed');controller.abort(Error('dismissed'));await refused;
 const replacement=readPublicProofReading(post,image);old.open();await new Promise(resolve=>setTimeout(resolve,0));expect(retainedPublicReading(post,image)).toBeNull();
 const follower=readPublicProofReading(post,image);fresh.open();const [a,b]=await Promise.all([replacement,follower]);expect(a).toBe(b);expect(a.text.length).toBe(17952);expect(fetcher).toHaveBeenCalledTimes(2);
});
