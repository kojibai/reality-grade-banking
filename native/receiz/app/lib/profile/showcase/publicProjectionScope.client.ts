"use client";

import { peekActiveReceizAccountBindingWithAccountAuthority } from "@/app/lib/auth/receizAccountBindings";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import type { ProfileShowcaseCompletePublicationScope } from "./publicProjectionScope";

export type ProfileShowcasePublicationRoute = Pick<ProfileShowcaseCompletePublicationScope, "username" | "profileIdentity">;

/** Read already-held account placement only. Never issue a session request to
 * discover proof truth or let a publication switch the active account. */
export function readProfileShowcasePublicationRoute(): ProfileShowcasePublicationRoute | null {
  const account = peekActiveReceizAccountBindingWithAccountAuthority()?.session
    ?? peekSessionBootstrapSnapshot(true);
  const username = account?.username?.trim().replace(/^@+/, "").normalize("NFC").toLowerCase();
  return username && account?.uid ? Object.freeze({ username, profileIdentity: account.uid }) : null;
}
