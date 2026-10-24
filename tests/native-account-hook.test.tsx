// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,expect,it,vi} from 'vitest';
import {useNativeAccount} from '../src/receiz/useNativeAccount';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {WalletObservation} from '../src/receiz/wallet-observation';
import {hostedFixture} from './fixtures/hosted-checkout';
import {hasPendingHostedCheckout} from '../src/receiz/checkout-state';
const custody=vi.hoisted(()=>({restore:vi.fn(),create:vi.fn(),importId:vi.fn(),forget:vi.fn(),history:vi.fn()}));
vi.mock('../src/receiz/native-identity',()=>({restoreNativeIdentity:custody.restore,createNativeIdentity:custody.create,importNativeIdentity:custody.importId,forgetDeviceIdentity:custody.forget}));
vi.mock('../src/receiz/private-history-restore',()=>({preloadPrivateHistory:custody.history}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const observation=(amount='100'):WalletObservation=>({wallet:{userId:'owner',totalUsdCents:amount,reserveUsdCents:amount,settlementUsdCents:'0',balancePhiMicro:'1000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'10',kaiUpulse:'10000000'},observedAt:'2026-10-18T12:00:00Z',history:[{userId:'owner',at:'2024-05-10T06:45:41.888Z',kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'},{userId:'owner',at:'2026-10-18T12:00:00Z',kaiUPulse:'10000000',totalUsdCents:amount,reserveUsdCents:amount,settlementUsdCents:'0'}],historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'10000000'}});
function held(known=observation()){
 let current=known;
 const identity={binding:{keyId:'fixture'},localHistory:{authority:'identity-only'},dispose:vi.fn(),knownWallet:()=>current,prepareAccountView:vi.fn(async()=>current),readWallet:vi.fn(async()=>current.wallet),setKnown:(value:WalletObservation)=>{current=value;}};
 return identity as unknown as OpenIdentity & {setKnown(value:WalletObservation):void};
}
beforeEach(()=>{history.replaceState(null,'','/');custody.history.mockReset().mockResolvedValue(null);custody.restore.mockReset().mockResolvedValue(null);custody.create.mockReset();custody.importId.mockReset();custody.forget.mockReset().mockResolvedValue(undefined);});
async function observe(run:(read:()=>ReturnType<typeof useNativeAccount>,frames:ReturnType<typeof useNativeAccount>[])=>Promise<void>){
 let state!:ReturnType<typeof useNativeAccount>;const frames:typeof state[]=[];const root=createRoot(document.createElement('div'));
 function Probe(){state=useNativeAccount();frames.push({...state});return null;}
 try{await act(async()=>root.render(<Probe/>));await run(()=>state,frames);}finally{act(()=>root.unmount());}
}
it('publishes identity, balance and original history in one settled frame without an immediate second read',async()=>{
 const identity=held();custody.restore.mockResolvedValue(identity);
 await observe(async(read,frames)=>{expect(read().identity).toBe(identity);expect(read().walletHistory[0].kaiUPulse).toBe('0');expect(read().wallet?.totalUsdCents).toBe('100');expect(read().busy).toBe(false);expect(identity.readWallet).not.toHaveBeenCalled();expect(frames.filter(frame=>frame.identity).every(frame=>frame.wallet&&frame.walletHistory.length===2&&!frame.opening)).toBe(true);});
});
it('opens a saved changed-head curve before remote history enrichment and publishes its eventual source once',async()=>{
 const retained={...observation('500'),historyBasis:undefined},identity=held(retained);
 let finish!:(value:WalletObservation)=>void;
 vi.mocked(identity.prepareAccountView).mockImplementation(async options=>options?.resume?retained:new Promise(resolve=>{finish=resolve;}));
 custody.restore.mockResolvedValue(identity);
 await observe(async(read,frames)=>{
  expect(read().identity).toBe(identity);expect(read().openingStage).toBe('ready');expect(read().wallet?.totalUsdCents).toBe('500');
  expect(read().walletHistory).toEqual(retained.history);expect(read().historyComplete).toBe(false);
  await act(async()=>{await vi.waitFor(()=>expect(finish).toBeTypeOf('function'));});
  expect(identity.prepareAccountView).toHaveBeenCalledTimes(2);expect(read().wallet?.totalUsdCents).toBe('500');
  const complete=observation('500');identity.setKnown(complete);await act(async()=>{finish(complete);});
  expect(read().historyComplete).toBe(true);expect(read().walletHistory).toEqual(complete.history);
  expect(frames.filter(frame=>frame.identity).every(frame=>!frame.opening&&frame.walletHistory.length===2)).toBe(true);expect(identity.readWallet).not.toHaveBeenCalled();
 });
});
it('still restores the retained rows before opening directly into the Ledger',async()=>{
 history.replaceState(null,'','/#ledger');const identity=held();custody.restore.mockResolvedValue(identity);let finish!:(v:null)=>void;custody.history.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
 await observe(async read=>{expect(read().identity).toBeNull();await act(async()=>{finish(null);});expect(read().identity).toBe(identity);expect(identity.readWallet).not.toHaveBeenCalled();});
});
it('keeps the account private while complete history is still opening instead of publishing a flat balance preview',async()=>{
 const identity=held();let finish!:(value:WalletObservation)=>void;vi.mocked(identity.prepareAccountView).mockReturnValue(new Promise(resolve=>{finish=resolve;}));custody.restore.mockResolvedValue(identity);
 await observe(async(read,frames)=>{expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(read().walletHistory).toEqual([]);expect(read().opening).toBe(true);expect(read().openingStage).toBe('history');await act(async()=>{finish(observation());});expect(read().identity).toBe(identity);expect(frames.filter(frame=>frame.identity).every(frame=>frame.walletHistory.length===2)).toBe(true);});
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
 await observe(async read=>{await act(async()=>{await read().refresh();});expect(read().wallet?.totalUsdCents).toBe('100');expect(read().error).toContain('balance could not be updated');expect(read().syncPending).toBe(true);});
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
 await observe(async read=>{await act(async()=>{await read().forget();finish(observation());});expect(read().identity).toBeNull();expect(read().wallet).toBeNull();expect(read().openingStage).toBe('identity');expect(identity.dispose).toHaveBeenCalled();});
});

