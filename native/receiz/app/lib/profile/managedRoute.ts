import { parseProfileUsername } from "@/app/lib/profile/username";

export const MANAGED_PROFILE_ROUTE_FALLBACK_PATH = "/__managed-profile__";

function normalizeInternalPath(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\n") || trimmed.includes("\r")) return null;
  return trimmed;
}

export function buildManagedProfileHref(usernameRaw: string | null | undefined): string | null {
  const username = typeof usernameRaw === "string" ? parseProfileUsername(usernameRaw) : null;
  if (!username) return null;
  return `/${encodeURIComponent(username)}?manage=1`;
}

export function isLegacyProfileRoutePath(pathRaw: string | null | undefined): boolean {
  const path = normalizeInternalPath(pathRaw);
  if (!path) return false;
  try {
    const parsed = new URL(path, "https://receiz.local");
    return parsed.pathname === "/profile";
  } catch {
    return false;
  }
}

export function isManagedProfileFallbackPath(pathRaw: string | null | undefined): boolean {
  const path = normalizeInternalPath(pathRaw);
  if (!path) return false;
  try {
    const parsed = new URL(path, "https://receiz.local");
    return parsed.pathname === MANAGED_PROFILE_ROUTE_FALLBACK_PATH || isLegacyProfileRoutePath(path);
  } catch {
    return path === MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  }
}

function normalizeManagedProfileFallbackHref(pathRaw: string): string {
  try {
    const parsed = new URL(pathRaw, "https://receiz.local");
    if (parsed.pathname === MANAGED_PROFILE_ROUTE_FALLBACK_PATH) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    if (parsed.pathname === "/profile") {
      return `${MANAGED_PROFILE_ROUTE_FALLBACK_PATH}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  }
  return MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
}

export function resolveManagedProfileHref(
  usernameRaw: string | null | undefined,
  nextPathRaw?: string | null | undefined,
): string {
  const nextPath = normalizeInternalPath(nextPathRaw ?? null);
  if (nextPath && !isManagedProfileFallbackPath(nextPath)) {
    return nextPath;
  }

  const managedHref = buildManagedProfileHref(usernameRaw);
  if (!managedHref) {
    if (nextPath && isManagedProfileFallbackPath(nextPath)) {
      return normalizeManagedProfileFallbackHref(nextPath);
    }
    return MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  }

  if (!nextPath || nextPath === MANAGED_PROFILE_ROUTE_FALLBACK_PATH) {
    return managedHref;
  }

  try {
    const managedUrl = new URL(managedHref, "https://receiz.local");
    const legacyUrl = new URL(nextPath, "https://receiz.local");
    legacyUrl.searchParams.forEach((value, key) => {
      if (key === "manage") return;
      managedUrl.searchParams.set(key, value);
    });
    managedUrl.hash = legacyUrl.hash;
    return `${managedUrl.pathname}${managedUrl.search}${managedUrl.hash}`;
  } catch {
    return managedHref;
  }
}
