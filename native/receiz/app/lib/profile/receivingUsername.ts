/** Send-input syntax only. Canonical names, account IDs, identity creation and
 * proof history stay unchanged. The existing directory selects the account. */
export function parseReceivingUsername(raw: string): string | null {
  const value = raw.trim().replace(/^@+/, "").replace(/\.receiz\.id$/i, "").toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(value) || /^receiz_[a-z0-9_]{3,24}$/.test(value) ? value : null;
}
export function receivingUsernameSearch(username: string): string {
  return /^receiz_([a-z0-9_]{3,24})$/.exec(username)?.[1] ?? username;
}
export function receivingUsernameMatches(username: string, input: string): boolean {
  const canonical = parseReceivingUsername(username), requested = parseReceivingUsername(input);
  return canonical !== null && requested !== null && receivingUsernameSearch(canonical) === receivingUsernameSearch(requested);
}
/** Reuse the existing unique directory selection. An explicitly prefixed exact
 * username keeps its established route; an unqualified input never guesses. */
export function selectReceivingUsername<T extends {kind: string; userId: string; username: string; receivingUsername?: string}>(users: readonly T[], input: string): T | null {
  const requested = parseReceivingUsername(input);
  if (!requested) return null;
  const matches = users.filter(user => user.kind === "user" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(user.userId) && (receivingUsernameMatches(user.username, requested) || typeof user.receivingUsername === "string" && /^[a-z0-9]{18}$/.test(user.receivingUsername) && receivingUsernameMatches(user.receivingUsername, requested)));
  const exact = requested.startsWith("receiz_") ? matches.filter(user => user.username.toLowerCase() === requested) : [];
  const selected = new Map((exact.length ? exact : matches).map(user => [user.userId, user]));
  return selected.size === 1 ? [...selected.values()][0] : null;
}

/** The source already retains the complete generated name in its signed device
 * binding. A shortened profile locator cannot supply the missing character. */
export function fullReceivingUsername(username: string, bindings: readonly Readonly<{localUid: string; revokedAt: string | null}>[]): string | null {
  const names = new Set<string>();
  for (const binding of bindings) {
    if (binding.revokedAt !== null) continue;
    const name = /^receiz_device_([a-z0-9]{18,})$/.exec(binding.localUid)?.[1]?.slice(0,18);
    if (name && [name, `receiz_${name}`, `receiz_${name.slice(0,17)}`].includes(username)) names.add(name);
  }
  return names.size === 1 ? [...names][0] : null;
}
export function receivingUsernameForIdentity(username: string, identityUsername: string): string {
  const name = /^receiz_([a-z0-9]{18})$/.exec(identityUsername)?.[1];
  return name && [name, identityUsername, identityUsername.slice(0,24)].includes(username) ? name : username;
}
export function legacyReceivingUsername(input: string): string | null {
  const parsed = parseReceivingUsername(input), name = parsed && receivingUsernameSearch(parsed);
  return name && /^[a-z0-9]{18}$/.test(name) ? `receiz_${name.slice(0,17)}` : null;
}
