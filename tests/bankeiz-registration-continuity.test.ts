import {expect,it} from 'vitest';
import {BANK_APPLICATION_ID,BANK_CARD_APPLICATION_IDS} from '../src/receiz/config';
import {cardOperationApplicationId} from '../src/receiz/card-deposit';
import {readWalletObservation} from '../src/receiz/wallet-observation';
import {permittedNativePath} from '../src/receiz/native-transport';
const previous='rc_uV6aT6wZJCQDspB0_SJ1DcEm';
it('uses the owner-created public Bankeiz client for new grants',()=>{expect(BANK_APPLICATION_ID).toBe('rc_2d1wcGkAYfmCi5kGT3J89gkl');});
it('retains prior deposits and first-paint observations under their original registration',()=>{
 expect(BANK_CARD_APPLICATION_IDS).toContain(previous);expect(cardOperationApplicationId(previous)).toBe(previous);
 const binding={keyId:'key-a',artifactSha256:'a'.repeat(64)};
 expect(readWalletObservation({schema:'receiz.bank.private-wallet-observation.v1',authority:'read-only-observation',applicationId:previous,...binding,observedAt:'2026-10-17T00:00:00Z',wallet:{userId:'same-user',totalUsdCents:'300',reserveUsdCents:'100',settlementUsdCents:'200',balancePhiMicro:'1000'}},binding)?.wallet.totalUsdCents).toBe('300');
});
it('admits only read-only recovery routes for the previous native registration',()=>{
 expect(permittedNativePath(`/api/connect/bank/payments/recover?applicationId=${previous}`,'POST')).toBe(true);
 for(const action of ['prepare','execute'])expect(permittedNativePath(`/api/connect/bank/payments/${action}?applicationId=${previous}`,'POST')).toBe(false);
 expect(permittedNativePath(`/api/sdk/v1/execution/by-idempotency/${previous}/custom%3Abankeiz/wallet.transfer/exact-key`,'GET')).toBe(true);
 expect(permittedNativePath(`/api/connect/bank/payments/recover?applicationId=foreign`,'POST')).toBe(false);
});
