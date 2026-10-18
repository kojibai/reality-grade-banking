import {canonicalizeReceizV122} from "@receiz/sdk";
import {receizBase64UrlEncode,receizBase64UrlDecode} from "@receiz/sdk";
export const PAYMENT_DOMAIN="receiz.bank.native-payment.root-signature.v1";
export type NativePaymentRequest=Readonly<{schema:"bankeiz.operation-request.v1";applicationId:string;requestId:string;actorReceizId:string;kind:"send-value";rail:"reserve"|"settlement";amountUsdCents:string;recipient:string}>;
export type NativePaymentTerms=Readonly<{debitUsdCents:string;debitPhiMicro:string;creditUsdCents:string;creditPhiMicro:string;feeUsdCents:string;quantityMicro:string;assetDigest:null;recipient:string;expiresAtKaiUPulse:number}>;
export type NativePaymentReview=Readonly<{schema:"receiz.bank.native-payment-review.v1";request:NativePaymentRequest;keyId:string;planDigest:string;terms:NativePaymentTerms}>;
export type NativePaymentPrepared=NativePaymentReview&Readonly<{ticket:string;challengeB64Url:string}>;
export type NativePaymentReceipt=Readonly<{schema:"receiz.bank.native-payment-receipt.v1";domain:typeof PAYMENT_DOMAIN;issuerRootKid:string;review:NativePaymentReview;transactionId:string;kaiUPulse:string;issuedAtKaiUPulse:string;nativeTransferSourceSha256:string;senderAfter:Readonly<{balancePhiMicro:string;reserveUsdCents:string;reserveBackingPhiMicro:string}>;rootSignature:Readonly<{kid:string;alg:"Ed25519";sig:string}>}>;
export const paymentSame=(a:unknown,b:unknown)=>canonicalizeReceizV122(a)===canonicalizeReceizV122(b);
export const paymentHex=(v:unknown):v is string=>typeof v==="string"&&/^[a-f0-9]{64}$/u.test(v);
const exact=(v:unknown,keys:string[]):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const int=(v:unknown):v is string=>typeof v==="string"&&/^(0|[1-9][0-9]{0,18})$/u.test(v);
export function inspectNativePaymentRequest(input:unknown):NativePaymentRequest{
 const v=input;if(!exact(v,["schema","applicationId","requestId","actorReceizId","kind","rail","amountUsdCents","recipient"])||v.schema!=="bankeiz.operation-request.v1"||v.kind!=="send-value"||!/^rc_[A-Za-z0-9_-]{1,128}$/u.test(String(v.applicationId))||!/^[A-Za-z0-9._:-]{8,120}$/u.test(String(v.requestId))||!["reserve","settlement"].includes(String(v.rail))||!int(v.amountUsdCents)||v.amountUsdCents==="0"||typeof v.actorReceizId!=="string"||!/^[A-Za-z0-9_@.-]{1,160}$/u.test(v.actorReceizId)||typeof v.recipient!=="string"||!/^[A-Za-z0-9_@.-]{1,160}$/u.test(v.recipient))throw Error("BANK_PAYMENT_REQUEST_INVALID");
 return structuredClone(v) as unknown as NativePaymentRequest;
}
export function inspectNativePaymentReview(input:unknown):NativePaymentReview{
 const v=input;if(!exact(v,["schema","request","keyId","planDigest","terms"])||v.schema!=="receiz.bank.native-payment-review.v1"||!paymentHex(v.keyId)||!paymentHex(v.planDigest))throw Error("BANK_PAYMENT_REVIEW_INVALID");
 const request=inspectNativePaymentRequest(v.request),t=v.terms;
 if(!exact(t,["debitUsdCents","debitPhiMicro","creditUsdCents","creditPhiMicro","feeUsdCents","quantityMicro","assetDigest","recipient","expiresAtKaiUPulse"])||!int(t.debitPhiMicro)||t.debitPhiMicro==="0"||t.debitUsdCents!==request.amountUsdCents||t.creditUsdCents!=="0"||t.creditPhiMicro!=="0"||t.feeUsdCents!=="0"||t.quantityMicro!=="0"||t.assetDigest!==null||t.recipient!==request.recipient||!Number.isSafeInteger(t.expiresAtKaiUPulse)||Number(t.expiresAtKaiUPulse)<=0)throw Error("BANK_PAYMENT_REVIEW_INVALID");
 return structuredClone(v) as unknown as NativePaymentReview;
}
export const nativePaymentChallenge=(review:NativePaymentReview)=>receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122({schema:"receiz.bank.native-payment-consent.v1",review:inspectNativePaymentReview(review)})));
export function nativePaymentReviewFromChallenge(challenge:string):NativePaymentReview{
 if(typeof challenge!=="string"||challenge.length>12000)throw Error("BANK_PAYMENT_CONSENT_INVALID");
 const raw=new TextDecoder("utf-8",{fatal:true}).decode(receizBase64UrlDecode(challenge)),v=JSON.parse(raw);
 if(!exact(v,["schema","review"])||v.schema!=="receiz.bank.native-payment-consent.v1"||canonicalizeReceizV122(v)!==raw)throw Error("BANK_PAYMENT_CONSENT_INVALID");return inspectNativePaymentReview(v.review);
}
export function inspectNativePaymentReceipt(input:unknown):NativePaymentReceipt{
 const v=input;if(!exact(v,["schema","domain","issuerRootKid","review","transactionId","kaiUPulse","issuedAtKaiUPulse","nativeTransferSourceSha256","senderAfter","rootSignature"])||v.schema!=="receiz.bank.native-payment-receipt.v1"||v.domain!==PAYMENT_DOMAIN||!paymentHex(v.nativeTransferSourceSha256)||!int(v.kaiUPulse)||!int(v.issuedAtKaiUPulse)||BigInt(String(v.issuedAtKaiUPulse))<BigInt(String(v.kaiUPulse))||!/^[-a-f0-9]{36}$/u.test(String(v.transactionId))||typeof v.issuerRootKid!=="string")throw Error("BANK_PAYMENT_RECEIPT_INVALID");
 inspectNativePaymentReview(v.review);const a=v.senderAfter,s=v.rootSignature;
 if(!exact(a,["balancePhiMicro","reserveUsdCents","reserveBackingPhiMicro"])||!Object.values(a).every(int)||BigInt(String(a.reserveBackingPhiMicro))>BigInt(String(a.balancePhiMicro))||!exact(s,["kid","alg","sig"])||s.kid!==v.issuerRootKid||s.alg!=="Ed25519"||typeof s.sig!=="string"||!/^[A-Za-z0-9_-]{86}$/u.test(s.sig))throw Error("BANK_PAYMENT_RECEIPT_INVALID");
 return structuredClone(v) as unknown as NativePaymentReceipt;
}

