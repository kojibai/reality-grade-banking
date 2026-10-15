import { createReceizArtifactAdmissionEngine } from "./artifactAdmission.js";
import { verifyReceizArtifact } from "./artifactVerification.js";
import { receizBase64UrlDecode } from "./identity.js";
import { prepareReceizSubjectSourceProofObjectCandidateV124, readReceizSubjectSourceV124 } from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { admitReceizKksV1ProofCoordinate } from "./v125KaiAuthority.js";

import { prepareInitialTemporalProofBytesV125 } from "./v125InitialTemporalSource.js";

/** Explicit initial issuance only; this never migrates an already sealed history. */
export async function prepareReceizInitialTemporalSubjectSourceV125(input: Readonly<{
  initialSource: true;
  subject: Parameters<typeof prepareReceizSubjectSourceProofObjectCandidateV124>[0];
  kksCoordinate: unknown;
}>) {
  const { subjectState: state, portable } = input.subject;
  if (input.initialSource !== true || state.head !== state.genesisHead || state.causalParents.length !== 0
    || portable.provenance.appends.length !== 0 || portable.ownership.proofRef !== "genesis") {
    throw new TypeError("V125_SUBJECT_GENUINE_INITIAL_SOURCE_REQUIRED");
  }
  const coordinate = await admitReceizKksV1ProofCoordinate(input.kksCoordinate, { expectedPreviousKaiSigilProofHead: null });
  const candidate = await prepareReceizSubjectSourceProofObjectCandidateV124(input.subject);
  const bytes = await prepareInitialTemporalProofBytesV125({ bytes: candidate.proofObject.payload.bytes, kksCoordinate: coordinate,
    receipt: { schema: "receiz.subject-initial-source.v125", subjectStateDigest: state.stateDigest } });
  return Object.freeze({ ...candidate, proofObject: Object.freeze({ ...candidate.proofObject,
    payload: Object.freeze({ ...candidate.proofObject.payload, bytes }) }) });
}

/** Both the embedded immutable subject and carried history derive from this exact seal. */
export async function readReceizTemporalSubjectSourceV125(artifact: ReceizPortableSealedArtifactV124) {
  const source = await readReceizSubjectSourceV124(artifact);
  const bytes = receizBase64UrlDecode(artifact.exactBytesB64u);
  const verification = await verifyReceizArtifact(new File([new Uint8Array(bytes).buffer], artifact.filename, { type: artifact.mimeType }));
  const admission = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" });
  if (admission.verdict !== "bearer-recovery" || admission.profile !== "portable-state"
    || admission.artifactSha256 !== source.artifactSha256 || !admission.proofHistory
    || admission.proofHistory.headDigests.length !== 1) throw new TypeError("V125_SUBJECT_TEMPORAL_SOURCE_REQUIRED");
  const head = admission.proofHistory.nodes.find((node) => node.nodeDigest === admission.proofHistory!.headDigests[0])!;
  const coordinate = await admitReceizKksV1ProofCoordinate(head.namespaceData["receiz.kks-v1"]);
  return { source, admission, head: head.nodeDigest, coordinate };
}
