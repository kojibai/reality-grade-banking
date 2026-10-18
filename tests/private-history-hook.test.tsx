// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { usePrivateHistory } from '../src/receiz/usePrivateHistory';
import { parsePrivateHistoryPage } from '../src/receiz/private-history';
import type { OpenIdentity } from '../src/receiz/native-identity';
const vault = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../src/receiz/identity-vault', () => ({ loadPrivateHistoryCache: vault.load, savePrivateHistoryCache: vault.save }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const page = (uid: string, ids: string[], nextCursor: string | null = null) => parsePrivateHistoryPage({ ok: true, accountUserId: uid, nextCursor, events: ids.map(id => ({ id, kind: 'reserve_credit', createdAt: '2026-10-14T12:00:00Z', amountUsdCents: '100' })) }, uid);
beforeEach(() => { vault.load.mockReset().mockResolvedValue(null); vault.save.mockReset().mockResolvedValue(undefined); });
async function observe(readPrivateHistory: ReturnType<typeof vi.fn>, run: (read: () => ReturnType<typeof usePrivateHistory>) => Promise<void>) {
  const identity = { binding: { artifactSha256: 'a'.repeat(64) }, readPrivateHistory } as unknown as OpenIdentity;
  let state!: ReturnType<typeof usePrivateHistory>; const root = createRoot(document.createElement('div'));
  function Probe() { state = usePrivateHistory(identity, 'A', true); return null; }
  try { await act(async () => root.render(<Probe />)); await run(() => state); } finally { act(() => root.unmount()); }
}
it('refuses freshly authenticated history from another account before display or retention', async () => {
  await observe(vi.fn().mockResolvedValue(page('B', ['private-B'])), async read => { expect(read().cache).toBeNull(); expect(vault.save).not.toHaveBeenCalled(); expect(read().error).toBeTruthy(); });
});
it('awaits encrypted restoration so a fast head read cannot erase retained older rows', async () => {
  let restore!: (value: unknown) => void;
  vault.load.mockImplementation(() => new Promise(resolve => { restore = resolve; }));
  const network = vi.fn().mockResolvedValue(page('A', ['head'], 'older'));
  await observe(network, async read => {
    await act(async () => { restore({ schema: 'bank.private-history-cache.v1', accountUid: 'A', observedAt: '2026-10-14T10:00:00Z', records: page('A', ['head', 'retained-older']).records, nextCursor: null }); });
    expect(read().cache?.records.map(row => row.sourceId)).toContain('retained-older');
    expect(vault.save.mock.calls.at(-1)?.[1].records.map((row: { sourceId: string }) => row.sourceId)).toContain('retained-older');
  });
});
it('pauses repeated or failed pagination until an explicit refresh', async () => {
  const network = vi.fn().mockResolvedValueOnce(page('A', ['head'], 'cursor-one')).mockResolvedValueOnce(page('A', ['older'], 'cursor-one')).mockResolvedValue(page('A', ['head'], 'cursor-one'));
  await observe(network, async read => {
    await act(async () => { await read().loadMore(); });
    expect(read().error).toBeTruthy();
    await act(async () => { await read().loadMore(); }); expect(network).toHaveBeenCalledTimes(2);
    await act(async () => { await read().refresh(); }); expect(network).toHaveBeenCalledTimes(3);
  });
});
it('ignores callbacks captured before switching identities', async () => {
  const a = { binding: { artifactSha256: 'a'.repeat(64) }, readPrivateHistory: vi.fn().mockResolvedValue(page('A', ['a'], 'older-a')) } as unknown as OpenIdentity;
  const b = { binding: { artifactSha256: 'b'.repeat(64) }, readPrivateHistory: vi.fn().mockResolvedValue(page('B', ['b'], 'older-b')) } as unknown as OpenIdentity;
  let state!: ReturnType<typeof usePrivateHistory>; const root = createRoot(document.createElement('div'));
  function Probe({ id, uid }: { id: OpenIdentity; uid: string }) { state = usePrivateHistory(id, uid, true); return null; }
  try {
    await act(async () => root.render(<Probe id={a} uid="A" />)); const oldLoad = state.loadMore;
    await act(async () => root.render(<Probe id={b} uid="B" />));
    await act(async () => { await oldLoad(); });
    expect(state.cache?.accountUid).toBe('B'); expect(state.canLoadMore).toBe(true); expect(state.error).toBeNull(); expect(a.readPrivateHistory).toHaveBeenCalledTimes(1);
  } finally { act(() => root.unmount()); }
});
it('keeps full source pages from earlier pagination when a refreshed head arrives',async()=>{
 const before=page('A',['older']);vault.load.mockResolvedValue({schema:'bank.private-history-cache.v1',accountUid:'A',observedAt:'2026-10-14T10:00:00Z',records:before.records,nextCursor:null,pages:[{cursor:'previous-cursor',json:before.sourceJson}]});
 const incoming=page('A',['newer'],'older');
 await observe(vi.fn().mockResolvedValue(incoming),async read=>{const pages=read().cache?.pages;expect(pages).toHaveLength(2);expect(pages?.map(p=>p.json)).toContain(before.sourceJson);expect(pages?.map(p=>p.json)).toContain(incoming.sourceJson);});
});
it('paints the complete union returned by atomic retention when another tab kept a page',async()=>{
 const first=page('A',['head']),other=page('A',['other-tab']);
 vault.save.mockImplementation(async(_binding,next)=>({...next,records:[...next.records,...other.records],pages:[...next.pages,{cursor:'other-cursor',json:other.sourceJson}]}));
 await observe(vi.fn().mockResolvedValue(first),async read=>{expect(read().cache?.records.map(row=>row.sourceId)).toContain('other-tab');expect(read().cache?.pages).toHaveLength(2);});
});
it('never exposes the previous identity cache on the first frame of another identity with the same UID',async()=>{
 const a={binding:{artifactSha256:'a'.repeat(64)},readPrivateHistory:vi.fn()} as unknown as OpenIdentity;
 const b={binding:{artifactSha256:'b'.repeat(64)},readPrivateHistory:vi.fn()} as unknown as OpenIdentity;
 const cached=(id:string)=>({schema:'bank.private-history-cache.v1',accountUid:'A',observedAt:'2026-10-14T10:00:00Z',records:page('A',[id]).records,nextCursor:null});
 let restoreB!:(value:unknown)=>void;vault.load.mockImplementation(binding=>binding.artifactSha256===a.binding.artifactSha256?Promise.resolve(cached('private-a')):new Promise(resolve=>{restoreB=resolve;}));
 let state!:ReturnType<typeof usePrivateHistory>;const frames:{id:OpenIdentity;rows:string[]}[]=[];const root=createRoot(document.createElement('div'));
 function Probe({id}:{id:OpenIdentity}){state=usePrivateHistory(id,'A',false);frames.push({id,rows:state.cache?.records.map(row=>row.sourceId)??[]});return null;}
 try{
  await act(async()=>root.render(<Probe id={a}/>));expect(state.cache?.records[0].sourceId).toBe('private-a');
  await act(async()=>root.render(<Probe id={b}/>));expect(state.cache).toBeNull();
  await act(async()=>{restoreB(cached('private-b'));});
  expect(frames.filter(frame=>frame.id===b).every(frame=>!frame.rows.includes('private-a'))).toBe(true);expect(state.cache?.records[0].sourceId).toBe('private-b');expect(vault.load).toHaveBeenCalledTimes(2);
 }finally{act(()=>root.unmount());}
});
it('remounts the same identity from the latest verified retained union without another decrypt',async()=>{
 const identity={binding:{artifactSha256:'a'.repeat(64)},readPrivateHistory:vi.fn().mockResolvedValue(page('A',['live-head']))} as unknown as OpenIdentity;
 vault.save.mockImplementation(async(_binding,next)=>({...next,records:[...next.records,...page('A',['other-tab']).records]}));
 let state!:ReturnType<typeof usePrivateHistory>;let root=createRoot(document.createElement('div'));const frames:string[][]=[];
 function Probe({active}:{active:boolean}){state=usePrivateHistory(identity,'A',active);frames.push(state.cache?.records.map(row=>row.sourceId)??[]);return null;}
 try{
  await act(async()=>root.render(<Probe active/>));expect(state.cache?.records.map(row=>row.sourceId)).toContain('other-tab');
  act(()=>root.unmount());root=createRoot(document.createElement('div'));frames.length=0;
  await act(async()=>root.render(<Probe active={false}/>));
  expect(frames[0]).toEqual(expect.arrayContaining(['live-head','other-tab']));expect(vault.load).toHaveBeenCalledOnce();expect(identity.readPrivateHistory).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('ignores a late authenticated read after switching identity instances with the same UID',async()=>{
 let finish!:(value:ReturnType<typeof page>)=>void;
 const a={binding:{artifactSha256:'a'.repeat(64)},readPrivateHistory:vi.fn().mockReturnValue(new Promise(resolve=>{finish=resolve;}))} as unknown as OpenIdentity;
 const b={binding:{artifactSha256:'b'.repeat(64)},readPrivateHistory:vi.fn().mockResolvedValue(page('A',['private-b']))} as unknown as OpenIdentity;
 let state!:ReturnType<typeof usePrivateHistory>;const root=createRoot(document.createElement('div'));
 function Probe({id}:{id:OpenIdentity}){state=usePrivateHistory(id,'A',true);return null;}
 try{
  await act(async()=>root.render(<Probe id={a}/>));await act(async()=>root.render(<Probe id={b}/>));
  await act(async()=>{finish(page('A',['too-late-a']));});
  expect(state.cache?.records.map(row=>row.sourceId)).toEqual(['private-b']);expect(vault.save).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
