"use client";

import { readReceizIdentityPublicBinding } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import { enqueueSourceBoundPublicationAction, deliverSourceBoundPublicationAction } from "@/app/lib/offline/localSignedActionOutbox";
import { resolvePublicationIdentityCustody } from "./publicationIdentityCustody";
import type { ProfileShowcaseCompletePublicSource,ProfileShowcasePublicationSource } from "./boundedEdgeVault";
import type { ExactByteBlockReference } from "@/app/lib/transport/exactByteBlocks";
import { writeProfileShowcaseCompleteSourceTransport,writeProfileShowcaseAcceptedTransitionTransport } from "./completeSourceTransport";
import { parseProfileShowcaseCompletePublicationScope, profileShowcaseCompletePublicationScopeKey, type ProfileShowcaseCompletePublicationScope } from "./publicProjectionScope";
import { readProfileShowcasePublicationRoute } from "./publicProjectionScope.client";
import { createImportedProofSourceCustody } from "./importedSourceCustody.client";
import { refreshAcceptedPublicProfileDocument } from "./publicProfileDocumentRefresh.client";

export const PROFILE_SHOWCASE_PUBLICATION_CONTENT_TYPE =
  "application/vnd.receiz.profile-showcase-publication.v1";

const MAGIC = new TextEncoder().encode("RECEIZSHOWPUBV1\0");

