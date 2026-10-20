"use client";

import {
  admitReceizAccountBinding,
  peekActiveReceizAccountBinding,
} from "@/app/lib/auth/receizAccountBindings";
import {
  hasOfflineIdentitySessionForBootstrap,
} from "@/app/lib/auth/offlineIdentitySession";
import {
  isReceizDeviceSyntheticEmail,
  peekReceizDeviceIdentity,
} from "@/app/lib/auth/receizDeviceIdentity";
import { isLocalProfileTruthRoot } from "@/app/lib/profile/localProfileTruth";
import type { ProfileViewData } from "@/app/lib/profile/types";
import {
  prepareProfileWorkspaceFastEntryHint,
  writeProfileWorkspaceHydrationSeed,
} from "@/app/lib/profile/workspaceHydration";
import {
  peekSessionBootstrapSnapshot,
  writeSessionBootstrapSnapshot,
} from "@/app/lib/session/bootstrapHydration";
import { type Plan } from "@/app/lib/premium/plan";

function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function sameUserId(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = text(left);
  const normalizedRight = text(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function sameNullableText(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = text(left);
  const normalizedRight = text(right);
  return normalizedLeft === normalizedRight;
}

function bootstrapAlreadyCarriesOwnedProfile(args: {
  bootstrap: ReturnType<typeof peekSessionBootstrapSnapshot>;
  profile: ProfileViewData;
  viewerEmail: string | null;
  canViewPhiAmounts: boolean | undefined;
  plan: Plan | null;
  entitlementPlan: Plan | null;
}): boolean {
  const bootstrap = args.bootstrap;
  if (!bootstrap?.signedIn) return false;
  if (!sameUserId(bootstrap.uid, args.profile.profile.userId)) return false;
  if (text(bootstrap.username) !== text(args.profile.profile.username)) return false;
  if (!sameNullableText(bootstrap.email, args.viewerEmail)) return false;
  if (bootstrap.canViewPhiAmounts !== Boolean(args.canViewPhiAmounts)) return false;
  if ((bootstrap.plan ?? null) !== (args.plan ?? null)) return false;
  if ((bootstrap.entitlementPlan ?? null) !== (args.entitlementPlan ?? null)) return false;
  return true;
}

export function admitOwnedProfileAuthority(args: {
  profile: ProfileViewData | null | undefined;
  viewerEmail?: string | null;
}): void {
  const profile = args.profile ?? null;
  if (!profile?.profile.userId || !profile.profile.username) return;
  if (!profile.viewer.isOwner && !profile.viewer.canEdit) return;
  if (isLocalProfileTruthRoot(profile)) return;

  const bootstrap = peekSessionBootstrapSnapshot(true);
  const viewerEmail = args.viewerEmail ?? bootstrap?.email ?? null;
  const durableProofBacked = hasOfflineIdentitySessionForBootstrap();

  writeProfileWorkspaceHydrationSeed({
    profile,
    viewerEmail,
  });
  prepareProfileWorkspaceFastEntryHint();

  if (!bootstrap || sameUserId(bootstrap.uid, profile.profile.userId)) {
    const nextPlan = bootstrap?.plan ?? null;
    const nextEntitlementPlan = bootstrap?.entitlementPlan ?? bootstrap?.plan ?? null;
    const nextCanViewPhiAmounts = true;
    if (
      !bootstrapAlreadyCarriesOwnedProfile({
        bootstrap,
        profile,
        viewerEmail,
        canViewPhiAmounts: nextCanViewPhiAmounts,
        plan: nextPlan,
        entitlementPlan: nextEntitlementPlan,
      })
    ) {
      writeSessionBootstrapSnapshot({
        signedIn: true,
        uid: profile.profile.userId,
        email: viewerEmail,
        username: profile.profile.username,
        canViewPhiAmounts: nextCanViewPhiAmounts,
        plan: nextPlan,
        entitlementPlan: nextEntitlementPlan,
        durableProofBacked: durableProofBacked ? true : undefined,
      });
    }
  }

  const identity = peekReceizDeviceIdentity();
  const activeBinding = peekActiveReceizAccountBinding();
  if (!identity || activeBinding?.receizKeyId !== identity.keyFile.keyId) return;
  if (!sameUserId(activeBinding.session.uid, profile.profile.userId)) return;

  admitReceizAccountBinding({
    receizKeyId: identity.keyFile.keyId,
    localUid: activeBinding.localUid ?? identity.localUid,
    session: {
      uid: profile.profile.userId,
      email: viewerEmail,
      username: profile.profile.username,
      displayName: profile.profile.displayName,
      plan: bootstrap?.plan ?? activeBinding.session.plan,
      entitlementPlan: bootstrap?.entitlementPlan ?? activeBinding.session.entitlementPlan,
    },
    source: activeBinding.pbiBound
      ? "pbi"
      : activeBinding.emailBound
        ? "email"
        : activeBinding.serverBound
          ? "receiz-device-bound"
          : "receiz-device",
    serverBound: activeBinding.serverBound,
    pbiBound: activeBinding.pbiBound,
    emailBound: activeBinding.emailBound || Boolean(viewerEmail && !isReceizDeviceSyntheticEmail(viewerEmail)),
    makeActive: true,
  });
}
