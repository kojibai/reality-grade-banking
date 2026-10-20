import { parseProfileUsername } from "@/app/lib/profile/username";

export const PROFILE_WORKSPACE_FAST_ENTRY_COOKIE = "receiz_profile_workspace_fast_entry";
export const PROFILE_WORKSPACE_FAST_ENTRY_MAX_AGE_SECONDS = 20;

export function profileWorkspaceFastEntryUsername(
  cookieValueRaw: string | null | undefined,
): string | null {
  if (typeof cookieValueRaw !== "string") return null;
  const raw = cookieValueRaw.trim();
  if (!raw) return null;

  try {
    return parseProfileUsername(decodeURIComponent(raw));
  } catch {
    return parseProfileUsername(raw);
  }
}

export function profileWorkspaceFastEntryMatchesUsername(
  cookieValueRaw: string | null | undefined,
  usernameRaw: string | null | undefined,
): boolean {
  const fastEntryUsername = profileWorkspaceFastEntryUsername(cookieValueRaw);
  const username = typeof usernameRaw === "string" ? parseProfileUsername(usernameRaw) : null;
  return Boolean(fastEntryUsername && username && fastEntryUsername === username);
}