function u32(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

export function encodeProfileShowcasePublicProjectionPublication(input: Readonly<{
  exactSealedCarrierBytes: Uint8Array;
  exactVisibleChildBytes: readonly Uint8Array[];
}>): Blob {
  if (
    !(input.exactSealedCarrierBytes instanceof Uint8Array)
    || input.exactSealedCarrierBytes.byteLength === 0
    || input.exactVisibleChildBytes.length > 24
    || input.exactVisibleChildBytes.some((bytes) => (
      !(bytes instanceof Uint8Array) || bytes.byteLength === 0
    ))
  ) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_INPUT_INVALID");
  const parts: BlobPart[] = [
    exactBuffer(MAGIC),
    exactBuffer(u32(input.exactSealedCarrierBytes.byteLength)),
    exactBuffer(input.exactSealedCarrierBytes),
    exactBuffer(u32(input.exactVisibleChildBytes.length)),
  ];
  for (const child of input.exactVisibleChildBytes) {
    parts.push(exactBuffer(u32(child.byteLength)), exactBuffer(child));
  }
  return new Blob(parts, { type: PROFILE_SHOWCASE_PUBLICATION_CONTENT_TYPE });
}

export type ProfileShowcasePublicProjectionPublicationResult =
  | Readonly<{
      status: "published";
      publicationVersion?: 2;
      scope?: ProfileShowcaseCompletePublicationScope;
      artifactDigest: string;
      operationCount: number;
      visibleChildCount: number;
      publicFamilyStatus?: "pending" | "ready";
    }>
  | Readonly<{
      status: "pending" | "rejected";
      code: string;
    }>;

class PublicationRejection extends Error {}
class PublicationPending extends Error {}

/** Immediate servant distribution of an already-settled local proof object. */
export async function publishProfileShowcasePublicProjection(
  source: ProfileShowcasePublicationSource,
  ownerReceizId: string,
  fetchImpl: typeof fetch = fetch,
  profileUsername?: string,
  capturedScope?: ProfileShowcaseCompletePublicationScope,
  readRoute: typeof readProfileShowcasePublicationRoute = readProfileShowcasePublicationRoute,
  resolveIdentity: typeof resolvePublicationIdentityCustody = resolvePublicationIdentityCustody,
  refreshDocument: typeof refreshAcceptedPublicProfileDocument = refreshAcceptedPublicProfileDocument,
  delivery: Readonly<{exportImportedSource?: (reference: import('./importedSourceReference').ImportedProofSourceReference, write: import('../../transport/exactByteBlocks').ExactByteBlockWriter) => Promise<void>}> = {},
): Promise<ProfileShowcasePublicProjectionPublicationResult> {
  return publishProfileShowcaseTransport(source.artifactDigest, ownerReceizId, fetchImpl, profileUsername,
    capturedScope, readRoute, () => resolveIdentity(source), refreshDocument,
    write => {const options={exportImportedSource:delivery.exportImportedSource??((reference:import('./importedSourceReference').ImportedProofSourceReference,writer:import('../../transport/exactByteBlocks').ExactByteBlockWriter)=>createImportedProofSourceCustody().exportBlocks(reference,writer))};
      return 'witnessNodes'in source?writeProfileShowcaseCompleteSourceTransport(source,write,options):writeProfileShowcaseAcceptedTransitionTransport(source,write,options);} );
}

/** Same authenticated v2 publisher; callers may reuse immutable byte references
 * rather than reopening all historical payloads to serialize them again. */
export async function publishProfileShowcaseTransport(
  artifactDigest: string, ownerReceizId: string, fetchImpl: typeof fetch,
  profileUsername: string | undefined,
  capturedScope: ProfileShowcaseCompletePublicationScope | undefined,
  readRoute: typeof readProfileShowcasePublicationRoute,
  resolveIdentity: () => ReturnType<typeof resolvePublicationIdentityCustody>,
  refreshDocument: typeof refreshAcceptedPublicProfileDocument,
  writeTransport: (write: import('../../transport/exactByteBlocks').ExactByteBlockWriter) => Promise<import('./completeSourceTransport').ProfileShowcaseCompleteSourceTransport>,
  association?: Readonly<{publicationSourceArtifactSha256:string;publicationChildArtifactDigest:string;publicationPredecessorArtifactDigest:string}>,
): Promise<ProfileShowcasePublicProjectionPublicationResult> {
  const pending = () => Object.freeze({ status: "pending" as const, code: "PROFILE_SHOWCASE_PUBLIC_PROJECTION_UNAVAILABLE" });
  try {
    const visibleProfileRoute = () => {
      if (!capturedScope || typeof window === "undefined") return null;
      const pathname = window.location.pathname.replace(/\/$/, "");
      if (pathname !== `/${capturedScope.username}` && pathname !== `/u/${capturedScope.username}`) return null;
      return { username: capturedScope.username, profileIdentity: capturedScope.profileIdentity };
    };
    const route = readRoute() ?? visibleProfileRoute();
    const scope = parseProfileShowcaseCompletePublicationScope(capturedScope ?? {
      publicationVersion: 2, ownerReceizId, artifactId: `profile-showcase:${ownerReceizId}`,
      artifactDigest, username: profileUsername ?? route?.username,
      profileIdentity: route?.profileIdentity,
    });
    if (scope.artifactDigest !== artifactDigest || scope.ownerReceizId !== ownerReceizId
      || (profileUsername && scope.username !== profileUsername)) return pending();
    const scopeKey = profileShowcaseCompletePublicationScopeKey(scope);
    const identity = await resolveIdentity();
    if (!identity) return { status: "pending", code: "PROFILE_SHOWCASE_SOURCE_IDENTITY_CUSTODY_REQUIRED" };
    const identityBinding = await readReceizIdentityPublicBinding(identity.actorAdmission);
    if (identityBinding.keyId !== identity.keyFile.keyId || identityBinding.publicKeyRawB64u !== identity.keyFile.crypto.publicKeyRawB64u) return pending();
    const routeStillCurrent = () => {
      const current = readRoute() ?? visibleProfileRoute();
      return current?.username === scope.username && current.profileIdentity === scope.profileIdentity;
    };
    const plan = async (body: Record<string, unknown>) => {
      if (!routeStillCurrent()) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
      const headers = { "content-type": "application/json", "x-receiz-owner-id": scope.ownerReceizId,
        "x-receiz-profile-username": scope.username };
      const bodyText = JSON.stringify(body.action === "finalize" ? { ...body, identityBinding } : body);
      const action = body.action === "finalize" ? await enqueueSourceBoundPublicationAction(bodyText, {
        keyFile: identity.keyFile, passphrase: identity.passphrase,
        actor: { uid: scope.profileIdentity, email: null, username: scope.username, displayName: null,
          receizKeyId: identityBinding.keyId, publicKeyRawB64u: identityBinding.publicKeyRawB64u,
          localUid: identity.actorAdmission.actor.actorId },
      }) : null;
      if (body.action === "finalize" && !action) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_ACTION_REQUIRED");
      if (!routeStillCurrent()) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
      const response = action ? await deliverSourceBoundPublicationAction(action, fetchImpl, headers)
        : await fetchImpl("/api/profile/showcase/publication", { method: "POST", credentials: "same-origin", headers, body: bodyText });
      const value = await response.json().catch(() => null);
      if (value?.status === "rejected" && typeof value.code === "string" && value.code.trim()) throw new PublicationRejection(value.code);
      if (value?.status === "pending" && typeof value.code === "string" && value.code.trim()) throw new PublicationPending(value.code);
      if (!response.ok) throw new PublicationPending(`PROFILE_SHOWCASE_PUBLICATION_HTTP_${response.status}`);
      if (!value || typeof value !== "object") throw new PublicationPending("PROFILE_SHOWCASE_PUBLICATION_RESPONSE_INVALID");
      return value;
    };
    const queue: Array<{ reference: ExactByteBlockReference; bytes: Uint8Array }> = [];
    const seen = new Set<string>();
    const flush = async () => {
      if (!queue.length) return;
      const batch = queue.splice(0, 16);
      const value = await plan({ action: "initialize-blocks", scope, references: batch.map(({ reference }) => reference) });
      if (value?.status !== "uploads" || profileShowcaseCompletePublicationScopeKey(value.scope) !== scopeKey
        || !Array.isArray(value.uploads) || value.uploads.length !== batch.length) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_UPLOAD_PLAN_INVALID");
      const commits: Array<{ reference: ExactByteBlockReference; stagingObjectName: string }> = [];
      // At most sixteen 1MiB bodies are in flight. Previously promoted exact
      // blocks need no upload, including children reused by a successor head.
      await Promise.all(batch.map(async ({ reference, bytes }, index) => {
        const upload = value.uploads[index];
        if (JSON.stringify(upload?.reference) !== JSON.stringify(reference)) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_UPLOAD_PLAN_INVALID");
        if (upload.alreadyStored === true) return;
        if (upload.alreadyStored !== false || typeof upload.signedUrl !== "string" || typeof upload.stagingObjectName !== "string") throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_UPLOAD_PLAN_INVALID");
        if (!routeStillCurrent()) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_ACCOUNT_CHANGED");
        const response = await fetchImpl(upload.signedUrl, { method: "PUT", credentials: "omit",
          headers: { "content-type": "application/octet-stream", "x-upsert": "false" }, body: exactBuffer(bytes) });
        if (!response.ok) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_BLOCK_UPLOAD_FAILED");
        commits.push({ reference, stagingObjectName: upload.stagingObjectName });
      }));
      if (commits.length) {
        const committed = await plan({ action: "commit-blocks", scope, blocks: commits });
        if (committed?.status !== "stored" || profileShowcaseCompletePublicationScopeKey(committed.scope) !== scopeKey) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_BLOCK_COMMIT_FAILED");
      }
    };
    const transport = await writeTransport(async (reference, bytes) => {
      if (seen.has(reference.sha256)) return;
      seen.add(reference.sha256);
      queue.push({ reference, bytes });
      if (queue.length === 16) await flush();
    });
    await flush();
    const value = await plan({ action: "finalize", scope, transport, ...association }) as ProfileShowcasePublicProjectionPublicationResult;
    if (value?.status === "published" && value.publicationVersion === 2 && value.scope
      && value.artifactDigest === artifactDigest && routeStillCurrent()
      && Number.isSafeInteger(value.operationCount) && value.operationCount >= 0
      && Number.isSafeInteger(value.visibleChildCount) && value.visibleChildCount >= 0
      && profileShowcaseCompletePublicationScopeKey(value.scope) === scopeKey) {
      // Document custody remains scheduled beneath the exact accepted Source.
      // Its ACK or failure cannot delay or revoke the publication receipt.
      void Promise.resolve().then(() => refreshDocument({ username: scope.username,
        artifactDigest: value.artifactDigest, operationCount: value.operationCount })).catch(() => {});
      return value;
    }
    if ((value?.status === "rejected" || value?.status === "pending") && typeof value.code === "string" && value.code.trim()) return value;
    return pending();
  } catch (error) {
    if (error instanceof PublicationRejection) return { status: "rejected", code: error.message };
    if (error instanceof PublicationPending) return { status: "pending", code: error.message };
    if (error instanceof Error && /^(?:PROFILE_SHOWCASE_|BANK_ASSET_PUBLICATION_)[A-Z0-9_]+$/.test(error.message)) {
      return { status: "pending", code: error.message };
    }
    console.warn("profile_showcase_public_projection_delivery_failed",
      error instanceof Error ? error.message : String(error));
    return pending();
  }
}
