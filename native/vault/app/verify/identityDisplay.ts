import { decodeProfileOriginalRouteProjectionAppend } from '../lib/profile/showcase/routeProjectionEncoding';

export type VerifierIdentity = Readonly<{ receizId: string | null; username: string | null; displayName: string | null; unavailableReason?: string }>;
export type VerifierIdentityDisplay = Readonly<{
  originalCreator: VerifierIdentity;
  currentOwner: VerifierIdentity;
  placementOwner: VerifierIdentity | null;
  sourceRolesUnavailable?: boolean;
  pbiSigners: readonly Readonly<{ identity: VerifierIdentity; assertionStatus: 'carried-unverified' | 'verified'; accountStatus: 'not-carried' }>[];
}>;
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null;
const USERNAME = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
export function verifierIdentity(value: unknown, displayName: unknown = null): VerifierIdentity {
  const receizId = text(value);
  const component = receizId?.endsWith('.receiz.id') ? receizId.slice(0, -10) : null;
  return { receizId, username: component && USERNAME.test(component) ? component : null, displayName: text(displayName) };
}
const absent = (): VerifierIdentity => verifierIdentity(null);

/** Reads the existing sealed Original projection after enclosing verification.
 * The payload digest has already been recomputed by the canonical reader. */
export function carriedVerifierOriginal(value: unknown): Record<string, unknown> | null {
  const result = record(value);
  if (result?.ok !== true || record(result.integrity)?.ok === false) return null;
  const continuity = record(result.assetContinuity);
  const document = record(continuity?.document);
  if (continuity?.state !== 'verified' || continuity.carrier !== 'portable_asset' || document?.assetType !== 'profile_original') return null;
  const appends = record(document.provenance)?.appends;
  const digest = text(record(document.payload)?.sha256);
  if (!Array.isArray(appends) || !digest) return null;
  const render = appends.filter(append => record(append)?.type === 'receiz.profile-original-render.v1');
  return render.length === 1 ? decodeProfileOriginalRouteProjectionAppend(render[0], digest) : null;
}

/** Display only: no source mutation, verification, storage or account lookup. */
export function projectVerifierIdentityDisplay(value: unknown): VerifierIdentityDisplay {
  const result = record(value);
  const empty = { originalCreator: absent(), currentOwner: absent(), placementOwner: null, pbiSigners: [] };
  if (result?.ok !== true || record(result.integrity)?.ok === false) return empty;
  const canonicalContinuity = record(result.assetContinuity);
  const native = record(record(result.bundle)?.nativeRecordSeal);
  const continuity = canonicalContinuity?.state === 'verified' ? canonicalContinuity : record(native?.ownershipContinuity);
  const owner = verifierIdentity(continuity?.ownerReceizId ?? native?.ownerReceizId);
  const original = carriedVerifierOriginal(result);
  const creator = record(original?.originalCreator);
  const creatorUsername = text(creator?.username);
  let originalCreator = creatorUsername && USERNAME.test(creatorUsername)
    ? verifierIdentity(`${creatorUsername}.receiz.id`, creator?.displayName)
    : verifierIdentity(creator?.receizId, creator?.displayName);
  // First sealing establishes the Original's creator and initial owner. Later
  // ownership appends retain that genesis identity; PBI assertions stay separate.
  if (!creator && (original?.ownershipKind === 'creator'
    || (!original && canonicalContinuity?.state === 'verified'
      && canonicalContinuity.carrier === 'native_record_seal'))) {
    originalCreator = verifierIdentity(continuity?.genesisOwnerReceizId ?? record(native?.ownershipContinuity)?.genesisOwnerReceizId);
  }
  const nested = record(result.identitySource);
  const nestedDisplay = nested?.state === 'verified' ? projectVerifierIdentityDisplay(nested.result) : null;
  const imported = Boolean(original && original.ownershipKind !== 'creator');
  const accepted = record(result.verifiedPbiAssertion);
  const history = Array.isArray(result.pbiAuthorshipHistory) ? result.pbiAuthorshipHistory : [];
  return {
    originalCreator: nestedDisplay?.originalCreator.receizId ? nestedDisplay.originalCreator : originalCreator,
    currentOwner: imported ? nestedDisplay?.currentOwner ?? { ...absent(), unavailableReason: nested?.state === 'invalid' ? 'Source ownership not verified by this reader' : 'Source ownership verification unavailable in this reader' } : owner,
    sourceRolesUnavailable: imported && !nestedDisplay,
    placementOwner: imported ? owner : null,
    pbiSigners: [...(nestedDisplay?.pbiSigners ?? []), ...history.flatMap(entry => {
      const receizId = text(record(entry)?.receizId);
      return receizId ? [{ identity: verifierIdentity(receizId), assertionStatus: accepted && accepted.sourceSha256 === result.fileHash && accepted.receizId === receizId && accepted.appendHeadSha256 === record(entry)?.appendHeadSha256 ? 'verified' as const : 'carried-unverified' as const, accountStatus: 'not-carried' as const }] : [];
    })],
  };
}

export function formatVerifierIdentity(identity: VerifierIdentity): string {
  if (identity.unavailableReason) return identity.unavailableReason;
  if (!identity.receizId) return identity.displayName ? `${identity.displayName} · Receiz ID not carried` : 'Not carried in this proof';
  return [identity.displayName, identity.username ? `@${identity.username}` : null, identity.receizId].filter(Boolean).join(' · ');
}
export function formatVerifierPbiSigners(display: VerifierIdentityDisplay): string {
  return display.pbiSigners.length ? display.pbiSigners.map(signer => `${formatVerifierIdentity(signer.identity)} · Assertion ${signer.assertionStatus === 'verified' ? 'verified' : 'not verified'}; account binding not verified`).join('\n') : display.sourceRolesUnavailable ? 'Source PBI signer not evaluated by this reader' : 'Not carried in this proof';
}

export { classifyPortableIdentityCarrier } from './portableIdentityReader';

/** Called only with the receipt returned by the existing successful local PBI
 * append action. Retains verification on the held frontend result, never a file. */
export function retainVerifierPbiAssertionResult<T extends { ok?: boolean; fileHash?: string }>(result: T, append: unknown): T {
  const carried = record(append);
  if (!result.ok || !result.fileHash || !text(carried?.receizId) || !text(carried?.appendHeadSha256)) return result;
  return { ...result, verifiedPbiAssertion: { sourceSha256: result.fileHash, receizId: carried!.receizId, appendHeadSha256: carried!.appendHeadSha256 } };
}
