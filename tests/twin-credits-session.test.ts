import {expect,it,vi} from 'vitest';
import {twinCreditsSession} from '../src/receiz/twin-credits-session';
import type {OpenIdentity} from '../src/receiz/native-identity';
import type {TwinUpgradeInput} from '../src/receiz/twin-upgrade';
it('retains one chosen top-up across chat navigation and retries the exact operation after an uncertain response',async()=>{
 const calls:TwinUpgradeInput[]=[],upgradeTwin=vi.fn(async(input:TwinUpgradeInput)=>{calls.push(input);if(calls.length===1)throw Error('response lost');return{accountUid:'owner',twinAccess:true,creditsCheckout:{sessionId:'cs_test_credits12345678',clientSecret:'cs_test_credits12345678_secret_fixture',credits:'2500',amountUsdCents:'2500'}};}),identity={upgradeTwin} as unknown as OpenIdentity;
 const a=twinCreditsSession(identity);await a.start('25');expect(a.known().uncertain).toBe(true);const b=twinCreditsSession(identity);expect(b).toBe(a);await b.start('100');expect(upgradeTwin).toHaveBeenCalledTimes(1);await b.retry();expect(calls[1]).toEqual(calls[0]);expect(b.known().checkout?.credits).toBe('2500');
});
it('shows added credits only after native settlement and keeps an unpaid checkout recoverable',async()=>{
 let paid=false;const identity={upgradeTwin:vi.fn(async(input:TwinUpgradeInput)=>input.action==='credits-checkout'?{accountUid:'owner',twinAccess:true,creditsCheckout:{sessionId:'cs_test_credits12345678',clientSecret:'cs_test_credits12345678_secret_fixture',credits:'1000',amountUsdCents:'1000'}}:{accountUid:'owner',twinAccess:true,creditsStatus:{sessionId:'cs_test_credits12345678',state:paid?'paid':'open',settled:paid},...(paid?{creditsBalance:{grantRemaining:'0',purchasedRemaining:'1000',totalRemaining:'1000'}}:{})})} as unknown as OpenIdentity;
 const session=twinCreditsSession(identity);await session.start('10');await session.check();expect(session.known().settled).toBe(false);expect(session.known().checkout).not.toBeNull();paid=true;await session.check();expect(session.known().settled).toBe(true);expect(session.known().balance?.totalRemaining).toBe('1000');
});
it('honors a top-up click while a balance read is finishing without losing its purchase intent',async()=>{
 let release!:()=>void;const waiting=new Promise<void>(resolve=>{release=resolve;});const upgradeTwin=vi.fn(async(input:TwinUpgradeInput)=>{if(input.action==='credits-balance'){await waiting;return{accountUid:'owner',twinAccess:true,creditsBalance:{grantRemaining:'0',purchasedRemaining:'0',totalRemaining:'0'}};}return{accountUid:'owner',twinAccess:true,creditsCheckout:{sessionId:'cs_test_credits12345678',clientSecret:'cs_test_credits12345678_secret_fixture',credits:'2500',amountUsdCents:'2500'}};});
 const session=twinCreditsSession({upgradeTwin} as unknown as OpenIdentity),balance=session.balance(),purchase=session.start('25');release();await balance;await purchase;expect(upgradeTwin).toHaveBeenCalledTimes(2);expect(session.known().checkout?.credits).toBe('2500');
});
it('allows a new intentional top-up only after native confirmation of the prior one',async()=>{
 const upgradeTwin=vi.fn(async(input:TwinUpgradeInput)=>input.action==='credits-checkout'?{accountUid:'owner',twinAccess:true,creditsCheckout:{sessionId:'cs_test_credits12345678',clientSecret:'cs_test_credits12345678_secret_fixture',credits:'1000',amountUsdCents:'1000'}}:{accountUid:'owner',twinAccess:true,creditsStatus:{sessionId:'cs_test_credits12345678',state:'paid',settled:true}});
 const s=twinCreditsSession({upgradeTwin} as unknown as OpenIdentity);await s.start('10');s.newTopUp();await s.start('25');expect(upgradeTwin).toHaveBeenCalledTimes(1);await s.check();s.newTopUp();await s.start('25');expect(upgradeTwin).toHaveBeenCalledTimes(3);expect(upgradeTwin.mock.calls[2][0]).not.toEqual(upgradeTwin.mock.calls[0][0]);
});
