"use client";

import {
  admitActiveIdentityCustodyContext,
  peekActiveIdentityCustodyContext,
  type ActiveIdentityCustodyContext,
} from "@/app/lib/auth/activeIdentityCustodyContext";
import { awaitPendingIdentityCustodyFinalization } from "@/app/lib/auth/identityCustodyNavigationSettlement";
import { readReceizDeviceIdentityForActor, realizeReceizDeviceIdentityRegister } from "@/app/lib/auth/receizDeviceIdentityRegister";
import {
  createReceizIdentityArtifactCustody,
} from "@/app/lib/auth/receizIdentityArtifactCustody";
import {
  peekReceizAccountBindingForActivePrincipal,
} from "@/app/lib/auth/receizAccountBindings";
import {
  isOfflineIdentitySessionExplicitlyLoggedOut,
  peekOfflineIdentitySession,
  type OfflineIdentitySession,
} from "@/app/lib/auth/offlineIdentitySession";
import {
  peekReceizDeviceIdentity,
} from "@/app/lib/auth/receizDeviceIdentity";
import {
  buildReceizKeyIdentityRecordPng,
  readReceizKeyFileFromBlob,
} from "@/app/utils/receizIdentityKey";
import type { ReceizKeyFile } from "../../../../packages/receiz-sdk/src/index";
import type { ReceizVerifiedIdentityArtifactAdmission } from "../../../../packages/receiz-sdk/src/index";

import { createProfileShowcaseBoundedEdgeVault, peekHeldProfileShowcasePublicSource, readProfileShowcasePublicSourceActorCustody, type ProfileShowcaseCompletePublicSource } from "./boundedEdgeVault";
import { resolvePublicationIdentityCustody } from "./publicationIdentityCustody";
import { readReceizIdentityPublicBinding } from "../../../../packages/receiz-sdk/src/artifactAdmission";
import type { ProfileShowcaseArtifactId } from "./types";
import { readRecoveredAccountShowcaseScope } from "./recoveredAccountScope.client";
import { recoverAcceptedShowcasePredecessor } from "./acceptedPredecessorRecovery.client";

export type ComposerIdentityCustodyContext = ActiveIdentityCustodyContext & Readonly<{
  /** The existing Showcase subject; the signer's identity is never relabeled. */
  showcaseArtifactId?: ProfileShowcaseArtifactId;
}>;

type ReopenedIdentityCustody = Readonly<{
  selector: Readonly<{
    ownerReceizId: string;
    actorId: string;
    issuerKeyId: string;
  }>;
  artifact: Blob;
  admission: ReceizVerifiedIdentityArtifactAdmission;
}>;

export type ComposerIdentityCustodyResolverDependencies = Readonly<{
  selectedShowcaseArtifactId?: ProfileShowcaseArtifactId | null;
  readSelectedShowcaseSource?: (artifactId: ProfileShowcaseArtifactId) => Promise<ProfileShowcaseCompletePublicSource | null>;
  resolveSelectedShowcaseCustody?: typeof resolvePublicationIdentityCustody;
  peekActive?: typeof peekActiveIdentityCustodyContext;
  awaitPendingFinalization?: typeof awaitPendingIdentityCustodyFinalization;
  readActiveBinding?: typeof peekReceizAccountBindingForActivePrincipal;
  readOfflineSession?: typeof peekOfflineIdentitySession;
  readDeviceIdentity?: typeof peekReceizDeviceIdentity;
  readDeviceIdentityForActor?: typeof readReceizDeviceIdentityForActor;
  readRecoveredAccountScope?: typeof readRecoveredAccountShowcaseScope;
  realizeDeviceIdentity?: typeof realizeReceizDeviceIdentityRegister;
  reopenForOwner?: (input: Readonly<{
    ownerReceizId: string;
    passphrase: string;
    preferredIssuerKeyIds?: readonly string[];
  }>) => Promise<ReopenedIdentityCustody | null>;
  readKeyFile?: (artifact: Blob) => Promise<ReceizKeyFile>;
  buildIdentityRecord?: typeof buildReceizKeyIdentityRecordPng;
  admitAndStore?: (input: Readonly<{
    artifact: Blob;
    ownerReceizId: string;
    actorId: string;
    issuerKeyId: string;
    passphrase: string;
  }>) => Promise<ReceizVerifiedIdentityArtifactAdmission>;
  admitActive?: typeof admitActiveIdentityCustodyContext;
}>;

function usernameFromOwnerReceizId(ownerReceizId: string): string | null {
  const normalized = ownerReceizId.trim().normalize("NFC").toLowerCase();
  const suffix = ".receiz.id";
  if (!normalized.endsWith(suffix)) return null;
  const username = normalized.slice(0, -suffix.length);
  return username ? username : null;
}

