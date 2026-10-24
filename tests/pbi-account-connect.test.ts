import {beforeEach,expect,it,vi} from 'vitest';
import {connectPbiToAccount} from '../src/receiz/pbi-account-connect';
import type {OpenIdentity} from '../src/receiz/native-identity';
const p=vi.hoisted(()=>({bridge:vi.fn(),admit:vi.fn(),sign:vi.fn()}));
const key={keyId:'held-key',alg:'Ed25519',owner:{uid:'local-device'},crypto:{publicKeyRawB64u:'held-public'}};
vi.mock('../src/receiz/pbi-account-bridge',()=>({runPbiAccountConnection:p.bridge}));
vi.mock('../src/receiz/pbi-account-source',()=>({admitPbiAccountCredential:p.admit}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({readReceizIdentityArtifact:async()=>key,receizBase64UrlEncode:(bytes:Uint8Array)=>Buffer.from(bytes).toString('base64url'),signReceizIdentityLoginProof:p.sign})}));
const bytes=new Uint8Array([1,2,3]);
function held(){return {binding:{keyId:'held-key',publicKeyRawB64u:'held-public',identityOwnerReceizId:'local-device'},readWallet:vi.fn(async()=>({userId:'original-account',totalUsdCents:'45123'})),knownWallet:()=>({wallet:{userId:'original-account'}}),backup:()=>({bytes:new Uint8Array(bytes),phrase:'original phrase',filename:'original.png'}),persistDeviceCustody:vi.fn(),dispose:vi.fn()} as unknown as OpenIdentity;}
beforeEach(()=>{p.bridge.mockReset().mockResolvedValue({accountUid:'original-account',credentialId:'credential',sourceB64u:'original-source'});p.admit.mockReset().mockResolvedValue({accountUid:'original-account'});p.sign.mockReset().mockResolvedValue({signatureB64Url:'signed-original-key'});});
it('connects the held original account without replacing its ID, backup, balance or ordinary Identity Record custody',async()=>{
 const identity=held(),popup={close:vi.fn(),closed:false} as unknown as Window,assertCurrent=vi.fn();
 await connectPbiToAccount(identity,popup,assertCurrent);
 expect(p.bridge).toHaveBeenCalledWith(popup,{keyId:'held-key',alg:'Ed25519',publicKeyRawB64u:'held-public',localUid:'local-device'},'original-account',expect.any(Function));
 await p.bridge.mock.calls[0][3]();const signed=p.sign.mock.calls[0][0];expect(signed.keyFile).toEqual(key);expect(signed.passphrase).toBe('original phrase');expect(Buffer.from(signed.challengeB64Url,'base64url').toString()).toContain('RECEIZ_DEVICE_SWITCH_V1\nkeyId=held-key\nlocalUid=local-device\ntargetUid=original-account\n');
 expect(p.admit).toHaveBeenCalledWith('original-source',{accountUid:'original-account',credentialId:'credential'});expect(identity.backup()).toEqual({bytes,phrase:'original phrase',filename:'original.png'});expect(identity.persistDeviceCustody).not.toHaveBeenCalled();expect(identity.dispose).not.toHaveBeenCalled();
});
it('refuses source mismatch or cancellation without changing Identity Record sign-in',async()=>{
 const identity=held(),popup={close:vi.fn(),closed:false} as unknown as Window;p.admit.mockRejectedValue(Error('PBI_ACCOUNT_SOURCE_INVALID'));
 await expect(connectPbiToAccount(identity,popup,()=>{})).rejects.toThrow('PBI_ACCOUNT_SOURCE_INVALID');expect(identity.backup().bytes).toEqual(bytes);expect(identity.persistDeviceCustody).not.toHaveBeenCalled();
});
