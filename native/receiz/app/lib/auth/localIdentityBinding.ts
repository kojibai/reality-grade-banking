export const LOCAL_IDENTITY_BINDING_SCHEMA = "receiz.identity.local-global-binding.v1";

export type LocalIdentityBindingAppend = {
  schema: typeof LOCAL_IDENTITY_BINDING_SCHEMA;
  localUid: string;
  globalUid: string;
  keyId: string;
  actionHashHex: string;
  pbiReceiptHash: string;
  pbiChallengeId: string;
  boundAt: string;
  appendHashHex: string;
};

export function canonicalLocalIdentityBinding(input: {
  localUid: string;
  globalUid: string;
  keyId: string;
  actionHashHex: string;
  pbiReceiptHash: string;
  pbiChallengeId: string;
  boundAt: string;
}): string {
  return [
    "RECEIZ_IDENTITY_LOCAL_GLOBAL_BINDING_V1",
    `localUid=${input.localUid.trim()}`,
    `globalUid=${input.globalUid.trim()}`,
    `keyId=${input.keyId.trim().toLowerCase()}`,
    `actionHashHex=${input.actionHashHex.trim().toLowerCase()}`,
    `pbiReceiptHash=${input.pbiReceiptHash.trim().toLowerCase()}`,
    `pbiChallengeId=${input.pbiChallengeId.trim()}`,
    `boundAt=${input.boundAt.trim()}`,
  ].join("\n");
}
