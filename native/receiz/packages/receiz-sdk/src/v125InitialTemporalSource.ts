import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";
import { createReceizProofHistoryNode, normalizeReceizProofHistory } from "./proofHistory.js";
import { deriveReceizPortableOwnershipContinuity, replaceReceizPortableProofHistoryBytes } from "./portableAsset.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import { digestReceizConstitution, type ReceizConstitutionJson } from "./constitution.js";
import { RECEIZ_CURRENT_CONSTITUTION_REGISTRY } from "./currentRegistry.generated.js";

/** Private initial issuance composition; never retrofits already sealed history. */
export async function prepareInitialTemporalProofBytesV125(input: Readonly<{
  bytes: Uint8Array; kksCoordinate: unknown; receipt: ReceizConstitutionJson;
}>): Promise<Uint8Array> {
  const bytes = new Uint8Array(input.bytes);
  const receipt = structuredClone(input.receipt);
  const kks = structuredClone(input.kksCoordinate);
  const coordinate = await admitReceizKksV1ProofCoordinate(kks, { expectedPreviousKaiSigilProofHead: null });
  const document = JSON.parse(new TextDecoder().decode(bytes));
  if (document.receizProofHistory !== undefined) throw new TypeError("V125_SUBJECT_GENUINE_INITIAL_SOURCE_REQUIRED");
  const identity = await deriveReceizPortableOwnershipContinuity(document);
  const registryDigest = await digestReceizConstitution(RECEIZ_CURRENT_CONSTITUTION_REGISTRY);
  const root = await createReceizProofHistoryNode({
    artifactId: identity.artifactId, registryDigest, parentDigests: [], kaiPulse: coordinate.kaiPulse,
    receipt,
    event: { type: "ownership.transition", fromOwnerReceizId: null, toOwnerReceizId: identity.ownerReceizId },
    namespaceData: { "receiz.kks-v1": coordinate as unknown as ReceizConstitutionJson },
  });
  const history = await normalizeReceizProofHistory({ artifactId: identity.artifactId, registryDigest, nodes: [root],
    verifyReceipt: async (receipt, expected) => await digestReceizAuthority("receipt", "receiz.proof-history-receipt.v111", receipt) === expected });
  return replaceReceizPortableProofHistoryBytes(bytes, history);
}
