import {
  admitReceizAuthenticatedRuntimeWireV124,
  createReceizAuthenticatedRuntimeRequestV124,
  getReceizAuthenticatedRuntimeAdmissionV124,
  type ReceizAuthenticatedRuntimeRequestV124,
} from "./v124AuthenticatedRuntime.js";
import {
  normalizeReceizNamespaceNamesV123,
  validateReceizNamespaceResolutionV123,
  type ReceizSubjectNamespaceResolutionV123,
} from "./v123Namespaces.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { applicationId, closedRecord, digest, freeze, text } from "./v124Contracts.js";

/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124NamespacesRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
  wire: unknown;
  receipt: unknown;
}>>;

/** Source-internal factory options.  Application/audience are configured truth bindings, never caller selection. */
export type ReceizV124NamespacesRuntimeOptions = Readonly<{
  applicationId: string;
  audience: string;
}>;

export type ReceizResolveNamespacesInputV124 = Readonly<{
  subjectId: string;
  atHead: string;
  names: readonly string[];
  expectedAdmittedProofDigest: string;
  expectedOwnershipHead: string;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
}>;

/** This is the validated existing V123 namespace primitive, not a new namespace authority. */
export type ReceizValidatedNamespaceProjectionV124 = ReceizSubjectNamespaceResolutionV123;

function fail(code: string): never { throw new TypeError(code); }

function runtimeOptions(value: ReceizV124NamespacesRuntimeOptions): Readonly<{
  applicationId: string;
  audience: string;
}> {
  const record = closedRecord(value, ["applicationId", "audience"], "V124_NAMESPACES_RUNTIME_OPTIONS_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_NAMESPACES_RUNTIME_OPTIONS_INVALID"),
    audience: text(record.audience, "V124_NAMESPACES_RUNTIME_OPTIONS_INVALID"),
  });
}

function input(value: ReceizResolveNamespacesInputV124): Readonly<{
  subjectId: string;
  atHead: string;
  names: readonly string[];
  expectedAdmittedProofDigest: string;
  expectedOwnershipHead: string;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
}> {
  const record = closedRecord(value, [
    "subjectId",
    "atHead",
    "names",
    "expectedAdmittedProofDigest",
    "expectedOwnershipHead",
    "expectedRegistryDigest",
    "expectedReducerDigest",
  ], "V124_NAMESPACES_INPUT_INVALID");
  let names: readonly string[];
  try { names = normalizeReceizNamespaceNamesV123(record.names as readonly string[]); } catch { fail("V124_NAMESPACES_INPUT_INVALID"); }
  return freeze({
    subjectId: text(record.subjectId, "V124_NAMESPACES_INPUT_INVALID"),
    atHead: digest(record.atHead, "V124_NAMESPACES_INPUT_INVALID"),
    names,
    expectedAdmittedProofDigest: digest(record.expectedAdmittedProofDigest, "V124_NAMESPACES_INPUT_INVALID"),
    expectedOwnershipHead: digest(record.expectedOwnershipHead, "V124_NAMESPACES_INPUT_INVALID"),
    expectedRegistryDigest: digest(record.expectedRegistryDigest, "V124_NAMESPACES_INPUT_INVALID"),
    expectedReducerDigest: digest(record.expectedReducerDigest, "V124_NAMESPACES_INPUT_INVALID"),
  });
}

