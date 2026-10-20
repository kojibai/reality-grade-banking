import type { ProfileShowcaseArtifactId } from "./types";

/** Account and route placement are transport scope, never source authority. */
export type ProfileShowcaseCompletePublicationScope = Readonly<{
  publicationVersion: 2;
  ownerReceizId: string;
  username: string;
  profileIdentity: string;
  artifactId: ProfileShowcaseArtifactId;
  artifactDigest: string;
}>;

export function parseProfileShowcaseCompletePublicationScope(value: unknown): ProfileShowcaseCompletePublicationScope {
  if (!value || typeof value !== "object") throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_SCOPE_INVALID");
  const scope = value as ProfileShowcaseCompletePublicationScope;
  if (scope.publicationVersion !== 2 || typeof scope.ownerReceizId !== "string"
    || !/^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/.test(scope.ownerReceizId)
    || typeof scope.username !== "string" || !/^[a-z0-9_]{3,24}$/.test(scope.username)
    || typeof scope.profileIdentity !== "string" || !scope.profileIdentity.trim()
    || scope.artifactId !== `profile-showcase:${scope.ownerReceizId}`
    || typeof scope.artifactDigest !== "string" || !/^[0-9a-f]{64}$/.test(scope.artifactDigest)) {
    throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_SCOPE_INVALID");
  }
  return Object.freeze({ publicationVersion: 2, ownerReceizId: scope.ownerReceizId,
    username: scope.username, profileIdentity: scope.profileIdentity,
    artifactId: scope.artifactId, artifactDigest: scope.artifactDigest });
}

export function profileShowcaseCompletePublicationScopeKey(scope: ProfileShowcaseCompletePublicationScope): string {
  const accepted = parseProfileShowcaseCompletePublicationScope(scope);
  return JSON.stringify([accepted.publicationVersion, accepted.ownerReceizId, accepted.username,
    accepted.profileIdentity, accepted.artifactId, accepted.artifactDigest]);
}
