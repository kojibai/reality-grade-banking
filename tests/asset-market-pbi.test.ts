import {afterEach,expect,it,vi} from 'vitest';
import {signAssetMarketPublication} from '../src/receiz/asset-market-pbi';
import {verifyLocalPbiAuthorshipProof} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>import('@receiz/sdk')}));
const encode=(value:ArrayBuffer|Uint8Array)=>Buffer.from(value instanceof Uint8Array?value:new Uint8Array(value)).toString('base64url');
const input={slug:'20261027_1200',code:'ABCDEF12',pulse:'14750000',claimHashHex:'a'.repeat(64),proofObjectScope:{predecessorArtifactSha256:'b'.repeat(64),predecessorProofHead:'c'.repeat(64),receizId:'d'.repeat(64),authorshipPosition:0,kaiUpulse:'14750000000000'}};
afterEach(()=>vi.unstubAllGlobals());
it.each(['valid','cancelled','wrong-origin','bad-signature'] as const)('uses the actual PBI authenticator proof for the exact published object: %s',async mode=>{
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 const key=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),publicKey=await crypto.subtle.exportKey('spki',key.publicKey),credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(publicKey).toString('base64')}\n-----END PUBLIC KEY-----`};
 const get=vi.fn(async(options:CredentialRequestOptions)=>{
  if(mode==='cancelled')throw new DOMException('Cancelled','NotAllowedError');
  const challenge=encode(options.publicKey!.challenge as ArrayBuffer),auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge,origin:mode==='wrong-origin'?'https://evil.test':'https://bankeiz.com',crossOrigin:false})),hash=new Uint8Array(await crypto.subtle.digest('SHA-256',client)),payload=new Uint8Array(69);payload.set(auth);payload.set(hash,37);
  const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key.privateKey,payload));if(mode==='bad-signature')signature[0]^=1;
  return{type:'public-key',rawId:new Uint8Array([1,2]).buffer,response:{authenticatorData:auth.buffer,clientDataJSON:client.buffer,signature:signature.buffer}};
 });vi.stubGlobal('navigator',{credentials:{get}});
 if(mode!=='valid')await expect(signAssetMarketPublication(input,credential,()=>{})).rejects.toThrow();
 else{const proof=await signAssetMarketPublication(input,credential,()=>{});expect(proof.input).toEqual(input);expect(await verifyLocalPbiAuthorshipProof(proof,args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}}))).toBe(true);expect(await verifyLocalPbiAuthorshipProof({...proof,input:{...proof.input,claimHashHex:'f'.repeat(64)}})).toBe(false);}
 expect(get).toHaveBeenCalledOnce();
});