it('completes entry checkpoints in the same rendered frame that publishes the account',async()=>{
 const identity=held();let identify!:(value:OpenIdentity)=>void,prepare!:(value:WalletObservation)=>void;
 custody.restore.mockReturnValue(new Promise(resolve=>{identify=resolve;}));
 vi.mocked(identity.prepareAccountView).mockReturnValue(new Promise(resolve=>{prepare=resolve;}));
 await observe(async(read,frames)=>{
  expect(read().openingStage).toBe('identity');expect(read().identity).toBeNull();
  await act(async()=>{identify(identity);});
  expect(read().openingStage).toBe('history');expect(read().identity).toBeNull();expect(read().wallet).toBeNull();
  await act(async()=>{prepare(observation());});
  expect(read().openingStage).toBe('ready');expect(read().identity).toBe(identity);
  expect(frames.every(frame=>frame.openingStage==='ready'?!!frame.identity&&!!frame.wallet&&frame.walletHistory.length===2&&!frame.opening:frame.identity===null)).toBe(true);
 });
});

it('does not complete a failed preparation and resets checkpoints before retrying',async()=>{
 const first=held(),retry=held();vi.mocked(first.prepareAccountView).mockRejectedValue(Error('SOURCE_UNAVAILABLE'));custody.create.mockResolvedValueOnce(first);
 let identify!:(value:OpenIdentity)=>void,prepare!:(value:WalletObservation)=>void;
 custody.create.mockImplementationOnce(()=>new Promise(resolve=>{identify=resolve;}));
 vi.mocked(retry.prepareAccountView).mockReturnValue(new Promise(resolve=>{prepare=resolve;}));
 await observe(async(read,frames)=>{
  await act(async()=>{await read().create(true);});
  expect(read().identity).toBeNull();expect(read().openingStage).not.toBe('ready');expect(read().error).toBe('SOURCE_UNAVAILABLE');
  let pending!:Promise<void>;await act(async()=>{pending=read().create(true);});
  expect(read().openingStage).toBe('identity');expect(read().busy).toBe(true);expect(read().error).toBeNull();
  await act(async()=>{identify(retry);});expect(read().openingStage).toBe('history');expect(read().identity).toBeNull();
  await act(async()=>{prepare(observation());await pending;});
  expect(read().openingStage).toBe('ready');expect(read().identity).toBe(retry);
  expect(frames.filter(frame=>frame.openingStage==='ready').every(frame=>frame.identity===retry)).toBe(true);
 });
});

