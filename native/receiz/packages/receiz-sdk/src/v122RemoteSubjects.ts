import { verifyReceizArtifact } from "./artifactVerification.js";
import { receizBase64UrlEncode } from "./identity.js";
import { createReceizSubjectAccessKeyV122, validateReceizSubjectAccessPublicBindingV122, type ReceizSubjectAccessKitV122, type ReceizSubjectAccessPublicBindingV122 } from "./v122SubjectAccess.js";
import { verifyReceizSubjectEdgeBundleV122, type ReceizSubjectEdgeBundleV122, type ReceizSubjectEdgeBundleVerifierV122 } from "./v122EdgeBundle.js";
import {
  validateReceizSubjectAdmissionInputV122,
  validateReceizSubjectAdmissionResultV122,
  verifyReceizAuthenticatedSubjectStateV122,
  type ReceizSubjectAdmissionInputV122,
  type ReceizSubjectAdmissionResultV122,
  type ReceizSubjectStateV122,
} from "./v122Subjects.js";
import { normalizeReceizNamespaceNamesV123, validateReceizNamespaceResolutionV123, type ReceizSubjectNamespaceResolutionInputV123, type ReceizSubjectNamespaceResolutionResultV123 } from "./v123Namespaces.js";

export type ReceizV122RemoteRequest = <T>(
  path: string,
  options?: Readonly<{ method?: string; body?: Record<string, unknown> }>,
) => Promise<T>;

export type ReceizRemoteSubjectsV122Options = Readonly<{
  request: ReceizV122RemoteRequest;
  hasAccessToken: () => boolean;
}>;

export type ReceizSubjectEdgeImportResultV122 =
  | Readonly<{ ok: true; state: ReceizSubjectStateV122 }>
  | Readonly<{ ok: false; code: string; writes: 0 }>;

export type ReceizRemoteSubjectsV122 = Readonly<{
  admit(input: ReceizSubjectAdmissionInputV122): Promise<ReceizSubjectAdmissionResultV122>;
  state(subjectId: string): Promise<ReceizSubjectStateV122>;
  exportEdgeBundle(subjectId: string, verifier: ReceizSubjectEdgeBundleVerifierV122): Promise<ReceizSubjectEdgeBundleV122>;
  importEdgeBundle(bundle: ReceizSubjectEdgeBundleV122, verifier: ReceizSubjectEdgeBundleVerifierV122): Promise<ReceizSubjectEdgeImportResultV122>;
  accessBinding(subjectId: string): Promise<ReceizSubjectAccessPublicBindingV122>;
  publishAccessKey(input: Readonly<{ publicBinding: ReceizSubjectAccessPublicBindingV122; expectedAccessKeyHead: string | null }>): Promise<Readonly<{ ok: true; state: ReceizSubjectStateV122; publicBinding: ReceizSubjectAccessPublicBindingV122 }> | Readonly<{ ok: false; code: string; writes: 0 }>>;
  createAccessKey(input: Readonly<{ subjectId: string; edgeWrappingKey: Uint8Array; accessKeyHead?: string }>): Promise<Readonly<{ accessKit: ReceizSubjectAccessKitV122; publicBinding: ReceizSubjectAccessPublicBindingV122; state: ReceizSubjectStateV122 }>>;
  resolveNamespaces(input: ReceizSubjectNamespaceResolutionInputV123): Promise<ReceizSubjectNamespaceResolutionResultV123>;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function requireSubjectId(subjectId: string): string {
  const normalized = subjectId.trim();
  if (!/^receiz:subject:[0-9a-f]{64}$/.test(normalized)) fail("V122_REMOTE_SUBJECT_ID_INVALID");
  return normalized;
}

function isTransportTimeout(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof DOMException && error.name === "AbortError");
}

async function requestWithOneTimeoutReplay<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isTransportTimeout(error)) throw error;
    return operation();
  }
}

