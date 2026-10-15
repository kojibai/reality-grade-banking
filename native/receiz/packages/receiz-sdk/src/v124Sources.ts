import {
  admitReceizAuthenticatedRuntimeWireV124,
  createReceizAuthenticatedRuntimeRequestV124,
  getReceizAuthenticatedRuntimeAdmissionV124,
  type ReceizAuthenticatedRuntimeRequestV124,
} from "./v124AuthenticatedRuntime.js";
import { applicationId, closedRecord, digest, freeze, text } from "./v124Contracts.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import {
  parseReceizPortableReplaySourceArtifactV124,
  verifyAndReadReceizDomainReplayProofObjectV124,
} from "./v124ReplayProofObject.js";

export type ReceizSealedSourcePublicationKindV124 =
  | "subject"
  | "replay-segment"
  | "checkpoint";

export type ReceizPublishSealedSourceInputV124 = Readonly<{
  applicationId: string;
  authoritySessionHandle: string | null;
  sourceArtifact: ReceizPortableSealedArtifactV124;
}>;

export type ReceizSealedSourcePublicationResultV124 = Readonly<{
  schema: "receiz.sealed-source-publication-result.v124";
  status: "published" | "idempotent";
  sourceKind: ReceizSealedSourcePublicationKindV124;
  artifactSha256: string;
  sourceBindingDigest: string;
  authority: Readonly<{
    publicationIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizV124SourcesRemoteV124 = (
  request: ReceizAuthenticatedRuntimeRequestV124,
) => Promise<Readonly<{ wire: unknown; receipt: unknown }>>;

const PATH = "/api/sdk/v1/sources/publish";

function fail(code: string): never { throw new TypeError(code); }

function sessionHandle(value: unknown): string | null {
  if (value === null) return null;
  const result = text(value, "V124_SOURCE_PUBLICATION_SESSION_INVALID");
  if (result.length > 512) fail("V124_SOURCE_PUBLICATION_SESSION_INVALID");
  return result;
}

function sourceKind(value: unknown): ReceizSealedSourcePublicationKindV124 {
  if (value !== "subject" && value !== "replay-segment" && value !== "checkpoint") {
    fail("V124_SOURCE_PUBLICATION_RESULT_INVALID");
  }
  return value;
}

async function pinnedSourceKind(
  artifact: ReceizPortableSealedArtifactV124,
  expectedApplicationId: string,
): Promise<ReceizSealedSourcePublicationKindV124> {
  const opened = await verifyAndReadReceizDomainReplayProofObjectV124(artifact);
  if (opened.carrier === null || typeof opened.carrier !== "object"
    || Array.isArray(opened.carrier)) {
    fail("V124_SOURCE_PUBLICATION_SOURCE_INVALID");
  }
  const descriptors = Object.getOwnPropertyDescriptors(opened.carrier);
  const schemaDescriptor = descriptors.schema;
  if (!schemaDescriptor || !schemaDescriptor.enumerable
    || !("value" in schemaDescriptor)
    || typeof schemaDescriptor.value !== "string") {
    fail("V124_SOURCE_PUBLICATION_SOURCE_INVALID");
  }
  if (schemaDescriptor.value === "receiz.viewer-subject-source.v124") {
    return "subject";
  }
  const applicationDescriptor = descriptors.applicationId;
  if (!applicationDescriptor || !applicationDescriptor.enumerable
    || !("value" in applicationDescriptor)
    || applicationId(
      applicationDescriptor.value,
      "V124_SOURCE_PUBLICATION_SOURCE_INVALID",
    ) !== expectedApplicationId) {
    fail("V124_SOURCE_PUBLICATION_SOURCE_INVALID");
  }
  if (schemaDescriptor.value === "receiz.domain-replay-segment-proof.v124") {
    return "replay-segment";
  }
  if (schemaDescriptor.value === "receiz.domain-replay-checkpoint-proof.v124") {
    return "checkpoint";
  }
  return fail("V124_SOURCE_PUBLICATION_SOURCE_INVALID");
}

function publicationInput(value: unknown): ReceizPublishSealedSourceInputV124 {
  const record = closedRecord(value, [
    "applicationId", "authoritySessionHandle", "sourceArtifact",
  ], "V124_SOURCE_PUBLICATION_INPUT_INVALID");
  return freeze({
    applicationId: applicationId(
      record.applicationId,
      "V124_SOURCE_PUBLICATION_INPUT_INVALID",
    ),
    authoritySessionHandle: sessionHandle(record.authoritySessionHandle),
    sourceArtifact: parseReceizPortableReplaySourceArtifactV124(record.sourceArtifact),
  });
}

function resultAuthority(value: unknown): ReceizSealedSourcePublicationResultV124["authority"] {
  const record = closedRecord(value, [
    "publicationIsProofAuthority", "strongerTruth",
  ], "V124_SOURCE_PUBLICATION_RESULT_INVALID");
  if (record.publicationIsProofAuthority !== false
    || record.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_SOURCE_PUBLICATION_RESULT_INVALID");
  }
  return freeze({
    publicationIsProofAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
}

/**
 * Projects only an already runtime-admitted source-publication response. Raw
 * caller JSON, including self-digested JSON, has no admission and is rejected.
 */
export async function validateReceizSealedSourcePublicationResultV124(
  value: unknown,
  expectedValue: Readonly<{ applicationId: string; artifactSha256: string }>,
): Promise<ReceizSealedSourcePublicationResultV124> {
  const expectedRecord = closedRecord(expectedValue, [
    "applicationId", "artifactSha256",
  ], "V124_SOURCE_PUBLICATION_RESULT_EXPECTATION_INVALID");
  const expected = freeze({
    applicationId: applicationId(
      expectedRecord.applicationId,
      "V124_SOURCE_PUBLICATION_RESULT_EXPECTATION_INVALID",
    ),
    artifactSha256: digest(
      expectedRecord.artifactSha256,
      "V124_SOURCE_PUBLICATION_RESULT_EXPECTATION_INVALID",
    ),
  });
  const admission = getReceizAuthenticatedRuntimeAdmissionV124(value);
  const requestBody = publicationInput(admission.request.body);
  if (admission.request.path !== PATH
    || admission.request.method !== "POST"
    || admission.request.applicationId !== expected.applicationId
    || admission.request.audience !== expected.applicationId
    || admission.request.strongerTruth !== "sealed-receiz-proof-object"
    || admission.receipt.authority.strongerTruth !== "sealed-receiz-proof-object"
    || requestBody.applicationId !== expected.applicationId
    || requestBody.sourceArtifact.artifactSha256 !== expected.artifactSha256) {
    fail("V124_SOURCE_PUBLICATION_RUNTIME_BINDING_INVALID");
  }

  const record = closedRecord(value, [
    "schema", "status", "sourceKind", "artifactSha256", "sourceBindingDigest",
    "authority",
  ], "V124_SOURCE_PUBLICATION_RESULT_INVALID");
  if (record.schema !== "receiz.sealed-source-publication-result.v124"
    || (record.status !== "published" && record.status !== "idempotent")) {
    fail("V124_SOURCE_PUBLICATION_RESULT_INVALID");
  }
  const artifactSha256 = digest(
    record.artifactSha256,
    "V124_SOURCE_PUBLICATION_RESULT_INVALID",
  );
  if (artifactSha256 !== expected.artifactSha256) {
    fail("V124_SOURCE_PUBLICATION_RESULT_INVALID");
  }
  const kind = sourceKind(record.sourceKind);
  if ((requestBody.authoritySessionHandle === null) !== (kind === "subject")) {
    fail("V124_SOURCE_PUBLICATION_RESULT_INVALID");
  }
  const sourceBindingDigest = digest(
    record.sourceBindingDigest,
    "V124_SOURCE_PUBLICATION_RESULT_INVALID",
  );
  const authority = resultAuthority(record.authority);
  if (kind !== await pinnedSourceKind(
    requestBody.sourceArtifact,
    expected.applicationId,
  )) {
    fail("V124_SOURCE_PUBLICATION_KIND_MISMATCH");
  }
  return freeze({
    schema: "receiz.sealed-source-publication-result.v124" as const,
    status: record.status,
    sourceKind: kind,
    artifactSha256,
    sourceBindingDigest,
    authority,
  });
}

/**
 * Source-publication coordination. The result is explicitly non-authoritative;
 * exact sealed artifact bytes remain the stronger proof object.
 */
export function createReceizV124Sources(remote: ReceizV124SourcesRemoteV124) {
  if (typeof remote !== "function") fail("V124_SOURCE_PUBLICATION_REMOTE_INVALID");
  const publishSealedSourceV124 = async (
    value: ReceizPublishSealedSourceInputV124,
  ): Promise<ReceizSealedSourcePublicationResultV124> => {
    const input = publicationInput(value);
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: PATH,
      applicationId: input.applicationId,
      audience: input.applicationId,
      strongerTruth: "sealed-receiz-proof-object",
      body: input,
    });
    const response = closedRecord(
      await remote(request),
      ["wire", "receipt"],
      "V124_SOURCE_PUBLICATION_REMOTE_RESPONSE_INVALID",
    );
    const wire = await admitReceizAuthenticatedRuntimeWireV124({
      request,
      wire: response.wire,
      receipt: response.receipt,
    });
    return validateReceizSealedSourcePublicationResultV124(wire, {
      applicationId: input.applicationId,
      artifactSha256: input.sourceArtifact.artifactSha256,
    });
  };
  return freeze({
    publishSealedSourceV124,
    publishSealedSource: publishSealedSourceV124,
  });
}