function exactV123Projection(value: unknown): ReceizSubjectNamespaceResolutionV123 {
  const record = closedRecord(value, [
    "schema",
    "subjectId",
    "atHead",
    "admittedProofDigest",
    "ownershipHead",
    "registryDigest",
    "reducerDigest",
    "namespaces",
    "authority",
    "resolutionDigest",
    "sourceArtifact",
  ], "V124_NAMESPACES_RESPONSE_CLOSED_SHAPE_INVALID");
  if (!Array.isArray(record.namespaces)) fail("V124_NAMESPACES_RESPONSE_CLOSED_SHAPE_INVALID");
  for (const namespace of record.namespaces) {
    const entry = closedRecord(namespace, ["name", "found", "exactBytesB64u", "digest"], "V124_NAMESPACES_RESPONSE_CLOSED_SHAPE_INVALID");
    if (entry.found === true) {
      if (typeof entry.exactBytesB64u !== "string" || entry.exactBytesB64u.length === 0) fail("V124_NAMESPACES_NAMESPACE_ENCODING_INVALID");
      let bytes: Uint8Array;
      try { bytes = receizBase64UrlDecode(entry.exactBytesB64u); } catch { fail("V124_NAMESPACES_NAMESPACE_ENCODING_INVALID"); }
      if (receizBase64UrlEncode(bytes) !== entry.exactBytesB64u) fail("V124_NAMESPACES_NAMESPACE_ENCODING_INVALID");
    }
  }
  closedRecord(record.authority, ["resolutionIsProofAuthority", "strongerTruth"], "V124_NAMESPACES_RESPONSE_CLOSED_SHAPE_INVALID");
  const { sourceArtifact: _sourceArtifact, ...projection } = record;
  return freeze(projection) as ReceizSubjectNamespaceResolutionV123;
}

async function authenticatedWire(
  remote: ReceizV124NamespacesRemoteV124,
  request: ReceizAuthenticatedRuntimeRequestV124,
): Promise<unknown> {
  const response = closedRecord(await remote(request), ["wire", "receipt"], "V124_NAMESPACES_REMOTE_RESPONSE_INVALID");
  const wire = await admitReceizAuthenticatedRuntimeWireV124({ request, wire: response.wire, receipt: response.receipt });
  const admitted = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  if (admitted.request.requestDigest !== request.requestDigest
    || admitted.request.path !== "/api/sdk/v1/subjects/namespaces/resolve"
    || admitted.request.strongerTruth !== "sealed-receiz-proof-object"
    || admitted.receipt.authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_NAMESPACES_RUNTIME_BINDING_INVALID");
  }
  return wire;
}

/**
 * Source-internal client composition.  It never admits raw remote JSON: the runtime
 * receipt has to custody the frozen wire before the V123 proof projection is reused.
 */
export function createReceizV124Namespaces(
  remote: ReceizV124NamespacesRemoteV124,
  options: ReceizV124NamespacesRuntimeOptions,
) {
  if (typeof remote !== "function") fail("V124_NAMESPACES_REMOTE_INVALID");
  const runtime = runtimeOptions(options);
  const resolveNamespacesV124 = async (value: ReceizResolveNamespacesInputV124): Promise<ReceizValidatedNamespaceProjectionV124> => {
    const expected = input(value);
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: "/api/sdk/v1/subjects/namespaces/resolve",
      applicationId: runtime.applicationId,
      audience: runtime.audience,
      strongerTruth: "sealed-receiz-proof-object",
      body: {
        subjectId: expected.subjectId,
        atHead: expected.atHead,
        names: expected.names,
        expectedAdmittedProofDigest: expected.expectedAdmittedProofDigest,
        expectedOwnershipHead: expected.expectedOwnershipHead,
        expectedRegistryDigest: expected.expectedRegistryDigest,
        expectedReducerDigest: expected.expectedReducerDigest,
      },
    });
    const wire = exactV123Projection(await authenticatedWire(remote, request));
    const result = await validateReceizNamespaceResolutionV123(wire, {
      subjectId: expected.subjectId,
      atHead: expected.atHead,
      names: expected.names,
    });
    if ("ok" in result) fail("V124_NAMESPACES_NOT_FOUND_OR_NOT_AUTHORIZED");
    if (result.admittedProofDigest !== expected.expectedAdmittedProofDigest
      || result.ownershipHead !== expected.expectedOwnershipHead
      || result.registryDigest !== expected.expectedRegistryDigest
      || result.reducerDigest !== expected.expectedReducerDigest) {
      fail("V124_NAMESPACES_EXPECTATION_MISMATCH");
    }
    return freeze(result);
  };
  // The historical `client.subjects.resolveNamespaces` remains the V123 method.
  return freeze({ resolveNamespacesV124 });
}
