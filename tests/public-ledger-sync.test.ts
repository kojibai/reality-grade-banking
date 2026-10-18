// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {announcePublicLedgerPublication,subscribePublicLedgerSync} from '../src/receiz/public-ledger-sync';
import {readPublicLedgerDiscoveries} from '../src/receiz/public-ledger-discovery';
afterEach(()=>vi.unstubAllGlobals());
it('uses cross-tab notifications only to request a fresh read and releases the channel',()=>{
 let channel:{onmessage:((event:{data:unknown})=>void)|null;postMessage:ReturnType<typeof vi.fn>;close:ReturnType<typeof vi.fn>};
 vi.stubGlobal('BroadcastChannel',class{onmessage=null;postMessage=vi.fn();close=vi.fn();constructor(){channel=this;}});
 const read=vi.fn(),stop=subscribePublicLedgerSync(read);announcePublicLedgerPublication('a'.repeat(64));
 expect(read).toHaveBeenCalledTimes(1);expect(channel!.postMessage).toHaveBeenCalledWith({type:'bankeiz.public-ledger.sync.v1',artifactSha256:'a'.repeat(64)});
 channel!.onmessage!({data:{type:'bankeiz.public-ledger.sync.v1',artifactSha256:'b'.repeat(64)}});expect(read).toHaveBeenCalledTimes(2);
 channel!.onmessage!({data:{type:'bankeiz.public-ledger.sync.v1',artifactSha256:'bad'}});expect(read).toHaveBeenCalledTimes(2);
 stop();expect(channel!.close).toHaveBeenCalledOnce();
});
it('reads the global index tail then asks only for additions beyond the observed count',async()=>{
 const row=(n:number)=>({artifactSha256:n.toString(16).padStart(64,'0'),kind:'proof',kaiPulse:String(n)});
 const fetch=vi.fn(async(input:string,init?:RequestInit)=>{expect(init?.credentials).toBe('omit');const cursor=Number(new URL(input,'https://bankeiz.com').searchParams.get('cursor')??0);return Response.json({count:25,entries:cursor===0?[row(1)]:cursor===13?[row(14),row(25)]:[],nextCursor:cursor===0?12:null});});vi.stubGlobal('fetch',fetch);
 const first=await readPublicLedgerDiscoveries();expect(first.entries).toHaveLength(3);expect(first.count).toBe(25);expect(first.nextCursor).toBe(12);
 await readPublicLedgerDiscoveries(first.watchCursor!);expect(fetch.mock.calls[2][0]).toContain('&cursor=25');
});
it('does not skip an addition appended while the first global discovery window is being read',async()=>{
 const row=(n:number)=>({artifactSha256:n.toString(16).padStart(64,'0'),kind:'proof',kaiPulse:String(n)});
 vi.stubGlobal('fetch',vi.fn(async(input:string)=>{const cursor=Number(new URL(input,'https://bankeiz.com').searchParams.get('cursor')??0);return Response.json(cursor===0?{count:25,entries:[row(1)],nextCursor:12}:cursor===13?{count:26,entries:[row(25)],nextCursor:25}:{count:26,entries:[row(26)],nextCursor:null});}));
 const initial=await readPublicLedgerDiscoveries();expect(initial.watchCursor).toBe(25);
 const next=await readPublicLedgerDiscoveries(initial.watchCursor!);expect(next.entries[0].kaiPulse).toBe('26');expect(next.watchCursor).toBe(26);
});
