// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {beforeEach,expect,it,vi} from 'vitest';
import {useNativeAccount} from '../src/receiz/useNativeAccount';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({restore:vi.fn(),create:vi.fn(),importId:vi.fn(),forget:vi.fn(),reserve:vi.fn(),pbi:vi.fn(),module:vi.fn()}));
vi.mock('../src/receiz/native-identity',()=>({restoreNativeIdentity:p.restore,createNativeIdentity:p.create,importNativeIdentity:p.importId,forgetDeviceIdentity:p.forget}));
vi.mock('../src/receiz/private-history-restore',()=>({preloadPrivateHistory:async()=>null}));
vi.mock('../src/receiz/pbi-account-bridge',()=>({reservePbiAccountPopup:p.reserve}));
vi.mock('../src/receiz/pbi-account',()=>{p.module();return{openPbiAccount:p.pbi};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const observation={wallet:{userId:'original-account',totalUsdCents:'45123',reserveUsdCents:'45123',settlementUsdCents:'0',balancePhiMicro:'0',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:'100000000'},observedAt:'2026-10-24T00:00:00Z',history:[{userId:'original-account',at:'2026-10-24T00:00:00Z',kaiUPulse:'0',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0'},{userId:'original-account',at:'2026-10-24T00:00:01Z',kaiUPulse:'100000000',totalUsdCents:'45123',reserveUsdCents:'45123',settlementUsdCents:'0'}],historyBasis:{schema:'bank.account-history-display.v1',startKaiUPulse:'0',endKaiUPulse:'100000000'}};
const identity=()=>({binding:{keyId:'original-local-key'},dispose:vi.fn(),knownWallet:()=>observation,prepareAccountView:async()=>observation}) as unknown as OpenIdentity;
beforeEach(()=>{for(const fn of [p.restore,p.create,p.importId,p.forget,p.reserve,p.pbi])fn.mockReset();p.restore.mockResolvedValue(null);p.reserve.mockReturnValue({close:vi.fn()});});
async function observe(run:(read:()=>ReturnType<typeof useNativeAccount>)=>Promise<void>){let state!:ReturnType<typeof useNativeAccount>;function Probe(){state=useNativeAccount();return null;}const root=createRoot(document.createElement('div'));try{await act(async()=>root.render(<Probe/>));await run(()=>state);}finally{act(()=>root.unmount());}}
it('does no PBI preparation on cold entry, Enter or import',async()=>{
 p.create.mockRejectedValue(Error('ordinary fixture'));p.importId.mockRejectedValue(Error('ordinary fixture'));
 await observe(async read=>{expect(p.module).not.toHaveBeenCalled();expect(p.reserve).not.toHaveBeenCalled();await act(async()=>{await read().create(true);await read().importId({} as File,'',true);});expect(p.pbi).not.toHaveBeenCalled();expect(p.reserve).not.toHaveBeenCalled();expect(p.module).not.toHaveBeenCalled();});
});
it('keeps the selected recovered account, original balance and full history in the same settled frame',async()=>{
 const original=identity();p.pbi.mockResolvedValue(original);
 await observe(async read=>{await act(async()=>{await read().pbi();});expect(read().identity).toBe(original);expect(read().wallet?.userId).toBe('original-account');expect(read().wallet?.totalUsdCents).toBe('45123');expect(read().walletHistory).toEqual(observation.history);expect(p.pbi).toHaveBeenCalledWith(p.reserve.mock.results[0].value,true);expect(p.create).not.toHaveBeenCalled();expect(p.importId).not.toHaveBeenCalled();});
});
it('keeps cancelled PBI on the unchanged entrance without creating or importing an account',async()=>{
 p.pbi.mockRejectedValue(Error('passkey_cancelled'));
 await observe(async read=>{await act(async()=>{await read().pbi();});expect(read().identity).toBeNull();expect(read().busy).toBe(false);expect(read().error).toBe('passkey_cancelled');expect(p.create).not.toHaveBeenCalled();expect(p.importId).not.toHaveBeenCalled();});
});
