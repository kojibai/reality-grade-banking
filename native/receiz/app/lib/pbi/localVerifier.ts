import { pbiAllowedOrigins, PBI_RP_ID } from "./realm";
import { verifyLocalPbiAssertion as verifyCanonicalLocalPbiAssertion } from "../../../packages/receiz-sdk/src/pbiLocalVerifier";
export * from "../../../packages/receiz-sdk/src/pbiLocalVerifier";

/** Host policy decorates the shared pure assertion verifier. */
export const verifyLocalPbiAssertion: typeof verifyCanonicalLocalPbiAssertion = (args) =>
  verifyCanonicalLocalPbiAssertion({ ...args, policy: {
    ...args.policy, rpId: args.policy?.rpId ?? PBI_RP_ID,
    originAllowList: args.policy?.originAllowList ?? pbiAllowedOrigins(),
  } });
