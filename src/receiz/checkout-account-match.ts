const PATH='/api/auth/receiz-id/account-match';
type Sdk=typeof import('@receiz/sdk');
interface MatchPorts{sdk:Sdk;keyFile:Parameters<Sdk['signReceizIdentityLoginProof']>[0]['keyFile'];phrase:string;accountUid:string;request:typeof fetch;}
/** Explicit paid-account selection only. An admitted candidate proves its
 * registered key before any continuation or device-custody selection. */
export async function matchesCheckoutAccountEmail({sdk,keyFile,phrase,accountUid,request}:MatchPorts,email:string):Promise<boolean>{
 const normalized=email.trim().toLowerCase();if(normalized.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))return false;
 const body=JSON.stringify({purpose:'bankeiz.paid-booking.identity-match.v1',email:normalized}),bodyHashHex=await sdk.sha256ReceizBytes(new TextEncoder().encode(body));
 const actionId=await sdk.sha256ReceizBytes(new TextEncoder().encode(JSON.stringify([PATH,body,crypto.randomUUID()])));
 const challengeText=sdk.canonicalizeReceizConstitution({schema:'receiz.local.signed-action.v1',actionId,actionKind:'identity.account.match',scope:'bankeiz:paid-booking:identity-match',createdAt:'',actor:{uid:accountUid,localUid:keyFile.owner.uid,email:null,username:null,displayName:null,receizKeyId:keyFile.keyId,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u},request:{method:'POST',path:PATH,contentType:'application/json',bodyHashHex,bodyReplayText:null,replayable:false}});
 const proof=await sdk.signReceizIdentityLoginProof({keyFile,passphrase:phrase,challengeText});
 const response=await request('https://receiz.com'+PATH,{method:'POST',headers:{'content-type':'application/json','x-receiz-local-action-id':actionId,'x-receiz-local-action-key-id':keyFile.keyId,'x-receiz-local-action-public-key':keyFile.crypto.publicKeyRawB64u,'x-receiz-local-action-challenge':proof.challengeB64Url,'x-receiz-local-action-signature':proof.signatureB64Url},body});
 if(!response.ok){await response.body?.cancel();return false;}
 const result=await response.json();return result?.matched===true;
}