export function createReceizRemoteSubjectsV122(options: ReceizRemoteSubjectsV122Options): ReceizRemoteSubjectsV122 {
  const requireToken = (): void => {
    if (!options.hasAccessToken()) fail("V122_REMOTE_SUBJECT_ACCESS_TOKEN_REQUIRED");
  };

  const admit = async (input: ReceizSubjectAdmissionInputV122): Promise<ReceizSubjectAdmissionResultV122> => {
    requireToken();
    const snapshot = await validateReceizSubjectAdmissionInputV122(input);
    const localProof = await verifyReceizArtifact(snapshot.proofObject.exactBytes);
    if (localProof.status !== "verified-artifact") fail("V122_REMOTE_SUBJECT_PROOF_INVALID");
    const body = {
      proofObject: {
        exactBytesB64u: receizBase64UrlEncode(snapshot.proofObject.exactBytes),
        filename: snapshot.proofObject.filename,
        mimeType: snapshot.proofObject.mimeType,
      },
      ownerReceizId: snapshot.ownerReceizId,
      idempotencyKey: snapshot.idempotencyKey,
      expectedAbsent: true,
    };
    const wire = await requestWithOneTimeoutReplay(() => options.request<unknown>(
      "/api/sdk/v1/subjects/admit",
      { method: "POST", body },
    ));
    if (wire !== null && typeof wire === "object" && !Array.isArray(wire)
      && (wire as Record<string, unknown>).ok === true
      && (wire as Record<string, unknown>).proofDigest !== localProof.artifactDigest.value) {
      fail("V122_REMOTE_SUBJECT_PROOF_MISMATCH");
    }
    const result = await validateReceizSubjectAdmissionResultV122(wire);
    if (result.ok && (result.proofDigest !== localProof.artifactDigest.value
      || result.receipt.ownerReceizId !== snapshot.ownerReceizId)) {
      fail("V122_REMOTE_SUBJECT_PROOF_MISMATCH");
    }
    return result;
  };

  const state = async (subjectId: string): Promise<ReceizSubjectStateV122> => {
    requireToken();
    const normalized = requireSubjectId(subjectId);
    const wire = await options.request<unknown>(`/api/sdk/v1/subjects/${encodeURIComponent(normalized)}/state`);
    const verified = await verifyReceizAuthenticatedSubjectStateV122(wire, {
      // The production Connect response is the authenticated snapshot layer.
      // Edge-bundle verification independently verifies stronger proof and append evidence.
      authenticateAdmissionReceipt: async () => true,
      authenticateState: async () => true,
    });
    if (!verified.ok) fail(`V122_REMOTE_SUBJECT_STATE_INVALID:${verified.code}`);
    return verified.state;
  };

  const exportEdgeBundle = async (
    subjectId: string,
    verifier: ReceizSubjectEdgeBundleVerifierV122,
  ): Promise<ReceizSubjectEdgeBundleV122> => {
    requireToken();
    const normalized = requireSubjectId(subjectId);
    const wire = await options.request<unknown>(`/api/sdk/v1/subjects/${encodeURIComponent(normalized)}/export`);
    const verified = await verifyReceizSubjectEdgeBundleV122(wire, verifier);
    if (!verified.ok) fail(`V122_REMOTE_SUBJECT_EDGE_BUNDLE_INVALID:${verified.code}`);
    return verified.bundle;
  };

  const importEdgeBundle = async (
    bundle: ReceizSubjectEdgeBundleV122,
    verifier: ReceizSubjectEdgeBundleVerifierV122,
  ): Promise<ReceizSubjectEdgeImportResultV122> => {
    requireToken();
    const verified = await verifyReceizSubjectEdgeBundleV122(bundle, verifier);
    if (!verified.ok) fail(`V122_REMOTE_SUBJECT_EDGE_BUNDLE_INVALID:${verified.code}`);
    return options.request<ReceizSubjectEdgeImportResultV122>("/api/sdk/v1/subjects/import", {
      method: "POST",
      body: { bundle: verified.bundle as unknown as Record<string, unknown> },
    });
  };

  const accessBinding = async (subjectId: string): Promise<ReceizSubjectAccessPublicBindingV122> => {
    requireToken();
    const normalized = requireSubjectId(subjectId);
    const binding = await options.request<ReceizSubjectAccessPublicBindingV122>(`/api/sdk/v1/subjects/${encodeURIComponent(normalized)}/access-key`);
    if (!await validateReceizSubjectAccessPublicBindingV122(binding)) fail("V122_REMOTE_ACCESS_BINDING_INVALID");
    return binding;
  };

  const publishAccessKey: ReceizRemoteSubjectsV122["publishAccessKey"] = async (keyInput) => {
    requireToken();
    if (!await validateReceizSubjectAccessPublicBindingV122(keyInput.publicBinding)) fail("V122_REMOTE_ACCESS_BINDING_INVALID");
    return options.request(`/api/sdk/v1/subjects/${encodeURIComponent(requireSubjectId(keyInput.publicBinding.subjectId))}/access-key`, {
      method: "POST",
      body: keyInput as unknown as Record<string, unknown>,
    });
  };

  const createAccessKey: ReceizRemoteSubjectsV122["createAccessKey"] = async (keyInput) => {
    const current = await state(keyInput.subjectId);
    const created = await createReceizSubjectAccessKeyV122({ subjectId: current.subjectId, subjectHead: current.head, edgeWrappingKey: keyInput.edgeWrappingKey, ...(keyInput.accessKeyHead ? { accessKeyHead: keyInput.accessKeyHead } : {}) });
    const published = await publishAccessKey({ publicBinding: created.publicBinding, expectedAccessKeyHead: current.accessKeyHead });
    if (!published.ok) fail(`V122_REMOTE_ACCESS_KEY_PUBLISH_FAILED:${published.code}`);
    return Object.freeze({ ...created, state: published.state });
  };

  const resolveNamespaces: ReceizRemoteSubjectsV122["resolveNamespaces"] = async (namespaceInput) => {
    requireToken();
    const subjectId = requireSubjectId(namespaceInput.subjectId);
    if (!/^[0-9a-f]{64}$/.test(namespaceInput.atHead)) fail("V123_NAMESPACE_HEAD_INVALID");
    const names = normalizeReceizNamespaceNamesV123(namespaceInput.names);
    const wire = await options.request<unknown>(`/api/sdk/v1/subjects/${encodeURIComponent(subjectId)}/namespaces/resolve`, {
      method: "POST",
      body: { atHead: namespaceInput.atHead, names },
    });
    return validateReceizNamespaceResolutionV123(wire, { subjectId, atHead: namespaceInput.atHead, names });
  };

  return Object.freeze({ admit, state, exportEdgeBundle, importEdgeBundle, accessBinding, publishAccessKey, createAccessKey, resolveNamespaces });
}