it('does not advance checkpoints when a removed identity finishes restoring later',async()=>{
 const identity=held();let identify!:(value:OpenIdentity)=>void;
 custody.restore.mockReturnValue(new Promise(resolve=>{identify=resolve;}));
 await observe(async read=>{
  await act(async()=>{await read().forget();identify(identity);});
  expect(read().openingStage).toBe('identity');expect(read().identity).toBeNull();
  expect(identity.prepareAccountView).not.toHaveBeenCalled();expect(identity.dispose).toHaveBeenCalled();
 });
});

it('cancels unsent notes before the existing device-removal guard',async()=>{
 const identity=held(),order:string[]=[];identity.cancelUnsentNotes=vi.fn(async()=>{order.push('cancel');});custody.restore.mockResolvedValue(identity);custody.forget.mockImplementation(async()=>{order.push('guarded-forget');});
 await observe(async read=>{await act(async()=>{await read().forget();});expect(order).toEqual(['cancel','guarded-forget']);expect(read().identity).toBeNull();});
});
it('keeps the identity and custody when unsent-note cancellation cannot be confirmed',async()=>{
 const identity=held();identity.cancelUnsentNotes=vi.fn().mockRejectedValue(Error('BANK_NOTE_FUNDING_PENDING'));custody.restore.mockResolvedValue(identity);
 await observe(async read=>{await act(async()=>{await expect(read().forget()).rejects.toThrow('BANK_NOTE_FUNDING_PENDING');});expect(custody.forget).not.toHaveBeenCalled();expect(identity.dispose).not.toHaveBeenCalled();expect(read().identity).toBe(identity);});
});
it('releases an abandoned unpaid hosted checkout before logout after navigating back to the account',async()=>{
 const f=hostedFixture(0),checkout=f.newController();await checkout.ready;const approval=await checkout.prepare({recipient:'merchant',amountUsdCents:'1000',method:'card'});await checkout.approve(approval.digest);
 const identity=held();identity.hostedCheckout=async()=>checkout;custody.restore.mockResolvedValue(identity);custody.forget.mockImplementation(async()=>{if(hasPendingHostedCheckout(f.state!))throw Error('checkout pending');});
 await observe(async read=>{await act(async()=>{await read().forget();});expect(read().identity).toBeNull();expect(hasPendingHostedCheckout(f.state!)).toBe(false);expect(f.transfer).not.toHaveBeenCalled();});
});
it('releases an abandoned Send card-funding approval before logout without checking or submitting it',async()=>{
 const f=hostedFixture(0),wallet=await f.deps.walletSend(),review=await wallet.prepare({recipient:'merchant',amountUsdCents:'1000'},{fundingPreference:'card'});await wallet.execute(review,review.digest);
 const identity=held();identity.walletSend=async()=>wallet;custody.restore.mockResolvedValue(identity);custody.forget.mockImplementation(async()=>{if((await wallet.status())?.status==='funding')throw Error('payment pending');});const reads=f.request.mock.calls.length;
 await observe(async read=>{await act(async()=>{await read().forget();});expect(read().identity).toBeNull();expect(await wallet.status()).toMatchObject({status:'not-sent',reason:'card_cancelled'});expect(f.request).toHaveBeenCalledTimes(reads);expect(f.transfer).not.toHaveBeenCalled();});
});
it('preserves the ID and exact recovery when logout follows a submitted payment with an unknown result',async()=>{
 const f=hostedFixture(),checkout=f.newController();await checkout.ready;const approval=await checkout.prepare({recipient:'merchant',amountUsdCents:'1000',method:'balance'});f.loseLookup(true);f.loseResponse(true);await checkout.approve(approval.digest);
 const identity=held();identity.hostedCheckout=async()=>checkout;identity.walletSend=f.deps.walletSend;custody.restore.mockResolvedValue(identity);custody.forget.mockImplementation(async()=>{if(hasPendingHostedCheckout(f.state!))throw Error('submitted payment pending');});
 await observe(async read=>{await act(async()=>{await expect(read().forget()).rejects.toThrow('submitted payment pending');});expect(read().identity).toBe(identity);expect(identity.dispose).not.toHaveBeenCalled();expect(checkout.snapshot().phase).toBe('confirming');expect(f.transfer).toHaveBeenCalledOnce();});
});
