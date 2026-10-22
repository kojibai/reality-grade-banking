import {expect,it} from 'vitest';
import {readHostedCheckoutState,hasPendingHostedCheckout,checkoutApprovalDigest,emptyCheckoutSnapshot,type CheckoutApproval} from '../src/receiz/checkout-state';
const owner='a'.repeat(64),nonce='10000000-0000-4000-8000-000000000001';
async function fixture(){const input={checkoutId:nonce,clientNonce:nonce,identityDigest:owner,accountUid:'10000000-0000-4000-8000-000000000002',recipient:{userId:'10000000-0000-4000-8000-000000000003',username:'merchant',displayName:'Merchant',avatarUrl:null},amountUsdCents:'1000',method:'card' as const,cardAmountUsdCents:'1000',balanceContributionUsdCents:'0',noteSourceDigests:[]};const approval:CheckoutApproval={...input,digest:await checkoutApprovalDigest(input)};return{schema:'bank.hosted-checkouts.v1' as const,identityDigest:owner,revision:1,current:{...emptyCheckoutSnapshot(),phase:'funding' as const,approval,approvalHistory:[approval]},history:[]};}
it('retains exact approved payment identity and refuses tampering',async()=>{
 const state=await fixture();expect(await readHostedCheckoutState(state,owner)).toEqual(state);expect(hasPendingHostedCheckout(state)).toBe(true);
 for(const field of ['amountUsdCents','method','clientNonce']as const){const changed=structuredClone(state);(changed.current.approval as any)[field]='changed';await expect(readHostedCheckoutState(changed,owner)).rejects.toThrow();}
 await expect(readHostedCheckoutState(state,'b'.repeat(64))).rejects.toThrow();
});
it('does not let an unsupported paid flag or missing Note source erase custody',async()=>{
 const state=await fixture();state.current.phase='paid' as any;await expect(readHostedCheckoutState(state,owner)).rejects.toThrow();
 const next=await fixture();(next.current.notes as any[]).push({noteId:nonce,status:'received',rail:'composite'});await expect(readHostedCheckoutState(next,owner)).rejects.toThrow();
});
it('permits removal of an unapproved edit but preserves pending entries anywhere in its history',async()=>{
 const editing={schema:'bank.hosted-checkouts.v1' as const,identityDigest:owner,revision:0,current:emptyCheckoutSnapshot(),history:[]};expect(hasPendingHostedCheckout(editing)).toBe(false);
 const funded=await fixture();expect(hasPendingHostedCheckout({...editing,history:[funded.current]})).toBe(true);
 await expect(readHostedCheckoutState({...editing,history:Array(1001).fill(editing.current)},owner)).rejects.toThrow();
});