export type NativePaymentRefusal=Readonly<{schema:"receiz.bank.native-payment-refusal.v1";domain:typeof PAYMENT_DOMAIN;issuerRootKid:string;review:NativePaymentReview;reasonCode:"EXPIRED";kaiUPulse:string;rootSignature:Readonly<{kid:string;alg:"Ed25519";sig:string}>}>;
export function inspectNativePaymentRefusal(input:unknown):NativePaymentRefusal{
 const v=input;if(!exact(v,["schema","domain","issuerRootKid","review","reasonCode","kaiUPulse","rootSignature"])||v.schema!=="receiz.bank.native-payment-refusal.v1"||v.domain!==PAYMENT_DOMAIN||v.reasonCode!=="EXPIRED"||!int(v.kaiUPulse)||typeof v.issuerRootKid!=="string")throw Error("BANK_PAYMENT_REFUSAL_INVALID");
 const review=inspectNativePaymentReview(v.review),s=v.rootSignature;
 if(BigInt(String(v.kaiUPulse))<BigInt(review.terms.expiresAtKaiUPulse)||!exact(s,["kid","alg","sig"])||s.kid!==v.issuerRootKid||s.alg!=="Ed25519"||typeof s.sig!=="string"||!/^[A-Za-z0-9_-]{86}$/u.test(s.sig))throw Error("BANK_PAYMENT_REFUSAL_INVALID");return structuredClone(v) as unknown as NativePaymentRefusal;
}
