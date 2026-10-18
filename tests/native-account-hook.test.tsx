// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,expect,it,vi} from 'vitest';
import {useNativeAccount} from '../src/receiz/useNativeAccount';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {WalletObservation} from '../src/receiz/wallet-observation';
const custody=vi.hoisted(()=>({restore:vi.fn(),create:vi.fn(),importId:vi.fn(),forget:vi.fn()}));
vi.mock('../src/receiz/native-identity',()=>({restoreNativeIdentity:custody.restore,createNativeIdentity:custody.create,importNativeIdentity:custody.importId,forgetDeviceIdentity:custody.forget}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const observation=(amount='100'):WalletObservation=>({wallet:{userId:'owner',totalUsdCents:amount,reserveUsdCents:amount,settlementUsdCents:'0',balancePhiMicro:'1000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'10',kaiUpulse:'10000000'},observedAt:'2026-10-18T12:00:00Z',history:[{userId:'owner',at:'2024-05-10T06:45:41.888Z',kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'},{userId:'owner',at:'2026-10-18T12:00:00Z',kaiUPulse:'10000000',totalUsdCents:amount,reserveUsdCents:amount,settlementUsdCents:'0'}],historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'10000000'}});
function held(known=observation()){
 let current=known;
 const identity={binding:{keyId:'fixture'},localHistory:{authority:'identity-only'},dispose:vi.fn(),knownWallet:()=>current,prepareAccountView:vi.fn(async()=>current),readWallet:vi.fn(async()=>current.wallet),setKnown:(value:WalletObservation)=>{current=value;}};
 return identity as unknown as OpenIdentity & {setKnown(value:WalletObservation):void};
}
beforeEach(()=>{custody.restore.mockReset().mockResolvedValue(null);custody.create.mockReset();custody.importId.mockReset();custody.forget.mockReset().mockResolvedValue(undefined);});
async function observe(run:(read:()=>ReturnType<typeof useNativeAccount>,frames:ReturnType<typeof useNativeAccount>[])=>Promise<void>){
 let state!:ReturnType<typeof useNativeAccount>;const frames:typeof state[]=[];const root=createRoot(document.createElement('div'));
 function Probe(){state=useNativeAccount();frames.push({...state});return null;}
 try{await act(async()=>root.render(<Probe/>));await run(()=>state,frames);}finally{act(()=>root.unmount());}
}
it('publishes identity, balance and original history in one settled frame without an immediate second read',async()=>{
 const identity=held();custody.restore.mockResolvedValue(identity);
 await observe(async(read,frames)=>{expect(read().identity).toBe(identity);expect(read().walletHistory[0].kaiUPulse).toBe('0');expect(read().wallet?.totalUsdCents).toBe('100');expect(read().busy).toBe(false);expect(identity.readWallet).not.toHaveBeenCalled();expect(frames.filter(frame=>frame.identity).every(frame=>frame.wallet&&frame.walletHistory.length===2&&!frame.opening)).toBe(true);});
});
it('keeps the account private while complete history is still opening instead of publishing a flat balance preview',async()=>{
 const identity=held();let finish!:(value:WalletObservation)=>void;vi.mocked(identity.prepareAccountView).mockReturnValue(new Promise(resolve=>{finish=resolve;}));custody.restore.mockResolvedValue(identity);
 await observe(async(read,frames)=>{expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(read().walletHistory).toEqual([]);expect(read().opening).toBe(true);await act(async()=>{finish(observation());});expect(read().identity).toBe(identity);expect(frames.filter(frame=>frame.identity).every(frame=>frame.walletHistory.length===2)).toBe(true);});
});
it('waits for settled import preparation and keeps account opening single-flight',async()=>{
 const identity=held();let finish!:(value:WalletObservation)=>void;vi.mocked(identity.prepareAccountView).mockReturnValue(new Promise(resolve=>{finish=resolve;}));custody.importId.mockResolvedValue(identity);
 await observe(async read=>{let pending!:Promise<void>;await act(async()=>{pending=read().importId({}as File,'',true);});expect(read().identity).toBeNull();await act(async()=>{await read().create(true);});expect(custody.create).not.toHaveBeenCalled();await act(async()=>{finish(observation());await pending;});expect(read().identity).toBe(identity);expect(read().walletHistory).toEqual(observation().history);});
});
it('does not publish an incomplete account or erase its Identity Seal when preparation fails',async()=>{
 const identity=held();vi.mocked(identity.prepareAccountView).mockRejectedValue(Error('Complete original history is unavailable'));custody.create.mockResolvedValue(identity);
 await observe(async read=>{await act(async()=>{await read().create(true);});expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(read().error).toContain('Complete original');expect(identity.dispose).toHaveBeenCalled();expect(custody.forget).not.toHaveBeenCalled();});
});
it('refreshes explicitly while retaining the settled opening history',async()=>{
 const identity=held();custody.restore.mockResolvedValue(identity);
 await observe(async read=>{identity.setKnown(observation('300'));await act(async()=>{await read().refresh();});expect(read().wallet?.totalUsdCents).toBe('300');expect(read().walletHistory).toEqual(observation('300').history);expect(identity.readWallet).toHaveBeenCalledTimes(1);});
});
it('retains the settled frame if a later update fails',async()=>{
 const identity=held();vi.mocked(identity.readWallet).mockRejectedValue(Error('Source unavailable'));custody.restore.mockResolvedValue(identity);
 await observe(async read=>{await act(async()=>{await read().refresh();});expect(read().wallet?.totalUsdCents).toBe('100');expect(read().error).toContain('could not update');expect(read().syncPending).toBe(true);});
});
it('preserves the current account if device removal is refused by held custody',async()=>{
 const identity=held();custody.restore.mockResolvedValue(identity);custody.forget.mockRejectedValue(Error('Notes remain in custody'));
 await observe(async read=>{await act(async()=>{await expect(read().forget()).rejects.toThrow('Notes');});expect(read().identity).toBe(identity);expect(identity.dispose).not.toHaveBeenCalled();});
});
it('clears the frame and prevents a pending update from reopening a removed identity',async()=>{
 const identity=held();custody.restore.mockResolvedValue(identity);let finish!:(value:unknown)=>void;vi.mocked(identity.readWallet).mockReturnValue(new Promise(resolve=>{finish=resolve;})as never);
 await observe(async read=>{let pending!:Promise<void>;await act(async()=>{pending=read().refresh();});await act(async()=>{await read().forget();finish(observation('999').wallet);await pending;});expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(read().walletHistory).toEqual([]);});
});
it('does not publish an opening identity after removal wins the generation',async()=>{
 const identity=held();let finish!:(value:WalletObservation)=>void;vi.mocked(identity.prepareAccountView).mockReturnValue(new Promise(resolve=>{finish=resolve;}));custody.restore.mockResolvedValue(identity);
 await observe(async read=>{await act(async()=>{await read().forget();finish(observation());});expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(identity.dispose).toHaveBeenCalled();});
});
