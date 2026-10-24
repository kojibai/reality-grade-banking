import {parseCardCheckout,type CardCheckout} from '../card-deposit';
import {vaultCanonical,vaultDigest,vaultObject} from './encoding';
export type VaultCardCheckoutRequest={schema:'receiz.bank.vault-checkout.v1';vaultId:string;referenceId:string;amountUsdCents:string;returnUrl:string};
export function readVaultCardCheckoutRequest(value:unknown):VaultCardCheckoutRequest{
 const v=vaultObject(value,['schema','vaultId','referenceId','amountUsdCents','returnUrl']),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(v.schema!=='receiz.bank.vault-checkout.v1'||typeof v.vaultId!=='string'||!uuid.test(v.vaultId)||typeof v.referenceId!=='string'||!uuid.test(v.referenceId)||typeof v.amountUsdCents!=='string'||!/^[1-9]\d{1,7}$/.test(v.amountUsdCents)||BigInt(v.amountUsdCents)<50n||BigInt(v.amountUsdCents)>10000000n||typeof v.returnUrl!=='string'||v.returnUrl.length>2048)throw Error('VAULT_CARD_REQUEST_INVALID');
 const url=new URL(v.returnUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('VAULT_CARD_REQUEST_INVALID');return v as VaultCardCheckoutRequest;
}
/** Provider coordination, never money authority. The actual native allocation
 * remains required after observing the exact account-bound card settlement. */
export async function admitVaultCardCheckout(value:unknown,request:VaultCardCheckoutRequest,ownerUserId:string,applicationId:string):Promise<CardCheckout>{
 const envelope=value as {ok?:unknown;checkout?:{referenceId?:unknown};vaultCheckout?:unknown};
 const v=vaultObject(envelope?.vaultCheckout,['schema','vaultId','referenceId','amountUsdCents','returnUrl','requestSha256','userId','clientId']);
 const requestSha256=await vaultDigest(new TextEncoder().encode(vaultCanonical(request)));
 if(envelope.ok!==true||envelope.checkout?.referenceId!==request.referenceId||Object.entries(request).some(([key,x])=>v[key]!==x)||v.requestSha256!==requestSha256||v.userId!==ownerUserId||v.clientId!==applicationId)throw Error('VAULT_CARD_BINDING');
 return parseCardCheckout(value,request.amountUsdCents);
}
