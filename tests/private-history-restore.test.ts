import { beforeEach, expect, it, vi } from 'vitest';
import { peekPrivateHistory, preloadPrivateHistory, updatePrivateHistory } from '../src/receiz/private-history-restore';
import type { OpenIdentity } from '../src/receiz/native-identity';
import type { PrivateHistoryCache } from '../src/receiz/identity-vault';
const vault=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../src/receiz/identity-vault',()=>({loadPrivateHistoryCache:vault.load}));
const identity=()=>({binding:{artifactSha256:'a'.repeat(64)}} as OpenIdentity);
const cache=(uid:string,at='2026-10-18T12:00:00Z'):PrivateHistoryCache=>({schema:'bank.private-history-cache.v1',accountUid:uid,observedAt:at,records:[],nextCursor:null});
beforeEach(()=>vault.load.mockReset().mockResolvedValue(null));
it('deduplicates pending local restoration per exact instance and UID and prevents stale restore overwrite',async()=>{
 const held=identity(),other=identity();let finish!:(value:PrivateHistoryCache)=>void;vault.load.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 const first=preloadPrivateHistory(held,'A');expect(preloadPrivateHistory(held,'A')).toBe(first);await Promise.resolve();expect(vault.load).toHaveBeenCalledOnce();
 expect(peekPrivateHistory(other,'A')).toBeNull();expect(peekPrivateHistory(held,'B')).toBeNull();
 const verified=cache('A','2026-10-18T13:00:00Z');expect(updatePrivateHistory(held,'A',verified)).toBe(true);finish(cache('A'));
 expect(await first).toBe(verified);expect(await preloadPrivateHistory(held,'A')).toBe(verified);expect(vault.load).toHaveBeenCalledOnce();
});
it('refuses wrong-account memory updates and keeps same-UID identity instances isolated',async()=>{
 const first=identity(),second=identity(),value=cache('A');
 expect(updatePrivateHistory(first,'A',value)).toBe(true);expect(updatePrivateHistory(first,'B',value)).toBe(false);
 expect(peekPrivateHistory(first,'A')).toBe(value);expect(peekPrivateHistory(first,'B')).toBeNull();expect(peekPrivateHistory(second,'A')).toBeNull();
 await preloadPrivateHistory(second,'A');expect(vault.load).toHaveBeenCalledOnce();expect(peekPrivateHistory(second,'A')).toBeNull();
});
