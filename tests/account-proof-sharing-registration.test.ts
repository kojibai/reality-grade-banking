import {expect,it} from 'vitest';
import {createAccountProofSharing,type AccountProofSharing} from '../src/receiz/account-proof-sharing';
it('shows and disables the previous registration live-sharing consent as well as the current one',async()=>{
 let priorLive=true,disabled=0;
 const status=()=>({schema:'bankeiz.account-proof-sharing.v1' as const,sharingHead:'a'.repeat(64),liveUpdates:false,latestSourceDigest:null});
 const previous:AccountProofSharing={status:async()=>({...status(),liveUpdates:priorLive}),disable:async()=>{disabled++;priorLive=false;return status();},publish:async()=>{throw Error('MUST_NOT_PUBLISH_PREVIOUS');}};
 const api=createAccountProofSharing({keyId:'b'.repeat(64),receizId:'test.receiz.id',previous,assertOpen(){},request:async()=>status(),signConsent:async()=>{throw Error('CURRENT_IS_ALREADY_OFF');}});
 expect((await api.status()).otherLiveUpdates).toBe(true);
 const closed=await api.disable();expect(disabled).toBe(1);expect(closed.liveUpdates).toBe(false);expect(closed.otherLiveUpdates).toBe(false);
});
