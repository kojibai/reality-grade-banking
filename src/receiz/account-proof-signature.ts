import {canonicalizeReceizV122} from "@receiz/sdk";
import {digestReceizCanonicalV122} from "@receiz/sdk";
import {receizBase64UrlEncode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature} from "@receiz/sdk";
import {receizCurrentPinnedSignatureV4Roots} from "../../native/receiz/packages/receiz-sdk/src/verifier/roots";
import type {ReceizSignatureV4RootPublicKey} from "../../native/receiz/packages/receiz-sdk/src/verifier/signatureV4";
import {inspectAccountStatement,type AccountStatement} from "./account-proof-statement";
export const BANK_NATIVE_ACCOUNT_STATEMENT_DOMAIN="receiz.bank.native-account-statement.root-signature.v2";
/** Typed public financial projection beneath the existing canonical enclosing
 * proof. A document seal alone never attests a self-declared account balance.
 * This neither admits a wallet nor makes any funds spendable. Production
 * callers use only the existing v129 canonical roots, never keys from a file. */
export async function verifyBankNativeAccountStatementSignature(input:unknown,applicationId:string,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>=receizCurrentPinnedSignatureV4Roots()):Promise<AccountStatement|null>{
 try{
  const statement=inspectAccountStatement(input,applicationId);
  if(!["bankeiz.public-account-statement.v2","bankeiz.public-account-statement.v3"].includes(statement.schema)||statement.domain!==BANK_NATIVE_ACCOUNT_STATEMENT_DOMAIN||!statement.rootSignature||!statement.issuerRootKid)return null;
  if(statement.schema==="bankeiz.public-account-statement.v3"&&await digestReceizCanonicalV122(statement.sourceFrontier)!==statement.checkpoint.accountHead)return null;
  const {rootSignature,...payload}=statement,root=roots.get(statement.issuerRootKid),pulse=BigInt(statement.checkpoint.kaiUPulse)/1_000_000n;
  if(!root||root.kid!==statement.issuerRootKid||root.alg!=="Ed25519"||rootSignature.kid!==root.kid
    ||root.status!=="active"&&root.status!=="retired"||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)
    ||root.status==="retired"&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))return null;
  const keyId=await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,"Ed25519");
  if(!await verifyReceizIdentityPublicKeyProjectionSignature({keyId,alg:"Ed25519",publicKeyRawB64u:root.publicKeyRawB64u,
    challengeB64Url:receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(payload))),signatureB64Url:rootSignature.sig}))return null;
  return statement;
 }catch{return null;}
}
