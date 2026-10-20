import { parseProfileUsername } from "@/app/lib/profile/username";

export type AuthenticatedReceizOwner = Readonly<{
  userId: string;
  username: string;
  receizId: string;
}>;

export function canonicalReceizOwnerId(usernameRaw: unknown): string | null {
  if (typeof usernameRaw !== "string") return null;
  const candidate = usernameRaw.trim().replace(/^@+/, "").toLowerCase();
  const username = parseProfileUsername(candidate);
  if (!username || username !== candidate) return null;
  return `${username}.receiz.id`;
}

export function ownerMatchesAuthenticatedReceizIdentity(
  ownerReceizIdRaw: unknown,
  authenticatedOwner: AuthenticatedReceizOwner,
): boolean {
  if (typeof ownerReceizIdRaw !== "string") return false;
  const canonical = canonicalReceizOwnerId(authenticatedOwner.username);
  if (!canonical || canonical !== authenticatedOwner.receizId) return false;
  return ownerReceizIdRaw.trim() === canonical;
}