/**
 * Restores the exact accepted Identity Record above transient runtime state.
 * It first lets an already-accepted restore finish, then reopens the exact
 * sealed artifact from custody. A bound local Receiz ID may create its first
 * native Identity Record only when the active account binding proves that the
 * same device key carries the requested profile.
 */
export async function resolveComposerIdentityCustody(
  profileOwnerReceizId: string,
  dependencies: ComposerIdentityCustodyResolverDependencies = {},
): Promise<ComposerIdentityCustodyContext | null> {
  const peekActive =
    dependencies.peekActive ?? peekActiveIdentityCustodyContext;
  const admitActive =
    dependencies.admitActive ?? admitActiveIdentityCustodyContext;
  const username = usernameFromOwnerReceizId(profileOwnerReceizId);
  if (!username) return null;
  // The already admitted Showcase selects its action custody. Recovery's
  // account projection must never create a competing proof object subject.
  if (dependencies.selectedShowcaseArtifactId) {
    const artifactId = dependencies.selectedShowcaseArtifactId;
    const ownerReceizId = artifactId.replace(/^profile-showcase:/, "");
    // Reuse held admitted identity before any source transport or storage read.
    // This selects custody only; the vault still admits the exact actor and
    // predecessor transition before any visible change or publication.
    const held = peekActive(ownerReceizId);
    if (held?.ownerReceizId === ownerReceizId
      && held.actorAdmission.ownerReceizId === ownerReceizId
      && held.actorAdmission.actor.actorId === held.actorId
      && held.keyFile.owner.uid === held.actorId
      && held.keyFile.keyId === held.issuerKeyId) return held;
    const source = await (dependencies.readSelectedShowcaseSource ?? (async id => {
      const heldSource = peekHeldProfileShowcasePublicSource(id)?.source;
      if (heldSource) return heldSource;
      const vault = createProfileShowcaseBoundedEdgeVault();
      const local = await vault.exportCompleteSource(id).catch(error => {
        if (error instanceof Error && error.message === "PROFILE_SHOWCASE_COMPLETE_SOURCE_INCOMPLETE") return null;
        throw error;
      });
      if (local) return local;
      await recoverAcceptedShowcasePredecessor({ username, artifactId: id, vault });
      return vault.exportCompleteSource(id);
    }))(artifactId);
    if (!source) return null;
    let selected = await (dependencies.resolveSelectedShowcaseCustody ?? resolvePublicationIdentityCustody)(source);
    if (!selected) {
      // The SDK append primitive accepts a genuine admitted identity for the
      // same actor and owner. A refreshed Record contributes new evidence to
      // the successor; it need not repeat the predecessor's artifact digest.
      const active = peekActive() ?? await resolveComposerIdentityCustody(profileOwnerReceizId, {
        ...dependencies, selectedShowcaseArtifactId: null,
      });
      const actor = readProfileShowcasePublicSourceActorCustody(source);
      if (active && actor && active.ownerReceizId === ownerReceizId && active.actorId === actor.actorId) {
        const current = await readReceizIdentityPublicBinding(active.actorAdmission);
        if (current.actorId === actor.actorId && current.artifactOwnerReceizId === ownerReceizId
          && current.keyId === active.keyFile.keyId
          && current.publicKeyRawB64u === active.keyFile.crypto.publicKeyRawB64u) {
          selected = { actorAdmission: active.actorAdmission, keyFile: active.keyFile, passphrase: active.unlock() };
        }
      }
    }
    if (!selected || selected.actorAdmission.ownerReceizId !== ownerReceizId) {
      const selectedOwnerReceizId = selected?.actorAdmission.ownerReceizId;
      const active = peekActive() ?? (selected && selectedOwnerReceizId ? admitActive({
        ownerReceizId: selectedOwnerReceizId,
        actorId: selected.actorAdmission.actor.actorId,
        issuerKeyId: selected.keyFile.keyId,
        artifactSha256: selected.actorAdmission.artifactSha256,
        actorAdmission: selected.actorAdmission,
        keyFile: selected.keyFile,
        passphrase: selected.passphrase ?? "",
      }) : null);
      const binding = (dependencies.readActiveBinding ?? peekReceizAccountBindingForActivePrincipal)();
      const actor = readProfileShowcasePublicSourceActorCustody(source);
      // An accepted recovered account can act on its existing Showcase using
      // its own admitted signer. Account placement cannot rewrite the subject,
      // predecessor, original actor, or the signer's native artifact owner.
      if (active && binding && actor
        && active.keyFile.owner.uid === active.actorId
        && active.actorAdmission.actor.actorId === active.actorId
        && binding.receizKeyId === active.keyFile.keyId
        && (binding.session.uid === active.actorId || binding.localUid === active.actorId)
        && binding.session.username?.trim().toLowerCase() === username) {
        const scope = await (dependencies.readRecoveredAccountScope ?? readRecoveredAccountShowcaseScope)({
          username, accountId: binding.session.uid, artifactId,
        });
        if (peekActive() === active && scope?.profileIdentity === binding.session.uid
          && scope.proofIdentity === actor.actorId) {
          return Object.freeze({ ...active, actorAdmission: active.actorAdmission,
            keyFile: active.keyFile, unlock: active.unlock, showcaseArtifactId: artifactId });
        }
      }
    }
    if (!selected) {
      const actor = readProfileShowcasePublicSourceActorCustody(source);
      const retained = actor && await (dependencies.readDeviceIdentityForActor ?? readReceizDeviceIdentityForActor)(actor.actorId);
      const key = retained?.keyFile;
      const keyOwner = key?.owner.username?.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
      // Recovery selects an account; it does not erase that account's original
      // signing source. Admit the retained exact actor through the same native
      // Record primitive, never by relabeling the replacement recovery key.
      if (key && key.owner.uid === actor!.actorId
        && (key.owner.uid === ownerReceizId || `${keyOwner}.receiz.id` === ownerReceizId)) {
        const artifact = await (dependencies.buildIdentityRecord ?? buildReceizKeyIdentityRecordPng)({
          keyFile: key, username: usernameFromOwnerReceizId(ownerReceizId)!,
        });
        const admission = await (dependencies.admitAndStore ?? (input => createReceizIdentityArtifactCustody().admitAndStore(input)))({
          artifact, ownerReceizId, actorId: key.owner.uid, issuerKeyId: key.keyId, passphrase: "",
        });
        selected = { actorAdmission: admission, keyFile: key, passphrase: "" };
      }
    }
    if (!selected || selected.actorAdmission.ownerReceizId !== ownerReceizId) return null;
    return admitActive({ ownerReceizId,
      actorId: selected.actorAdmission.actor.actorId,
      issuerKeyId: selected.keyFile.keyId,
      artifactSha256: selected.actorAdmission.artifactSha256,
      actorAdmission: selected.actorAdmission, keyFile: selected.keyFile,
      passphrase: selected.passphrase ?? "",
    });
  }

  const readActiveBinding = () => (
    dependencies.readActiveBinding
    ?? peekReceizAccountBindingForActivePrincipal
  )();
  const readOfflineSession = (): OfflineIdentitySession | null => (
    dependencies.readOfflineSession
    ?? peekOfflineIdentitySession
  )();
  let activeBinding = readActiveBinding();
  let offlineSession = readOfflineSession();
  let bindingUsername = activeBinding?.session.username
    ?.trim()
    .replace(/^@+/, "")
    .normalize("NFC")
    .toLowerCase();
  let offlineUsername = offlineSession?.session.username
    ?.trim()
    .replace(/^@+/, "")
    .normalize("NFC")
    .toLowerCase();
  const routeCarriesIssuer = (issuerKeyId: string): boolean => Boolean(
    activeBinding
    && bindingUsername === username
    && activeBinding.receizKeyId === issuerKeyId
  ) || Boolean(
    offlineSession
    && !isOfflineIdentitySessionExplicitlyLoggedOut(offlineSession)
    && offlineUsername === username
    && offlineSession.keyId === issuerKeyId
  );
  const selectExistingRecoveredSubject = async (context: ActiveIdentityCustodyContext): Promise<ComposerIdentityCustodyContext | null> => {
    // A recovered signer retains its native Identity Record. The already
    // accepted account placement selects the existing Showcase subject.
    if (context.ownerReceizId === profileOwnerReceizId || !activeBinding
      || bindingUsername !== username || activeBinding.receizKeyId !== context.keyFile.keyId
      || (activeBinding.session.uid !== context.actorId && activeBinding.localUid !== context.actorId)) return context;
    const scope = await (dependencies.readRecoveredAccountScope ?? readRecoveredAccountShowcaseScope)({
      username, accountId: activeBinding.session.uid,
    });
    if (!scope) return context;
    return resolveComposerIdentityCustody(profileOwnerReceizId, {
      ...dependencies, selectedShowcaseArtifactId: scope.locator.showcaseArtifactId as ProfileShowcaseArtifactId,
    });
  };
  const active = peekActive();
  if (active && routeCarriesIssuer(active.issuerKeyId)) return selectExistingRecoveredSubject(active);

  await (
    dependencies.awaitPendingFinalization
    ?? awaitPendingIdentityCustodyFinalization
  )();
  activeBinding = readActiveBinding();
  offlineSession = readOfflineSession();
  bindingUsername = activeBinding?.session.username?.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
  offlineUsername = offlineSession?.session.username?.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
  const finalizedActive = peekActive();
  if (
    finalizedActive
    && routeCarriesIssuer(finalizedActive.issuerKeyId)
  ) return selectExistingRecoveredSubject(finalizedActive);

  const readIdentity = dependencies.readDeviceIdentity ?? peekReceizDeviceIdentity;
  let identity = readIdentity();
  if (!identity) {
    // Visibility/composer authority consumes the active identity only. A held
    // identity needs no storage reopen; unrelated register sources cannot gate it.
    await (dependencies.realizeDeviceIdentity ?? realizeReceizDeviceIdentityRegister)("active");
    identity = readIdentity();
  }
  const stableIdentityUsername = identity?.keyFile.owner.username
    ?.trim()
    .replace(/^@+/, "")
    .normalize("NFC")
    .toLowerCase() ?? "";
  const ownerReceizId = stableIdentityUsername
    ? `${stableIdentityUsername}.receiz.id`
    : profileOwnerReceizId;

  const alreadyActive = peekActive(ownerReceizId);
  if (alreadyActive) return selectExistingRecoveredSubject(alreadyActive);

  const preferredIssuerKeyIds =
    activeBinding && bindingUsername === username
      ? [activeBinding.receizKeyId]
      : offlineSession && offlineUsername === username
        ? [offlineSession.keyId]
        : [];

  const custody = dependencies.reopenForOwner && dependencies.admitAndStore
    ? null
    : createReceizIdentityArtifactCustody();
  const reopenForOwner =
    dependencies.reopenForOwner
    ?? ((input) => custody!.reopenForOwner(input));

  try {
    const reopened = await reopenForOwner({
      ownerReceizId,
      passphrase: "",
      preferredIssuerKeyIds,
    });
    if (reopened) {
      const keyFile = await (
        dependencies.readKeyFile ?? readReceizKeyFileFromBlob
      )(reopened.artifact);
      if (
        keyFile.keyId !== reopened.selector.issuerKeyId
        || keyFile.owner.uid !== reopened.selector.actorId
      ) {
        throw new TypeError("RECEIZ_IDENTITY_PROOF_BINDING_MISMATCH");
      }
      return selectExistingRecoveredSubject(admitActive({
        ownerReceizId,
        actorId: reopened.selector.actorId,
        issuerKeyId: reopened.selector.issuerKeyId,
        artifactSha256: reopened.admission.artifactSha256,
        actorAdmission: reopened.admission,
        keyFile,
        passphrase: "",
      }));
    }
  } catch {
    // A stale or password-mismatched same-owner custody candidate must not
    // outrank the already accepted active account + Receiz ID binding. The
    // exact bound device identity below creates a fresh admitted native record.
  }

  const offlineSessionCarriesOwnerAuthority = Boolean(
    identity
    && offlineSession
    && !isOfflineIdentitySessionExplicitlyLoggedOut(offlineSession)
    && offlineUsername === username
    && offlineSession.keyId === identity.keyFile.keyId
    && offlineSession.receizDevice?.localUid === identity.localUid,
  );
  const activeBindingCarriesOwnerAuthority = Boolean(
    identity
    && activeBinding
    && bindingUsername === username
    && activeBinding.receizKeyId === identity.keyFile.keyId
    && activeBinding.localUid === identity.localUid,
  );
  if (
    !identity
    || (!activeBindingCarriesOwnerAuthority && !offlineSessionCarriesOwnerAuthority)
  ) {
    return null;
  }

  const artifact = await (
    dependencies.buildIdentityRecord ?? buildReceizKeyIdentityRecordPng
  )({
    keyFile: identity.keyFile,
    username: stableIdentityUsername,
  });
  const admission = await (
    dependencies.admitAndStore
    ?? ((input) => custody!.admitAndStore(input))
  )({
    artifact,
    ownerReceizId,
    actorId: identity.keyFile.owner.uid,
    issuerKeyId: identity.keyFile.keyId,
    passphrase: "",
  });
  return selectExistingRecoveredSubject(admitActive({
    ownerReceizId,
    actorId: identity.keyFile.owner.uid,
    issuerKeyId: identity.keyFile.keyId,
    artifactSha256: admission.artifactSha256,
    actorAdmission: admission,
    keyFile: identity.keyFile,
    passphrase: "",
  }));
}
