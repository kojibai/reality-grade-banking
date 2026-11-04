"use client";
import { performPresenceBoundAssertionWithKnownCredentialOnCurrentOrigin } from "@/app/utils/pbi/webauthn";
import { verifyLocalPbiAssertion } from "./localVerifier";
import { createLocalPbiAuthorshipProof as createCanonicalLocalPbiAuthorshipProof,
  verifyLocalPbiAuthorshipProof as verifyCanonicalLocalPbiAuthorshipProof } from "../../../packages/receiz-sdk/src/pbiLocalAuthorship";
export * from "../../../packages/receiz-sdk/src/pbiLocalAuthorship";

export const createLocalPbiAuthorshipProof: typeof createCanonicalLocalPbiAuthorshipProof = (args) =>
  createCanonicalLocalPbiAuthorshipProof({ ...args, dependencies: {
    ...args.dependencies,
    performAssertion: args.dependencies?.performAssertion ?? performPresenceBoundAssertionWithKnownCredentialOnCurrentOrigin,
    verifyAssertion: args.dependencies?.verifyAssertion ?? verifyLocalPbiAssertion,
  } });
export const verifyLocalPbiAuthorshipProof: typeof verifyCanonicalLocalPbiAuthorshipProof =
  (proof, verifyAssertion = verifyLocalPbiAssertion) => verifyCanonicalLocalPbiAuthorshipProof(proof, verifyAssertion);
